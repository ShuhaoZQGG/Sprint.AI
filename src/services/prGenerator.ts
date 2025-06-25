import { groqService } from './groq';
import { githubService } from './github';
import { Task, Repository, PRTemplate, FileScaffold } from '../types';
import { RepositoryAnalysis } from '../types/github';

export interface PRGenerationRequest {
  task: Task;
  repository: Repository;
  targetBranch?: string;
  includeScaffolds?: boolean;
}

export interface PRGenerationResponse {
  template: PRTemplate;
  reasoning: string;
  confidence: number;
}

class PRGenerator {
  /**
   * Generate PR template from task
   */
  async generatePRTemplate(request: PRGenerationRequest): Promise<PRGenerationResponse> {
    try {
      if (!groqService.isAvailable()) {
        throw new Error('AI service is not available');
      }

      const { task, repository, targetBranch = 'main', includeScaffolds = true } = request;

      // Generate branch name
      const branchName = this.generateBranchName(task);

      // Generate PR title and description
      const { title, description } = await this.generatePRContent(task, repository);

      // Generate commit message
      const commitMessage = this.generateCommitMessage(task);

      // Generate file scaffolds if requested
      const fileScaffolds = includeScaffolds 
        ? await this.generateFileScaffolds(task, repository)
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
        reasoning: `Generated PR template for ${task.type} task with ${fileScaffolds.length} file scaffolds`,
        confidence: 0.85,
      };

    } catch (error) {
      console.error('PR generation error:', error);
      throw error;
    }
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
   * Generate PR title and description using AI
   */
  private async generatePRContent(task: Task, repository: Repository): Promise<{ title: string; description: string }> {
    const prompt = `
Generate a professional Pull Request title and description for the following task:

Task: ${task.title}
Description: ${task.description}
Type: ${task.type}
Priority: ${task.priority}
Repository: ${repository.name}

Requirements:
1. Title should be concise and descriptive (max 72 characters)
2. Description should include:
   - Brief summary of changes
   - What problem this solves
   - How to test the changes
   - Any breaking changes or considerations

Format as JSON:
{
  "title": "PR title here",
  "description": "PR description here"
}
    `;

    try {
      const response = await groqService.makeCompletion(prompt, 1024);
      const parsed = JSON.parse(response);
      
      return {
        title: parsed.title || task.title,
        description: parsed.description || task.description,
      };
    } catch (error) {
      // Fallback to simple template
      return {
        title: `${task.type}: ${task.title}`,
        description: `## Summary\n${task.description}\n\n## Testing\n- [ ] Manual testing completed\n- [ ] Unit tests added/updated\n\n## Checklist\n- [ ] Code follows project standards\n- [ ] Documentation updated if needed`,
      };
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

  /**
   * Generate file scaffolds for the task
   */
  private async generateFileScaffolds(task: Task, repository: Repository): Promise<FileScaffold[]> {
    const scaffolds: FileScaffold[] = [];

    try {
      // Determine file types needed based on task and repository structure
      const fileTypes = this.determineRequiredFiles(task, repository);

      for (const fileType of fileTypes) {
        const scaffold = await this.generateFileScaffold(task, repository, fileType);
        if (scaffold) {
          scaffolds.push(scaffold);
        }
      }

      return scaffolds;
    } catch (error) {
      console.warn('Failed to generate file scaffolds:', error);
      return [];
    }
  }

  /**
   * Determine what files are needed for the task
   */
  private determineRequiredFiles(task: Task, repository: Repository): string[] {
    const files: string[] = [];
    const language = repository.language?.toLowerCase();

    // Base on task type and repository language
    if (task.type === 'feature') {
      if (language === 'typescript' || language === 'javascript') {
        files.push('component', 'service', 'test');
      } else if (language === 'python') {
        files.push('module', 'test');
      }
    } else if (task.type === 'bug') {
      files.push('test');
    } else if (task.type === 'test') {
      files.push('test');
    } else if (task.type === 'docs') {
      files.push('documentation');
    }

    return files;
  }

  /**
   * Generate individual file scaffold
   */
  private async generateFileScaffold(
    task: Task, 
    repository: Repository, 
    fileType: string
  ): Promise<FileScaffold | null> {
    const prompt = `
Generate a file scaffold for the following task:

Task: ${task.title}
Description: ${task.description}
File Type: ${fileType}
Repository Language: ${repository.language}

Generate:
1. Appropriate file path
2. Basic file structure with TODO comments
3. List of TODO items for implementation

Format as JSON:
{
  "path": "relative/file/path",
  "content": "file content with TODO comments",
  "todos": ["TODO item 1", "TODO item 2"]
}
    `;

    try {
      const response = await groqService.makeCompletion(prompt, 1024);
      const parsed = JSON.parse(response);
      
      return {
        path: parsed.path,
        content: parsed.content,
        todos: parsed.todos || [],
      };
    } catch (error) {
      console.warn(`Failed to generate ${fileType} scaffold:`, error);
      return this.generateFallbackScaffold(task, fileType, repository.language);
    }
  }

  /**
   * Generate fallback scaffold when AI fails
   */
  private generateFallbackScaffold(
    task: Task, 
    fileType: string, 
    language?: string
  ): FileScaffold | null {
    const sanitizedName = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    switch (fileType) {
      case 'component':
        if (language === 'typescript') {
          return {
            path: `src/components/${sanitizedName}/${sanitizedName}.tsx`,
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