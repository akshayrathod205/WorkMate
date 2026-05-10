import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserPlus, ArrowLeft, LayoutGrid, List, Search, X } from "lucide-react";
import clsx from "clsx";
import { getProjectDetails, getTasks, updateTask } from "../api";
import { useAuth } from "../AuthContext";
import { ROLE_MANAGER, TASK_STATUSES } from "../auth";
import { useDebounce } from "../hooks/useDebounce";
import { useEventSource } from "../hooks/useEventSource";
import { PageContainer } from "./ui/PageContainer";
import { Skeleton } from "./ui/Skeleton";
import { Avatar } from "./ui/Avatar";
import { StatusBadge } from "./ui/StatusBadge";
import { Board } from "./kanban/Board";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { ActivityPanel } from "./ActivityPanel";

const ProjectDetails = () => {
  const { id } = useParams();
  const projectId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEventSource(projectId);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectDetails(projectId),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId, debouncedSearch],
    queryFn: () => getTasks(projectId, { q: debouncedSearch || undefined }),
    placeholderData: (prev) => prev, // keep showing previous results while re-fetching
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, task }) => updateTask(taskId, task),
    onMutate: async ({ taskId, task }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      const prev = queryClient.getQueryData(["tasks", projectId, debouncedSearch]);
      queryClient.setQueryData(["tasks", projectId, debouncedSearch], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) => (t.id === taskId ? { ...t, ...task } : t)),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["tasks", projectId, debouncedSearch], ctx.prev);
      toast.error("Failed to update task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["events", projectId] });
    },
  });

  const project = projectQuery.data;
  const tasks = tasksQuery.data?.tasks ?? [];
  const userId = tasksQuery.data?.userId;
  const isManager = user?.role === ROLE_MANAGER;

  const visibleTasks = tasks.filter((t) => filter === "all" || t.assigned_to === userId);
  const canDragTask = (task) => task.assigned_to === userId || isManager;
  const selectedTask = visibleTasks.find((t) => t.id === selectedTaskId) || tasks.find((t) => t.id === selectedTaskId);

  const handleMove = (task, newStatus) => {
    updateMutation.mutate({ taskId: task.id, task: { ...task, status: newStatus } });
  };

  return (
    <PageContainer>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" />
        All projects
      </Link>

      {projectQuery.isLoading && (
        <>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </>
      )}

      {project && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project.name}</h1>
              {project.description && (
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{project.description}</p>
              )}
            </div>
            {isManager && (
              <div className="flex flex-wrap gap-2">
                <Link to={`/projects/${projectId}/add-team-members`} className="btn-secondary">
                  <UserPlus className="h-4 w-4" />
                  Add members
                </Link>
                <Link to={`/projects/${projectId}/create-task`} className="btn-primary">
                  <Plus className="h-4 w-4" />
                  New task
                </Link>
              </div>
            )}
          </div>

          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Team</h2>
            {project.team_members?.length ? (
              <div className="flex flex-wrap gap-3">
                {project.team_members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <Avatar name={m.name} size={24} />
                    <span className="text-slate-900 dark:text-slate-100">{m.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{m.role}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No team members yet.</p>
            )}
          </section>
        </>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tasks</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-8 pr-7 sm:w-56"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  className={clsx("rounded px-3 py-1", filter === "all" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300")}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  className={clsx("rounded px-3 py-1", filter === "mine" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300")}
                  onClick={() => setFilter("mine")}
                >
                  My tasks
                </button>
              </div>
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  className={clsx("inline-flex items-center gap-1 rounded px-2.5 py-1", view === "board" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300")}
                  onClick={() => setView("board")}
                  aria-label="Board view"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  className={clsx("inline-flex items-center gap-1 rounded px-2.5 py-1", view === "list" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300")}
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {tasksQuery.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!tasksQuery.isLoading && visibleTasks.length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-600 dark:text-slate-400">
              {debouncedSearch
                ? `No tasks matching "${debouncedSearch}".`
                : filter === "mine"
                ? "No tasks assigned to you."
                : "No tasks yet."}
            </div>
          )}

          {!tasksQuery.isLoading && visibleTasks.length > 0 && view === "board" && (
            <Board
              tasks={visibleTasks}
              members={project?.team_members ?? []}
              canDragTask={canDragTask}
              onMove={handleMove}
              onOpenTask={(t) => setSelectedTaskId(t.id)}
            />
          )}

          {!tasksQuery.isLoading && visibleTasks.length > 0 && view === "list" && (
            <ul className="space-y-3">
              {visibleTasks.map((task) => {
                const canEditStatus = canDragTask(task);
                return (
                  <li key={task.id} className="card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">{task.title}</h3>
                        {task.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        {canEditStatus ? (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              updateMutation.mutate({
                                taskId: task.id,
                                task: { ...task, status: e.target.value },
                              })
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={task.status} />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ActivityPanel projectId={projectId} />
      </div>

      <TaskDetailDialog
        task={selectedTask}
        members={project?.team_members ?? []}
        open={!!selectedTask}
        onOpenChange={(o) => !o && setSelectedTaskId(null)}
      />
    </PageContainer>
  );
};

export default ProjectDetails;
