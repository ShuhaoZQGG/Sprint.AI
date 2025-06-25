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
  const { developers, tasks } = useAppStore();
  const { repositories } = useRepositories();

  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const totalTasks = tasks.length;

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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-dark-400 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {stat.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm ${
                          stat.changeType === 'positive'
                            ? 'text-success-400'
                            : stat.changeType === 'negative'
                            ? 'text-error-400'
                            : 'text-dark-400'
                        }`}
                      >
                        {stat.change}
                      </span>
                      {stat.changeType === 'positive' && (
                        <ArrowUpRight size={14} className="ml-1 text-success-400" />
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-dark-700 rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-primary-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                    src={dev.avatar}
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
                        {dev.profile.strengths[0]}
                      </span>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-success-400 rounded-full"></div>
                </div>
              ))}
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
                {Math.round((completedTasks / totalTasks) * 100)}%
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};