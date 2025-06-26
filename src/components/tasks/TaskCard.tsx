import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Clock, 
  User, 
  Calendar, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Flag,
  MessageSquare,
  Paperclip
} from 'lucide-react';
import { Task, TaskType, Priority } from '../../types';
import { Button } from '../ui/Button';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
  isDragging?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onView,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTaskTypeColor = (type: TaskType) => {
    const colors = {
      feature: 'bg-primary-500',
      bug: 'bg-error-500',
      refactor: 'bg-secondary-500',
      docs: 'bg-accent-500',
      test: 'bg-warning-500',
      devops: 'bg-dark-500',
    };
    return colors[type] || 'bg-dark-500';
  };

  const getPriorityColor = (priority: Priority) => {
    const colors = {
      low: 'text-dark-400 border-dark-600',
      medium: 'text-warning-400 border-warning-600',
      high: 'text-accent-400 border-accent-600',
      critical: 'text-error-400 border-error-600',
    };
    return colors[priority] || 'text-dark-400 border-dark-600';
  };

  const getPriorityIcon = (priority: Priority) => {
    const icons = {
      low: '○',
      medium: '◐',
      high: '●',
      critical: '🔥',
    };
    return icons[priority] || '○';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleActionClick = (action: () => void) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
      setShowMenu(false);
    };
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        group relative bg-dark-800 border border-dark-700 rounded-lg p-4 
        hover:border-dark-600 hover:shadow-lg transition-all duration-200 cursor-grab
        ${isDragging ? 'opacity-50 rotate-2 shadow-2xl z-50' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      onClick={() => onView(task)}
    >
      {/* Drag Handle - invisible but covers the card */}
      <div
        {...listeners}
        className="absolute inset-0 z-10"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />

      {/* Card Content */}
      <div className="relative z-20 pointer-events-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${getTaskTypeColor(task.type)}`}
              title={task.type}
            />
            <span className="text-xs font-medium text-dark-400 uppercase tracking-wide">
              {task.type}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Priority Indicator */}
            <div className={`flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
              <span className="text-sm">{getPriorityIcon(task.priority)}</span>
              <span className="text-xs font-medium capitalize">{task.priority}</span>
            </div>
            
            {/* Menu Button */}
            <div className="relative pointer-events-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
              >
                <MoreVertical size={14} />
              </Button>
              
              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-32 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-40 py-1">
                    <button
                      onClick={handleActionClick(() => onView(task))}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                    <button
                      onClick={handleActionClick(() => onEdit(task))}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 transition-colors"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleActionClick(() => onDelete(task.id))}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-700 transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-white font-medium text-sm leading-5 mb-2 line-clamp-2">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-dark-400 text-xs leading-4 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Tags/Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.labels.slice(0, 3).map((label, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-dark-700 text-dark-300 text-xs rounded-full"
              >
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="px-2 py-1 bg-dark-700 text-dark-400 text-xs rounded-full">
                +{task.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-dark-500">
          <div className="flex items-center space-x-3">
            {/* Effort Estimate */}
            {task.estimatedEffort && (
              <div className="flex items-center space-x-1">
                <Clock size={12} />
                <span>{task.estimatedEffort}h</span>
              </div>
            )}
            
            {/* Assignee */}
            {task.assigneeId && (
              <div className="flex items-center space-x-1">
                <User size={12} />
                <span>Assigned</span>
              </div>
            )}
            
            {/* Comments Count */}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare size={12} />
                <span>{task.comments.length}</span>
              </div>
            )}
            
            {/* Attachments Count */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip size={12} />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar for In-Progress Tasks */}
        {task.status === 'in-progress' && task.actualEffort && task.estimatedEffort && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-dark-400">Progress</span>
              <span className="text-xs text-dark-400">
                {Math.round((task.actualEffort / task.estimatedEffort) * 100)}%
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (task.actualEffort / task.estimatedEffort) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay Effect */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary-500/10 border-2 border-primary-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};