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
  PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAppStore } from '../../stores/useAppStore';
import { Task, TaskStatus } from '../../types';

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
  const { tasks, developers } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');

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
                  <Card key={task.id} hover className="cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-white text-sm leading-5">
                            {task.title}
                          </h4>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${priorityColors[task.priority]} bg-current bg-opacity-10`}
                          >
                            {task.priority}
                          </span>
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
                          <span className="text-xs text-dark-500">
                            {new Date(task.updatedAt).toLocaleDateString()}
                          </span>
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
    </div>
  );
};