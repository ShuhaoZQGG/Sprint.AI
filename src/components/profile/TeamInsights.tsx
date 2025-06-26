import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Zap,
  Brain,
  Shield,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { teamOptimizer, TeamOptimizationAnalysis, TeamHealthMetrics } from '../../services/teamOptimizer';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useTasks } from '../../hooks/useTasks';

interface TeamInsightsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamInsights: React.FC<TeamInsightsProps> = ({
  isOpen,
  onClose,
}) => {
  const { developers } = useDevelopers();
  const { tasks } = useTasks();
  const [analysis, setAnalysis] = useState<TeamOptimizationAnalysis | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<TeamHealthMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'collaboration' | 'performance'>('overview');

  useEffect(() => {
    if (isOpen && developers.length > 0) {
      analyzeTeam();
    }
  }, [isOpen, developers, tasks]);

  const analyzeTeam = async () => {
    setLoading(true);
    try {
      const projectRequirements = [
        'Frontend', 'Backend', 'React', 'TypeScript', 'Node.js', 
        'Testing', 'DevOps', 'Database', 'API Design'
      ];

      const [teamAnalysis, teamHealth] = await Promise.all([
        teamOptimizer.analyzeTeam(developers, tasks, projectRequirements),
        teamOptimizer.calculateTeamHealth(developers, []),
      ]);

      setAnalysis(teamAnalysis);
      setHealthMetrics(teamHealth);
    } catch (error) {
      console.error('Error analyzing team:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-success-400';
    if (score >= 60) return 'text-warning-400';
    return 'text-error-400';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-success-500';
    if (score >= 60) return 'bg-warning-500';
    return 'bg-error-500';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Team Health Overview */}
      {healthMetrics && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold text-white flex items-center">
              <Shield size={20} className="mr-2 text-primary-400" />
              Team Health Score
            </h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${getHealthColor(healthMetrics.overallHealth)}`}>
                  {Math.round(healthMetrics.overallHealth)}
                </div>
                <div className="text-sm text-dark-400">Overall Health</div>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getHealthBgColor(healthMetrics.overallHealth)}`}
                    style={{ width: `${healthMetrics.overallHealth}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${getHealthColor(healthMetrics.skillCoverage)}`}>
                  {Math.round(healthMetrics.skillCoverage)}
                </div>
                <div className="text-sm text-dark-400">Skill Coverage</div>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getHealthBgColor(healthMetrics.skillCoverage)}`}
                    style={{ width: `${healthMetrics.skillCoverage}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${getHealthColor(healthMetrics.workloadBalance)}`}>
                  {Math.round(healthMetrics.workloadBalance)}
                </div>
                <div className="text-sm text-dark-400">Workload Balance</div>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getHealthBgColor(healthMetrics.workloadBalance)}`}
                    style={{ width: `${healthMetrics.workloadBalance}%` }}
                  />
                </div>
              </div>

              <div className="text-center">
                <div className={`text-3xl font-bold mb-1 ${getHealthColor(healthMetrics.collaborationScore)}`}>
                  {Math.round(healthMetrics.collaborationScore)}
                </div>
                <div className="text-sm text-dark-400">Collaboration</div>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getHealthBgColor(healthMetrics.collaborationScore)}`}
                    style={{ width: `${healthMetrics.collaborationScore}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Composition */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white">Team Composition</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-dark-400">Total Members</span>
                    <span className="text-white font-medium">{analysis.teamComposition.totalMembers}</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-white mb-2">Experience Levels</h5>
                  <div className="space-y-2">
                    {Object.entries(analysis.teamComposition.experienceLevels).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-sm text-dark-400 capitalize">{level}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white">{count}</span>
                          <div className="w-16 bg-dark-700 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full"
                              style={{ width: `${(count / analysis.teamComposition.totalMembers) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white">Key Insights</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthMetrics?.strengths && healthMetrics.strengths.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-success-400 mb-2 flex items-center">
                      <CheckCircle size={14} className="mr-1" />
                      Strengths
                    </h5>
                    <ul className="space-y-1">
                      {healthMetrics.strengths.slice(0, 3).map((strength, index) => (
                        <li key={index} className="text-sm text-dark-300">• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {healthMetrics?.riskFactors && healthMetrics.riskFactors.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-warning-400 mb-2 flex items-center">
                      <AlertTriangle size={14} className="mr-1" />
                      Risk Factors
                    </h5>
                    <ul className="space-y-1">
                      {healthMetrics.riskFactors.slice(0, 3).map((risk, index) => (
                        <li key={index} className="text-sm text-dark-300">• {risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderSkillsTab = () => (
    <div className="space-y-6">
      {analysis && (
        <>
          {/* Skill Distribution */}
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white">Skill Distribution</h4>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analysis.teamComposition.skillDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 9)
                  .map(([skill, count]) => (
                    <div key={skill} className="text-center p-3 bg-dark-700 rounded-lg">
                      <div className="text-lg font-bold text-white">{count}</div>
                      <div className="text-sm text-dark-400">{skill}</div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-error-400" />
                  Critical Skill Gaps
                </h4>
              </CardHeader>
              <CardContent>
                {analysis.skillGaps.criticalGaps.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.skillGaps.criticalGaps.map((gap, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-error-900/20 rounded border border-error-500">
                        <span className="text-white">{gap}</span>
                        <span className="text-xs text-error-400 font-medium">CRITICAL</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-center py-4">No critical skill gaps identified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white flex items-center">
                  <TrendingUp size={20} className="mr-2 text-primary-400" />
                  Emerging Needs
                </h4>
              </CardHeader>
              <CardContent>
                {analysis.skillGaps.emergingNeeds.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.skillGaps.emergingNeeds.map((need, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-primary-900/20 rounded border border-primary-500">
                        <span className="text-white">{need}</span>
                        <span className="text-xs text-primary-400 font-medium">EMERGING</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-center py-4">No emerging needs identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white">Skill Development Recommendations</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.skillGaps.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-dark-700 rounded-lg">
                    <Target size={16} className="text-secondary-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  const renderCollaborationTab = () => (
    <div className="space-y-6">
      {analysis && (
        <>
          {/* Pair Programming Opportunities */}
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white flex items-center">
                <Users size={20} className="mr-2 text-secondary-400" />
                Pair Programming Opportunities
              </h4>
            </CardHeader>
            <CardContent>
              {analysis.collaborationInsights.pairProgrammingOpportunities.length > 0 ? (
                <div className="space-y-3">
                  {analysis.collaborationInsights.pairProgrammingOpportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-white font-medium">{opportunity.mentor}</div>
                        <ArrowRight size={16} className="text-dark-400" />
                        <div className="text-white">{opportunity.mentee}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-secondary-400">{opportunity.skill}</div>
                        <div className="text-xs text-dark-400">Benefit: {opportunity.benefit.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-4">No pair programming opportunities identified</p>
              )}
            </CardContent>
          </Card>

          {/* Communication Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Connectors</h4>
                <p className="text-xs text-dark-400">High collaboration</p>
              </CardHeader>
              <CardContent>
                {analysis.collaborationInsights.communicationPatterns.connectors.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.collaborationInsights.communicationPatterns.connectors.map((name, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle size={14} className="text-success-400" />
                        <span className="text-white text-sm">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-xs">None identified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Isolated</h4>
                <p className="text-xs text-dark-400">Low collaboration</p>
              </CardHeader>
              <CardContent>
                {analysis.collaborationInsights.communicationPatterns.isolated.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.collaborationInsights.communicationPatterns.isolated.map((name, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <AlertTriangle size={14} className="text-warning-400" />
                        <span className="text-white text-sm">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-xs">None identified</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Bottlenecks</h4>
                <p className="text-xs text-dark-400">High skills, low sharing</p>
              </CardHeader>
              <CardContent>
                {analysis.collaborationInsights.communicationPatterns.bottlenecks.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.collaborationInsights.communicationPatterns.bottlenecks.map((name, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <AlertTriangle size={14} className="text-error-400" />
                        <span className="text-white text-sm">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-400 text-xs">None identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Sharing Needs */}
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white flex items-center">
                <Brain size={20} className="mr-2 text-warning-400" />
                Knowledge Sharing Needs
              </h4>
            </CardHeader>
            <CardContent>
              {analysis.collaborationInsights.knowledgeSharingNeeds.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {analysis.collaborationInsights.knowledgeSharingNeeds.map((skill, index) => (
                    <div key={index} className="p-2 bg-warning-900/20 rounded border border-warning-500 text-center">
                      <span className="text-warning-400 text-sm font-medium">{skill}</span>
                      <div className="text-xs text-dark-400 mt-1">Single expert</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-4">Good knowledge distribution across the team</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {analysis && (
        <>
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Underutilized</h4>
                <p className="text-xs text-dark-400">Available capacity</p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary-400 mb-2">
                  {analysis.performanceOptimization.underutilized.length}
                </div>
                {analysis.performanceOptimization.underutilized.map((dev, index) => (
                  <div key={index} className="text-sm text-white mb-1">
                    {dev.name} ({dev.availableCapacity}% free)
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Overloaded</h4>
                <p className="text-xs text-dark-400">Above capacity</p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error-400 mb-2">
                  {analysis.performanceOptimization.overloaded.length}
                </div>
                {analysis.performanceOptimization.overloaded.map((dev, index) => (
                  <div key={index} className="text-sm text-white mb-1">
                    {dev.name} (+{dev.overloadPercentage}% over)
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h4 className="text-sm font-semibold text-white">Skill Mismatches</h4>
                <p className="text-xs text-dark-400">Wrong task types</p>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning-400 mb-2">
                  {analysis.performanceOptimization.skillMismatches.length}
                </div>
                {analysis.performanceOptimization.skillMismatches.map((dev, index) => (
                  <div key={index} className="text-sm text-white mb-1">
                    {dev.name}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Performance Issues */}
          {analysis.performanceOptimization.overloaded.length > 0 && (
            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-error-400" />
                  Overloaded Team Members
                </h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.performanceOptimization.overloaded.map((dev, index) => (
                    <div key={index} className="p-4 bg-error-900/20 rounded-lg border border-error-500">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-white">{dev.name}</h5>
                        <span className="text-error-400 font-bold">+{dev.overloadPercentage}% over capacity</span>
                      </div>
                      <div>
                        <h6 className="text-sm font-medium text-dark-300 mb-1">Redistribution Suggestions:</h6>
                        <ul className="text-sm text-dark-400 space-y-1">
                          {dev.redistributionSuggestions.map((suggestion, idx) => (
                            <li key={idx}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <h4 className="text-lg font-semibold text-white">Performance Recommendations</h4>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-success-400 mb-2">Immediate Actions</h5>
                  <div className="space-y-2">
                    {analysis.recommendations.immediate.map((rec, index) => (
                      <div key={index} className="text-sm text-white p-2 bg-dark-700 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-warning-400 mb-2">Short-term</h5>
                  <div className="space-y-2">
                    {analysis.recommendations.shortTerm.map((rec, index) => (
                      <div key={index} className="text-sm text-white p-2 bg-dark-700 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-primary-400 mb-2">Long-term</h5>
                  <div className="space-y-2">
                    {analysis.recommendations.longTerm.map((rec, index) => (
                      <div key={index} className="text-sm text-white p-2 bg-dark-700 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Team Insights & Optimization" size="xl">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center space-x-4 border-b border-dark-700">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'skills'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('skills')}
          >
            Skills
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'collaboration'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('collaboration')}
          >
            Collaboration
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={analyzeTeam}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <BarChart3 size={16} />
            <span>Refresh Analysis</span>
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Analyzing team dynamics...</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'skills' && renderSkillsTab()}
            {activeTab === 'collaboration' && renderCollaborationTab()}
            {activeTab === 'performance' && renderPerformanceTab()}
          </>
        )}
      </div>
    </Modal>
  );
};