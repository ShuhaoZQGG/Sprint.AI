import React from 'react';
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Clock,
  GitBranch,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useAppStore } from '../../stores/useAppStore';
import { useRepositories } from '../../hooks/useRepositories';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useTasks } from '../../hooks/useTasks';

const stats = [
  {
    title: 'Active Tasks',
    value: '24',
    change: '+12%',
    changeType: 'positive' as const,
    icon: CheckSquare,
  },
  {
    title: 'Team Velocity',
    value: '32pts',
    change: '+8%',
    changeType: 'positive' as const,
    icon: TrendingUp,
  },
  {
    title: 'Sprint Progress',
    value: '68%',
    change: 'On track',
    changeType: 'neutral' as const,
    icon: Clock,
  },
  {
    title: 'Active PRs',
    value: '7',
    change: '+3 today',
    changeType: 'positive' as const,
    icon: GitBranch,
  },
];

export const DashboardView: React.FC = () => {
  const { repositories } = useRepositories();
  const { developers } = useDevelopers();
  const { tasks } = useTasks();

  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const totalTasks = tasks.length;
  const totalVelocity = developers.reduce((acc, dev) => acc + dev.profile.velocity, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to Sprint.AI</h1>
            <p className="text-primary-100">
              Your AI-native development platform is ready. Let's build something amazing.
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Active Tasks</p>
                <p className="text-2xl font-bold text-white">{totalTasks}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-success-400">
                    {inProgressTasks} in progress
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                <CheckSquare size={20} className="text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Team Velocity</p>
                <p className="text-2xl font-bold text-white">{totalVelocity}pts</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-success-400">
                    {developers.length} developers
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Sprint Progress</p>
                <p className="text-2xl font-bold text-white">
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-success-400">On track</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Repositories</p>
                <p className="text-2xl font-bold text-white">{repositories.length}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-success-400">Connected</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                <GitBranch size={20} className="text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Repositories */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Recent Repositories</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {repositories.slice(0, 3).map((repo) => (
                <div key={repo.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">{repo.name}</h4>
                    <p className="text-sm text-dark-400">{repo.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs text-dark-500">{repo.language}</span>
                      <span className="text-xs text-dark-500">⭐ {repo.stars}</span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-success-400 rounded-full"></div>
                </div>
              ))}
              {repositories.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-dark-400">No repositories connected yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Team Overview</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {developers.slice(0, 3).map((dev) => (
                <div key={dev.id} className="flex items-center space-x-3">
                  <img
                    src={dev.avatar || `https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150`}
                    alt={dev.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{dev.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-dark-400">
                        Velocity: {dev.profile.velocity}pts
                      </span>
                      <span className="text-sm text-dark-500">•</span>
                      <span className="text-sm text-primary-400">
                        {dev.profile.strengths[0] || 'Developer'}
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-success-400 rounded-full"></div>
                </div>
              ))}
              {developers.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-dark-400">No team members added yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Sprint Progress</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success-400 mb-2">
                {completedTasks}
              </div>
              <p className="text-dark-400">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-warning-400 mb-2">
                {inProgressTasks}
              </div>
              <p className="text-dark-400">In Progress</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-400 mb-2">
                {totalTasks}
              </div>
              <p className="text-dark-400">Total Tasks</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-dark-400">Overall Progress</span>
              <span className="text-sm text-white">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};