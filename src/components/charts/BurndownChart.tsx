import React, { useMemo } from 'react';
import { TrendingDown, Calendar, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';

export interface BurndownDataPoint {
  date: Date;
  remaining: number;
  ideal: number;
  completed: number;
}

interface BurndownChartProps {
  data: BurndownDataPoint[];
  sprintStartDate: Date;
  sprintEndDate: Date;
  totalCapacity: number;
  className?: string;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({
  data,
  sprintStartDate,
  sprintEndDate,
  totalCapacity,
  className = '',
}) => {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], maxValue: 100, currentTrend: 'on-track' as const };

    const maxValue = Math.max(totalCapacity, ...data.map(d => Math.max(d.remaining, d.ideal)));
    const latest = data[data.length - 1];
    const ideal = latest.ideal;
    const actual = latest.remaining;
    
    let currentTrend: 'ahead' | 'on-track' | 'behind';
    if (actual < ideal * 0.9) currentTrend = 'ahead';
    else if (actual > ideal * 1.1) currentTrend = 'behind';
    else currentTrend = 'on-track';

    return { points: data, maxValue, currentTrend };
  }, [data, totalCapacity]);

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'ahead': return 'text-success-400';
      case 'behind': return 'text-error-400';
      default: return 'text-primary-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'ahead': return <TrendingDown className="text-success-400" size={16} />;
      case 'behind': return <AlertTriangle className="text-error-400" size={16} />;
      default: return <Target className="text-primary-400" size={16} />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateProgress = () => {
    if (chartData.points.length === 0) return 0;
    const latest = chartData.points[chartData.points.length - 1];
    return Math.round(((totalCapacity - latest.remaining) / totalCapacity) * 100);
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const end = new Date(sprintEndDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Sprint Burndown</h3>
          <div className="flex items-center space-x-2">
            {getTrendIcon(chartData.currentTrend)}
            <span className={`text-sm font-medium ${getTrendColor(chartData.currentTrend)}`}>
              {chartData.currentTrend === 'ahead' && 'Ahead of Schedule'}
              {chartData.currentTrend === 'behind' && 'Behind Schedule'}
              {chartData.currentTrend === 'on-track' && 'On Track'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{calculateProgress()}%</div>
              <div className="text-sm text-dark-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{getDaysRemaining()}</div>
              <div className="text-sm text-dark-400">Days Left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {chartData.points.length > 0 ? chartData.points[chartData.points.length - 1].remaining : totalCapacity}
              </div>
              <div className="text-sm text-dark-400">Remaining</div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="relative h-64 bg-dark-700 rounded-lg p-4">
            {chartData.points.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-dark-400 mx-auto mb-2" />
                  <p className="text-dark-400">No burndown data available</p>
                  <p className="text-sm text-dark-500">Data will appear as the sprint progresses</p>
                </div>
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 400 200">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(percent => (
                  <line
                    key={percent}
                    x1="40"
                    y1={160 - (percent * 1.2)}
                    x2="380"
                    y2={160 - (percent * 1.2)}
                    stroke="#374151"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Y-axis labels */}
                {[0, 25, 50, 75, 100].map(percent => (
                  <text
                    key={percent}
                    x="30"
                    y={165 - (percent * 1.2)}
                    fill="#9CA3AF"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {Math.round((percent / 100) * chartData.maxValue)}
                  </text>
                ))}

                {/* Ideal line */}
                <polyline
                  points={chartData.points.map((point, index) => {
                    const x = 40 + (index * (340 / (chartData.points.length - 1)));
                    const y = 160 - ((point.ideal / chartData.maxValue) * 120);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />

                {/* Actual line */}
                <polyline
                  points={chartData.points.map((point, index) => {
                    const x = 40 + (index * (340 / (chartData.points.length - 1)));
                    const y = 160 - ((point.remaining / chartData.maxValue) * 120);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3"
                />

                {/* Data points */}
                {chartData.points.map((point, index) => {
                  const x = 40 + (index * (340 / (chartData.points.length - 1)));
                  const y = 160 - ((point.remaining / chartData.maxValue) * 120);
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#3B82F6"
                      stroke="#1E293B"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* X-axis labels */}
                {chartData.points.filter((_, index) => index % Math.ceil(chartData.points.length / 5) === 0).map((point, index) => {
                  const originalIndex = chartData.points.findIndex(p => p === point);
                  const x = 40 + (originalIndex * (340 / (chartData.points.length - 1)));
                  return (
                    <text
                      key={index}
                      x={x}
                      y="185"
                      fill="#9CA3AF"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {formatDate(point.date)}
                    </text>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-primary-500"></div>
              <span className="text-sm text-dark-300">Actual</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-0.5 bg-dark-500 border-dashed border-t"></div>
              <span className="text-sm text-dark-300">Ideal</span>
            </div>
          </div>

          {/* Sprint Timeline */}
          <div className="flex items-center justify-between text-sm text-dark-400 pt-4 border-t border-dark-700">
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>Started: {formatDate(sprintStartDate)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>Ends: {formatDate(sprintEndDate)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};