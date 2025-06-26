import { BurndownDataPoint } from '../components/charts/BurndownChart';

export interface SprintMetrics {
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
}

export class ChartDataGenerator {
  /**
   * Generate burndown chart data for a sprint
   */
  static generateBurndownData(
    sprintStartDate: Date,
    sprintEndDate: Date,
    totalCapacity: number,
    dailyProgress: { date: Date; completed: number }[]
  ): BurndownDataPoint[] {
    const data: BurndownDataPoint[] = [];
    const sprintDays = this.getWorkingDaysBetween(sprintStartDate, sprintEndDate);
    const idealBurnRate = totalCapacity / sprintDays;

    let cumulativeCompleted = 0;
    let currentDate = new Date(sprintStartDate);

    for (let day = 0; day <= sprintDays; day++) {
      // Find progress for this day
      const dayProgress = dailyProgress.find(p => 
        p.date.toDateString() === currentDate.toDateString()
      );

      if (dayProgress) {
        cumulativeCompleted += dayProgress.completed;
      }

      const remaining = Math.max(0, totalCapacity - cumulativeCompleted);
      const ideal = Math.max(0, totalCapacity - (idealBurnRate * day));

      data.push({
        date: new Date(currentDate),
        remaining,
        ideal,
        completed: cumulativeCompleted,
      });

      // Move to next working day
      currentDate = this.addWorkingDays(currentDate, 1);
    }

    return data;
  }

  /**
   * Generate velocity chart data
   */
  static generateVelocityData(
    sprintHistory: Array<{
      sprintName: string;
      plannedVelocity: number;
      actualVelocity: number;
      endDate: Date;
    }>
  ): Array<{
    sprint: string;
    planned: number;
    actual: number;
    date: Date;
    variance: number;
  }> {
    return sprintHistory.map(sprint => ({
      sprint: sprint.sprintName,
      planned: sprint.plannedVelocity,
      actual: sprint.actualVelocity,
      date: sprint.endDate,
      variance: ((sprint.actualVelocity - sprint.plannedVelocity) / sprint.plannedVelocity) * 100,
    }));
  }

  /**
   * Generate cumulative flow diagram data
   */
  static generateCumulativeFlowData(
    startDate: Date,
    endDate: Date,
    dailyTaskCounts: Array<{
      date: Date;
      backlog: number;
      todo: number;
      inProgress: number;
      review: number;
      done: number;
    }>
  ): Array<{
    date: Date;
    backlog: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  }> {
    const data: Array<{
      date: Date;
      backlog: number;
      todo: number;
      inProgress: number;
      review: number;
      done: number;
    }> = [];

    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayData = dailyTaskCounts.find(d => 
        d.date.toDateString() === currentDate.toDateString()
      );

      if (dayData) {
        data.push({
          date: new Date(currentDate),
          backlog: dayData.backlog,
          todo: dayData.todo,
          inProgress: dayData.inProgress,
          review: dayData.review,
          done: dayData.done,
        });
      }

      currentDate = this.addDays(currentDate, 1);
    }

    return data;
  }

  /**
   * Generate team performance radar chart data
   */
  static generateTeamRadarData(developers: Array<{
    name: string;
    velocity: number;
    codeQuality: number;
    collaboration: number;
    commitFrequency: number;
  }>): Array<{
    metric: string;
    teamAverage: number;
    maxValue: number;
    developers: Array<{ name: string; value: number }>;
  }> {
    const metrics = [
      { key: 'velocity', label: 'Velocity', maxValue: 20 },
      { key: 'codeQuality', label: 'Code Quality', maxValue: 10 },
      { key: 'collaboration', label: 'Collaboration', maxValue: 10 },
      { key: 'commitFrequency', label: 'Commit Frequency', maxValue: 30 },
    ];

    return metrics.map(metric => {
      const values = developers.map(dev => dev[metric.key as keyof typeof dev] as number);
      const teamAverage = values.reduce((sum, val) => sum + val, 0) / values.length;

      return {
        metric: metric.label,
        teamAverage,
        maxValue: metric.maxValue,
        developers: developers.map(dev => ({
          name: dev.name,
          value: dev[metric.key as keyof typeof dev] as number,
        })),
      };
    });
  }

  /**
   * Generate sprint health indicators
   */
  static generateSprintHealthData(
    currentSprint: {
      plannedCapacity: number;
      actualCapacity: number;
      completedStoryPoints: number;
      remainingStoryPoints: number;
      daysRemaining: number;
      totalDays: number;
    }
  ): {
    capacityUtilization: number;
    progressRate: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  } {
    const capacityUtilization = (currentSprint.actualCapacity / currentSprint.plannedCapacity) * 100;
    const progressRate = (currentSprint.completedStoryPoints / 
      (currentSprint.completedStoryPoints + currentSprint.remainingStoryPoints)) * 100;
    
    const expectedProgress = ((currentSprint.totalDays - currentSprint.daysRemaining) / currentSprint.totalDays) * 100;
    const progressVariance = progressRate - expectedProgress;

    let riskLevel: 'low' | 'medium' | 'high';
    const recommendations: string[] = [];

    if (progressVariance < -20) {
      riskLevel = 'high';
      recommendations.push('Sprint is significantly behind schedule');
      recommendations.push('Consider removing lower priority items');
    } else if (progressVariance < -10) {
      riskLevel = 'medium';
      recommendations.push('Sprint progress is below expected pace');
      recommendations.push('Review blockers and resource allocation');
    } else {
      riskLevel = 'low';
      if (progressVariance > 10) {
        recommendations.push('Sprint is ahead of schedule');
        recommendations.push('Consider adding additional scope if capacity allows');
      }
    }

    if (capacityUtilization > 100) {
      recommendations.push('Team capacity is overallocated');
      recommendations.push('Monitor for burnout and quality issues');
    } else if (capacityUtilization < 80) {
      recommendations.push('Team has available capacity');
      recommendations.push('Consider adding more work to the sprint');
    }

    return {
      capacityUtilization,
      progressRate,
      riskLevel,
      recommendations,
    };
  }

  /**
   * Helper: Get working days between two dates (excluding weekends)
   */
  private static getWorkingDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      currentDate = this.addDays(currentDate, 1);
    }

    return count - 1; // Subtract 1 because we include start date
  }

  /**
   * Helper: Add working days to a date
   */
  private static addWorkingDays(date: Date, days: number): Date {
    let result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result = this.addDays(result, 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        addedDays++;
      }
    }

    return result;
  }

  /**
   * Helper: Add days to a date
   */
  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}