import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Task, TaskType, Priority, TaskStatus, Developer } from '../../types';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  task?: Task | null;
  developers: Developer[];
}

export const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  developers,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'feature' as TaskType,
    priority: 'medium' as Priority,
    status: 'backlog' as TaskStatus,
    estimatedEffort: 8,
    actualEffort: 0,
    assigneeId: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        estimatedEffort: task.estimatedEffort,
        actualEffort: task.actualEffort || 0,
        assigneeId: task.assignee?.id || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'feature',
        priority: 'medium',
        status: 'backlog',
        estimatedEffort: 8,
        actualEffort: 0,
        assigneeId: '',
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    const assignee = formData.assigneeId 
      ? developers.find(dev => dev.id === formData.assigneeId)
      : undefined;

    onSubmit({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
      status: formData.status,
      estimatedEffort: formData.estimatedEffort,
      actualEffort: formData.actualEffort,
      assignee,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'Create New Task'}
      size="lg"
    >
      <div className="flex flex-col h-full">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div className="grid grid-cols-1 gap-4">
              <Input
                label="Task Title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />

              <div>
                <label className="block text-sm font-medium text-dark-200 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe the task in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-500 focus:border-primary-500 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none transition-colors duration-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TaskType }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-500 focus:border-primary-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <option value="feature">Feature</option>
                    <option value="bug">Bug</option>
                    <option value="refactor">Refactor</option>
                    <option value="docs">Documentation</option>
                    <option value="test">Testing</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-500 focus:border-primary-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-500 focus:border-primary-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Assignee
                  </label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 hover:border-dark-500 focus:border-primary-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
                  >
                    <option value="">Unassigned</option>
                    {developers?.map(dev => (
                      <option key={dev.id} value={dev.id}>
                        {dev.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Estimated Effort (hours)"
                  type="number"
                  min="1"
                  max="40"
                  value={formData.estimatedEffort}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedEffort: parseInt(e.target.value) || 8 }))}
                />

                {task && (
                  <Input
                    label="Actual Effort (hours)"
                    type="number"
                    min="0"
                    value={formData.actualEffort}
                    onChange={(e) => setFormData(prev => ({ ...prev, actualEffort: parseInt(e.target.value) || 0 }))}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 flex-shrink-0 flex items-center justify-end space-x-3 pt-6 mt-6 border-t border-dark-700 bg-dark-800">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit">
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};