import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Star, 
  GitCommit, 
  Award, 
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useDevelopers } from '../../hooks/useDevelopers';
import { Developer } from '../../types';

interface PerformanceChartProps {
  isOpen: boolean;
  onClose: () => void;
  developer: Developer;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  isOpen,
  onClose,
  developer,
}) => {
  const { getPerformanceHistory } = useDevelopers();
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const data = await getPerformanceHistory(developer.id, 6);
        setPerformanceData(data);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && developer.id) {
      fetchPerformanceData();
    }
  }, [isOpen, developer.id, getPerformanceHistory]);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'velocity': return TrendingUp;
      case 'quality': return Star;
      case 'collaboration': return Award;
      case 'commits': return GitCommit;
      default: return Activity;
    }
  };

  const getMetricColor = (trend: number) => {
    if (trend > 5) return 'text-success-400';
    if (trend < -5) return 'text-error-400';
    return 'text-warning-400';
  };

  const metrics = [
    {
      key: 'velocity',
      label: 'Velocity',
      current: developer.profile.velocity,
      previous: performanceData[1]?.velocity || developer.profile.velocity,
      unit: 'pts',
    },
    {
      key: 'quality',
      label: 'Code Quality',
      current: developer.profile.codeQuality,
      previous: performanceData[1]?.code_quality_score || developer.profile.codeQuality,
      unit: '/10',
    },
    {
      key: 'collaboration',
      label: 'Collaboration',
      current: developer.profile.collaboration,
      previous: performanceData[1]?.collaboration_score || developer.profile.collaboration,
      unit: '/10',
    },
    {
      key: 'commits',
      label: 'Commits/Week',
      current: developer.profile.commitFrequency,
      previous: performanceData[1]?.commit_frequency || developer.profile.commitFrequency,
      unit: '/wk',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${developer.name} - Performance Analytics`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Developer Summary */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <img
                src={developer.avatar || `https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=150`}
                alt={developer.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">{developer.name}</h3>
                <p className="text-dark-400">{developer.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex flex-wrap gap-1">
                    {developer.profile.strengths.slice(0, 3).map(strength => (
                      <span
                        key={strength}
                        className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full"
                      >
                        {strength}
                      </span>
                    ))}
                    {developer.profile.strengths.length > 3 && (
                      <span className="px-2 py-1 bg-dark-600 text-dark-300 text-xs rounded-full">
                        +{developer.profile.strengths.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = getMetricIcon(metric.key);
            const trend = calculateTrend(metric.current, metric.previous);
            const trendColor = getMetricColor(trend);

            return (
              <Card key={metric.key}>
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon size={20} className="text-primary-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {metric.current}{metric.unit}
                  </div>
                  <div className="text-sm text-dark-400 mb-2">{metric.label}</div>
                  <div className={`text-xs font-medium ${trendColor}`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Performance History */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 size={20} className="text-primary-400" />
              <h4 className="text-lg font-semibold text-white">Recent Sprint Performance</h4>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : performanceData.length > 0 ? (
              <div className="space-y-4">
                {performanceData.slice(0, 5).map((sprint, index) => (
                  <div key={sprint.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="font-medium text-white">
                          {sprint.sprint?.name || `Sprint ${index + 1}`}
                        </h5>
                        <div className="flex items-center space-x-1 text-xs text-dark-400">
                          <Calendar size={12} />
                          <span>
                            {sprint.sprint?.start_date 
                              ? new Date(sprint.sprint.start_date).toLocaleDateString()
                              : 'Recent'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium text-white">{sprint.tasks_completed}</div>
                        <div className="text-xs text-dark-400">Tasks</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{sprint.story_points_completed}</div>
                        <div className="text-xs text-dark-400">Points</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{sprint.hours_logged}h</div>
                        <div className="text-xs text-dark-400">Hours</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{sprint.velocity}</div>
                        <div className="text-xs text-dark-400">Velocity</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                <h5 className="text-lg font-medium text-white mb-2">No Performance Data</h5>
                <p className="text-dark-400">
                  Performance metrics will appear here after completing sprints
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills Breakdown */}
        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-white">Skills & Expertise</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium text-dark-300 mb-3">Technical Strengths</h5>
                <div className="space-y-2">
                  {developer.profile.strengths.map((strength, index) => (
                    <div key={strength} className="flex items-center justify-between">
                      <span className="text-white">{strength}</span>
                      <div className="w-24 bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${Math.max(60, 100 - index * 10)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-sm font-medium text-dark-300 mb-3">Preferred Task Types</h5>
                <div className="space-y-2">
                  {developer.profile.preferredTasks.map((taskType, index) => (
                    <div key={taskType} className="flex items-center justify-between">
                      <span className="text-white capitalize">{taskType}</span>
                      <div className="w-24 bg-dark-700 rounded-full h-2">
                        <div
                          className="bg-secondary-500 h-2 rounded-full"
                          style={{ width: `${Math.max(50, 90 - index * 15)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
};