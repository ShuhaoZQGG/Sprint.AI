import { Developer } from '../types';
import { developerService } from './developerService';
import { taskService } from './taskService';
import { sprintService } from './sprintService';

export interface CapacityPlan {
  totalCapacity: number;
  availableCapacity: number;
  teamVelocity: number;
  developerCapacities: DeveloperCapacity[];
  recommendations: CapacityRecommendation[];
  sprintHealth: 'healthy' | 'at-risk' | 'overloaded';
}

export interface DeveloperCapacity {
  developerId: string;
  name: string;
  velocity: number;
  availableHours: number;
  currentLoad: number;
  recommendedTasks: number;
  skillMatch: number; // 0-1 score for task-skill alignment
}

export interface CapacityRecommendation {
  type: 'warning' | 'suggestion' | 'optimization';
  message: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SprintCapacityOptions {
  sprintDuration: number; // days
  bufferPercentage: number; // 0-100
  includeTimeOff: boolean;
  skillWeighting: boolean;
}

class CapacityPlanner {
  /**
   * Calculate team capacity for a sprint
   */
  async calculateSprintCapacity(
    sprintId?: string,
    options: Partial<SprintCapacityOptions> = {}
  ): Promise<CapacityPlan> {
    const defaultOptions: SprintCapacityOptions = {
      sprintDuration: 14, // 2 weeks
      bufferPercentage: 20,
      includeTimeOff: true,
      skillWeighting: true,
      ...options,
    };

    try {
      const developers = await developerService.getDevelopers();
      const activeTasks = sprintId 
        ? await this.getSprintTasks(sprintId)
        : await taskService.getTasks();

      const developerCapacities = await Promise.all(
        developers.map(dev => this.calculateDeveloperCapacity(dev, activeTasks, defaultOptions))
      );

      const totalCapacity = developerCapacities.reduce((sum, cap) => sum + cap.availableHours, 0);
      const teamVelocity = developerCapacities.reduce((sum, cap) => sum + cap.velocity, 0);
      const currentLoad = developerCapacities.reduce((sum, cap) => sum + cap.currentLoad, 0);

      const availableCapacity = Math.max(0, totalCapacity - currentLoad);
      const recommendations = this.generateRecommendations(developerCapacities, defaultOptions);
      const sprintHealth = this.assessSprintHealth(totalCapacity, currentLoad, defaultOptions);

      return {
        totalCapacity,
        availableCapacity,
        teamVelocity,
        developerCapacities,
        recommendations,
        sprintHealth,
      };
    } catch (error) {
      console.error('Error calculating sprint capacity:', error);
      throw new Error('Failed to calculate sprint capacity');
    }
  }

  /**
   * Calculate individual developer capacity
   */
  private async calculateDeveloperCapacity(
    developer: Developer,
    tasks: any[],
    options: SprintCapacityOptions
  ): Promise<DeveloperCapacity> {
    const baseHours = options.sprintDuration * 8; // 8 hours per day
    const bufferHours = baseHours * (options.bufferPercentage / 100);
    const availableHours = baseHours - bufferHours;

    // Calculate current load from assigned tasks
    const assignedTasks = tasks.filter(task => 
      task.assigned_to === developer.id && 
      ['todo', 'in-progress'].includes(task.status)
    );
    
    const currentLoad = assignedTasks.reduce((sum, task) => 
      sum + (task.estimated_effort || 0), 0
    );

    // Calculate skill match for potential tasks
    const unassignedTasks = tasks.filter(task => !task.assigned_to);
    const skillMatch = this.calculateSkillMatch(developer, unassignedTasks);

    // Recommended tasks based on remaining capacity and velocity
    const remainingCapacity = Math.max(0, availableHours - currentLoad);
    const recommendedTasks = Math.floor(remainingCapacity / (developer.profile.velocity || 1));

    return {
      developerId: developer.id,
      name: developer.name,
      velocity: developer.profile.velocity,
      availableHours,
      currentLoad,
      recommendedTasks,
      skillMatch,
    };
  }

  /**
   * Calculate how well a developer's skills match available tasks
   */
  private calculateSkillMatch(developer: Developer, tasks: any[]): number {
    if (tasks.length === 0) return 1;

    const developerSkills = developer.profile.strengths.map(s => s.toLowerCase());
    const preferredTypes = developer.profile.preferredTasks;

    let totalMatch = 0;
    let taskCount = 0;

    tasks.forEach(task => {
      let taskMatch = 0;
      
      // Check task type preference
      if (preferredTypes.includes(task.type)) {
        taskMatch += 0.5;
      }

      // Check skill alignment (simplified - could be enhanced with NLP)
      const taskText = `${task.title} ${task.description}`.toLowerCase();
      const skillMatches = developerSkills.filter(skill => 
        taskText.includes(skill)
      ).length;
      
      taskMatch += Math.min(0.5, skillMatches * 0.1);
      
      totalMatch += taskMatch;
      taskCount++;
    });

    return taskCount > 0 ? totalMatch / taskCount : 1;
  }

  /**
   * Generate capacity recommendations
   */
  private generateRecommendations(
    capacities: DeveloperCapacity[],
    options: SprintCapacityOptions
  ): CapacityRecommendation[] {
    const recommendations: CapacityRecommendation[] = [];

    // Check for overloaded developers
    capacities.forEach(capacity => {
      const loadPercentage = (capacity.currentLoad / capacity.availableHours) * 100;
      
      if (loadPercentage > 90) {
        recommendations.push({
          type: 'warning',
          message: `${capacity.name} is overloaded (${Math.round(loadPercentage)}% capacity)`,
          action: 'Consider redistributing tasks or extending sprint duration',
          priority: 'high',
        });
      } else if (loadPercentage < 50) {
        recommendations.push({
          type: 'suggestion',
          message: `${capacity.name} has available capacity (${Math.round(100 - loadPercentage)}% free)`,
          action: 'Consider assigning additional tasks',
          priority: 'medium',
        });
      }
    });

    // Check team balance
    const velocities = capacities.map(c => c.velocity);
    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;

    if (velocityVariance > avgVelocity * 0.5) {
      recommendations.push({
        type: 'optimization',
        message: 'Team velocity is unbalanced',
        action: 'Consider pairing or knowledge sharing to balance skills',
        priority: 'medium',
      });
    }

    // Check skill alignment
    const avgSkillMatch = capacities.reduce((sum, c) => sum + c.skillMatch, 0) / capacities.length;
    if (avgSkillMatch < 0.6) {
      recommendations.push({
        type: 'suggestion',
        message: 'Low skill-task alignment detected',
        action: 'Review task assignments for better skill matching',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Assess overall sprint health
   */
  private assessSprintHealth(
    totalCapacity: number,
    currentLoad: number,
    options: SprintCapacityOptions
  ): 'healthy' | 'at-risk' | 'overloaded' {
    const loadPercentage = (currentLoad / totalCapacity) * 100;
    
    if (loadPercentage > 95) return 'overloaded';
    if (loadPercentage > 80) return 'at-risk';
    return 'healthy';
  }

  /**
   * Auto-assign tasks based on capacity and skills
   */
  async autoAssignTasks(sprintId: string): Promise<{ assigned: number; recommendations: string[] }> {
    try {
      const capacity = await this.calculateSprintCapacity(sprintId);
      const unassignedTasks = await this.getUnassignedSprintTasks(sprintId);
      
      let assignedCount = 0;
      const recommendations: string[] = [];

      // Sort tasks by priority and effort
      const sortedTasks = unassignedTasks.sort((a, b) => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityWeight[a.priority] || 1;
        const bPriority = priorityWeight[b.priority] || 1;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return (a.estimated_effort || 0) - (b.estimated_effort || 0);
      });

      // Assign tasks to developers with available capacity
      for (const task of sortedTasks) {
        const bestDeveloper = this.findBestDeveloper(task, capacity.developerCapacities);
        
        if (bestDeveloper && bestDeveloper.currentLoad + (task.estimated_effort || 0) <= bestDeveloper.availableHours) {
          await taskService.assignTask(task.id, bestDeveloper.developerId);
          bestDeveloper.currentLoad += task.estimated_effort || 0;
          assignedCount++;
          
          recommendations.push(`Assigned "${task.title}" to ${bestDeveloper.name} (${Math.round((bestDeveloper.currentLoad / bestDeveloper.availableHours) * 100)}% capacity)`);
        }
      }

      return { assigned: assignedCount, recommendations };
    } catch (error) {
      console.error('Error auto-assigning tasks:', error);
      throw new Error('Failed to auto-assign tasks');
    }
  }

  /**
   * Find the best developer for a task
   */
  private findBestDeveloper(task: any, capacities: DeveloperCapacity[]): DeveloperCapacity | null {
    const availableDevelopers = capacities.filter(cap => 
      cap.currentLoad + (task.estimated_effort || 0) <= cap.availableHours
    );

    if (availableDevelopers.length === 0) return null;

    // Score developers based on skill match, velocity, and current load
    return availableDevelopers.reduce((best, current) => {
      const currentScore = this.calculateDeveloperScore(current, task);
      const bestScore = this.calculateDeveloperScore(best, task);
      
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate developer score for task assignment
   */
  private calculateDeveloperScore(capacity: DeveloperCapacity, task: any): number {
    const loadFactor = 1 - (capacity.currentLoad / capacity.availableHours); // Prefer less loaded developers
    const skillFactor = capacity.skillMatch;
    const velocityFactor = Math.min(1, capacity.velocity / 10); // Normalize velocity
    
    return (loadFactor * 0.4) + (skillFactor * 0.4) + (velocityFactor * 0.2);
  }

  /**
   * Get tasks for a specific sprint
   */
  private async getSprintTasks(sprintId: string): Promise<any[]> {
    // This would be implemented based on your sprint-task relationship
    // For now, return all tasks (this should be replaced with actual sprint task query)
    return taskService.getTasks();
  }

  /**
   * Get unassigned tasks for a sprint
   */
  private async getUnassignedSprintTasks(sprintId: string): Promise<any[]> {
    const tasks = await this.getSprintTasks(sprintId);
    return tasks.filter(task => !task.assigned_to);
  }
}

export const capacityPlanner = new CapacityPlanner();