import React, { useState } from 'react';
import { 
  CheckCircle, 
  Edit3, 
  Trash2, 
  Plus, 
  AlertCircle,
  Clock,
  User,
  Flag,
  GitBranch,
  Zap
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Task, TaskType, Priority, Developer } from '../../types';
import { useTasks } from '../../hooks/useTasks';
import { useDevelopers } from '../../hooks/useDevelopers';
import { prGenerator } from '../../services/prGenerator';
import toast from 'react-hot-toast';
import { useRepositories } from '../../hooks/useRepositories';
import { repositoryService } from '../../services/repositoryService';
import { documentationService } from '../../services/documentationService';

interface TaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  businessSpecTitle: string;
  businessSpecId?: string;
  onTasksCreated: (tasks: Task[]) => void;
}

export const TaskReviewModal: React.FC<TaskReviewModalProps> = ({
  isOpen,
  onClose,
  generatedTasks,
  businessSpecTitle,
  businessSpecId,
  onTasksCreated,
}) => {
  const { createTask } = useTasks();
  const { developers } = useDevelopers();
  const { currentRepository } = useRepositories();
  const [tasks, setTasks] = useState(generatedTasks);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [generatingPRs, setGeneratingPRs] = useState<Set<number>>(new Set());

  const handleEditTask = (index: number, field: keyof Task, value: any) => {
    setTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const handleDeleteTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTask = () => {
    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'New Task',
      description: 'Task description',
      type: 'feature',
      priority: 'medium',
      status: 'backlog',
      estimatedEffort: 8,
    };
    setTasks(prev => [...prev, newTask]);
    setEditingIndex(tasks.length);
  };

  const handleCreateTasks = async () => {
    if (tasks.length === 0) {
      toast.error('No tasks to create');
      return;
    }

    setCreating(true);
    try {
      const createdTasks: Task[] = [];
      
      for (const taskData of tasks) {
        const payload = businessSpecId ? { ...taskData, businessSpecId } : taskData;
        const createdTask = await createTask(payload);
        createdTasks.push(createdTask);
      }

      onTasksCreated(createdTasks);
      toast.success(`${createdTasks.length} tasks created successfully!`);
      onClose();
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast.error('Failed to create tasks');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateAndContinueToPRs = async () => {
    if (tasks.length === 0) {
      toast.error('No tasks to create');
      return;
    }
    setCreating(true);
    try {
      const createdTasks: Task[] = [];
      for (const taskData of tasks) {
        const payload = businessSpecId ? { ...taskData, businessSpecId } : taskData;
        const createdTask = await createTask(payload);
        createdTasks.push(createdTask);
      }
      onTasksCreated(createdTasks);
      toast.success(`${createdTasks.length} tasks created successfully!`);
      // Call handleGeneratePR for each task sequentially
      for (let i = 0; i < tasks.length; i++) {
        await handleGeneratePR(i);
      }
      // Optionally, close modal or navigate
      onClose();
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast.error('Failed to create tasks');
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePR = async (taskIndex: number) => {
    const task = tasks[taskIndex];
    if (!task) return;
    if (!currentRepository) {
      toast.error('No repository selected');
      return;
    }
    const repository = await repositoryService.getRepository(task.repositoryId || '');
    if (!repository && !currentRepository) {
      toast.error('No repository selected');
      return;
    }
    setGeneratingPRs(prev => new Set(prev).add(taskIndex));
    try {
      const { template } = await prGenerator.generatePRTemplate({
        task: {
          ...task,
          id: (task as any).id || `temp-${taskIndex}`,
          createdAt: (task as any).createdAt || new Date(),
          updatedAt: (task as any).updatedAt || new Date(),
        },
        repository: currentRepository,
        includeScaffolds: true,
      });
      template.branchName = template.branchName + '-' + Math.random().toString(36).substring(2, 12);
      const { prUrl } = await prGenerator.submitPRToGitHub(template, repository ? repository : currentRepository!);
      toast.success((
        <span>
          PR created for "{task.title}" <a href={prUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary-400">View PR</a>
        </span>
      ));    
    } catch (error) {
      console.error('Error generating PR:', error);
      toast.error('Failed to generate PR template');
    } finally {
      setGeneratingPRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskIndex);
        return newSet;
      });
    }
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
      low: 'text-dark-400',
      medium: 'text-warning-400',
      high: 'text-accent-400',
      critical: 'text-error-400',
    };
    return colors[priority] || 'text-dark-400';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Generated Tasks" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Tasks for: {businessSpecTitle}
            </h3>
            <p className="text-sm text-dark-400">
              Review and modify the AI-generated tasks before creating them
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={handleAddTask}>
              <Plus size={16} className="mr-2" />
              Add Task
            </Button>
            <Button onClick={handleCreateTasks} disabled={creating || tasks.length === 0}>
              {creating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle size={16} className="mr-2" />
              )}
              Create {tasks.length} Task{tasks.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-dark-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Tasks Generated</h3>
                <p className="text-dark-400 mb-4">
                  Add tasks manually or regenerate from the business specification.
                </p>
                <Button onClick={handleAddTask}>
                  <Plus size={16} className="mr-2" />
                  Add First Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task, index) => (
              <Card key={index} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${getTaskTypeColor(task.type)}`}
                      />
                      {editingIndex === index ? (
                        <Input
                          value={task.title}
                          onChange={(e) => handleEditTask(index, 'title', e.target.value)}
                          className="flex-1"
                          placeholder="Task title"
                        />
                      ) : (
                        <h4 className="font-medium text-white flex-1">{task.title}</h4>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className="p-1 h-6 w-6"
                      >
                        <Edit3 size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(index)}
                        className="p-1 h-6 w-6 text-error-400 hover:text-error-300"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Description */}
                    {editingIndex === index ? (
                      <textarea
                        value={task.description}
                        onChange={(e) => handleEditTask(index, 'description', e.target.value)}
                        className="w-full h-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none resize-none"
                        placeholder="Task description"
                      />
                    ) : (
                      <p className="text-dark-300 text-sm">{task.description}</p>
                    )}

                    {/* Task Properties */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">Type</label>
                        {editingIndex === index ? (
                          <select
                            value={task.type}
                            onChange={(e) => handleEditTask(index, 'type', e.target.value as TaskType)}
                            className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm"
                          >
                            <option value="feature">Feature</option>
                            <option value="bug">Bug</option>
                            <option value="refactor">Refactor</option>
                            <option value="docs">Documentation</option>
                            <option value="test">Testing</option>
                            <option value="devops">DevOps</option>
                          </select>
                        ) : (
                          <span className="text-sm text-white capitalize">{task.type}</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">Priority</label>
                        {editingIndex === index ? (
                          <select
                            value={task.priority}
                            onChange={(e) => handleEditTask(index, 'priority', e.target.value as Priority)}
                            className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        ) : (
                          <div className={`flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                            <Flag size={12} />
                            <span className="text-sm capitalize">{task.priority}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">Effort (hours)</label>
                        {editingIndex === index ? (
                          <input
                            type="number"
                            value={task.estimatedEffort}
                            onChange={(e) => handleEditTask(index, 'estimatedEffort', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm"
                            min="1"
                            max="40"
                          />
                        ) : (
                          <div className="flex items-center space-x-1 text-white">
                            <Clock size={12} />
                            <span className="text-sm">{task.estimatedEffort}h</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-dark-400 mb-1">Assignee</label>
                        {editingIndex === index ? (
                          <select
                            value={task.assignee?.id || ''}
                            onChange={(e) => {
                              const developer = developers.find(d => d.id === e.target.value);
                              handleEditTask(index, 'assignee', developer || undefined);
                            }}
                            className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-sm"
                          >
                            <option value="">Unassigned</option>
                            {developers.map(dev => (
                              <option key={dev.id} value={dev.id}>{dev.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center space-x-1 text-white">
                            <User size={12} />
                            <span className="text-sm">
                              {task.assignee?.name || 'Unassigned'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-dark-700">
                      <div className="text-xs text-dark-400">
                        Task {index + 1} of {tasks.length}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            setCreating(true);
                            try {
                              const payload = businessSpecId ? { ...task, businessSpecId } : task;
                              await createTask(payload);
                              toast.success(`Task '${task.title}' created!`);
                            } catch (error) {
                              toast.error('Failed to create task and generate PR');
                            } finally {
                              setCreating(false);
                            }
                          }}
                          disabled={creating}
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Create Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGeneratePR(index)}
                          disabled={generatingPRs.has(index)}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          {generatingPRs.has(index) ? (
                            <LoadingSpinner size="sm" className="mr-1" />
                          ) : (
                            <GitBranch size={14} className="mr-1" />
                          )}
                          Generate PR
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-700">
          <div className="text-sm text-dark-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} ready for creation
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreateAndContinueToPRs} disabled={creating || tasks.length === 0}>
              {creating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Zap size={16} className="mr-2" />
              )}
              Create & Continue to PRs
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};