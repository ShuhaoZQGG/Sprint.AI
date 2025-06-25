import React, { useState } from 'react';
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
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PRPreview } from './PRPreview';
import { useAppStore } from '../../stores/useAppStore';
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
  const { tasks, developers, repositories, currentRepository } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showPRPreview, setShowPRPreview] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [generatedPR, setGeneratedPR] = useState<PRTemplate | null>(null);
  const [generatingPR, setGeneratingPR] = useState<string | null>(null);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAssigneeName = (task: Task) => {
    if (!task.assignee) return 'Unassigned';
    const developer = developers.find(dev => dev.id === task.assignee?.id);
    return developer?.name || 'Unknown';
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

  const tasksByStatus = Object.keys(statusConfig).reduce((acc, status) => {
    acc[status as TaskStatus] = filteredTasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-dark-400">Manage and track development tasks</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          New Task
        </Button>
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
              <div className="text-sm text-dark-400">
                {currentRepository.language} • {currentRepository.stars} stars
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
                {statusTasks.map((task) => (
                  <Card key={task.id} hover className="cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-white text-sm leading-5">
                            {task.title}
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
                            <Button variant="ghost" size="sm" className="p-1">
                              <MoreHorizontal size={12} />
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
                      </div>
                    </CardContent>
                  </Card>
                ))}

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