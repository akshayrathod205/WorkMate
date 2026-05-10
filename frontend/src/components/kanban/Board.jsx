import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TASK_STATUSES } from "../../auth";
import { Column } from "./Column";
import { Card } from "./Card";

export function Board({ tasks, members, canDragTask, onMove, onOpenTask }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const grouped = TASK_STATUSES.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status);
    return acc;
  }, {});

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));

  const handleDragStart = ({ active }) => {
    setActiveTask(active.data.current?.task ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    const task = active.data.current?.task;
    if (!task) return;

    // `over.id` is either a column id (status string) or another task id.
    let destStatus = TASK_STATUSES.find((s) => s === over.id);
    if (!destStatus) {
      const overTask = tasks.find((t) => t.id === over.id);
      destStatus = overTask?.status;
    }
    if (!destStatus || destStatus === task.status) return;

    onMove(task, destStatus);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            members={members}
            canDragTask={canDragTask}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-1">
            <Card task={activeTask} assignee={memberById.get(activeTask.assigned_to)} draggable />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
