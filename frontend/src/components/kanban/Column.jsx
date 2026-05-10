import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import clsx from "clsx";
import { Card } from "./Card";

const headerStyles = {
  "Not Started": "text-slate-600 dark:text-slate-400",
  "In Progress": "text-amber-700 dark:text-amber-400",
  Completed: "text-emerald-700 dark:text-emerald-400",
};

export function Column({ status, tasks, members, canDragTask, onOpenTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex h-full flex-col rounded-lg border bg-slate-50 p-3 transition-colors dark:bg-slate-900/50",
        isOver
          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
          : "border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className={clsx("text-xs font-semibold uppercase tracking-wide", headerStyles[status])}>{status}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {tasks.map((task) => (
            <Card
              key={task.id}
              task={task}
              assignee={memberById.get(task.assigned_to)}
              draggable={canDragTask(task)}
              onOpen={onOpenTask}
            />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-600">
              No tasks
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
