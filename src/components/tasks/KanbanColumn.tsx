import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { Button } from '../ui/Button';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewTask: (task: Task) => void;
  color?: string;
  /**
   * Optional: Called when the user clicks Generate PR for a task in this column.
   */
  onGeneratePR?: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onViewTask,
  color = 'bg-dark-600',
  onGeneratePR,
}) => {
  const {
    setNodeRef,
    isOver,
    active,
  } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  });

  const taskIds = tasks.map(task => task.id);

  const getColumnColor = (status: TaskStatus) => {
    const colors = {
      backlog: 'border-dark-600',
      todo: 'border-primary-600',
      'in-progress': 'border-warning-600',
      review: 'border-accent-600',
      done: 'border-success-600',
    };
    return colors[status] || 'border-dark-600';
  };

  const getColumnHeaderColor = (status: TaskStatus) => {
    const colors = {
      backlog: 'text-dark-400',
      todo: 'text-primary-400',
      'in-progress': 'text-warning-400',
      review: 'text-accent-400',
      done: 'text-success-400',
    };
    return colors[status] || 'text-dark-400';
  };

  const isDraggedTaskFromThisColumn = active?.data.current?.task?.status === id;
  const isDropTarget = isOver && active?.data.current?.type === 'task';

  return (
    <div className="flex flex-col h-full min-w-80 max-w-80">
      {/* Column Header */}
      <div className={`
        flex items-center justify-between p-4 border-b-2 transition-colors duration-200
        ${getColumnColor(id)}
        ${isDropTarget ? 'border-opacity-100 bg-dark-700/50' : 'border-opacity-30'}
      `}>
        <div className="flex items-center space-x-3">
          <h3 className={`font-semibold ${getColumnHeaderColor(id)}`}>
            {title}
          </h3>
          <span className="bg-dark-700 text-dark-300 text-xs px-2 py-1 rounded-full font-medium">
            {tasks.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTask(id)}
            className="p-1.5 h-7 w-7 hover:bg-dark-700"
            title="Add task"
          >
            <Plus size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-1.5 h-7 w-7 hover:bg-dark-700"
            title="Column options"
          >
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-4 space-y-3 overflow-y-auto transition-all duration-200
          ${isDropTarget ? 'bg-dark-800/50' : ''}
          ${isDraggedTaskFromThisColumn ? 'opacity-75' : ''}
        `}
        style={{
          minHeight: '200px',
        }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onView={onViewTask}
              onGeneratePR={onGeneratePR}
            />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center mb-3">
              <Plus size={20} className="text-dark-400" />
            </div>
            <p className="text-dark-400 text-sm mb-2">No tasks yet</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask(id)}
              className="text-xs"
            >
              Add first task
            </Button>
          </div>
        )}

        {/* Drop Indicator */}
        {isDropTarget && (
          <div className="border-2 border-dashed border-primary-500 rounded-lg p-4 bg-primary-500/5">
            <p className="text-primary-400 text-sm text-center">
              Drop task here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};