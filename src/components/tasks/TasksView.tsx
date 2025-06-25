import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Filter, 
  Search,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  GitBranch,
  MoreHorizontal,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PresenceIndicator } from '../ui/PresenceIndicator';
import { RealtimeIndicator } from '../ui/RealtimeIndicator';
import { PRPreview } from './PRPreview';
import { TaskForm } from './TaskForm';
import { useTasks } from '../../hooks/useTasks';
import { useRepositories } from '../../hooks/useRepositories';
import { useAppStore } from '../../stores/useAppStore';
import { useRealtimeTable, usePresence, useOptimisticUpdates } from '../../hooks/useRealtime';
import { useAuth } from '../../hooks/useSupabase';
import { prGenerator } from '../../services/prGenerator';
import { Task, TaskStatus, PRTemplate } from '../../types';
import toast from 'react-hot-toast';

const statusConfig = {
  backlog: { icon: Circle, color: 'text-dark-400', bg: 'bg-dark-700' },
  todo: { icon: Circle, color: 'text-primary-400', bg: 'bg-primary-900/20' },
  'in-progress': { icon: PlayCircle, color: 'text-warning-400', bg: 'bg-warning-900/20' },
  review: { icon: AlertCircle, color: 'text-secondary-400', bg: 'bg-secondary-900/20' },
  done: { icon: CheckCircle2, color: 'text-success-400', bg: 'bg-success-900/20' },
};

const priorityColors = {
  low: 'text-dark-400',
  medium: 'text-warning-400',
  high: 'text-accent-400',
  critical: 'text-error-400',
};

export const TasksView: React.FC = () => {
  const { tasks, loading, createTask, updateTask, deleteTask, updateTaskStatus } = useTasks();
  const { repositories } = useRepositories();
  const { currentRepository, developers } = useAppStore();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showPRPreview, setShowPRPreview] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [generatedPR, setGeneratedPR] = useState<PRTemplate | null>(null);
  const [generatingPR, setGeneratingPR] = useState<string | null>(null);

  // Real-time optimistic updates
  const {
    data: realtimeTasks,
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
    confirmUpdate,
    revertUpdate,
    pendingUpdates,
  } = useOptimisticUpdates(tasks);

  // Real-time presence for collaboration
  const { users: onlineUsers, broadcast, onBroadcast } = usePresence(
    'tasks-board',
    {
      id: user?.id || 'anonymous',
      name: user?.user_metadata?.full_name || user?.email || 'Anonymous',
      avatar: user?.user_metadata?.avatar_url,
    },
    { enabled: !!user }
  );

  // Real-time task updates
  useRealtimeTable(
    'tasks',
    (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      switch (eventType) {
        case 'INSERT':
          if (newRecord) {
            const newTask = mapRowToTask(newRecord);
            confirmUpdate(newTask.id);
            
            // Show notification for tasks created by others
            if (newRecord.created_by !== user?.id) {
              toast.success(`New task created: ${newTask.title}`);
            }
          }
          break;
          
        case 'UPDATE':
          if (newRecord) {
            const updatedTask = mapRowToTask(newRecord);
            confirmUpdate(updatedTask.id);
            
            // Broadcast task status changes to other users
            if (oldRecord && newRecord.status !== oldRecord.status) {
              broadcast('task-status-changed', {
                taskId: updatedTask.id,
                oldStatus: oldRecord.status,
                newStatus: newRecord.status,
                updatedBy: user?.id,
              });
            }
          }
          break;
          
        case 'DELETE':
          if (oldRecord) {
            confirmUpdate(oldRecord.id);
            toast.info(`Task "${oldRecord.title}" was deleted`);
          }
          break;
      }
    },
    { enabled: !loading }
  );

  // Listen for real-time broadcasts
  useEffect(() => {
    onBroadcast('task-status-changed', (payload) => {
      if (payload.updatedBy !== user?.id) {
        toast.success(`Task status updated to ${payload.newStatus}`);
      }
    });

    onBroadcast('task-assignment-changed', (payload) => {
      if (payload.updatedBy !== user?.id) {
        toast.info(`Task assignment changed`);
      }
    });
  }, [onBroadcast, user?.id]);

  // Helper function to map database row to Task type
  const mapRowToTask = (row: any): Task => {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      estimatedEffort: row.estimated_effort,
      actualEffort: row.actual_effort,
      assignee: row.assigned_developer ? {
        id: row.assigned_developer.id,
        name: row.assigned_developer.name,
        email: row.assigned_developer.email,
        avatar: row.assigned_developer.avatar_url || '',
        profile: {
          velocity: 0,
          strengths: [],
          preferredTasks: [],
          commitFrequency: 0,
          codeQuality: 5,
          collaboration: 5,
        },
      } : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  };

  const filteredTasks = realtimeTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAssigneeName = (task: Task) => {
    if (!task.assignee) return 'Unassigned';
    return task.assignee.name || 'Unknown';
  };

  const handleGeneratePR = async (task: Task) => {
    if (!currentRepository) {
      toast.error('Please select a repository first');
      return;
    }

    setGeneratingPR(task.id);

    try {
      const prResponse = await prGenerator.generatePRTemplate({
        task,
        repository: currentRepository,
        includeScaffolds: true,
      });

      setSelectedTask(task);
      setGeneratedPR(prResponse.template);
      setShowPRPreview(true);
      toast.success('PR template generated successfully!');
    } catch (error) {
      console.error('PR generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate PR template');
    } finally {
      setGeneratingPR(null);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Optimistic update
      optimisticUpdate(taskId, { status: newStatus });
      
      // Broadcast the change
      broadcast('task-status-changed', {
        taskId,
        newStatus,
        updatedBy: user?.id,
      });

      // Update in database
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      // Revert optimistic update on error
      revertUpdate(taskId);
      console.error('Failed to update task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        // Optimistic update
        optimisticRemove(taskId);
        
        // Delete from database
        await deleteTask(taskId);
      } catch (error) {
        // Revert optimistic update on error
        revertUpdate(taskId);
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskFormSubmit = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingTask) {
        // Optimistic update
        optimisticUpdate(editingTask.id, taskData);
        
        // Update in database
        await updateTask(editingTask.id, taskData);
      } else {
        // Create new task with optimistic update
        const tempId = `temp-${Date.now()}`;
        const newTask: Task = {
          ...taskData,
          id: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        optimisticAdd(newTask);
        
        // Create in database
        await createTask(taskData);
      }
      
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    }
  };

  const tasksByStatus = Object.keys(statusConfig).reduce((acc, status) => {
    acc[status as TaskStatus] = filteredTasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-dark-400">Manage and track development tasks</p>
        </div>
        <div className="flex items-center space-x-3">
          <PresenceIndicator users={onlineUsers} showNames />
          <RealtimeIndicator />
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus size={16} className="mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Repository Info */}
      {currentRepository && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <GitBranch size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{currentRepository.name}</h3>
                  <p className="text-sm text-dark-400">Connected repository for PR generation</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-dark-400">
                  {currentRepository.language} • {currentRepository.stars} stars
                </div>
                {onlineUsers.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-dark-400">
                    <Users size={14} />
                    <span>{onlineUsers.length} online</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
          className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <Button variant="ghost">
          <Filter size={16} className="mr-2" />
          More Filters
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
          const config = statusConfig[status as TaskStatus];
          const Icon = config.icon;

          return (
            <div key={status} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon size={16} className={config.color} />
                  <h3 className="font-medium text-white capitalize">
                    {status.replace('-', ' ')}
                  </h3>
                </div>
                <span className="text-sm text-dark-400">
                  {statusTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {statusTasks.map((task) => {
                  const isPending = pendingUpdates.has(task.id);
                  
                  return (
                    <Card 
                      key={task.id} 
                      hover 
                      className={`cursor-pointer group transition-all duration-200 ${
                        isPending ? 'opacity-70 ring-2 ring-primary-500' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-white text-sm leading-5">
                              {task.title}
                              {isPending && (
                                <span className="ml-2 text-xs text-primary-400">
                                  Updating...
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGeneratePR(task)}
                                disabled={!currentRepository || generatingPR === task.id}
                                className="p-1"
                                title="Generate PR Template"
                              >
                                {generatingPR === task.id ? (
                                  <div className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <GitBranch size={12} />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTask(task)}
                                className="p-1"
                                title="Edit Task"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-error-400 hover:text-error-300"
                                title="Delete Task"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-dark-400 line-clamp-2">
                            {task.description}
                          </p>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-1 text-dark-500">
                              <Clock size={12} />
                              <span>{task.estimatedEffort}h</span>
                            </div>
                            <div className="flex items-center space-x-1 text-dark-500">
                              <User size={12} />
                              <span>{getAssigneeName(task)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                task.type === 'feature'
                                  ? 'bg-primary-900/20 text-primary-400'
                                  : task.type === 'bug'
                                  ? 'bg-error-900/20 text-error-400'
                                  : task.type === 'refactor'
                                  ? 'bg-secondary-900/20 text-secondary-400'
                                  : 'bg-dark-700 text-dark-300'
                              }`}
                            >
                              {task.type}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs font-medium ${priorityColors[task.priority]}`}
                              >
                                {task.priority}
                              </span>
                              <span className="text-xs text-dark-500">
                                {new Date(task.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Status Change Buttons */}
                          <div className="flex items-center space-x-1">
                            {Object.keys(statusConfig).map((newStatus) => {
                              if (newStatus === status) return null;
                              return (
                                <Button
                                  key={newStatus}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTaskStatusChange(task.id, newStatus as TaskStatus)}
                                  className="text-xs px-2 py-1 h-6"
                                  disabled={isPending}
                                >
                                  → {newStatus.replace('-', ' ')}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {statusTasks.length === 0 && (
                  <div className="p-4 border-2 border-dashed border-dark-700 rounded-lg text-center">
                    <p className="text-sm text-dark-500">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Form Modal */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        task={editingTask}
        developers={developers}
      />

      {/* PR Preview Modal */}
      {showPRPreview && selectedTask && generatedPR && currentRepository && (
        <PRPreview
          isOpen={showPRPreview}
          onClose={() => {
            setShowPRPreview(false);
            setSelectedTask(null);
            setGeneratedPR(null);
          }}
          template={generatedPR}
          task={selectedTask}
          repository={currentRepository}
        />
      )}
    </div>
  );
};