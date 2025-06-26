import { groqService } from '../services/groq';

export interface CodeComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: string[];
}

export interface CodeQualityMetrics {
  duplicateCodeRatio: number;
  commentRatio: number;
  testCoverageRatio: number;
  bugDensity: number;
  securityVulnerabilities: number;
  performanceIssues: string[];
}

export interface ArchitecturalMetrics {
  modularity: number;
  coupling: number;
  cohesion: number;
  abstractness: number;
  instability: number;
  designPatterns: string[];
}

export interface ProductivityMetrics {
  linesOfCodePerHour: number;
  featuresDeliveredPerSprint: number;
  bugFixTime: number;
  codeReviewTime: number;
  deploymentFrequency: number;
  leadTime: number;
}

class CodeMetricsCalculator {
  /**
   * Analyze code complexity using AI
   */
  async analyzeCodeComplexity(
    codeFiles: Array<{ filename: string; content: string; language: string }>
  ): Promise<CodeComplexityMetrics> {
    try {
      const codeAnalysisData = this.prepareCodeForAnalysis(codeFiles);
      
      const prompt = `
        Analyze the following code files for complexity metrics:

        Code Analysis Data:
        ${JSON.stringify(codeAnalysisData, null, 2)}

        Please analyze and provide complexity metrics:
        1. Cyclomatic Complexity (1-10 scale, where 1 is simple, 10 is very complex)
        2. Cognitive Complexity (1-10 scale, how hard it is to understand)
        3. Maintainability Index (0-100 scale, where 100 is highly maintainable)
        4. Technical Debt (0-10 scale, where 0 is no debt, 10 is high debt)
        5. Code Smells (array of identified issues)

        Consider factors like:
        - Function length and nesting depth
        - Number of parameters and variables
        - Control flow complexity
        - Code duplication
        - Naming conventions
        - Documentation quality

        Return a JSON response:
        {
          "cyclomaticComplexity": 6.5,
          "cognitiveComplexity": 7.2,
          "maintainabilityIndex": 75,
          "technicalDebt": 4.3,
          "codeSmells": ["Long functions", "Deep nesting", "Magic numbers"]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const metrics = this.parseAIResponse(response);

      return {
        cyclomaticComplexity: metrics.cyclomaticComplexity || 5,
        cognitiveComplexity: metrics.cognitiveComplexity || 5,
        maintainabilityIndex: metrics.maintainabilityIndex || 70,
        technicalDebt: metrics.technicalDebt || 3,
        codeSmells: metrics.codeSmells || [],
      };
    } catch (error) {
      console.error('Error analyzing code complexity:', error);
      return this.getFallbackComplexityMetrics();
    }
  }

  /**
   * Analyze code quality using AI
   */
  async analyzeCodeQuality(
    codeFiles: Array<{ filename: string; content: string; language: string }>,
    testFiles: Array<{ filename: string; content: string }>
  ): Promise<CodeQualityMetrics> {
    try {
      const qualityData = {
        codeFiles: this.prepareCodeForAnalysis(codeFiles),
        testFiles: testFiles.map(f => ({ filename: f.filename, lineCount: f.content.split('\n').length })),
        totalCodeLines: codeFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0),
        totalTestLines: testFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0),
      };

      const prompt = `
        Analyze the following code and test data for quality metrics:

        Quality Data:
        ${JSON.stringify(qualityData, null, 2)}

        Please analyze and provide quality metrics (as ratios 0-1):
        1. Duplicate Code Ratio (estimated percentage of duplicated code)
        2. Comment Ratio (comments to code ratio)
        3. Test Coverage Ratio (test lines to code lines ratio)
        4. Bug Density (estimated bugs per 1000 lines of code)
        5. Security Vulnerabilities (count of potential security issues)
        6. Performance Issues (array of identified performance concerns)

        Consider factors like:
        - Code patterns and repetition
        - Documentation and comments
        - Test file coverage
        - Common security anti-patterns
        - Performance bottlenecks

        Return a JSON response:
        {
          "duplicateCodeRatio": 0.15,
          "commentRatio": 0.25,
          "testCoverageRatio": 0.80,
          "bugDensity": 2.5,
          "securityVulnerabilities": 1,
          "performanceIssues": ["Inefficient loops", "Memory leaks"]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const metrics = this.parseAIResponse(response);

      return {
        duplicateCodeRatio: metrics.duplicateCodeRatio || 0.1,
        commentRatio: metrics.commentRatio || 0.2,
        testCoverageRatio: metrics.testCoverageRatio || 0.6,
        bugDensity: metrics.bugDensity || 3,
        securityVulnerabilities: metrics.securityVulnerabilities || 0,
        performanceIssues: metrics.performanceIssues || [],
      };
    } catch (error) {
      console.error('Error analyzing code quality:', error);
      return this.getFallbackQualityMetrics();
    }
  }

  /**
   * Analyze architectural metrics using AI
   */
  async analyzeArchitecture(
    projectStructure: any,
    dependencies: Array<{ name: string; version: string; type: string }>
  ): Promise<ArchitecturalMetrics> {
    try {
      const architectureData = {
        structure: projectStructure,
        dependencies: dependencies.slice(0, 20), // Limit for AI processing
        moduleCount: projectStructure.modules?.length || 0,
        serviceCount: projectStructure.services?.length || 0,
      };

      const prompt = `
        Analyze the following project architecture for architectural metrics:

        Architecture Data:
        ${JSON.stringify(architectureData, null, 2)}

        Please analyze and provide architectural metrics (0-10 scale):
        1. Modularity (how well the code is organized into modules)
        2. Coupling (how dependent modules are on each other, lower is better)
        3. Cohesion (how related elements within modules are, higher is better)
        4. Abstractness (level of abstraction in the design)
        5. Instability (how likely modules are to change)
        6. Design Patterns (array of identified design patterns)

        Consider factors like:
        - Module organization and separation of concerns
        - Dependency relationships
        - Interface design
        - Code reusability
        - Design pattern usage

        Return a JSON response:
        {
          "modularity": 8.2,
          "coupling": 3.5,
          "cohesion": 7.8,
          "abstractness": 6.1,
          "instability": 4.2,
          "designPatterns": ["MVC", "Observer", "Factory"]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const metrics = this.parseAIResponse(response);

      return {
        modularity: metrics.modularity || 6,
        coupling: metrics.coupling || 5,
        cohesion: metrics.cohesion || 6,
        abstractness: metrics.abstractness || 5,
        instability: metrics.instability || 5,
        designPatterns: metrics.designPatterns || [],
      };
    } catch (error) {
      console.error('Error analyzing architecture:', error);
      return this.getFallbackArchitecturalMetrics();
    }
  }

  /**
   * Calculate productivity metrics
   */
  calculateProductivityMetrics(
    commits: any[],
    tasks: any[],
    sprints: any[],
    codeReviews: any[]
  ): ProductivityMetrics {
    const totalLinesChanged = commits.reduce((sum, commit) => 
      sum + (commit.stats?.additions || 0) + (commit.stats?.deletions || 0), 0
    );
    
    const totalHours = commits.length * 2; // Estimate 2 hours per commit
    const linesOfCodePerHour = totalHours > 0 ? totalLinesChanged / totalHours : 0;

    const completedTasks = tasks.filter(task => task.status === 'done');
    const completedSprints = sprints.filter(sprint => sprint.status === 'completed');
    const featuresDeliveredPerSprint = completedSprints.length > 0 
      ? completedTasks.length / completedSprints.length 
      : 0;

    const bugTasks = tasks.filter(task => task.type === 'bug' && task.status === 'done');
    const avgBugFixTime = bugTasks.length > 0
      ? bugTasks.reduce((sum, task) => sum + (task.actualEffort || 0), 0) / bugTasks.length
      : 0;

    const avgCodeReviewTime = codeReviews.length > 0
      ? codeReviews.reduce((sum, review) => sum + (review.reviewTime || 4), 0) / codeReviews.length
      : 4;

    const deploymentFrequency = commits.length / 30; // Deployments per month estimate
    const leadTime = tasks.length > 0
      ? tasks.reduce((sum, task) => {
          const created = new Date(task.createdAt);
          const completed = task.status === 'done' ? new Date(task.updatedAt) : new Date();
          return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / tasks.length
      : 0;

    return {
      linesOfCodePerHour,
      featuresDeliveredPerSprint,
      bugFixTime: avgBugFixTime,
      codeReviewTime: avgCodeReviewTime,
      deploymentFrequency,
      leadTime,
    };
  }

  /**
   * Generate code quality score
   */
  calculateOverallQualityScore(
    complexity: CodeComplexityMetrics,
    quality: CodeQualityMetrics,
    architecture: ArchitecturalMetrics
  ): {
    overallScore: number;
    breakdown: {
      complexity: number;
      quality: number;
      architecture: number;
    };
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  } {
    // Calculate component scores (0-100)
    const complexityScore = Math.max(0, 100 - (complexity.cyclomaticComplexity + complexity.cognitiveComplexity) * 5);
    const qualityScore = (quality.testCoverageRatio * 40) + ((1 - quality.duplicateCodeRatio) * 30) + (quality.commentRatio * 30);
    const architectureScore = (architecture.modularity + architecture.cohesion + (10 - architecture.coupling)) * 10 / 3;

    const overallScore = (complexityScore + qualityScore + architectureScore) / 3;

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    const recommendations: string[] = [];
    
    if (complexityScore < 70) {
      recommendations.push('Reduce code complexity by breaking down large functions');
    }
    if (qualityScore < 70) {
      recommendations.push('Improve test coverage and reduce code duplication');
    }
    if (architectureScore < 70) {
      recommendations.push('Improve module organization and reduce coupling');
    }

    return {
      overallScore,
      breakdown: {
        complexity: complexityScore,
        quality: qualityScore,
        architecture: architectureScore,
      },
      grade,
      recommendations,
    };
  }

  // Helper methods

  private prepareCodeForAnalysis(codeFiles: Array<{ filename: string; content: string; language: string }>): any {
    return codeFiles.slice(0, 10).map(file => ({
      filename: file.filename,
      language: file.language,
      lineCount: file.content.split('\n').length,
      functionCount: this.countFunctions(file.content, file.language),
      classCount: this.countClasses(file.content, file.language),
      complexity: this.estimateComplexity(file.content),
    }));
  }

  private countFunctions(content: string, language: string): number {
    const patterns = {
      javascript: /function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g,
      typescript: /function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/g,
      python: /def\s+\w+/g,
      java: /(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/g,
    };

    const pattern = patterns[language as keyof typeof patterns] || patterns.javascript;
    return (content.match(pattern) || []).length;
  }

  private countClasses(content: string, language: string): number {
    const patterns = {
      javascript: /class\s+\w+/g,
      typescript: /class\s+\w+|interface\s+\w+/g,
      python: /class\s+\w+/g,
      java: /(public|private|protected)?\s*class\s+\w+/g,
    };

    const pattern = patterns[language as keyof typeof patterns] || patterns.javascript;
    return (content.match(pattern) || []).length;
  }

  private estimateComplexity(content: string): number {
    const complexityIndicators = [
      /if\s*\(/g,
      /else\s*if/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&|\|\|/g,
    ];

    return complexityIndicators.reduce((complexity, pattern) => {
      return complexity + (content.match(pattern) || []).length;
    }, 1);
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

  private getFallbackComplexityMetrics(): CodeComplexityMetrics {
    return {
      cyclomaticComplexity: 5,
      cognitiveComplexity: 5,
      maintainabilityIndex: 70,
      technicalDebt: 3,
      codeSmells: ['Unable to analyze - using default values'],
    };
  }

  private getFallbackQualityMetrics(): CodeQualityMetrics {
    return {
      duplicateCodeRatio: 0.1,
      commentRatio: 0.2,
      testCoverageRatio: 0.6,
      bugDensity: 3,
      securityVulnerabilities: 0,
      performanceIssues: ['Unable to analyze - using default values'],
    };
  }

  private getFallbackArchitecturalMetrics(): ArchitecturalMetrics {
    return {
      modularity: 6,
      coupling: 5,
      cohesion: 6,
      abstractness: 5,
      instability: 5,
      designPatterns: ['Unable to analyze - using default values'],
    };
  }
}

export const codeMetricsCalculator = new CodeMetricsCalculator();