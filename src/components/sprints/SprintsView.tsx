import React from 'react';
import { 
  Calendar, 
  Play, 
  Pause, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/useAppStore';

const mockSprints = [
  {
    id: '1',
    name: 'Sprint 1 - Foundation',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-01-29'),
    status: 'active' as const,
    progress: 68,
    totalTasks: 12,
    completedTasks: 8,
    totalPoints: 42,
    completedPoints: 28,
  },
  {
    id: '2',
    name: 'Sprint 2 - Core Features',
    startDate: new Date('2024-01-30'),
    endDate: new Date('2024-02-13'),
    status: 'planning' as const,
    progress: 0,
    totalTasks: 15,
    completedTasks: 0,
    totalPoints: 58,
    completedPoints: 0,
  },
  {
    id: '3',
    name: 'Sprint 3 - Integration',
    startDate: new Date('2024-02-14'),
    endDate: new Date('2024-02-28'),
    status: 'planning' as const,
    progress: 0,
    totalTasks: 10,
    completedTasks: 0,
    totalPoints: 38,
    completedPoints: 0,
  },
];

const statusConfig = {
  planning: { color: 'text-dark-400', bg: 'bg-dark-700', icon: Calendar },
  active: { color: 'text-success-400', bg: 'bg-success-900/20', icon: Play },
  completed: { color: 'text-primary-400', bg: 'bg-primary-900/20', icon: CheckCircle },
};

export const SprintsView: React.FC = () => {
  const { developers } = useAppStore();

  const totalCapacity = developers.reduce((acc, dev) => acc + dev.profile.velocity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Sprint Planning</h1>
          <p className="text-dark-400">Autonomous sprint planning with AI-powered task distribution</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost">
            <TrendingUp size={16} className="mr-2" />
            Analytics
          </Button>
          <Button>
            <Plus size={16} className="mr-2" />
            New Sprint
          </Button>
        </div>
      </div>

      {/* Sprint Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">3</div>
            <div className="text-dark-400">Active Sprints</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{totalCapacity}pts</div>
            <div className="text-dark-400">Team Capacity</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-warning-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">68%</div>
            <div className="text-dark-400">Sprint Progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-success-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">92%</div>
            <div className="text-dark-400">Velocity Match</div>
          </CardContent>
        </Card>
      </div>

      {/* Sprint Cards */}
      <div className="space-y-4">
        {mockSprints.map((sprint) => {
          const config = statusConfig[sprint.status];
          const Icon = config.icon;
          const daysRemaining = Math.ceil((sprint.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

          return (
            <Card key={sprint.id} hover>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <Icon size={20} className={config.color} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{sprint.name}</h3>
                      <p className="text-sm text-dark-400">
                        {sprint.startDate.toLocaleDateString()} - {sprint.endDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      {sprint.status}
                    </div>
                    {sprint.status === 'active' && (
                      <p className="text-sm text-dark-400 mt-1">
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Progress */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-400">Tasks</span>
                        <span className="text-white">{sprint.completedTasks}/{sprint.totalTasks}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(sprint.completedTasks / sprint.totalTasks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Story Points */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Story Points</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-400">Completed</span>
                        <span className="text-white">{sprint.completedPoints}/{sprint.totalPoints}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-secondary-500 to-accent-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(sprint.completedPoints / sprint.totalPoints) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Assignment */}
                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-2">Team</h4>
                    <div className="flex -space-x-2">
                      {developers.slice(0, 3).map((dev, index) => (
                        <img
                          key={dev.id}
                          src={dev.avatar}
                          alt={dev.name}
                          className="w-8 h-8 rounded-full border-2 border-dark-800 object-cover"
                          title={dev.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2">
                    {sprint.status === 'active' && (
                      <Button variant="ghost" size="sm">
                        <Pause size={14} className="mr-1" />
                        Pause
                      </Button>
                    )}
                    {sprint.status === 'planning' && (
                      <Button size="sm">
                        <Play size={14} className="mr-1" />
                        Start
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Burndown Chart Placeholder */}
                {sprint.status === 'active' && (
                  <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                    <h4 className="text-sm font-medium text-dark-300 mb-3">Burndown Chart</h4>
                    <div className="h-32 bg-dark-800 rounded flex items-center justify-center">
                      <span className="text-dark-500 text-sm">Burndown chart visualization</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};