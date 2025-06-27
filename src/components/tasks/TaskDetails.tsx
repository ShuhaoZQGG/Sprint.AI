import React, { useState } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar, 
  User, 
  Flag,
  MessageSquare,
  Paperclip,
  GitBranch,
  Eye,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Task, TaskType, Priority } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

interface TaskDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  /**
   * Optional: Called when the user clicks Generate PR for this task.
   */
  onGeneratePR?: (task: Task) => void;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  onGeneratePR,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details');

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
      low: 'text-dark-400',
      medium: 'text-warning-400',
      high: 'text-accent-400',
      critical: 'text-error-400',
    };
    return colors[priority] || 'text-dark-400';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      backlog: 'bg-dark-600 text-dark-300',
      todo: 'bg-primary-600 text-white',
      'in-progress': 'bg-warning-600 text-white',
      review: 'bg-accent-600 text-white',
      done: 'bg-success-600 text-white',
    };
    return colors[status as keyof typeof colors] || 'bg-dark-600 text-dark-300';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-dark-700">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span
                className={`inline-block w-3 h-3 rounded-full ${getTaskTypeColor(task.type)}`}
              />
              <span className="text-sm font-medium text-dark-400 uppercase tracking-wide">
                {task.type}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('-', ' ')}
              </span>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">{task.title}</h1>
            
            <div className="flex items-center space-x-4 text-sm text-dark-400">
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>Created {formatDate(task.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>Updated {formatDate(task.updatedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onGeneratePR && (
              <Button variant="ghost" size="sm" onClick={() => onGeneratePR(task)}>
                <GitBranch size={16} className="mr-2" />
                Generate PR
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-6 px-6 py-3 border-b border-dark-700">
          <button
            className={`text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-primary-400 border-b-2 border-primary-400 pb-3'
                : 'text-dark-400 hover:text-white pb-3'
            }`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-primary-400 border-b-2 border-primary-400 pb-3'
                : 'text-dark-400 hover:text-white pb-3'
            }`}
            onClick={() => setActiveTab('comments')}
          >
            Comments
          </button>
          <button
            className={`text-sm font-medium transition-colors ${
              activeTab === 'activity'
                ? 'text-primary-400 border-b-2 border-primary-400 pb-3'
                : 'text-dark-400 hover:text-white pb-3'
            }`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              {task.description && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Description</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-dark-300 leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Task Properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Properties</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">Priority</span>
                      <div className={`flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                        <Flag size={14} />
                        <span className="font-medium capitalize">{task.priority}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">Type</span>
                      <span className="text-white font-medium capitalize">{task.type}</span>
                    </div>
                    
                    {task.estimatedEffort && (
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400">Estimated Effort</span>
                        <span className="text-white font-medium">{task.estimatedEffort}h</span>
                      </div>
                    )}
                    
                    {task.actualEffort && (
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400">Actual Effort</span>
                        <span className="text-white font-medium">{task.actualEffort}h</span>
                      </div>
                    )}
                    
                    {/* Due Date feature removed: task.dueDate does not exist on Task type */}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Assignment</h3>
                  </CardHeader>
                  {/* CardContent removed: no assignment details to display */}
                </Card>
              </div>

              {/* Labels feature removed: task.labels does not exist on Task type */}

              {/* Progress */}
              {task.status === 'in-progress' && task.actualEffort && task.estimatedEffort && (
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Progress</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-dark-400">Completion</span>
                        <span className="text-white font-medium">
                          {Math.round((task.actualEffort / task.estimatedEffort) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-3">
                        <div
                          className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (task.actualEffort / task.estimatedEffort) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-dark-400">
                        <span>{task.actualEffort}h logged</span>
                        <span>{task.estimatedEffort}h estimated</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Comments feature removed: task.comments does not exist on Task type */}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                <p className="text-dark-400">Activity tracking coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};