import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useWorkspaceContext } from '../context/workspaceContext';
import { useUpdateTask } from '../hooks/useMutations';

const columns = [
  {
    id: 'TODO',
    title: 'To Do',
    color: 'border-zinc-200 dark:border-zinc-700',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    color: 'border-blue-200 dark:border-blue-500/40',
  },
  {
    id: 'DONE',
    title: 'Done',
    color: 'border-emerald-200 dark:border-emerald-500/40',
  },
];

const TaskCard = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-sm shadow-sm cursor-grab active:cursor-grabbing transition ${
        isDragging ? 'opacity-60' : ''
      }`}
    >
      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
        {task.title}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
        {task.description || 'No description'}
      </div>
      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Project: {task.projectName || 'Unknown'}
      </div>
    </div>
  );
};

const Column = ({ column, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 rounded-xl border ${column.color} bg-zinc-50/60 dark:bg-zinc-950/40 p-4 min-h-[320px] transition ${
        isOver ? 'ring-2 ring-blue-500/30' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {column.title}
        </h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
      {tasks.length === 0 && (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
          Drop tasks here
        </div>
      )}
    </div>
  );
};

const MyTasks = () => {
  const { currentWorkspace } = useWorkspaceContext();
  const user = useSelector((state) => state.auth.user);
  const { mutateAsync: updateTask } = useUpdateTask();
  const sensors = useSensors(useSensor(PointerSensor));

  const myTasks = useMemo(() => {
    const tasks = currentWorkspace?.projects?.flatMap((project) =>
      project.tasks.map((task) => ({
        ...task,
        projectName: project.name,
      }))
    );

    const userId = user?.id;
    if (!tasks || !userId) return [];

    return tasks.filter(
      (task) => task.assigneeId === userId || task.assignee?.id === userId
    );
  }, [currentWorkspace, user]);

  const tasksByStatus = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = myTasks.filter((task) => task.status === column.id);
      return acc;
    }, {});
  }, [myTasks]);

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;
    const taskId = active.id;
    const nextStatus = over.id;

    const task = myTasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus) return;

    try {
      toast.loading('Updating status...');
      await updateTask({
        workspaceId: currentWorkspace?.id,
        taskId,
        payload: { status: nextStatus },
      });
      toast.dismiss();
      toast.success('Task updated');
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || 'Failed to update task');
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
        Select a workspace to view tasks.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-white">
          My Tasks
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Drag and drop tasks to update your workflow.
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.id] || []}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};

export default MyTasks;
