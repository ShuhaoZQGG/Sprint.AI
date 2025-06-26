import { Developer } from '../types';

export interface VelocityMetrics {
  currentVelocity: number;
  averageVelocity: number;
  velocityTrend: 'increasing' | 'decreasing' | 'stable';
  predictedVelocity: number;
  confidence: number; // 0-1
}

export interface TeamVelocityMetrics {
  totalVelocity: number;
  averageVelocity: number;
  velocityDistribution: { [developerId: string]: number };
  teamTrend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface SprintVelocityData {
  sprintId: string;
  sprintName: string;
  plannedVelocity: number;
  actualVelocity: number;
  completionRate: number;
  date: Date;
}

class VelocityCalculator {
  /**
   * Calculate individual developer velocity metrics
   */
  calculateDeveloperVelocity(
    developer: Developer,
    sprintHistory: SprintVelocityData[]
  ): VelocityMetrics {
    if (sprintHistory.length === 0) {
      return {
        currentVelocity: developer.profile.velocity,
        averageVelocity: developer.profile.velocity,
        velocityTrend: 'stable',
        predictedVelocity: developer.profile.velocity,
        confidence: 0.5,
      };
    }

    const velocities = sprintHistory.map(sprint => sprint.actualVelocity);
    const currentVelocity = velocities[velocities.length - 1] || developer.profile.velocity;
    const averageVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;

    const velocityTrend = this.calculateTrend(velocities);
    const predictedVelocity = this.predictNextVelocity(velocities);
    const confidence = this.calculateConfidence(velocities);

    return {
      currentVelocity,
      averageVelocity,
      velocityTrend,
      predictedVelocity,
      confidence,
    };
  }

  /**
   * Calculate team velocity metrics
   */
  calculateTeamVelocity(
    developers: Developer[],
    teamSprintHistory: SprintVelocityData[]
  ): TeamVelocityMetrics {
    const totalVelocity = developers.reduce((sum, dev) => sum + dev.profile.velocity, 0);
    const averageVelocity = totalVelocity / developers.length;

    const velocityDistribution: { [developerId: string]: number } = {};
    developers.forEach(dev => {
      velocityDistribution[dev.id] = dev.profile.velocity;
    });

    const teamVelocities = teamSprintHistory.map(sprint => sprint.actualVelocity);
    const teamTrend = this.calculateTrend(teamVelocities);
    const recommendations = this.generateVelocityRecommendations(developers, teamSprintHistory);

    return {
      totalVelocity,
      averageVelocity,
      velocityDistribution,
      teamTrend,
      recommendations,
    };
  }

  /**
   * Calculate velocity trend
   */
  private calculateTrend(velocities: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (velocities.length < 3) return 'stable';

    const recent = velocities.slice(-3);
    const older = velocities.slice(-6, -3);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;

    const changePercentage = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercentage > 10) return 'increasing';
    if (changePercentage < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Predict next sprint velocity using linear regression
   */
  private predictNextVelocity(velocities: number[]): number {
    if (velocities.length < 2) {
      return velocities[0] || 0;
    }

    // Simple linear regression
    const n = velocities.length;
    const x = Array.from({ length: n }, (_, i) => i + 1);
    const y = velocities;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextX = n + 1;
    const prediction = slope * nextX + intercept;

    // Ensure prediction is reasonable (within 50% of recent average)
    const recentAvg = velocities.slice(-3).reduce((sum, v) => sum + v, 0) / Math.min(3, velocities.length);
    const minPrediction = recentAvg * 0.5;
    const maxPrediction = recentAvg * 1.5;

    return Math.max(minPrediction, Math.min(maxPrediction, prediction));
  }

  /**
   * Calculate confidence in velocity prediction
   */
  private calculateConfidence(velocities: number[]): number {
    if (velocities.length < 3) return 0.3;

    // Calculate coefficient of variation (lower = more consistent = higher confidence)
    const mean = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;

    // Convert to confidence score (0-1)
    const confidence = Math.max(0.1, Math.min(1, 1 - coefficientOfVariation));
    
    // Boost confidence with more data points
    const dataBonus = Math.min(0.2, velocities.length * 0.02);
    
    return Math.min(1, confidence + dataBonus);
  }

  /**
   * Generate velocity improvement recommendations
   */
  private generateVelocityRecommendations(
    developers: Developer[],
    sprintHistory: SprintVelocityData[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for velocity inconsistency
    const velocities = developers.map(dev => dev.profile.velocity);
    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const maxVelocity = Math.max(...velocities);
    const minVelocity = Math.min(...velocities);

    if (maxVelocity > avgVelocity * 2) {
      recommendations.push('Consider knowledge sharing from high-velocity developers to improve team consistency');
    }

    if (minVelocity < avgVelocity * 0.5) {
      recommendations.push('Identify blockers for low-velocity developers and provide additional support');
    }

    // Check sprint completion rates
    if (sprintHistory.length > 0) {
      const recentSprints = sprintHistory.slice(-3);
      const avgCompletionRate = recentSprints.reduce((sum, sprint) => sum + sprint.completionRate, 0) / recentSprints.length;

      if (avgCompletionRate < 0.8) {
        recommendations.push('Sprint completion rate is low - consider reducing sprint scope or addressing blockers');
      }

      if (avgCompletionRate > 1.1) {
        recommendations.push('Team is consistently over-delivering - consider increasing sprint capacity');
      }
    }

    // Check for skill gaps
    const allSkills = developers.flatMap(dev => dev.profile.strengths);
    const skillCounts = allSkills.reduce((counts, skill) => {
      counts[skill] = (counts[skill] || 0) + 1;
      return counts;
    }, {} as { [skill: string]: number });

    const criticalSkills = ['Frontend', 'Backend', 'Testing', 'DevOps'];
    criticalSkills.forEach(skill => {
      if (!skillCounts[skill] || skillCounts[skill] < 2) {
        recommendations.push(`Consider cross-training team members in ${skill} to reduce bottlenecks`);
      }
    });

    return recommendations;
  }

  /**
   * Calculate sprint capacity based on team velocity
   */
  calculateSprintCapacity(
    developers: Developer[],
    sprintDurationDays: number,
    bufferPercentage: number = 20
  ): {
    totalStoryPoints: number;
    totalHours: number;
    recommendedStoryPoints: number;
    recommendedHours: number;
  } {
    const totalVelocity = developers.reduce((sum, dev) => sum + dev.profile.velocity, 0);
    const totalHours = sprintDurationDays * 8 * developers.length; // 8 hours per day per developer

    const bufferMultiplier = 1 - (bufferPercentage / 100);
    const recommendedStoryPoints = Math.floor(totalVelocity * bufferMultiplier);
    const recommendedHours = Math.floor(totalHours * bufferMultiplier);

    return {
      totalStoryPoints: totalVelocity,
      totalHours,
      recommendedStoryPoints,
      recommendedHours,
    };
  }

  /**
   * Estimate task completion time based on developer velocity
   */
  estimateTaskCompletion(
    task: { estimatedEffort: number; storyPoints: number },
    developer: Developer
  ): {
    estimatedDays: number;
    confidence: 'low' | 'medium' | 'high';
  } {
    const hoursPerDay = 8;
    const velocityPerDay = developer.profile.velocity / 14; // Assuming 2-week sprints
    
    let estimatedDays: number;
    
    if (task.storyPoints > 0) {
      estimatedDays = task.storyPoints / velocityPerDay;
    } else {
      estimatedDays = task.estimatedEffort / hoursPerDay;
    }

    // Adjust based on developer's code quality and collaboration scores
    const qualityFactor = developer.profile.codeQuality / 10;
    const collaborationFactor = developer.profile.collaboration / 10;
    const adjustmentFactor = (qualityFactor + collaborationFactor) / 2;
    
    estimatedDays = estimatedDays / adjustmentFactor;

    // Determine confidence based on developer's consistency
    let confidence: 'low' | 'medium' | 'high';
    if (developer.profile.velocity > 8 && developer.profile.codeQuality > 7) {
      confidence = 'high';
    } else if (developer.profile.velocity > 5 && developer.profile.codeQuality > 5) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      estimatedDays: Math.ceil(estimatedDays),
      confidence,
    };
  }
}

export const velocityCalculator = new VelocityCalculator();