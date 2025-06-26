import { Sprint, Task } from '../types';
import { sprintService } from './sprintService';
import { taskService } from './taskService';
import { developerService } from './developerService';
import { capacityPlanner } from './capacityPlanner';
import { velocityCalculator } from '../utils/velocityCalculator';

export interface AutoSprintOptions {
  duration: number; // days
  bufferPercentage: number;
  autoAssignTasks: boolean;
  prioritizeByValue: boolean;
  balanceWorkload: boolean;
}

export interface SprintRecommendation {
  type: 'capacity' | 'assignment' | 'scope' | 'timeline';
  priority: 'low' | 'medium' | 'high';
  message: string;
  action?: string;
  impact?: string;
}

export interface SprintAnalytics {
  velocityTrend: 'improving' | 'declining' | 'stable';
  teamEfficiency: number; // 0-100
  riskFactors: string[];
  successProbability: number; // 0-100
  recommendations: SprintRecommendation[];
}

class SprintAutomation {
  /**
   * Create an optimized sprint automatically
   */
  async createOptimizedSprint(
    name: string,
    startDate: Date,
    endDate: Date,
    options: Partial<AutoSprintOptions> = {}
  ): Promise<{ sprint: Sprint; analytics: SprintAnalytics; assigned: number }> {
    const defaultOptions: AutoSprintOptions = {
      duration: 14,
      bufferPercentage: 20,
      autoAssignTasks: true,
      prioritizeByValue: true,
      balanceWorkload: true,
      ...options,
    };

    try {
      // Calculate team capacity
      const capacity = await capacityPlanner.calculateSprintCapacity();
      
      // Create the sprint
      const sprint = await sprintService.createSprint({
        name,
        startDate,
        endDate,
        status: 'planning',
        capacity: capacity.totalCapacity,
        velocityTarget: capacity.teamVelocity,
      });

      // Get available tasks
      const availableTasks = await this.getAvailableTasksForSprint();
      
      // Select optimal tasks for the sprint
      const selectedTasks = this.selectOptimalTasks(
        availableTasks,
        capacity,
        defaultOptions
      );

      // Add tasks to sprint
      for (const task of selectedTasks) {
        await sprintService.addTaskToSprint(sprint.id, task.id);
      }

      // Auto-assign tasks if enabled
      let assignedCount = 0;
      if (defaultOptions.autoAssignTasks) {
        const assignmentResult = await capacityPlanner.autoAssignTasks(sprint.id);
        assignedCount = assignmentResult.assigned;
      }

      // Generate analytics
      const analytics = await this.generateSprintAnalytics(sprint.id, capacity);

      return { sprint, analytics, assigned: assignedCount };
    } catch (error) {
      console.error('Error creating optimized sprint:', error);
      throw new Error('Failed to create optimized sprint');
    }
  }

  /**
   * Analyze current sprint and provide recommendations
   */
  async analyzeCurrentSprint(sprintId: string): Promise<SprintAnalytics> {
    try {
      const capacity = await capacityPlanner.calculateSprintCapacity(sprintId);
      return this.generateSprintAnalytics(sprintId, capacity);
    } catch (error) {
      console.error('Error analyzing sprint:', error);
      throw new Error('Failed to analyze sprint');
    }
  }

  /**
   * Auto-balance workload across team members
   */
  async balanceSprintWorkload(sprintId: string): Promise<{
    rebalanced: number;
    recommendations: string[];
  }> {
    try {
      const capacity = await capacityPlanner.calculateSprintCapacity(sprintId);
      const sprintTasks = await this.getSprintTasks(sprintId);
      
      let rebalancedCount = 0;
      const recommendations: string[] = [];

      // Find overloaded and underloaded developers
      const overloaded = capacity.developerCapacities.filter(dev => 
        (dev.currentLoad / dev.availableHours) > 0.9
      );
      
      const underloaded = capacity.developerCapacities.filter(dev => 
        (dev.currentLoad / dev.availableHours) < 0.7
      );

      // Redistribute tasks from overloaded to underloaded developers
      for (const overloadedDev of overloaded) {
        const devTasks = sprintTasks.filter(task => 
          task.assigned_to === overloadedDev.developerId
        );
        
        // Sort tasks by effort (smallest first for easier redistribution)
        const sortedTasks = devTasks.sort((a, b) => 
          (a.estimated_effort || 0) - (b.estimated_effort || 0)
        );

        for (const task of sortedTasks) {
          const targetDev = this.findBestReassignmentTarget(
            task,
            underloaded,
            capacity.developerCapacities
          );

          if (targetDev && 
              targetDev.currentLoad + (task.estimated_effort || 0) <= targetDev.availableHours) {
            
            await taskService.assignTask(task.id, targetDev.developerId);
            
            // Update local capacity tracking
            overloadedDev.currentLoad -= task.estimated_effort || 0;
            targetDev.currentLoad += task.estimated_effort || 0;
            
            rebalancedCount++;
            recommendations.push(
              `Moved "${task.title}" from ${overloadedDev.name} to ${targetDev.name}`
            );

            // Stop if the overloaded developer is now balanced
            if ((overloadedDev.currentLoad / overloadedDev.availableHours) <= 0.85) {
              break;
            }
          }
        }
      }

      return { rebalanced: rebalancedCount, recommendations };
    } catch (error) {
      console.error('Error balancing workload:', error);
      throw new Error('Failed to balance sprint workload');
    }
  }

  /**
   * Generate sprint retrospective data
   */
  async generateSprintRetrospective(sprintId: string): Promise<{
    velocityAchieved: number;
    velocityTarget: number;
    completionRate: number;
    teamPerformance: { [developerId: string]: number };
    blockers: string[];
    improvements: string[];
    celebrations: string[];
  }> {
    try {
      const sprint = await sprintService.getSprint(sprintId);
      if (!sprint) throw new Error('Sprint not found');

      const sprintTasks = await this.getSprintTasks(sprintId);
      const completedTasks = sprintTasks.filter(task => task.status === 'done');
      
      const velocityAchieved = completedTasks.reduce((sum, task) => 
        sum + (task.story_points || 0), 0
      );
      
      const completionRate = sprintTasks.length > 0 
        ? (completedTasks.length / sprintTasks.length) * 100 
        : 0;

      // Calculate individual performance
      const developers = await developerService.getDevelopers();
      const teamPerformance: { [developerId: string]: number } = {};
      
      developers.forEach(dev => {
        const devTasks = completedTasks.filter(task => task.assigned_to === dev.id);
        const devVelocity = devTasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
        teamPerformance[dev.id] = devVelocity;
      });

      // Generate insights
      const blockers = this.identifySprintBlockers(sprintTasks);
      const improvements = this.generateImprovementSuggestions(sprint, sprintTasks, completionRate);
      const celebrations = this.generateCelebrations(sprint, sprintTasks, completionRate);

      return {
        velocityAchieved,
        velocityTarget: sprint.velocityTarget || 0,
        completionRate,
        teamPerformance,
        blockers,
        improvements,
        celebrations,
      };
    } catch (error) {
      console.error('Error generating retrospective:', error);
      throw new Error('Failed to generate sprint retrospective');
    }
  }

  /**
   * Predict sprint success probability
   */
  async predictSprintSuccess(sprintId: string): Promise<{
    probability: number;
    factors: Array<{ factor: string; impact: number; description: string }>;
    recommendations: string[];
  }> {
    try {
      const capacity = await capacityPlanner.calculateSprintCapacity(sprintId);
      const sprintTasks = await this.getSprintTasks(sprintId);
      
      const factors = [];
      let totalScore = 0;

      // Factor 1: Capacity utilization (25% weight)
      const utilizationScore = this.calculateUtilizationScore(capacity);
      factors.push({
        factor: 'Capacity Utilization',
        impact: utilizationScore * 0.25,
        description: `Team capacity is ${capacity.sprintHealth}`,
      });
      totalScore += utilizationScore * 0.25;

      // Factor 2: Task complexity (20% weight)
      const complexityScore = this.calculateComplexityScore(sprintTasks);
      factors.push({
        factor: 'Task Complexity',
        impact: complexityScore * 0.20,
        description: 'Based on estimated effort and task types',
      });
      totalScore += complexityScore * 0.20;

      // Factor 3: Team velocity consistency (20% weight)
      const velocityScore = await this.calculateVelocityConsistencyScore();
      factors.push({
        factor: 'Velocity Consistency',
        impact: velocityScore * 0.20,
        description: 'Based on historical sprint performance',
      });
      totalScore += velocityScore * 0.20;

      // Factor 4: Skill-task alignment (15% weight)
      const skillScore = this.calculateSkillAlignmentScore(capacity);
      factors.push({
        factor: 'Skill Alignment',
        impact: skillScore * 0.15,
        description: 'How well tasks match team skills',
      });
      totalScore += skillScore * 0.15;

      // Factor 5: Dependencies and blockers (20% weight)
      const dependencyScore = this.calculateDependencyScore(sprintTasks);
      factors.push({
        factor: 'Dependencies',
        impact: dependencyScore * 0.20,
        description: 'Risk from task dependencies and external blockers',
      });
      totalScore += dependencyScore * 0.20;

      const probability = Math.round(totalScore);
      const recommendations = this.generateSuccessRecommendations(factors, probability);

      return { probability, factors, recommendations };
    } catch (error) {
      console.error('Error predicting sprint success:', error);
      throw new Error('Failed to predict sprint success');
    }
  }

  // Private helper methods

  private async getAvailableTasksForSprint(): Promise<any[]> {
    const tasks = await taskService.getTasks();
    return tasks.filter(task => 
      task.status === 'backlog' || task.status === 'todo'
    );
  }

  private selectOptimalTasks(
    tasks: any[],
    capacity: any,
    options: AutoSprintOptions
  ): any[] {
    // Sort tasks by priority and value
    const sortedTasks = tasks.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 1;
      const bPriority = priorityWeight[b.priority] || 1;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      return (a.estimated_effort || 0) - (b.estimated_effort || 0);
    });

    // Select tasks that fit within capacity
    const selectedTasks = [];
    let totalEffort = 0;
    const maxCapacity = capacity.availableCapacity * (1 - options.bufferPercentage / 100);

    for (const task of sortedTasks) {
      if (totalEffort + (task.estimated_effort || 0) <= maxCapacity) {
        selectedTasks.push(task);
        totalEffort += task.estimated_effort || 0;
      }
    }

    return selectedTasks;
  }

  private async generateSprintAnalytics(sprintId: string, capacity: any): Promise<SprintAnalytics> {
    const developers = await developerService.getDevelopers();
    const teamMetrics = velocityCalculator.calculateTeamVelocity(developers, []);
    
    const riskFactors = [];
    if (capacity.sprintHealth === 'overloaded') {
      riskFactors.push('Team capacity is overallocated');
    }
    if (capacity.recommendations.some(r => r.priority === 'high')) {
      riskFactors.push('High priority capacity issues detected');
    }

    const teamEfficiency = Math.round(
      developers.reduce((sum, dev) => sum + dev.profile.codeQuality, 0) / developers.length * 10
    );

    const successProbability = await this.predictSprintSuccess(sprintId);

    return {
      velocityTrend: teamMetrics.teamTrend,
      teamEfficiency,
      riskFactors,
      successProbability: successProbability.probability,
      recommendations: capacity.recommendations.map((rec: any) => ({
        type: 'capacity',
        priority: rec.priority,
        message: rec.message,
        action: rec.action,
      })),
    };
  }

  private async getSprintTasks(sprintId: string): Promise<any[]> {
    // This should be implemented based on your sprint-task relationship
    const tasks = await taskService.getTasks();
    return tasks; // Placeholder - should filter by sprint
  }

  private findBestReassignmentTarget(task: any, candidates: any[], allCapacities: any[]): any {
    return candidates.find(candidate => 
      candidate.currentLoad + (task.estimated_effort || 0) <= candidate.availableHours
    );
  }

  private identifySprintBlockers(tasks: any[]): string[] {
    const blockers = [];
    
    const stuckTasks = tasks.filter(task => 
      task.status === 'in-progress' && 
      new Date().getTime() - new Date(task.updated_at).getTime() > 3 * 24 * 60 * 60 * 1000 // 3 days
    );
    
    if (stuckTasks.length > 0) {
      blockers.push(`${stuckTasks.length} tasks have been in progress for over 3 days`);
    }

    const highEffortTasks = tasks.filter(task => (task.estimated_effort || 0) > 20);
    if (highEffortTasks.length > 0) {
      blockers.push(`${highEffortTasks.length} tasks have high effort estimates (>20 hours)`);
    }

    return blockers;
  }

  private generateImprovementSuggestions(sprint: any, tasks: any[], completionRate: number): string[] {
    const improvements = [];

    if (completionRate < 80) {
      improvements.push('Consider breaking down large tasks into smaller, manageable pieces');
      improvements.push('Implement daily standups to identify blockers early');
    }

    const unassignedTasks = tasks.filter(task => !task.assigned_to);
    if (unassignedTasks.length > 0) {
      improvements.push('Ensure all tasks are assigned at sprint start');
    }

    improvements.push('Conduct mid-sprint reviews to adjust scope if needed');
    improvements.push('Improve estimation accuracy through planning poker sessions');

    return improvements;
  }

  private generateCelebrations(sprint: any, tasks: any[], completionRate: number): string[] {
    const celebrations = [];

    if (completionRate >= 90) {
      celebrations.push('Excellent sprint completion rate!');
    }

    const completedTasks = tasks.filter(task => task.status === 'done');
    if (completedTasks.length > 0) {
      celebrations.push(`Successfully completed ${completedTasks.length} tasks`);
    }

    celebrations.push('Team collaboration and communication');
    celebrations.push('Continuous improvement mindset');

    return celebrations;
  }

  private calculateUtilizationScore(capacity: any): number {
    switch (capacity.sprintHealth) {
      case 'healthy': return 85;
      case 'at-risk': return 65;
      case 'overloaded': return 40;
      default: return 70;
    }
  }

  private calculateComplexityScore(tasks: any[]): number {
    const avgEffort = tasks.reduce((sum, task) => sum + (task.estimated_effort || 0), 0) / tasks.length;
    
    if (avgEffort < 5) return 90;
    if (avgEffort < 10) return 75;
    if (avgEffort < 20) return 60;
    return 45;
  }

  private async calculateVelocityConsistencyScore(): Promise<number> {
    // Simplified - would use actual historical data
    return 75;
  }

  private calculateSkillAlignmentScore(capacity: any): number {
    const avgSkillMatch = capacity.developerCapacities.reduce((sum: number, dev: any) => 
      sum + dev.skillMatch, 0
    ) / capacity.developerCapacities.length;
    
    return Math.round(avgSkillMatch * 100);
  }

  private calculateDependencyScore(tasks: any[]): number {
    const tasksWithDependencies = tasks.filter(task => 
      task.dependencies && task.dependencies.length > 0
    );
    
    const dependencyRatio = tasksWithDependencies.length / tasks.length;
    return Math.round((1 - dependencyRatio) * 100);
  }

  private generateSuccessRecommendations(factors: any[], probability: number): string[] {
    const recommendations = [];

    if (probability < 60) {
      recommendations.push('Consider reducing sprint scope');
      recommendations.push('Address high-risk factors before sprint start');
    }

    const lowFactors = factors.filter(f => f.impact < 15);
    lowFactors.forEach(factor => {
      recommendations.push(`Improve ${factor.factor.toLowerCase()}`);
    });

    if (probability > 80) {
      recommendations.push('Sprint setup looks excellent - maintain current approach');
    }

    return recommendations;
  }
}

export const sprintAutomation = new SprintAutomation();