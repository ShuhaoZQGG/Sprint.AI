import React from 'react';
import { 
  User, 
  TrendingUp, 
  Star, 
  GitCommit,
  Award,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useAppStore } from '../../stores/useAppStore';

export const ProfileView: React.FC = () => {
  const { developers } = useAppStore();

  const getSkillColor = (skill: string) => {
    const colors = {
      'Frontend': 'bg-primary-500',
      'Backend': 'bg-secondary-500',
      'React': 'bg-accent-500',
      'TypeScript': 'bg-primary-400',
      'Python': 'bg-success-500',
      'DevOps': 'bg-warning-500',
      'Testing': 'bg-error-500',
      'QA': 'bg-error-400',
      'Documentation': 'bg-dark-500',
    };
    return colors[skill as keyof typeof colors] || 'bg-dark-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Team Profile</h1>
        <p className="text-dark-400">Developer velocity, strengths, and intelligent task assignment</p>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{developers.length}</div>
            <div className="text-dark-400">Team Members</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {developers.reduce((acc, dev) => acc + dev.profile.velocity, 0)}pts
            </div>
            <div className="text-dark-400">Total Velocity</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-warning-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <GitCommit className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {developers.reduce((acc, dev) => acc + dev.profile.commitFrequency, 0)}
            </div>
            <div className="text-dark-400">Commits/Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Developer Profiles */}
      <div className="space-y-4">
        {developers.map((developer) => (
          <Card key={developer.id}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-center space-x-4">
                  <img
                    src={developer.avatar}
                    alt={developer.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{developer.name}</h3>
                    <p className="text-dark-400">{developer.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Target size={16} className="text-primary-400" />
                      <span className="text-sm text-dark-400">Velocity</span>
                    </div>
                    <div className="text-xl font-bold text-white">{developer.profile.velocity}pts</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Star size={16} className="text-warning-400" />
                      <span className="text-sm text-dark-400">Quality</span>
                    </div>
                    <div className="text-xl font-bold text-white">{developer.profile.codeQuality}/10</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Award size={16} className="text-secondary-400" />
                      <span className="text-sm text-dark-400">Collaboration</span>
                    </div>
                    <div className="text-xl font-bold text-white">{developer.profile.collaboration}/10</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <GitCommit size={16} className="text-accent-400" />
                      <span className="text-sm text-dark-400">Commits</span>
                    </div>
                    <div className="text-xl font-bold text-white">{developer.profile.commitFrequency}/wk</div>
                  </div>
                </div>
              </div>

              {/* Skills and Strengths */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-3">Strengths</h4>
                  <div className="flex flex-wrap gap-2">
                    {developer.profile.strengths.map((strength) => (
                      <span
                        key={strength}
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getSkillColor(strength)}`}
                      >
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-3">Preferred Tasks</h4>
                  <div className="flex flex-wrap gap-2">
                    {developer.profile.preferredTasks.map((taskType) => (
                      <span
                        key={taskType}
                        className="px-3 py-1 bg-dark-700 text-dark-300 rounded-full text-xs font-medium border border-dark-600"
                      >
                        {taskType}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Chart Placeholder */}
              <div className="mt-6 p-4 bg-dark-700 rounded-lg">
                <h4 className="text-sm font-medium text-dark-300 mb-3">Recent Performance</h4>
                <div className="h-20 bg-dark-800 rounded flex items-center justify-center">
                  <span className="text-dark-500 text-sm">Performance chart would go here</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};