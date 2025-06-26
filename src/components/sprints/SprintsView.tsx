import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock,
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Zap,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { BurndownChart, BurndownDataPoint } from '../charts/BurndownChart';
import { useSprints } from '../../hooks/useSprints';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useTasks } from '../../hooks/useTasks';
import { capacityPlanner, CapacityPlan } from '../../services/capacityPlanner';
import { sprintAutomation, SprintAnalytics } from '../../services/sprintAutomation';
import { ChartDataGenerator } from '../../utils/chartData';
import { Sprint } from '../../types';
import toast from 'react-hot-toast';

export const SprintsView: React.FC = () => {
  const { sprints, activeSprint, loading, createSprint, updateSprint } = useSprints();
  const { developers } = useDevelopers();
  const { tasks } = useTasks();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [capacityPlan, setCapacityPlan] = useState<CapacityPlan | null>(null);
  const [sprintAnalytics, setSprintAnalytics] = useState<SprintAnalytics | null>(null);
  const [autoOptimizing, setAutoOptimizing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    autoOptimize: true,
  });

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        toast.error('End date must be after start date');
        return;
      }

      if (formData.autoOptimize) {
        setAutoOptimizing(true);
        const result = await sprintAutomation.createOptimizedSprint(
          formData.name,
          startDate,
          endDate,
          {
            duration: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
            autoAssignTasks: true,
            prioritizeByValue: true,
            balanceWorkload: true,
          }
        );
        
        toast.success(`Sprint created with ${result.assigned} auto-assigned tasks!`);
        setSprintAnalytics(result.analytics);
      } else {
        await createSprint({
          name: formData.name,
          description: formData.description,
          startDate,
          endDate,
          status: 'planning',
          capacity: 0,
          velocityTarget: 0,
        });
        
        toast.success('Sprint created successfully!');
      }

      setShowCreateModal(false);
      setFormData({ name: '', description: '', startDate: '', endDate: '', autoOptimize: true });
    } catch (error) {
      toast.error('Failed to create sprint');
    } finally {
      setAutoOptimizing(false);
    }
  };

  const handleViewCapacity = async (sprint: Sprint) => {
    try {
      setSelectedSprint(sprint);
      const plan = await capacityPlanner.calculateSprintCapacity(sprint.id);
      setCapacityPlan(plan);
      setShowCapacityModal(true);
    } catch (error) {
      toast.error('Failed to calculate capacity');
    }
  };

  const handleViewAnalytics = async (sprint: Sprint) => {
    try {
      setSelectedSprint(sprint);
      const analytics = await sprintAutomation.analyzeCurrentSprint(sprint.id);
      setSprintAnalytics(analytics);
      setShowAnalyticsModal(true);
    } catch (error) {
      toast.error('Failed to load analytics');
    }
  };

  const handleAutoBalance = async (sprintId: string) => {
    try {
      const result = await sprintAutomation.balanceSprintWorkload(sprintId);
      toast.success(`Rebalanced ${result.rebalanced} tasks`);
      
      if (result.recommendations.length > 0) {
        console.log('Rebalancing recommendations:', result.recommendations);
      }
    } catch (error) {
      toast.error('Failed to balance workload');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success-400 bg-success-900/20';
      case 'completed': return 'text-primary-400 bg-primary-900/20';
      case 'cancelled': return 'text-error-400 bg-error-900/20';
      default: return 'text-warning-400 bg-warning-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'cancelled': return <Pause size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const generateMockBurndownData = (sprint: Sprint): BurndownDataPoint[] => {
    // Generate mock burndown data for demonstration
    const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
    const totalCapacity = sprintTasks.reduce((sum, task) => sum + (task.estimatedEffort || 0), 0);
    
    const dailyProgress = [];
    const startDate = new Date(sprint.startDate);
    const currentDate = new Date();
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      if (date <= currentDate) {
        dailyProgress.push({
          date,
          completed: Math.random() * 5 + 2, // Random progress
        });
      }
    }

    return ChartDataGenerator.generateBurndownData(
      sprint.startDate,
      sprint.endDate,
      totalCapacity,
      dailyProgress
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Sprint Planning</h1>
          <p className="text-dark-400">AI-powered sprint planning with capacity optimization</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          Create Sprint
        </Button>
      </div>

      {/* Active Sprint Overview */}
      {activeSprint && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeSprint.status)}`}>
                  {getStatusIcon(activeSprint.status)}
                  <span className="capitalize">{activeSprint.status}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{activeSprint.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewCapacity(activeSprint)}
                >
                  <Users size={14} className="mr-1" />
                  Capacity
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewAnalytics(activeSprint)}
                >
                  <BarChart3 size={14} className="mr-1" />
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAutoBalance(activeSprint.id)}
                >
                  <RefreshCw size={14} className="mr-1" />
                  Auto-Balance
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sprint Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">
                      {tasks.filter(t => t.sprintId === activeSprint.id && t.status === 'done').length}
                    </div>
                    <div className="text-sm text-dark-400">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">
                      {tasks.filter(t => t.sprintId === activeSprint.id).length}
                    </div>
                    <div className="text-sm text-dark-400">Total Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">{activeSprint.capacity}h</div>
                    <div className="text-sm text-dark-400">Capacity</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">
                      {Math.ceil((new Date(activeSprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className="text-sm text-dark-400">Days Left</div>
                  </div>
                </div>

                <div className="p-4 bg-dark-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Sprint Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">Start Date:</span>
                      <span className="text-white">{new Date(activeSprint.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">End Date:</span>
                      <span className="text-white">{new Date(activeSprint.endDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">Duration:</span>
                      <span className="text-white">
                        {Math.ceil((new Date(activeSprint.endDate).getTime() - new Date(activeSprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Burndown Chart */}
              <BurndownChart
                data={generateMockBurndownData(activeSprint)}
                sprintStartDate={activeSprint.startDate}
                sprintEndDate={activeSprint.endDate}
                totalCapacity={activeSprint.capacity}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Sprints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sprints.map((sprint) => {
          const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
          const completedTasks = sprintTasks.filter(task => task.status === 'done');
          const progress = sprintTasks.length > 0 ? (completedTasks.length / sprintTasks.length) * 100 : 0;

          return (
            <Card key={sprint.id} hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
                    {getStatusIcon(sprint.status)}
                    <span className="capitalize">{sprint.status}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCapacity(sprint)}
                    >
                      <Users size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewAnalytics(sprint)}
                    >
                      <BarChart3 size={14} />
                    </Button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{sprint.name}</h3>
                {sprint.description && (
                  <p className="text-sm text-dark-400 mb-4">{sprint.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">Progress</span>
                    <span className="text-white">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{completedTasks.length}</div>
                      <div className="text-xs text-dark-400">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{sprintTasks.length}</div>
                      <div className="text-xs text-dark-400">Total Tasks</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-dark-500 pt-2 border-t border-dark-700">
                    <span>{new Date(sprint.startDate).toLocaleDateString()}</span>
                    <span>→</span>
                    <span>{new Date(sprint.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Sprint Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Sprint"
      >
        <form onSubmit={handleCreateSprint} className="space-y-6">
          <Input
            label="Sprint Name"
            placeholder="e.g., Sprint 1 - Core Features"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Description (Optional)
            </label>
            <textarea
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              placeholder="Sprint goals and objectives..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              required
            />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-primary-900/20 rounded-lg border border-primary-500">
            <input
              type="checkbox"
              id="autoOptimize"
              checked={formData.autoOptimize}
              onChange={(e) => setFormData(prev => ({ ...prev, autoOptimize: e.target.checked }))}
              className="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
            />
            <div className="flex-1">
              <label htmlFor="autoOptimize" className="text-sm font-medium text-primary-400 cursor-pointer">
                AI-Powered Sprint Optimization
              </label>
              <p className="text-xs text-dark-300 mt-1">
                Automatically select and assign tasks based on team capacity and skills
              </p>
            </div>
            <Zap className="w-5 h-5 text-primary-400" />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={autoOptimizing}>
              {autoOptimizing ? 'Optimizing...' : 'Create Sprint'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Capacity Planning Modal */}
      <Modal
        isOpen={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        title={`Capacity Plan - ${selectedSprint?.name}`}
        size="xl"
      >
        {capacityPlan && (
          <div className="space-y-6">
            {/* Capacity Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{capacityPlan.totalCapacity}h</div>
                  <div className="text-sm text-dark-400">Total Capacity</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{capacityPlan.availableCapacity}h</div>
                  <div className="text-sm text-dark-400">Available</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{capacityPlan.teamVelocity}pts</div>
                  <div className="text-sm text-dark-400">Team Velocity</div>
                </CardContent>
              </Card>
            </div>

            {/* Sprint Health */}
            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white">Sprint Health</h4>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    capacityPlan.sprintHealth === 'healthy' ? 'bg-success-400' :
                    capacityPlan.sprintHealth === 'at-risk' ? 'bg-warning-400' : 'bg-error-400'
                  }`}></div>
                  <span className="text-white font-medium capitalize">{capacityPlan.sprintHealth}</span>
                </div>
                
                {capacityPlan.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-dark-300">Recommendations:</h5>
                    {capacityPlan.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2 text-sm">
                        <AlertTriangle size={14} className={`mt-0.5 ${
                          rec.priority === 'high' ? 'text-error-400' :
                          rec.priority === 'medium' ? 'text-warning-400' : 'text-primary-400'
                        }`} />
                        <div>
                          <p className="text-white">{rec.message}</p>
                          {rec.action && <p className="text-dark-400">{rec.action}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Developer Capacities */}
            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white">Developer Capacities</h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {capacityPlan.developerCapacities.map((dev) => {
                    const utilizationPercent = (dev.currentLoad / dev.availableHours) * 100;
                    return (
                      <div key={dev.developerId} className="p-4 bg-dark-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-white">{dev.name}</h5>
                          <span className="text-sm text-dark-400">
                            {Math.round(utilizationPercent)}% utilized
                          </span>
                        </div>
                        
                        <div className="w-full bg-dark-600 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              utilizationPercent > 90 ? 'bg-error-500' :
                              utilizationPercent > 75 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-white font-medium">{dev.velocity}</div>
                            <div className="text-dark-400">Velocity</div>
                          </div>
                          <div>
                            <div className="text-white font-medium">{dev.availableHours}h</div>
                            <div className="text-dark-400">Available</div>
                          </div>
                          <div>
                            <div className="text-white font-medium">{dev.currentLoad}h</div>
                            <div className="text-dark-400">Current Load</div>
                          </div>
                          <div>
                            <div className="text-white font-medium">{Math.round(dev.skillMatch * 100)}%</div>
                            <div className="text-dark-400">Skill Match</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title={`Sprint Analytics - ${selectedSprint?.name}`}
        size="xl"
      >
        {sprintAnalytics && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <TrendingUp className={`w-5 h-5 ${
                      sprintAnalytics.velocityTrend === 'improving' ? 'text-success-400' :
                      sprintAnalytics.velocityTrend === 'declining' ? 'text-error-400' : 'text-warning-400'
                    }`} />
                    <span className="text-sm text-dark-400 capitalize">{sprintAnalytics.velocityTrend}</span>
                  </div>
                  <div className="text-lg font-bold text-white">Velocity Trend</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{sprintAnalytics.teamEfficiency}%</div>
                  <div className="text-sm text-dark-400">Team Efficiency</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white mb-1">{sprintAnalytics.successProbability}%</div>
                  <div className="text-sm text-dark-400">Success Probability</div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Factors */}
            {sprintAnalytics.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <h4 className="text-lg font-semibold text-white">Risk Factors</h4>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sprintAnalytics.riskFactors.map((risk, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <AlertTriangle size={14} className="text-warning-400" />
                        <span className="text-white">{risk}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <h4 className="text-lg font-semibold text-white">Recommendations</h4>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sprintAnalytics.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-dark-700 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          rec.priority === 'high' ? 'bg-error-400' :
                          rec.priority === 'medium' ? 'bg-warning-400' : 'bg-primary-400'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{rec.message}</p>
                          {rec.action && (
                            <p className="text-dark-400 text-xs mt-1">{rec.action}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};