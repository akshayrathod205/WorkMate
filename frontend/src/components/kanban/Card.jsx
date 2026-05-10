import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock } from "lucide-react";
import { Avatar } from "../ui/Avatar";

export function Card({ task, assignee, draggable, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="card group flex gap-2 p-3 hover:shadow-md">
      {draggable ? (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
          aria-label="Drag task"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="text-slate-300 dark:text-slate-700" title="You can't change this task's status">
          <Lock className="h-4 w-4" />
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      >
        <h4 className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{task.title}</h4>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{task.description}</p>
        )}
        {assignee && (
          <div className="mt-2 flex items-center gap-1.5">
            <Avatar name={assignee.name} size={18} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{assignee.name}</span>
          </div>
        )}
      </button>
    </div>
  );
}
