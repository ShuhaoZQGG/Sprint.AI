import { groqService } from './groq';
import { githubService } from './github';
import { GitHubCommit } from '../types/github';

export interface CommitAnalysis {
  developerId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    totalCommits: number;
    linesAdded: number;
    linesDeleted: number;
    filesModified: number;
    avgCommitSize: number;
    commitFrequency: number; // commits per day
  };
  patterns: {
    commitTimes: { [hour: string]: number };
    commitDays: { [day: string]: number };
    fileTypes: { [extension: string]: number };
    commitTypes: { [type: string]: number };
  };
  skills: {
    detectedSkills: string[];
    skillConfidence: { [skill: string]: number };
    emergingSkills: string[];
    skillProgression: { [skill: string]: number };
  };
  collaboration: {
    pairProgramming: number;
    codeReviews: number;
    mentoring: number;
    knowledgeSharing: number;
  };
  quality: {
    bugFixRatio: number;
    refactoringRatio: number;
    testCoverage: number;
    documentationRatio: number;
    codeComplexity: 'low' | 'medium' | 'high';
  };
  insights: string[];
  recommendations: string[];
}

export interface SkillEvolution {
  skill: string;
  timeline: Array<{
    date: Date;
    proficiency: number;
    evidence: string[];
  }>;
  trend: 'improving' | 'stable' | 'declining';
  projectedGrowth: number;
}

class CommitAnalyzer {
  /**
   * Analyze developer commits using AI
   */
  async analyzeCommits(
    developerId: string,
    repositoryIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CommitAnalysis> {
    try {
      // Fetch commits from GitHub
      const commits = await this.fetchCommitsForPeriod(repositoryIds, startDate, endDate);
      const developerCommits = this.filterCommitsByDeveloper(commits, developerId);

      if (developerCommits.length === 0) {
        return this.createEmptyAnalysis(developerId, startDate, endDate);
      }

      // Basic metrics calculation
      const metrics = this.calculateBasicMetrics(developerCommits, startDate, endDate);
      const patterns = this.analyzeCommitPatterns(developerCommits);

      // AI-powered analysis
      const skills = await this.analyzeSkillsWithAI(developerCommits);
      const collaboration = await this.analyzeCollaborationWithAI(developerCommits);
      const quality = await this.analyzeCodeQualityWithAI(developerCommits);

      // Generate insights and recommendations
      const insights = await this.generateInsightsWithAI(metrics, patterns, skills, collaboration, quality);
      const recommendations = await this.generateRecommendationsWithAI(skills, collaboration, quality, insights);

      return {
        developerId,
        period: { startDate, endDate },
        metrics,
        patterns,
        skills,
        collaboration,
        quality,
        insights,
        recommendations,
      };
    } catch (error) {
      console.error('Error analyzing commits:', error);
      throw new Error('Failed to analyze developer commits');
    }
  }

  /**
   * Analyze skill evolution over time
   */
  async analyzeSkillEvolution(
    developerId: string,
    repositoryIds: string[],
    timeframe: 'quarter' | 'year' | 'all'
  ): Promise<SkillEvolution[]> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDateForTimeframe(timeframe);
      
      const commits = await this.fetchCommitsForPeriod(repositoryIds, startDate, endDate);
      const developerCommits = this.filterCommitsByDeveloper(commits, developerId);

      // Group commits by month for timeline analysis
      const monthlyCommits = this.groupCommitsByMonth(developerCommits);
      
      // Analyze skills for each month using AI
      const skillEvolutions: { [skill: string]: SkillEvolution } = {};

      for (const [monthKey, monthCommits] of Object.entries(monthlyCommits)) {
        const monthDate = new Date(monthKey);
        const monthSkills = await this.analyzeSkillsWithAI(monthCommits);

        for (const skill of monthSkills.detectedSkills) {
          if (!skillEvolutions[skill]) {
            skillEvolutions[skill] = {
              skill,
              timeline: [],
              trend: 'stable',
              projectedGrowth: 0,
            };
          }

          const proficiency = monthSkills.skillConfidence[skill] || 0;
          const evidence = this.extractSkillEvidence(monthCommits, skill);

          skillEvolutions[skill].timeline.push({
            date: monthDate,
            proficiency,
            evidence,
          });
        }
      }

      // Calculate trends and projections for each skill
      return Object.values(skillEvolutions).map(evolution => ({
        ...evolution,
        trend: this.calculateSkillTrend(evolution.timeline),
        projectedGrowth: this.calculateProjectedGrowth(evolution.timeline),
      }));
    } catch (error) {
      console.error('Error analyzing skill evolution:', error);
      throw new Error('Failed to analyze skill evolution');
    }
  }

  /**
   * Analyze skills using AI
   */
  private async analyzeSkillsWithAI(commits: GitHubCommit[]): Promise<CommitAnalysis['skills']> {
    try {
      const commitData = this.prepareCommitDataForAI(commits);
      
      const prompt = `
        Analyze the following developer commit data and extract skill insights:

        Commit Data:
        ${JSON.stringify(commitData, null, 2)}

        Please analyze and provide:
        1. Detected skills based on file types, commit messages, and code changes
        2. Confidence level for each skill (0-1)
        3. Emerging skills that are being developed
        4. Skill progression indicators

        Focus on technical skills like programming languages, frameworks, tools, and methodologies.
        Consider file extensions, commit message patterns, and change types.

        Return a JSON response with the following structure:
        {
          "detectedSkills": ["skill1", "skill2", ...],
          "skillConfidence": {"skill1": 0.8, "skill2": 0.6, ...},
          "emergingSkills": ["newSkill1", "newSkill2", ...],
          "skillProgression": {"skill1": 0.1, "skill2": -0.05, ...}
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const skillsData = this.parseAIResponse(response);

      return {
        detectedSkills: skillsData.detectedSkills || [],
        skillConfidence: skillsData.skillConfidence || {},
        emergingSkills: skillsData.emergingSkills || [],
        skillProgression: skillsData.skillProgression || {},
      };
    } catch (error) {
      console.error('Error analyzing skills with AI:', error);
      return this.getFallbackSkillsAnalysis(commits);
    }
  }

  /**
   * Analyze collaboration patterns using AI
   */
  private async analyzeCollaborationWithAI(commits: GitHubCommit[]): Promise<CommitAnalysis['collaboration']> {
    try {
      const collaborationData = this.extractCollaborationData(commits);
      
      const prompt = `
        Analyze the following commit data for collaboration patterns:

        Collaboration Data:
        ${JSON.stringify(collaborationData, null, 2)}

        Please analyze and provide collaboration metrics (0-10 scale):
        1. Pair programming indicators (co-authored commits, shared files)
        2. Code review participation (review-related commits)
        3. Mentoring activities (helping others, documentation)
        4. Knowledge sharing (cross-team commits, documentation)

        Return a JSON response:
        {
          "pairProgramming": 7.5,
          "codeReviews": 8.2,
          "mentoring": 6.1,
          "knowledgeSharing": 7.8
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const collaborationMetrics = this.parseAIResponse(response);

      return {
        pairProgramming: collaborationMetrics.pairProgramming || 5,
        codeReviews: collaborationMetrics.codeReviews || 5,
        mentoring: collaborationMetrics.mentoring || 5,
        knowledgeSharing: collaborationMetrics.knowledgeSharing || 5,
      };
    } catch (error) {
      console.error('Error analyzing collaboration with AI:', error);
      return this.getFallbackCollaborationAnalysis(commits);
    }
  }

  /**
   * Analyze code quality using AI
   */
  private async analyzeCodeQualityWithAI(commits: GitHubCommit[]): Promise<CommitAnalysis['quality']> {
    try {
      const qualityData = this.extractQualityData(commits);
      
      const prompt = `
        Analyze the following commit data for code quality indicators:

        Quality Data:
        ${JSON.stringify(qualityData, null, 2)}

        Please analyze and provide quality metrics:
        1. Bug fix ratio (percentage of commits that are bug fixes)
        2. Refactoring ratio (percentage of commits that are refactoring)
        3. Test coverage (estimated based on test file changes)
        4. Documentation ratio (percentage of commits with documentation)
        5. Code complexity assessment (low/medium/high)

        Return a JSON response:
        {
          "bugFixRatio": 0.15,
          "refactoringRatio": 0.25,
          "testCoverage": 0.70,
          "documentationRatio": 0.30,
          "codeComplexity": "medium"
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const qualityMetrics = this.parseAIResponse(response);

      return {
        bugFixRatio: qualityMetrics.bugFixRatio || 0.1,
        refactoringRatio: qualityMetrics.refactoringRatio || 0.2,
        testCoverage: qualityMetrics.testCoverage || 0.6,
        documentationRatio: qualityMetrics.documentationRatio || 0.2,
        codeComplexity: qualityMetrics.codeComplexity || 'medium',
      };
    } catch (error) {
      console.error('Error analyzing code quality with AI:', error);
      return this.getFallbackQualityAnalysis(commits);
    }
  }

  /**
   * Generate insights using AI
   */
  private async generateInsightsWithAI(
    metrics: CommitAnalysis['metrics'],
    patterns: CommitAnalysis['patterns'],
    skills: CommitAnalysis['skills'],
    collaboration: CommitAnalysis['collaboration'],
    quality: CommitAnalysis['quality']
  ): Promise<string[]> {
    try {
      const analysisData = { metrics, patterns, skills, collaboration, quality };
      
      const prompt = `
        Based on the following developer analysis data, generate 3-5 key insights:

        Analysis Data:
        ${JSON.stringify(analysisData, null, 2)}

        Generate insights that are:
        1. Actionable and specific
        2. Based on the data provided
        3. Relevant for developer growth
        4. Clear and concise

        Return a JSON array of insight strings:
        ["insight1", "insight2", "insight3", ...]
      `;

      const response = await groqService.generateResponse(prompt);
      const insights = this.parseAIResponse(response);

      return Array.isArray(insights) ? insights : [];
    } catch (error) {
      console.error('Error generating insights with AI:', error);
      return this.getFallbackInsights(metrics, skills, quality);
    }
  }

  /**
   * Generate recommendations using AI
   */
  private async generateRecommendationsWithAI(
    skills: CommitAnalysis['skills'],
    collaboration: CommitAnalysis['collaboration'],
    quality: CommitAnalysis['quality'],
    insights: string[]
  ): Promise<string[]> {
    try {
      const recommendationData = { skills, collaboration, quality, insights };
      
      const prompt = `
        Based on the following developer data and insights, generate 3-5 specific recommendations:

        Data:
        ${JSON.stringify(recommendationData, null, 2)}

        Generate recommendations that are:
        1. Specific and actionable
        2. Focused on improvement opportunities
        3. Realistic and achievable
        4. Aligned with career growth

        Return a JSON array of recommendation strings:
        ["recommendation1", "recommendation2", "recommendation3", ...]
      `;

      const response = await groqService.generateResponse(prompt);
      const recommendations = this.parseAIResponse(response);

      return Array.isArray(recommendations) ? recommendations : [];
    } catch (error) {
      console.error('Error generating recommendations with AI:', error);
      return this.getFallbackRecommendations(skills, collaboration, quality);
    }
  }

  // Helper methods for data processing and fallbacks

  private async fetchCommitsForPeriod(
    repositoryIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<GitHubCommit[]> {
    const allCommits: GitHubCommit[] = [];
    
    for (const repoId of repositoryIds) {
      try {
        const commits = await githubService.getCommits(repoId, {
          since: startDate.toISOString(),
          until: endDate.toISOString(),
        });
        allCommits.push(...commits);
      } catch (error) {
        console.warn(`Failed to fetch commits for repository ${repoId}:`, error);
      }
    }
    
    return allCommits;
  }

  private filterCommitsByDeveloper(commits: GitHubCommit[], developerId: string): GitHubCommit[] {
    // This would need to match developer ID with commit author
    // For now, we'll use a simple email/username match
    return commits.filter(commit => 
      commit.author?.login === developerId || 
      commit.commit.author.email.includes(developerId)
    );
  }

  private calculateBasicMetrics(
    commits: GitHubCommit[],
    startDate: Date,
    endDate: Date
  ): CommitAnalysis['metrics'] {
    const totalCommits = commits.length;
    const linesAdded = commits.reduce((sum, commit) => sum + (commit.stats?.additions || 0), 0);
    const linesDeleted = commits.reduce((sum, commit) => sum + (commit.stats?.deletions || 0), 0);
    const filesModified = commits.reduce((sum, commit) => sum + (commit.stats?.total || 0), 0);
    
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const commitFrequency = totalCommits / daysDiff;
    const avgCommitSize = totalCommits > 0 ? (linesAdded + linesDeleted) / totalCommits : 0;

    return {
      totalCommits,
      linesAdded,
      linesDeleted,
      filesModified,
      avgCommitSize,
      commitFrequency,
    };
  }

  private analyzeCommitPatterns(commits: GitHubCommit[]): CommitAnalysis['patterns'] {
    const commitTimes: { [hour: string]: number } = {};
    const commitDays: { [day: string]: number } = {};
    const fileTypes: { [extension: string]: number } = {};
    const commitTypes: { [type: string]: number } = {};

    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date);
      const hour = date.getHours().toString();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });

      commitTimes[hour] = (commitTimes[hour] || 0) + 1;
      commitDays[day] = (commitDays[day] || 0) + 1;

      // Analyze commit message for type
      const message = commit.commit.message.toLowerCase();
      if (message.includes('fix') || message.includes('bug')) {
        commitTypes['bug-fix'] = (commitTypes['bug-fix'] || 0) + 1;
      } else if (message.includes('feat') || message.includes('add')) {
        commitTypes['feature'] = (commitTypes['feature'] || 0) + 1;
      } else if (message.includes('refactor')) {
        commitTypes['refactor'] = (commitTypes['refactor'] || 0) + 1;
      } else if (message.includes('test')) {
        commitTypes['test'] = (commitTypes['test'] || 0) + 1;
      } else if (message.includes('doc')) {
        commitTypes['documentation'] = (commitTypes['documentation'] || 0) + 1;
      } else {
        commitTypes['other'] = (commitTypes['other'] || 0) + 1;
      }
    });

    return { commitTimes, commitDays, fileTypes, commitTypes };
  }

  private prepareCommitDataForAI(commits: GitHubCommit[]): any {
    return {
      totalCommits: commits.length,
      commitMessages: commits.slice(0, 20).map(c => c.commit.message),
      fileChanges: commits.slice(0, 10).map(c => ({
        additions: c.stats?.additions || 0,
        deletions: c.stats?.deletions || 0,
        files: c.files?.map(f => f.filename) || [],
      })),
      timePattern: commits.map(c => new Date(c.commit.author.date).getHours()),
    };
  }

  private extractCollaborationData(commits: GitHubCommit[]): any {
    return {
      coAuthoredCommits: commits.filter(c => 
        c.commit.message.includes('Co-authored-by')
      ).length,
      reviewCommits: commits.filter(c => 
        c.commit.message.toLowerCase().includes('review') ||
        c.commit.message.toLowerCase().includes('pr')
      ).length,
      documentationCommits: commits.filter(c => 
        c.commit.message.toLowerCase().includes('doc') ||
        c.files?.some(f => f.filename.includes('README') || f.filename.includes('.md'))
      ).length,
      totalCommits: commits.length,
    };
  }

  private extractQualityData(commits: GitHubCommit[]): any {
    return {
      bugFixCommits: commits.filter(c => 
        c.commit.message.toLowerCase().includes('fix') ||
        c.commit.message.toLowerCase().includes('bug')
      ).length,
      refactorCommits: commits.filter(c => 
        c.commit.message.toLowerCase().includes('refactor')
      ).length,
      testCommits: commits.filter(c => 
        c.commit.message.toLowerCase().includes('test') ||
        c.files?.some(f => f.filename.includes('test') || f.filename.includes('spec'))
      ).length,
      totalCommits: commits.length,
      avgCommitSize: commits.reduce((sum, c) => sum + (c.stats?.total || 0), 0) / commits.length,
    };
  }

  private parseAIResponse(response: string): any {
    try {
      // Extract JSON from response if it's wrapped in text
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

  // Fallback methods for when AI analysis fails

  private getFallbackSkillsAnalysis(commits: GitHubCommit[]): CommitAnalysis['skills'] {
    const fileExtensions = commits.flatMap(c => 
      c.files?.map(f => f.filename.split('.').pop()?.toLowerCase()) || []
    ).filter(Boolean);

    const skillMap: { [ext: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React',
      'tsx': 'React',
      'py': 'Python',
      'java': 'Java',
      'css': 'CSS',
      'html': 'HTML',
      'sql': 'SQL',
      'md': 'Documentation',
    };

    const detectedSkills = [...new Set(
      fileExtensions.map(ext => skillMap[ext!]).filter(Boolean)
    )];

    const skillConfidence: { [skill: string]: number } = {};
    detectedSkills.forEach(skill => {
      skillConfidence[skill] = 0.7; // Default confidence
    });

    return {
      detectedSkills,
      skillConfidence,
      emergingSkills: [],
      skillProgression: {},
    };
  }

  private getFallbackCollaborationAnalysis(commits: GitHubCommit[]): CommitAnalysis['collaboration'] {
    const coAuthoredCommits = commits.filter(c => 
      c.commit.message.includes('Co-authored-by')
    ).length;
    
    const reviewCommits = commits.filter(c => 
      c.commit.message.toLowerCase().includes('review')
    ).length;

    return {
      pairProgramming: Math.min(10, (coAuthoredCommits / commits.length) * 20),
      codeReviews: Math.min(10, (reviewCommits / commits.length) * 15),
      mentoring: 5, // Default
      knowledgeSharing: 5, // Default
    };
  }

  private getFallbackQualityAnalysis(commits: GitHubCommit[]): CommitAnalysis['quality'] {
    const bugFixCommits = commits.filter(c => 
      c.commit.message.toLowerCase().includes('fix')
    ).length;
    
    const testCommits = commits.filter(c => 
      c.commit.message.toLowerCase().includes('test')
    ).length;

    return {
      bugFixRatio: bugFixCommits / commits.length,
      refactoringRatio: 0.2,
      testCoverage: testCommits / commits.length,
      documentationRatio: 0.1,
      codeComplexity: 'medium',
    };
  }

  private getFallbackInsights(
    metrics: CommitAnalysis['metrics'],
    skills: CommitAnalysis['skills'],
    quality: CommitAnalysis['quality']
  ): string[] {
    const insights: string[] = [];

    if (metrics.commitFrequency > 2) {
      insights.push('High commit frequency indicates active development');
    }

    if (skills.detectedSkills.length > 5) {
      insights.push('Demonstrates versatility across multiple technologies');
    }

    if (quality.testCoverage > 0.3) {
      insights.push('Good focus on testing and quality assurance');
    }

    return insights;
  }

  private getFallbackRecommendations(
    skills: CommitAnalysis['skills'],
    collaboration: CommitAnalysis['collaboration'],
    quality: CommitAnalysis['quality']
  ): string[] {
    const recommendations: string[] = [];

    if (collaboration.pairProgramming < 5) {
      recommendations.push('Consider more pair programming to improve collaboration');
    }

    if (quality.testCoverage < 0.5) {
      recommendations.push('Increase focus on writing tests to improve code quality');
    }

    if (skills.detectedSkills.length < 3) {
      recommendations.push('Explore new technologies to broaden skill set');
    }

    return recommendations;
  }

  private createEmptyAnalysis(
    developerId: string,
    startDate: Date,
    endDate: Date
  ): CommitAnalysis {
    return {
      developerId,
      period: { startDate, endDate },
      metrics: {
        totalCommits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        filesModified: 0,
        avgCommitSize: 0,
        commitFrequency: 0,
      },
      patterns: {
        commitTimes: {},
        commitDays: {},
        fileTypes: {},
        commitTypes: {},
      },
      skills: {
        detectedSkills: [],
        skillConfidence: {},
        emergingSkills: [],
        skillProgression: {},
      },
      collaboration: {
        pairProgramming: 0,
        codeReviews: 0,
        mentoring: 0,
        knowledgeSharing: 0,
      },
      quality: {
        bugFixRatio: 0,
        refactoringRatio: 0,
        testCoverage: 0,
        documentationRatio: 0,
        codeComplexity: 'low',
      },
      insights: ['No commit data available for analysis'],
      recommendations: ['Start making commits to enable analysis'],
    };
  }

  private getStartDateForTimeframe(timeframe: 'quarter' | 'year' | 'all'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'all':
        return new Date(2020, 0, 1); // Arbitrary start date
      default:
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    }
  }

  private groupCommitsByMonth(commits: GitHubCommit[]): { [monthKey: string]: GitHubCommit[] } {
    const grouped: { [monthKey: string]: GitHubCommit[] } = {};
    
    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(commit);
    });
    
    return grouped;
  }

  private extractSkillEvidence(commits: GitHubCommit[], skill: string): string[] {
    return commits
      .filter(commit => 
        commit.commit.message.toLowerCase().includes(skill.toLowerCase()) ||
        commit.files?.some(file => 
          file.filename.toLowerCase().includes(skill.toLowerCase())
        )
      )
      .slice(0, 3)
      .map(commit => commit.commit.message);
  }

  private calculateSkillTrend(timeline: Array<{ date: Date; proficiency: number }>): 'improving' | 'stable' | 'declining' {
    if (timeline.length < 2) return 'stable';
    
    const recent = timeline.slice(-3);
    const older = timeline.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, t) => sum + t.proficiency, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.proficiency, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private calculateProjectedGrowth(timeline: Array<{ date: Date; proficiency: number }>): number {
    if (timeline.length < 2) return 0;
    
    // Simple linear regression for growth projection
    const n = timeline.length;
    const x = timeline.map((_, i) => i);
    const y = timeline.map(t => t.proficiency);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return slope * 3; // Project 3 months ahead
  }
}

export const commitAnalyzer = new CommitAnalyzer();