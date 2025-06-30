import { groqService } from './groq';
import { Developer } from '../types';
import { commitAnalyzer, CommitAnalysis } from './commitAnalyzer';
import { codeMetricsCalculator } from '../utils/codeMetrics';

export interface TeamOptimizationAnalysis {
  teamComposition: {
    totalMembers: number;
    skillDistribution: { [skill: string]: number };
    experienceLevels: { [level: string]: number };
    roleBalance: { [role: string]: number };
  };
  skillGaps: {
    criticalGaps: string[];
    emergingNeeds: string[];
    overrepresented: string[];
    recommendations: string[];
  };
  collaborationInsights: {
    pairProgrammingOpportunities: Array<{
      mentor: string;
      mentee: string;
      skill: string;
      benefit: number;
    }>;
    knowledgeSharingNeeds: string[];
    communicationPatterns: {
      isolated: string[];
      connectors: string[];
      bottlenecks: string[];
    };
  };
  performanceOptimization: {
    underutilized: Array<{
      developerId: string;
      name: string;
      availableCapacity: number;
      suggestedTasks: string[];
    }>;
    overloaded: Array<{
      developerId: string;
      name: string;
      overloadPercentage: number;
      redistributionSuggestions: string[];
    }>;
    skillMismatches: Array<{
      developerId: string;
      name: string;
      currentTasks: string[];
      betterSuitedTasks: string[];
    }>;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    priority: 'low' | 'medium' | 'high';
  };
}

export interface TeamHealthMetrics {
  overallHealth: number; // 0-100
  skillCoverage: number; // 0-100
  workloadBalance: number; // 0-100
  collaborationScore: number; // 0-100
  growthPotential: number; // 0-100
  riskFactors: string[];
  strengths: string[];
}

export interface SkillGapAnalysis {
  skill: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  developersWithSkill: Array<{
    developerId: string;
    name: string;
    proficiency: number;
  }>;
  trainingRecommendations: string[];
}

class TeamOptimizer {
  /**
   * Analyze team composition and optimization opportunities
   */
  async analyzeTeam(
    developers: Developer[],
    currentTasks: any[],
    projectRequirements: string[]
  ): Promise<TeamOptimizationAnalysis> {
    try {
      // Gather comprehensive team data
      const teamData = await this.gatherTeamData(developers, currentTasks);
      
      // Analyze team composition
      const teamComposition = this.analyzeTeamComposition(developers);
      
      // Identify skill gaps using AI
      const skillGaps = await this.identifySkillGapsWithAI(developers, projectRequirements);
      
      // Analyze collaboration patterns
      const collaborationInsights = await this.analyzeCollaborationPatterns(developers, teamData);
      
      // Optimize performance allocation
      const performanceOptimization = this.analyzePerformanceOptimization(developers, currentTasks);
      
      // Generate comprehensive recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        teamComposition,
        skillGaps,
        collaborationInsights,
        performanceOptimization
      );

      return {
        teamComposition,
        skillGaps,
        collaborationInsights,
        performanceOptimization,
        recommendations,
      };
    } catch (error) {
      console.error('Error analyzing team:', error);
      throw new Error('Failed to analyze team optimization opportunities');
    }
  }

  /**
   * Calculate team health metrics
   */
  async calculateTeamHealth(
    developers: Developer[],
    recentPerformance: any[]
  ): Promise<TeamHealthMetrics> {
    try {
      const skillCoverage = this.calculateSkillCoverage(developers);
      const workloadBalance = this.calculateWorkloadBalance(developers, recentPerformance);
      const collaborationScore = this.calculateCollaborationScore(developers, recentPerformance);
      const growthPotential = this.calculateGrowthPotential(developers);
      
      const overallHealth = (skillCoverage + workloadBalance + collaborationScore + growthPotential) / 4;
      
      const riskFactors = this.identifyRiskFactors(developers, recentPerformance);
      const strengths = this.identifyTeamStrengths(developers);

      return {
        overallHealth,
        skillCoverage,
        workloadBalance,
        collaborationScore,
        growthPotential,
        riskFactors,
        strengths,
      };
    } catch (error) {
      console.error('Error calculating team health:', error);
      throw new Error('Failed to calculate team health metrics');
    }
  }

  /**
   * Analyze skill gaps using AI
   */
  async analyzeSkillGaps(
    developers: Developer[],
    projectRequirements: string[],
    industryTrends: string[] = []
  ): Promise<SkillGapAnalysis[]> {
    try {
      const teamSkills = this.extractTeamSkills(developers);
      
      const prompt = `
        Analyze the following team skills against project requirements and industry trends:

        Team Skills:
        ${JSON.stringify(teamSkills, null, 2)}

        Project Requirements:
        ${JSON.stringify(projectRequirements, null, 2)}

        Industry Trends:
        ${JSON.stringify(industryTrends, null, 2)}

        Please identify skill gaps and provide analysis for each gap:
        1. Current team level for each required skill (0-10)
        2. Required level for project success (0-10)
        3. Gap severity and business impact
        4. Developers who have some proficiency in the skill
        5. Training and development recommendations

        Return a JSON array of skill gap analyses:
        [
          {
            "skill": "React",
            "currentLevel": 6.5,
            "requiredLevel": 8.0,
            "gap": 1.5,
            "impact": "medium",
            "developersWithSkill": [
              {"developerId": "dev1", "name": "John", "proficiency": 7}
            ],
            "trainingRecommendations": ["Advanced React patterns course", "Mentoring program"]
          }
        ]
      `;

      const response = await groqService.makeCompletion(prompt);
      const skillGaps = this.parseAIResponse(response);

      return Array.isArray(skillGaps) ? skillGaps : [];
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
      return this.getFallbackSkillGaps(developers, projectRequirements);
    }
  }

  /**
   * Generate team optimization recommendations
   */
  async generateTeamRecommendations(
    teamAnalysis: TeamOptimizationAnalysis,
    teamHealth: TeamHealthMetrics
  ): Promise<{
    immediate: Array<{ action: string; priority: number; effort: string; impact: string }>;
    shortTerm: Array<{ action: string; timeline: string; resources: string; outcome: string }>;
    longTerm: Array<{ action: string; timeline: string; investment: string; benefit: string }>;
  }> {
    try {
      const recommendationData = {
        teamAnalysis: {
          skillGaps: teamAnalysis.skillGaps.criticalGaps,
          collaboration: teamAnalysis.collaborationInsights.knowledgeSharingNeeds,
          performance: teamAnalysis.performanceOptimization.underutilized.length,
        },
        teamHealth: {
          overallHealth: teamHealth.overallHealth,
          riskFactors: teamHealth.riskFactors,
          strengths: teamHealth.strengths,
        },
      };

      const prompt = `
        Based on the following team analysis and health metrics, generate specific recommendations:

        Team Data:
        ${JSON.stringify(recommendationData, null, 2)}

        Generate three categories of recommendations:
        1. Immediate actions (can be implemented within 1-2 weeks)
        2. Short-term initiatives (1-3 months)
        3. Long-term strategic changes (3-12 months)

        Each recommendation should include specific details about implementation, effort, and expected impact.

        Return a JSON response:
        {
          "immediate": [
            {
              "action": "Specific action to take",
              "priority": 8,
              "effort": "Low/Medium/High",
              "impact": "Expected outcome"
            }
          ],
          "shortTerm": [
            {
              "action": "Initiative description",
              "timeline": "2-3 months",
              "resources": "Required resources",
              "outcome": "Expected outcome"
            }
          ],
          "longTerm": [
            {
              "action": "Strategic change",
              "timeline": "6-12 months",
              "investment": "Required investment",
              "benefit": "Long-term benefit"
            }
          ]
        }
      `;

      const response = await groqService.makeCompletion(prompt);
      const recommendations = this.parseAIResponse(response);

      return {
        immediate: recommendations.immediate || [],
        shortTerm: recommendations.shortTerm || [],
        longTerm: recommendations.longTerm || [],
      };
    } catch (error) {
      console.error('Error generating team recommendations:', error);
      return this.getFallbackRecommendations(teamAnalysis, teamHealth);
    }
  }

  // Private helper methods

  private async gatherTeamData(developers: Developer[], currentTasks: any[]): Promise<any> {
    const teamData: any = {
      developers: developers.length,
      totalVelocity: developers.reduce((sum, dev) => sum + dev.profile.velocity, 0),
      skillDistribution: {},
      taskDistribution: {},
      collaborationMetrics: {},
    };

    // Gather skill distribution
    developers.forEach(dev => {
      dev.profile.strengths.forEach(skill => {
        teamData.skillDistribution[skill] = (teamData.skillDistribution[skill] || 0) + 1;
      });
    });

    // Gather task distribution
    currentTasks.forEach(task => {
      const type = task.type || 'unknown';
      teamData.taskDistribution[type] = (teamData.taskDistribution[type] || 0) + 1;
    });

    return teamData;
  }

  private analyzeTeamComposition(developers: Developer[]): TeamOptimizationAnalysis['teamComposition'] {
    const skillDistribution: { [skill: string]: number } = {};
    const experienceLevels: { [level: string]: number } = { junior: 0, mid: 0, senior: 0 };
    const roleBalance: { [role: string]: number } = {};

    developers.forEach(dev => {
      // Count skills
      dev.profile.strengths.forEach(skill => {
        skillDistribution[skill] = (skillDistribution[skill] || 0) + 1;
      });

      // Categorize experience level based on velocity and code quality
      const experienceScore = (dev.profile.velocity + dev.profile.codeQuality) / 2;
      if (experienceScore >= 8) experienceLevels.senior++;
      else if (experienceScore >= 6) experienceLevels.mid++;
      else experienceLevels.junior++;

      // Count preferred task types as roles
      dev.profile.preferredTasks.forEach(taskType => {
        roleBalance[taskType] = (roleBalance[taskType] || 0) + 1;
      });
    });

    return {
      totalMembers: developers.length,
      skillDistribution,
      experienceLevels,
      roleBalance,
    };
  }

  private async identifySkillGapsWithAI(
    developers: Developer[],
    projectRequirements: string[]
  ): Promise<TeamOptimizationAnalysis['skillGaps']> {
    try {
      const teamSkills = developers.flatMap(dev => dev.profile.strengths);
      const skillCounts = teamSkills.reduce((counts, skill) => {
        counts[skill] = (counts[skill] || 0) + 1;
        return counts;
      }, {} as { [skill: string]: number });

      const gapAnalysisData = {
        teamSkills: skillCounts,
        projectRequirements,
        teamSize: developers.length,
      };

      const prompt = `
        Analyze skill gaps for this development team:

        Team Data:
        ${JSON.stringify(gapAnalysisData, null, 2)}

        Identify:
        1. Critical skill gaps that could block project success
        2. Emerging technology needs for future projects
        3. Overrepresented skills that might indicate imbalance
        4. Specific recommendations to address gaps

        Return a JSON response:
        {
          "criticalGaps": ["skill1", "skill2"],
          "emergingNeeds": ["skill3", "skill4"],
          "overrepresented": ["skill5"],
          "recommendations": ["recommendation1", "recommendation2"]
        }
      `;

      const response = await groqService.makeCompletion(prompt);
      const skillGaps = this.parseAIResponse(response);

      return {
        criticalGaps: skillGaps.criticalGaps || [],
        emergingNeeds: skillGaps.emergingNeeds || [],
        overrepresented: skillGaps.overrepresented || [],
        recommendations: skillGaps.recommendations || [],
      };
    } catch (error) {
      console.error('Error identifying skill gaps with AI:', error);
      return this.getFallbackSkillGapsAnalysis(developers, projectRequirements);
    }
  }

  private async analyzeCollaborationPatterns(
    developers: Developer[],
    teamData: any
  ): Promise<TeamOptimizationAnalysis['collaborationInsights']> {
    // Identify pairing opportunities based on skill complementarity
    const pairProgrammingOpportunities: Array<{
      mentor: string;
      mentee: string;
      skill: string;
      benefit: number;
    }> = [];

    developers.forEach(mentor => {
      developers.forEach(mentee => {
        if (mentor.id !== mentee.id) {
          mentor.profile.strengths.forEach(skill => {
            if (!mentee.profile.strengths.includes(skill)) {
              const benefit = mentor.profile.codeQuality + mentor.profile.collaboration;
              pairProgrammingOpportunities.push({
                mentor: mentor.name,
                mentee: mentee.name,
                skill,
                benefit,
              });
            }
          });
        }
      });
    });

    // Sort by benefit and take top opportunities
    pairProgrammingOpportunities.sort((a, b) => b.benefit - a.benefit);

    const knowledgeSharingNeeds = this.identifyKnowledgeSharingNeeds(developers);
    const communicationPatterns = this.analyzeCommunicationPatterns(developers);

    return {
      pairProgrammingOpportunities: pairProgrammingOpportunities.slice(0, 5),
      knowledgeSharingNeeds,
      communicationPatterns,
    };
  }

  private analyzePerformanceOptimization(
    developers: Developer[],
    currentTasks: any[]
  ): TeamOptimizationAnalysis['performanceOptimization'] {
    const underutilized: Array<{
      developerId: string;
      name: string;
      availableCapacity: number;
      suggestedTasks: string[];
    }> = [];

    const overloaded: Array<{
      developerId: string;
      name: string;
      overloadPercentage: number;
      redistributionSuggestions: string[];
    }> = [];

    const skillMismatches: Array<{
      developerId: string;
      name: string;
      currentTasks: string[];
      betterSuitedTasks: string[];
    }> = [];

    developers.forEach(dev => {
      const assignedTasks = currentTasks.filter(task => task.assigned_to === dev.id);
      const totalEffort = assignedTasks.reduce((sum, task) => sum + (task.estimated_effort || 0), 0);
      const capacity = dev.profile.velocity * 8; // Assuming 8 hours per velocity point

      const utilizationRate = totalEffort / capacity;

      if (utilizationRate < 0.7) {
        underutilized.push({
          developerId: dev.id,
          name: dev.name,
          availableCapacity: Math.round((1 - utilizationRate) * 100),
          suggestedTasks: this.suggestTasksForDeveloper(dev, currentTasks),
        });
      } else if (utilizationRate > 1.2) {
        overloaded.push({
          developerId: dev.id,
          name: dev.name,
          overloadPercentage: Math.round((utilizationRate - 1) * 100),
          redistributionSuggestions: this.suggestTaskRedistribution(dev, assignedTasks),
        });
      }

      // Check for skill mismatches
      const mismatchedTasks = assignedTasks.filter(task => 
        !dev.profile.preferredTasks.includes(task.type)
      );

      if (mismatchedTasks.length > 0) {
        skillMismatches.push({
          developerId: dev.id,
          name: dev.name,
          currentTasks: mismatchedTasks.map(task => task.title),
          betterSuitedTasks: this.findBetterSuitedTasks(dev, currentTasks),
        });
      }
    });

    return {
      underutilized,
      overloaded,
      skillMismatches,
    };
  }

  private async generateOptimizationRecommendations(
    teamComposition: TeamOptimizationAnalysis['teamComposition'],
    skillGaps: TeamOptimizationAnalysis['skillGaps'],
    collaborationInsights: TeamOptimizationAnalysis['collaborationInsights'],
    performanceOptimization: TeamOptimizationAnalysis['performanceOptimization']
  ): Promise<TeamOptimizationAnalysis['recommendations']> {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Immediate recommendations
    if (performanceOptimization.overloaded.length > 0) {
      immediate.push('Redistribute tasks from overloaded team members');
    }
    if (skillGaps.criticalGaps.length > 0) {
      immediate.push('Address critical skill gaps through training or hiring');
    }

    // Short-term recommendations
    if (collaborationInsights.pairProgrammingOpportunities.length > 0) {
      shortTerm.push('Implement pair programming sessions for knowledge transfer');
    }
    if (skillGaps.emergingNeeds.length > 0) {
      shortTerm.push('Plan training for emerging technology needs');
    }

    // Long-term recommendations
    if (teamComposition.totalMembers < 5) {
      longTerm.push('Consider team expansion for better skill coverage');
    }
    longTerm.push('Develop career progression paths for team members');

    const priority = skillGaps.criticalGaps.length > 0 ? 'high' : 
                    performanceOptimization.overloaded.length > 0 ? 'medium' : 'low';

    return {
      immediate,
      shortTerm,
      longTerm,
      priority,
    };
  }

  // Additional helper methods

  private calculateSkillCoverage(developers: Developer[]): number {
    const requiredSkills = ['Frontend', 'Backend', 'Testing', 'DevOps', 'Database'];
    const teamSkills = developers.flatMap(dev => dev.profile.strengths);
    const coveredSkills = requiredSkills.filter(skill => teamSkills.includes(skill));
    return (coveredSkills.length / requiredSkills.length) * 100;
  }

  private calculateWorkloadBalance(developers: Developer[], recentPerformance: any[]): number {
    const velocities = developers.map(dev => dev.profile.velocity);
    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / avgVelocity;
    
    return Math.max(0, (1 - coefficientOfVariation) * 100);
  }

  private calculateCollaborationScore(developers: Developer[], recentPerformance: any[]): number {
    const avgCollaboration = developers.reduce((sum, dev) => sum + dev.profile.collaboration, 0) / developers.length;
    return (avgCollaboration / 10) * 100;
  }

  private calculateGrowthPotential(developers: Developer[]): number {
    // Calculate based on skill diversity and learning indicators
    const totalSkills = developers.reduce((sum, dev) => sum + dev.profile.strengths.length, 0);
    const avgSkillsPerDeveloper = totalSkills / developers.length;
    const uniqueSkills = new Set(developers.flatMap(dev => dev.profile.strengths)).size;
    
    return Math.min(100, (avgSkillsPerDeveloper * 10) + (uniqueSkills * 2));
  }

  private identifyRiskFactors(developers: Developer[], recentPerformance: any[]): string[] {
    const risks: string[] = [];
    
    if (developers.length < 3) {
      risks.push('Team size too small - single points of failure');
    }
    
    const lowPerformers = developers.filter(dev => dev.profile.velocity < 5).length;
    if (lowPerformers > developers.length * 0.3) {
      risks.push('High percentage of low-velocity developers');
    }
    
    const skillCoverage = this.calculateSkillCoverage(developers);
    if (skillCoverage < 60) {
      risks.push('Insufficient skill coverage for project requirements');
    }
    
    return risks;
  }

  private identifyTeamStrengths(developers: Developer[]): string[] {
    const strengths: string[] = [];
    
    const avgQuality = developers.reduce((sum, dev) => sum + dev.profile.codeQuality, 0) / developers.length;
    if (avgQuality > 8) {
      strengths.push('High code quality standards');
    }
    
    const avgCollaboration = developers.reduce((sum, dev) => sum + dev.profile.collaboration, 0) / developers.length;
    if (avgCollaboration > 8) {
      strengths.push('Strong collaboration culture');
    }
    
    const uniqueSkills = new Set(developers.flatMap(dev => dev.profile.strengths)).size;
    if (uniqueSkills > 10) {
      strengths.push('Diverse skill set');
    }
    
    return strengths;
  }

  private extractTeamSkills(developers: Developer[]): { [skill: string]: number } {
    const skillCounts: { [skill: string]: number } = {};
    developers.forEach(dev => {
      dev.profile.strengths.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    return skillCounts;
  }

  private identifyKnowledgeSharingNeeds(developers: Developer[]): string[] {
    const allSkills = developers.flatMap(dev => dev.profile.strengths);
    const skillCounts = allSkills.reduce((counts, skill) => {
      counts[skill] = (counts[skill] || 0) + 1;
      return counts;
    }, {} as { [skill: string]: number });

    // Identify skills known by only one person
    return Object.entries(skillCounts)
      .filter(([_, count]) => count === 1)
      .map(([skill, _]) => skill);
  }

  private analyzeCommunicationPatterns(developers: Developer[]): {
    isolated: string[];
    connectors: string[];
    bottlenecks: string[];
  } {
    // Simplified analysis based on collaboration scores
    const isolated = developers
      .filter(dev => dev.profile.collaboration < 6)
      .map(dev => dev.name);

    const connectors = developers
      .filter(dev => dev.profile.collaboration > 8)
      .map(dev => dev.name);

    const bottlenecks = developers
      .filter(dev => dev.profile.strengths.length > 5 && dev.profile.collaboration < 7)
      .map(dev => dev.name);

    return { isolated, connectors, bottlenecks };
  }

  private suggestTasksForDeveloper(developer: Developer, allTasks: any[]): string[] {
    const unassignedTasks = allTasks.filter(task => !task.assigned_to);
    const suitableTasks = unassignedTasks.filter(task => 
      developer.profile.preferredTasks.includes(task.type)
    );
    
    return suitableTasks.slice(0, 3).map(task => task.title);
  }

  private suggestTaskRedistribution(developer: Developer, assignedTasks: any[]): string[] {
    const suggestions: string[] = [];
    
    if (assignedTasks.length > 5) {
      suggestions.push('Reduce number of concurrent tasks');
    }
    
    const lowPriorityTasks = assignedTasks.filter(task => task.priority === 'low');
    if (lowPriorityTasks.length > 0) {
      suggestions.push('Reassign low-priority tasks to other team members');
    }
    
    return suggestions;
  }

  private findBetterSuitedTasks(developer: Developer, allTasks: any[]): string[] {
    const unassignedTasks = allTasks.filter(task => !task.assigned_to);
    const betterTasks = unassignedTasks.filter(task => 
      developer.profile.preferredTasks.includes(task.type)
    );
    
    return betterTasks.slice(0, 5).map(task => task.title);
  }

  private parseAIResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }

  private getFallbackSkillGaps(developers: Developer[], projectRequirements: string[]): SkillGapAnalysis[] {
    const teamSkills = developers.flatMap(dev => dev.profile.strengths);
    const missingSkills = projectRequirements.filter(req => !teamSkills.includes(req));
    
    return missingSkills.map(skill => ({
      skill,
      currentLevel: 0,
      requiredLevel: 8,
      gap: 8,
      impact: 'high' as const,
      developersWithSkill: [],
      trainingRecommendations: [`Training needed for ${skill}`],
    }));
  }

  private getFallbackSkillGapsAnalysis(
    developers: Developer[],
    projectRequirements: string[]
  ): TeamOptimizationAnalysis['skillGaps'] {
    const teamSkills = developers.flatMap(dev => dev.profile.strengths);
    const criticalGaps = projectRequirements.filter(req => !teamSkills.includes(req));
    
    return {
      criticalGaps,
      emergingNeeds: ['AI/ML', 'Cloud Architecture'],
      overrepresented: [],
      recommendations: ['Hire specialists for critical gaps', 'Implement training programs'],
    };
  }

  private getFallbackRecommendations(
    teamAnalysis: TeamOptimizationAnalysis,
    teamHealth: TeamHealthMetrics
  ): {
    immediate: Array<{ action: string; priority: number; effort: string; impact: string }>;
    shortTerm: Array<{ action: string; timeline: string; resources: string; outcome: string }>;
    longTerm: Array<{ action: string; timeline: string; investment: string; benefit: string }>;
  } {
    return {
      immediate: [
        {
          action: 'Review current task assignments',
          priority: 8,
          effort: 'Low',
          impact: 'Improved workload balance',
        },
      ],
      shortTerm: [
        {
          action: 'Implement skill development program',
          timeline: '2-3 months',
          resources: 'Training budget and time allocation',
          outcome: 'Reduced skill gaps',
        },
      ],
      longTerm: [
        {
          action: 'Strategic team expansion',
          timeline: '6-12 months',
          investment: 'Hiring budget and onboarding resources',
          benefit: 'Comprehensive skill coverage',
        },
      ],
    };
  }
}

export const teamOptimizer = new TeamOptimizer();