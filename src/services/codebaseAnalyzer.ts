import { groqService } from './groq';
import { Repository } from '../types';

export interface ModuleAnalysis {
  relevantFiles: string[];
  relevantDirectories: string[];
  owners: string[];
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  suggestedApproach: string;
}

export interface CodebaseStructure {
  directories: string[];
  files: string[];
  languages: { [language: string]: number };
  frameworks: string[];
  dependencies: { [name: string]: string };
  architecture: {
    type: string;
    patterns: string[];
    layers: string[];
  };
}

class CodebaseAnalyzer {
  /**
   * Analyze task scope within the codebase
   */
  async analyzeTaskScope(
    repository: Repository,
    taskTitle: string,
    taskDescription: string,
    requiredSkills: string[]
  ): Promise<ModuleAnalysis> {
    try {
      const codebaseStructure = await this.getCodebaseStructure(repository);
      
      const prompt = `
        Analyze the following task within the context of this codebase structure:

        Task:
        - Title: ${taskTitle}
        - Description: ${taskDescription}
        - Required Skills: ${requiredSkills.join(', ')}

        Codebase Structure:
        ${JSON.stringify(codebaseStructure, null, 2)}

        Repository Info:
        - Name: ${repository.name}
        - Language: ${repository.language}
        - Description: ${repository.description}

        Determine:
        1. Which files and directories are most relevant to this task
        2. Who might be the best owners/maintainers based on the code structure
        3. The complexity level of implementing this task
        4. Key dependencies that might be affected
        5. Suggested implementation approach

        Consider:
        - File naming conventions and organization
        - Component/module boundaries
        - Existing patterns and architecture
        - Potential impact on other parts of the system

        Return a JSON response:
        {
          "relevantFiles": ["src/components/auth/", "src/services/auth.ts"],
          "relevantDirectories": ["src/auth/", "src/components/auth/"],
          "owners": ["developer@company.com", "team-lead@company.com"],
          "complexity": "medium",
          "dependencies": ["authentication", "user-management"],
          "suggestedApproach": "Implement using existing auth patterns, extend current user service"
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        relevantFiles: analysis.relevantFiles || [],
        relevantDirectories: analysis.relevantDirectories || [],
        owners: analysis.owners || [],
        complexity: analysis.complexity || 'medium',
        dependencies: analysis.dependencies || [],
        suggestedApproach: analysis.suggestedApproach || 'Standard implementation approach',
      };
    } catch (error) {
      console.error('Error analyzing task scope:', error);
      return this.getFallbackModuleAnalysis();
    }
  }

  /**
   * Get codebase structure from repository
   */
  async getCodebaseStructure(repository: Repository): Promise<CodebaseStructure> {
    try {
      // In a real implementation, this would analyze the actual repository
      // For now, we'll use the repository structure data if available
      const structure = repository.structure || {};
      
      return {
        directories: structure.directories || [],
        files: structure.files || [],
        languages: structure.languages || { [repository.language || 'JavaScript']: 100 },
        frameworks: this.detectFrameworks(repository),
        dependencies: structure.dependencies || {},
        architecture: {
          type: this.detectArchitectureType(repository),
          patterns: this.detectPatterns(repository),
          layers: this.detectLayers(repository),
        },
      };
    } catch (error) {
      console.error('Error getting codebase structure:', error);
      return this.getFallbackCodebaseStructure(repository);
    }
  }

  /**
   * Analyze code quality and technical debt
   */
  async analyzeCodeQuality(
    repository: Repository,
    files: string[]
  ): Promise<{
    overallScore: number;
    issues: Array<{
      type: 'complexity' | 'duplication' | 'security' | 'performance';
      severity: 'low' | 'medium' | 'high';
      description: string;
      file?: string;
      suggestion: string;
    }>;
    recommendations: string[];
  }> {
    try {
      const prompt = `
        Analyze the code quality for the following repository and files:

        Repository: ${repository.name}
        Language: ${repository.language}
        Files to analyze: ${files.join(', ')}

        Based on common code quality metrics and best practices, provide:
        1. An overall quality score (0-100)
        2. Specific issues found (complexity, duplication, security, performance)
        3. Actionable recommendations for improvement

        Consider:
        - Code complexity and maintainability
        - Security vulnerabilities and best practices
        - Performance optimization opportunities
        - Code duplication and reusability
        - Testing coverage and quality
        - Documentation and comments

        Return a JSON response:
        {
          "overallScore": 75,
          "issues": [
            {
              "type": "complexity",
              "severity": "medium",
              "description": "High cyclomatic complexity in authentication module",
              "file": "src/auth/auth.service.ts",
              "suggestion": "Break down large functions into smaller, focused methods"
            }
          ],
          "recommendations": [
            "Add unit tests for critical functions",
            "Implement error handling patterns",
            "Add TypeScript strict mode"
          ]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        overallScore: analysis.overallScore || 70,
        issues: analysis.issues || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error) {
      console.error('Error analyzing code quality:', error);
      return {
        overallScore: 70,
        issues: [],
        recommendations: ['Unable to analyze - please review manually'],
      };
    }
  }

  /**
   * Generate file scaffolding for a task
   */
  async generateFileScaffolding(
    repository: Repository,
    task: {
      title: string;
      description: string;
      type: string;
      requiredSkills: string[];
    },
    relevantFiles: string[]
  ): Promise<Array<{
    path: string;
    content: string;
    description: string;
    todos: string[];
  }>> {
    try {
      const codebaseStructure = await this.getCodebaseStructure(repository);
      
      const prompt = `
        Generate file scaffolding for the following task:

        Task:
        - Title: ${task.title}
        - Description: ${task.description}
        - Type: ${task.type}
        - Required Skills: ${task.requiredSkills.join(', ')}

        Codebase Context:
        ${JSON.stringify(codebaseStructure, null, 2)}

        Relevant Files: ${relevantFiles.join(', ')}

        Generate scaffolding for 1-3 key files that would need to be created or modified:
        1. Follow the existing project structure and conventions
        2. Include appropriate imports and exports
        3. Add TODO comments for implementation details
        4. Use proper TypeScript types if applicable
        5. Follow the project's coding patterns

        Return a JSON response:
        {
          "files": [
            {
              "path": "src/components/NewComponent.tsx",
              "content": "import React from 'react';\\n\\n// TODO: Implement component logic\\nexport const NewComponent: React.FC = () => {\\n  return <div>Component content</div>;\\n};",
              "description": "Main component for the new feature",
              "todos": ["Implement component logic", "Add proper styling", "Add error handling"]
            }
          ]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const result = this.parseAIResponse(response);

      return result.files || [];
    } catch (error) {
      console.error('Error generating file scaffolding:', error);
      return [];
    }
  }

  // Helper methods

  private detectFrameworks(repository: Repository): string[] {
    const frameworks: string[] = [];
    const name = repository.name.toLowerCase();
    const description = (repository.description || '').toLowerCase();
    const language = (repository.language || '').toLowerCase();

    // Detect based on common patterns
    if (language.includes('javascript') || language.includes('typescript')) {
      if (name.includes('react') || description.includes('react')) {
        frameworks.push('React');
      }
      if (name.includes('vue') || description.includes('vue')) {
        frameworks.push('Vue.js');
      }
      if (name.includes('angular') || description.includes('angular')) {
        frameworks.push('Angular');
      }
      if (name.includes('next') || description.includes('next')) {
        frameworks.push('Next.js');
      }
      if (name.includes('express') || description.includes('express')) {
        frameworks.push('Express.js');
      }
    }

    if (language.includes('python')) {
      if (name.includes('django') || description.includes('django')) {
        frameworks.push('Django');
      }
      if (name.includes('flask') || description.includes('flask')) {
        frameworks.push('Flask');
      }
    }

    return frameworks;
  }

  private detectArchitectureType(repository: Repository): string {
    const name = repository.name.toLowerCase();
    const description = (repository.description || '').toLowerCase();

    if (name.includes('microservice') || description.includes('microservice')) {
      return 'Microservices';
    }
    if (name.includes('monolith') || description.includes('monolith')) {
      return 'Monolithic';
    }
    if (name.includes('serverless') || description.includes('serverless')) {
      return 'Serverless';
    }
    if (name.includes('spa') || description.includes('single page')) {
      return 'Single Page Application';
    }

    return 'Standard Web Application';
  }

  private detectPatterns(repository: Repository): string[] {
    const patterns: string[] = [];
    const description = (repository.description || '').toLowerCase();

    if (description.includes('mvc')) patterns.push('MVC');
    if (description.includes('mvvm')) patterns.push('MVVM');
    if (description.includes('redux')) patterns.push('Redux');
    if (description.includes('observer')) patterns.push('Observer');
    if (description.includes('factory')) patterns.push('Factory');

    return patterns;
  }

  private detectLayers(repository: Repository): string[] {
    const layers: string[] = [];
    const structure = repository.structure || {};

    // Detect common layer patterns from directory structure
    if (structure.directories) {
      const dirs = structure.directories.map(d => d.toLowerCase());
      
      if (dirs.some(d => d.includes('component') || d.includes('view'))) {
        layers.push('Presentation Layer');
      }
      if (dirs.some(d => d.includes('service') || d.includes('business'))) {
        layers.push('Business Logic Layer');
      }
      if (dirs.some(d => d.includes('data') || d.includes('repository'))) {
        layers.push('Data Access Layer');
      }
      if (dirs.some(d => d.includes('api') || d.includes('controller'))) {
        layers.push('API Layer');
      }
    }

    return layers;
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

  private getFallbackModuleAnalysis(): ModuleAnalysis {
    return {
      relevantFiles: [],
      relevantDirectories: [],
      owners: [],
      complexity: 'medium',
      dependencies: [],
      suggestedApproach: 'Standard implementation approach - please review manually',
    };
  }

  private getFallbackCodebaseStructure(repository: Repository): CodebaseStructure {
    return {
      directories: ['src/', 'components/', 'services/', 'utils/'],
      files: [],
      languages: { [repository.language || 'JavaScript']: 100 },
      frameworks: this.detectFrameworks(repository),
      dependencies: {},
      architecture: {
        type: 'Standard Web Application',
        patterns: [],
        layers: ['Presentation Layer', 'Business Logic Layer'],
      },
    };
  }
}

export const codebaseAnalyzer = new CodebaseAnalyzer();