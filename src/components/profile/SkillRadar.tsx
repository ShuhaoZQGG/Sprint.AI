import React from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Developer } from '../../types';

interface SkillRadarProps {
  developer: Developer;
  skillData: {
    skill: string;
    current: number;
    target: number;
    growth: number;
  }[];
  className?: string;
}

export const SkillRadar: React.FC<SkillRadarProps> = ({
  developer,
  skillData,
  className = '',
}) => {
  const maxValue = 10;
  const center = 120;
  const radius = 100;

  // Calculate points for radar chart
  const calculatePoint = (value: number, index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const distance = (value / maxValue) * radius;
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle),
    };
  };

  const createPath = (values: number[]) => {
    const points = values.map((value, index) => 
      calculatePoint(value, index, values.length)
    );
    
    return points.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '') + ' Z';
  };

  const currentValues = skillData.map(skill => skill.current);
  const targetValues = skillData.map(skill => skill.target);

  return (
    <Card className={className}>
      <CardHeader>
        <h4 className="text-lg font-semibold text-white">Skill Radar</h4>
        <p className="text-sm text-dark-400">Current vs Target Skills</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
          {/* Radar Chart */}
          <div className="relative">
            <svg width="240" height="240" className="overflow-visible">
              {/* Grid circles */}
              {[2, 4, 6, 8, 10].map(value => (
                <circle
                  key={value}
                  cx={center}
                  cy={center}
                  r={(value / maxValue) * radius}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
              
              {/* Grid lines */}
              {skillData.map((_, index) => {
                const angle = (index * 2 * Math.PI) / skillData.length - Math.PI / 2;
                const endX = center + radius * Math.cos(angle);
                const endY = center + radius * Math.sin(angle);
                
                return (
                  <line
                    key={index}
                    x1={center}
                    y1={center}
                    x2={endX}
                    y2={endY}
                    stroke="#374151"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                );
              })}
              
              {/* Target area */}
              <path
                d={createPath(targetValues)}
                fill="#3B82F6"
                fillOpacity="0.1"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              
              {/* Current area */}
              <path
                d={createPath(currentValues)}
                fill="#10B981"
                fillOpacity="0.2"
                stroke="#10B981"
                strokeWidth="2"
              />
              
              {/* Skill labels */}
              {skillData.map((skill, index) => {
                const angle = (index * 2 * Math.PI) / skillData.length - Math.PI / 2;
                const labelDistance = radius + 20;
                const labelX = center + labelDistance * Math.cos(angle);
                const labelY = center + labelDistance * Math.sin(angle);
                
                return (
                  <text
                    key={skill.skill}
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-white font-medium"
                  >
                    {skill.skill}
                  </text>
                );
              })}
              
              {/* Value labels */}
              {[2, 4, 6, 8, 10].map(value => (
                <text
                  key={value}
                  x={center + 5}
                  y={center - (value / maxValue) * radius}
                  className="text-xs fill-dark-400"
                  textAnchor="start"
                >
                  {value}
                </text>
              ))}
            </svg>
          </div>

          {/* Legend and Details */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                <span className="text-white">Current Level</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-primary-500 border-dashed rounded-full"></div>
                <span className="text-white">Target Level</span>
              </div>
            </div>

            {/* Skill Details */}
            <div className="space-y-3">
              {skillData.map((skill) => (
                <div key={skill.skill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{skill.skill}</span>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-success-400">{skill.current}/10</span>
                      <span className="text-dark-500">→</span>
                      <span className="text-primary-400">{skill.target}/10</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-dark-700 rounded-full h-2">
                      <div
                        className="bg-success-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(skill.current / maxValue) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      {skill.growth > 0 ? (
                        <span className="text-xs text-success-400">+{skill.growth.toFixed(1)}</span>
                      ) : skill.growth < 0 ? (
                        <span className="text-xs text-error-400">{skill.growth.toFixed(1)}</span>
                      ) : (
                        <span className="text-xs text-dark-400">0.0</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Growth Summary */}
            <div className="p-3 bg-dark-700 rounded-lg">
              <h5 className="text-sm font-medium text-white mb-2">Growth Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-dark-400">Improving Skills:</span>
                  <span className="text-success-400 ml-1">
                    {skillData.filter(s => s.growth > 0).length}
                  </span>
                </div>
                <div>
                  <span className="text-dark-400">Target Gap:</span>
                  <span className="text-warning-400 ml-1">
                    {skillData.reduce((sum, s) => sum + Math.max(0, s.target - s.current), 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};