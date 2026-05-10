import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// Caps the in-memory activity feed so a long-lived stream doesn't grow without bound.
const MAX_EVENTS_IN_CACHE = 200;

function mergeEventIntoCache(queryClient, projectId, event) {
  // Prepend to the activity feed cache. We use setQueriesData so it touches every
  // ["events", projectId, ...] variant, regardless of pagination/limit args.
  queryClient.setQueriesData({ queryKey: ["events", projectId] }, (old) => {
    if (!old) return old;
    const existing = old.events ?? [];
    if (existing.some((e) => e.id === event.id)) return old;
    return { ...old, events: [event, ...existing].slice(0, MAX_EVENTS_IN_CACHE) };
  });

  const p = event.payload || {};

  switch (event.kind) {
    case "task.status_changed": {
      // Patch every cached tasks list for this project (covers all search variants).
      queryClient.setQueriesData({ queryKey: ["tasks", projectId] }, (old) => {
        if (!old?.tasks) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === p.task_id ? { ...t, status: p.to } : t
          ),
        };
      });
      break;
    }
    case "task.deleted": {
      queryClient.setQueriesData({ queryKey: ["tasks", projectId] }, (old) => {
        if (!old?.tasks) return old;
        return { ...old, tasks: old.tasks.filter((t) => t.id !== p.task_id) };
      });
      break;
    }
    case "task.created": {
      // We don't have the full task row in the payload (no description/due_date),
      // so refetch instead of patching incomplete state.
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      break;
    }
    case "comment.created": {
      if (p.task_id) {
        queryClient.invalidateQueries({ queryKey: ["comments", p.task_id] });
      }
      break;
    }
    case "members.added":
    case "project.updated": {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      break;
    }
    default:
      break;
  }
}

export function useEventSource(projectId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    let es;
    let closed = false;
    let retryTimer;
    let retryDelay = 1000;

    const open = () => {
      if (closed) return;
      es = new EventSource(`${API_URL}/projects/${projectId}/stream`, {
        withCredentials: true,
      });

      es.onopen = () => {
        retryDelay = 1000;
      };

      es.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data);
          mergeEventIntoCache(queryClient, projectId, event);
        } catch {
          // ignore malformed payloads
        }
      };

      es.onerror = () => {
        // EventSource auto-reconnects, but if the server closed (e.g., 401 after
        // logout) it stays in CLOSED. Force a manual retry with backoff.
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          if (closed) return;
          retryTimer = setTimeout(open, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      };
    };

    open();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (es) es.close();
    };
  }, [projectId, queryClient]);
}
