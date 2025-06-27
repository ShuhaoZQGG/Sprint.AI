import { groqService } from './groq';
import { githubService } from './github';
import { codebaseAnalyzer, CodebaseContext } from './codebaseAnalyzer';
import { Task, Repository, PRTemplate, FileScaffold } from '../types';
import { RepositoryAnalysis } from '../types/github';

export interface PRGenerationRequest {
  task: Task;
  repository: Repository;
  targetBranch?: string;
  includeScaffolds?: boolean;
  codebaseContext?: CodebaseContext;
}

export interface PRGenerationResponse {
  template: PRTemplate;
  reasoning: string;
  confidence: number;
}

export interface EnhancedPRTemplate extends PRTemplate {
  codebaseContext?: CodebaseContext;
  implementationPlan?: {
    steps: string[];
    estimatedTime: number;
    riskFactors: string[];
  };
}

class PRGenerator {
  /**
   * Generate comprehensive PR template from task with codebase analysis
   */
  async generatePRTemplate(request: PRGenerationRequest): Promise<PRGenerationResponse> {
    try {
      if (!groqService.isAvailable()) {
        throw new Error('AI service is not available');
      }

      const { task, repository, targetBranch = 'main', includeScaffolds = true } = request;

      // Analyze codebase context if not provided
      let codebaseContext = request.codebaseContext;
      if (!codebaseContext && repository.structure) {
        try {
          codebaseContext = await codebaseAnalyzer.analyzeTaskContext(
            repository.structure,
            task.description,
            task.type
          );
        } catch (error) {
          console.warn('Failed to analyze codebase context:', error);
        }
      }

      // Generate branch name
      const branchName = this.generateBranchName(task);

      // Generate PR title and description with AI
      const { title, description } = await this.generatePRContentWithAI(task, repository, codebaseContext);

      // Generate commit message
      const commitMessage = this.generateCommitMessage(task);

      // Generate file scaffolds if requested
      const fileScaffolds = includeScaffolds 
        ? await this.generateFileScaffoldsWithAI(task, repository, codebaseContext)
        : [];

      const template: PRTemplate = {
        branchName,
        title,
        description,
        fileScaffolds,
        commitMessage,
      };

      return {
        template,
        reasoning: `Generated comprehensive PR template for ${task.type} task with ${fileScaffolds.length} file scaffolds and codebase analysis`,
        confidence: 0.9,
      };

    } catch (error) {
      console.error('PR generation error:', error);
      throw error;
    }
  }

  /**
   * Generate enhanced PR template with implementation planning
   */
  async generateEnhancedPRTemplate(request: PRGenerationRequest): Promise<EnhancedPRTemplate> {
    const basicResponse = await this.generatePRTemplate(request);
    const template = basicResponse.template;

    // Generate implementation plan
    const implementationPlan = await this.generateImplementationPlan(
      request.task,
      request.codebaseContext
    );

    return {
      ...template,
      codebaseContext: request.codebaseContext,
      implementationPlan,
    };
  }

  /**
   * Generate branch name from task
   */
  private generateBranchName(task: Task): string {
    const typePrefix = this.getTypePrefix(task.type);
    const sanitizedTitle = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `${typePrefix}/${sanitizedTitle}`;
  }

  /**
   * Get branch prefix based on task type
   */
  private getTypePrefix(type: Task['type']): string {
    const prefixes = {
      feature: 'feature',
      bug: 'bugfix',
      refactor: 'refactor',
      docs: 'docs',
      test: 'test',
      devops: 'chore',
    };
    return prefixes[type] || 'feature';
  }

  /**
   * Generate PR title and description using AI with codebase context
   */
  private async generatePRContentWithAI(
    task: Task, 
    repository: Repository, 
    codebaseContext?: CodebaseContext
  ): Promise<{ title: string; description: string }> {
    if (!groqService.isAvailable()) {
      return this.generateFallbackPRContent(task);
    }

    try {
      const prompt = `
        Generate a professional Pull Request title and description for the following task:

        Task Details:
        - Title: ${task.title}
        - Description: ${task.description}
        - Type: ${task.type}
        - Priority: ${task.priority}
        - Estimated Effort: ${task.estimatedEffort} hours

        Repository: ${repository.name}
        Language: ${repository.language}

        ${codebaseContext ? `
        Codebase Context:
        - Relevant Modules: ${codebaseContext.relevantModules.map(m => m.name).join(', ')}
        - Affected Files: ${codebaseContext.affectedFiles.slice(0, 5).join(', ')}
        - Architecture Patterns: ${codebaseContext.architecture.patterns.join(', ')}
        - Estimated Complexity: ${codebaseContext.complexity.riskLevel} risk, ${codebaseContext.complexity.estimatedEffort}h effort
        ` : ''}

        Requirements:
        1. Title should be concise and descriptive (max 72 characters)
        2. Description should include:
           - Brief summary of changes
           - What problem this solves
           - Implementation approach
           - Testing considerations
           - Any breaking changes or considerations
           ${codebaseContext ? '- Affected modules and files' : ''}

        Format as JSON:
        {
          "title": "PR title here",
          "description": "PR description here"
        }
      `;

      const response = await groqService.makeCompletion(prompt, 1024);
      const parsed = JSON.parse(response);
      
      return {
        title: parsed.title || this.generateFallbackTitle(task),
        description: parsed.description || this.generateFallbackDescription(task, codebaseContext),
      };
    } catch (error) {
      console.error('Failed to generate PR content with AI:', error);
      return this.generateFallbackPRContent(task, codebaseContext);
    }
  }

  /**
   * Generate file scaffolds using AI with codebase context
   */
  private async generateFileScaffoldsWithAI(
    task: Task, 
    repository: Repository, 
    codebaseContext?: CodebaseContext
  ): Promise<FileScaffold[]> {
    if (!groqService.isAvailable()) {
      return this.generateFallbackScaffolds(task, repository);
    }

    try {
      const scaffolds: FileScaffold[] = [];

      // Determine file types needed based on task and codebase context
      const fileTypes = this.determineRequiredFilesWithContext(task, repository, codebaseContext);

      for (const fileType of fileTypes) {
        const scaffold = await this.generateFileScaffoldWithAI(task, repository, fileType, codebaseContext);
        if (scaffold) {
          scaffolds.push(scaffold);
        }
      }

      return scaffolds;
    } catch (error) {
      console.warn('Failed to generate file scaffolds with AI:', error);
      return this.generateFallbackScaffolds(task, repository);
    }
  }

  /**
   * Determine what files are needed based on task and codebase context
   */
  private determineRequiredFilesWithContext(
    task: Task, 
    repository: Repository, 
    codebaseContext?: CodebaseContext
  ): string[] {
    const files: string[] = [];
    const language = repository.language?.toLowerCase();

    // Base on task type and repository language
    if (task.type === 'feature') {
      if (language === 'typescript' || language === 'javascript') {
        files.push('component', 'service', 'test');
        
        // Add specific files based on codebase context
        if (codebaseContext?.architecture.patterns.includes('Component-based Architecture')) {
          files.push('component');
        }
        if (codebaseContext?.architecture.patterns.includes('Service Layer Pattern')) {
          files.push('service');
        }
      } else if (language === 'python') {
        files.push('module', 'test');
      }
    } else if (task.type === 'bug') {
      files.push('test');
      
      // Add the specific file that needs fixing if identified
      if (codebaseContext?.affectedFiles.length) {
        files.push('bugfix');
      }
    } else if (task.type === 'test') {
      files.push('test');
    } else if (task.type === 'docs') {
      files.push('documentation');
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Generate individual file scaffold with AI and codebase context
   */
  private async generateFileScaffoldWithAI(
    task: Task, 
    repository: Repository, 
    fileType: string,
    codebaseContext?: CodebaseContext
  ): Promise<FileScaffold | null> {
    try {
      const prompt = `
        Generate a file scaffold for the following task:

        Task: ${task.title}
        Description: ${task.description}
        File Type: ${fileType}
        Repository Language: ${repository.language}

        ${codebaseContext ? `
        Codebase Context:
        - Relevant Modules: ${codebaseContext.relevantModules.map(m => `${m.name} (${m.type})`).join(', ')}
        - Architecture Patterns: ${codebaseContext.architecture.patterns.join(', ')}
        - Frameworks: ${codebaseContext.architecture.frameworks.join(', ')}
        - Affected Files: ${codebaseContext.affectedFiles.slice(0, 3).join(', ')}
        ` : ''}

        Generate:
        1. Appropriate file path following project conventions
        2. Basic file structure with TODO comments for implementation
        3. List of TODO items for development

        Consider the existing codebase patterns and follow established conventions.

        Format as JSON:
        {
          "path": "relative/file/path",
          "content": "file content with TODO comments",
          "todos": ["TODO item 1", "TODO item 2"]
        }
      `;

      const response = await groqService.makeCompletion(prompt, 1024);
      const parsed = JSON.parse(response);
      
      return {
        path: parsed.path,
        content: parsed.content,
        todos: parsed.todos || [],
      };
    } catch (error) {
      console.warn(`Failed to generate ${fileType} scaffold with AI:`, error);
      return this.generateFallbackScaffold(task, fileType, repository.language, codebaseContext);
    }
  }

  /**
   * Generate implementation plan using AI
   */
  private async generateImplementationPlan(
    task: Task,
    codebaseContext?: CodebaseContext
  ): Promise<EnhancedPRTemplate['implementationPlan']> {
    if (!groqService.isAvailable() || !codebaseContext) {
      return this.generateFallbackImplementationPlan(task, codebaseContext);
    }

    try {
      const prompt = `
        Generate an implementation plan for the following task:

        Task: ${task.title}
        Description: ${task.description}
        Type: ${task.type}
        Estimated Effort: ${task.estimatedEffort} hours

        Codebase Context:
        - Relevant Modules: ${codebaseContext.relevantModules.map(m => m.name).join(', ')}
        - Affected Files: ${codebaseContext.affectedFiles.join(', ')}
        - Risk Level: ${codebaseContext.complexity.riskLevel}
        - Dependencies: ${codebaseContext.dependencies.map(d => d.name).join(', ')}

        Generate:
        1. Step-by-step implementation plan
        2. Estimated time for completion
        3. Potential risk factors and mitigation strategies

        Format as JSON:
        {
          "steps": ["Step 1", "Step 2", "Step 3"],
          "estimatedTime": 8,
          "riskFactors": ["Risk 1", "Risk 2"]
        }
      `;

      const response = await groqService.makeCompletion(prompt, 512);
      const parsed = JSON.parse(response);

      return {
        steps: parsed.steps || [],
        estimatedTime: parsed.estimatedTime || task.estimatedEffort,
        riskFactors: parsed.riskFactors || [],
      };
    } catch (error) {
      console.error('Failed to generate implementation plan:', error);
      return this.generateFallbackImplementationPlan(task, codebaseContext);
    }
  }

  /**
   * Generate commit message
   */
  private generateCommitMessage(task: Task): string {
    const typeMap = {
      feature: 'feat',
      bug: 'fix',
      refactor: 'refactor',
      docs: 'docs',
      test: 'test',
      devops: 'chore',
    };

    const type = typeMap[task.type] || 'feat';
    const scope = this.extractScope(task.title);
    const description = task.title.toLowerCase();

    return scope 
      ? `${type}(${scope}): ${description}`
      : `${type}: ${description}`;
  }

  /**
   * Extract scope from task title
   */
  private extractScope(title: string): string | null {
    const scopePatterns = [
      /\b(auth|authentication)\b/i,
      /\b(api|endpoint)\b/i,
      /\b(ui|interface|component)\b/i,
      /\b(db|database)\b/i,
      /\b(config|configuration)\b/i,
      /\b(test|testing)\b/i,
      /\b(doc|documentation)\b/i,
    ];

    for (const pattern of scopePatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  // Fallback methods when AI is not available

  private generateFallbackPRContent(task: Task, codebaseContext?: CodebaseContext): { title: string; description: string } {
    return {
      title: this.generateFallbackTitle(task),
      description: this.generateFallbackDescription(task, codebaseContext),
    };
  }

  private generateFallbackTitle(task: Task): string {
    const typePrefix = task.type.charAt(0).toUpperCase() + task.type.slice(1);
    return `${typePrefix}: ${task.title}`;
  }

  private generateFallbackDescription(task: Task, codebaseContext?: CodebaseContext): string {
    let description = `## Summary\n${task.description}\n\n`;
    
    if (codebaseContext) {
      description += `## Affected Components\n`;
      description += codebaseContext.relevantModules.slice(0, 3).map(m => `- ${m.name}`).join('\n');
      description += '\n\n';
    }
    
    description += `## Testing\n- [ ] Manual testing completed\n- [ ] Unit tests added/updated\n\n`;
    description += `## Checklist\n- [ ] Code follows project standards\n- [ ] Documentation updated if needed`;
    
    return description;
  }

  private generateFallbackScaffolds(task: Task, repository: Repository): FileScaffold[] {
    const scaffolds: FileScaffold[] = [];
    const language = repository.language?.toLowerCase();

    if (task.type === 'feature' && (language === 'typescript' || language === 'javascript')) {
      scaffolds.push(this.generateFallbackScaffold(task, 'component', language));
    }

    return scaffolds.filter(Boolean) as FileScaffold[];
  }

  private generateFallbackScaffold(
    task: Task, 
    fileType: string, 
    language?: string,
    codebaseContext?: CodebaseContext
  ): FileScaffold | null {
    const sanitizedName = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    switch (fileType) {
      case 'component':
        if (language === 'typescript') {
          return {
            path: `src/components/${sanitizedName}/${this.toPascalCase(sanitizedName)}.tsx`,
            content: `import React from 'react';\n\ninterface ${this.toPascalCase(sanitizedName)}Props {\n  // TODO: Define component props\n}\n\nexport const ${this.toPascalCase(sanitizedName)}: React.FC<${this.toPascalCase(sanitizedName)}Props> = (props) => {\n  // TODO: Implement component logic\n  \n  return (\n    <div>\n      {/* TODO: Implement component UI */}\n    </div>\n  );\n};`,
            todos: [
              'Define component props interface',
              'Implement component logic',
              'Add component styling',
              'Write component tests',
            ],
          };
        }
        break;

      case 'service':
        if (language === 'typescript') {
          return {
            path: `src/services/${sanitizedName}.ts`,
            content: `// TODO: Add necessary imports\n\nclass ${this.toPascalCase(sanitizedName)}Service {\n  // TODO: Implement service methods\n  \n  async ${this.toCamelCase(sanitizedName)}() {\n    // TODO: Implement main functionality\n    throw new Error('Not implemented');\n  }\n}\n\nexport const ${this.toCamelCase(sanitizedName)}Service = new ${this.toPascalCase(sanitizedName)}Service();`,
            todos: [
              'Add necessary imports and dependencies',
              'Implement service methods',
              'Add error handling',
              'Write service tests',
            ],
          };
        }
        break;

      case 'test':
        return {
          path: `src/__tests__/${sanitizedName}.test.${language === 'typescript' ? 'ts' : 'js'}`,
          content: `// TODO: Add test imports\n\ndescribe('${task.title}', () => {\n  // TODO: Add test setup\n  \n  it('should ${task.title.toLowerCase()}', () => {\n    // TODO: Implement test\n    expect(true).toBe(true);\n  });\n  \n  // TODO: Add more test cases\n});`,
          todos: [
            'Add necessary test imports',
            'Implement test setup and teardown',
            'Write comprehensive test cases',
            'Add edge case testing',
          ],
        };

      case 'documentation':
        return {
          path: `docs/${sanitizedName}.md`,
          content: `# ${task.title}\n\n## Overview\n\n<!-- TODO: Add feature overview -->\n\n## Implementation\n\n<!-- TODO: Document implementation details -->\n\n## Usage\n\n<!-- TODO: Add usage examples -->\n\n## Testing\n\n<!-- TODO: Document testing approach -->`,
          todos: [
            'Add comprehensive feature overview',
            'Document implementation details',
            'Provide usage examples',
            'Document testing approach',
          ],
        };
    }

    return null;
  }

  private generateFallbackImplementationPlan(
    task: Task,
    codebaseContext?: CodebaseContext
  ): EnhancedPRTemplate['implementationPlan'] {
    const steps = [
      'Analyze requirements and existing code',
      'Design implementation approach',
      'Implement core functionality',
      'Add tests and documentation',
      'Review and refine implementation',
    ];

    const riskFactors = [];
    if (codebaseContext?.complexity.riskLevel === 'high') {
      riskFactors.push('High complexity implementation');
    }
    if (codebaseContext?.relevantModules.length > 3) {
      riskFactors.push('Multiple modules affected');
    }

    return {
      steps,
      estimatedTime: task.estimatedEffort,
      riskFactors,
    };
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Create GitHub PR (if GitHub integration is available)
   */
  async createGitHubPR(
    template: PRTemplate,
    repository: Repository,
    targetBranch: string = 'main'
  ): Promise<{ prUrl: string; branchUrl: string }> {
    try {
      const parsed = githubService.parseRepositoryUrl(repository.url);
      if (!parsed) {
        throw new Error('Invalid repository URL');
      }

      // Note: This would require GitHub API write permissions
      // For now, we'll return mock URLs
      const branchUrl = `${repository.url}/tree/${template.branchName}`;
      const prUrl = `${repository.url}/compare/${targetBranch}...${template.branchName}`;

      return { prUrl, branchUrl };
    } catch (error) {
      console.error('GitHub PR creation error:', error);
      throw error;
    }
  }
}

export const prGenerator = new PRGenerator();