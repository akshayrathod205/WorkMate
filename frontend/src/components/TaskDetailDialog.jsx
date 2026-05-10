import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Trash2, Send } from "lucide-react";
import { createComment, deleteComment, getComments } from "../api";
import { useAuth } from "../AuthContext";
import { ROLE_MANAGER } from "../auth";
import { Avatar } from "./ui/Avatar";
import { StatusBadge } from "./ui/StatusBadge";
import { Spinner } from "./ui/Spinner";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TaskDetailDialog({ task, members, open, onOpenChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const assignee = members?.find((m) => m.id === task?.assigned_to);
  const taskId = task?.id;

  const commentsQuery = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => getComments(taskId),
    enabled: !!taskId && open,
  });

  const createMutation = useMutation({
    mutationFn: () => createComment(taskId, body.trim()),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["events", task?.project_id] });
    },
    onError: () => toast.error("Failed to post comment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  const userName = user?.name || localStorage.getItem("name");
  const isManager = user?.role === ROLE_MANAGER;
  const comments = commentsQuery.data?.comments ?? [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim() || createMutation.isPending) return;
    createMutation.mutate();
  };

  if (!task) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-white shadow-xl dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {task.title}
              </Dialog.Title>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <StatusBadge status={task.status} />
                {assignee && (
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar name={assignee.name} size={18} />
                    {assignee.name}
                  </span>
                )}
                {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {task.description && (
              <p className="mb-6 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{task.description}</p>
            )}

            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>

            {commentsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No comments yet. Start the discussion below.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => {
                  const canDelete = c.user_id === user?.id || isManager;
                  return (
                    <li key={c.id} className="flex gap-3">
                      <Avatar name={c.user_name} size={32} />
                      <div className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.user_name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(c.created_at)}</span>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => deleteMutation.mutate(c.id)}
                              className="text-slate-400 hover:text-red-600"
                              aria-label="Delete comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{c.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-end gap-2">
              <Avatar name={userName} size={32} />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="input flex-1 resize-none"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit(e);
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={!body.trim() || createMutation.isPending}
                aria-label="Post comment"
              >
                {createMutation.isPending ? <Spinner className="text-white" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">⌘/Ctrl + Enter to send</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
