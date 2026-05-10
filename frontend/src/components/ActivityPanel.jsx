import { useQuery } from "@tanstack/react-query";
import { Activity, FolderPlus, FolderEdit, Plus, ArrowRight, Trash2, MessageSquare, UserPlus } from "lucide-react";
import { getProjectEvents } from "../api";
import { Avatar } from "./ui/Avatar";
import { Skeleton } from "./ui/Skeleton";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const KIND_ICONS = {
  "project.created": FolderPlus,
  "project.updated": FolderEdit,
  "task.created": Plus,
  "task.status_changed": ArrowRight,
  "task.deleted": Trash2,
  "comment.created": MessageSquare,
  "members.added": UserPlus,
};

function describe(event) {
  const p = event.payload || {};
  switch (event.kind) {
    case "project.created":
      return <>created the project <strong>{p.name}</strong></>;
    case "project.updated":
      return <>updated the project</>;
    case "task.created":
      return <>added task <strong>{p.title}</strong></>;
    case "task.status_changed":
      return <>moved <strong>{p.title}</strong> from <em>{p.from}</em> to <em>{p.to}</em></>;
    case "task.deleted":
      return <>deleted task <strong>{p.title}</strong></>;
    case "comment.created":
      return <>commented: "<em>{p.snippet}</em>"</>;
    case "members.added":
      return <>added {p.count} member{p.count === 1 ? "" : "s"}</>;
    default:
      return event.kind;
  }
}

export function ActivityPanel({ projectId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", projectId],
    queryFn: () => getProjectEvents(projectId, { limit: 30 }),
    enabled: !!projectId,
  });

  const events = data?.events ?? [];

  return (
    <aside className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Activity className="h-4 w-4" />
        Activity
      </h3>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600">Failed to load activity.</p>
      )}

      {!isLoading && !isError && events.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
      )}

      {events.length > 0 && (
        <ul className="space-y-3">
          {events.map((e) => {
            const Icon = KIND_ICONS[e.kind] || Activity;
            return (
              <li key={e.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <Avatar name={e.actor_name || "user"} size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{e.actor_name || "Someone"}</span>{" "}
                      {describe(e)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatTime(e.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
