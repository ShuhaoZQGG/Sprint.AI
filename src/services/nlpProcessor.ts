import { groqService } from './groq';
import { BusinessSpec, Task, TaskType, Priority } from '../types';

export interface DocumentationChange {
  documentTitle: string;
  sectionTitle: string;
  originalContent: string;
  updatedContent: string;
  changeType: 'addition' | 'modification' | 'deletion';
}

export interface BusinessSpecAnalysis {
  suggestedTitle: string;
  description: string;
  acceptanceCriteria: string[];
  technicalRequirements: string[];
  priority: Priority;
  estimatedEffort?: number;
  tags: string[];
  changeImpact: 'low' | 'medium' | 'high';
  affectedSystems: string[];
}

export interface TaskGenerationResult {
  tasks: Array<{
    title: string;
    description: string;
    type: TaskType;
    priority: Priority;
    estimatedEffort: number;
    requiredSkills: string[];
    dependencies: string[];
    acceptanceCriteria: string[];
    technicalNotes?: string;
  }>;
  totalEstimatedEffort: number;
  suggestedSprint: {
    name: string;
    duration: number;
    capacity: number;
  };
}

class NLPProcessor {
  /**
   * Analyze documentation changes and generate business specification
   */
  async analyzeDocumentationChanges(changes: DocumentationChange[]): Promise<BusinessSpecAnalysis> {
    try {
      const prompt = `
        Analyze the following documentation changes and generate a comprehensive business specification:

        Documentation Changes:
        ${changes.map((change, index) => `
        Change ${index + 1}:
        - Document: ${change.documentTitle}
        - Section: ${change.sectionTitle}
        - Type: ${change.changeType}
        - Original: ${change.originalContent.substring(0, 500)}...
        - Updated: ${change.updatedContent.substring(0, 500)}...
        `).join('\n')}

        Based on these changes, generate a business specification with:
        1. A clear, descriptive title that summarizes the business need
        2. A comprehensive description explaining the business value and context
        3. Specific acceptance criteria (3-8 items) that define success
        4. Technical requirements needed for implementation
        5. Priority level based on impact and urgency
        6. Estimated effort in hours (consider complexity and scope)
        7. Relevant tags for categorization
        8. Change impact assessment (low/medium/high)
        9. Affected systems or components

        Consider:
        - Business value and user impact
        - Technical complexity and dependencies
        - Risk assessment and mitigation
        - Integration requirements
        - Performance and scalability needs

        Return a JSON response:
        {
          "suggestedTitle": "Clear business-focused title",
          "description": "Detailed description with business context and value proposition",
          "acceptanceCriteria": ["Specific, measurable criteria"],
          "technicalRequirements": ["Technical implementation needs"],
          "priority": "high|medium|low|critical",
          "estimatedEffort": 40,
          "tags": ["relevant", "tags"],
          "changeImpact": "high|medium|low",
          "affectedSystems": ["system1", "system2"]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        suggestedTitle: analysis.suggestedTitle || 'Documentation Update',
        description: analysis.description || 'Business specification generated from documentation changes',
        acceptanceCriteria: analysis.acceptanceCriteria || [],
        technicalRequirements: analysis.technicalRequirements || [],
        priority: analysis.priority || 'medium',
        estimatedEffort: analysis.estimatedEffort,
        tags: analysis.tags || [],
        changeImpact: analysis.changeImpact || 'medium',
        affectedSystems: analysis.affectedSystems || [],
      };
    } catch (error) {
      console.error('Error analyzing documentation changes:', error);
      return this.getFallbackBusinessSpecAnalysis(changes);
    }
  }

  /**
   * Generate tasks from business specification
   */
  async generateTasksFromBusinessSpec(
    businessSpec: BusinessSpec,
    codebaseContext: any,
    teamSkills: string[]
  ): Promise<TaskGenerationResult> {
    try {
      const prompt = `
        Convert the following business specification into actionable technical tasks:

        Business Specification:
        - Title: ${businessSpec.title}
        - Description: ${businessSpec.description}
        - Priority: ${businessSpec.priority}
        - Acceptance Criteria: ${businessSpec.acceptanceCriteria.join(', ')}
        - Technical Requirements: ${businessSpec.technicalRequirements.join(', ')}
        - Estimated Effort: ${businessSpec.estimatedEffort || 'Not specified'}

        Codebase Context:
        ${JSON.stringify(codebaseContext, null, 2)}

        Team Skills Available: ${teamSkills.join(', ')}

        Generate 3-8 specific, actionable tasks that:
        1. Break down the business spec into implementable units
        2. Consider the existing codebase structure and patterns
        3. Match team skills and capabilities
        4. Include proper dependencies and sequencing
        5. Have realistic effort estimates (1-40 hours each)
        6. Include specific acceptance criteria
        7. Specify required skills and technologies

        Task Types:
        - feature: New functionality or enhancements
        - bug: Fixes for existing issues
        - refactor: Code improvements without functional changes
        - docs: Documentation updates
        - test: Testing implementation or improvements
        - devops: Infrastructure, deployment, or tooling

        Priority Levels:
        - critical: Blocking or urgent issues
        - high: Important for business goals
        - medium: Standard priority
        - low: Nice to have or future improvements

        Return a JSON response:
        {
          "tasks": [
            {
              "title": "Specific, actionable task title",
              "description": "Detailed description with context and approach",
              "type": "feature|bug|refactor|docs|test|devops",
              "priority": "critical|high|medium|low",
              "estimatedEffort": 8,
              "requiredSkills": ["React", "TypeScript", "API"],
              "dependencies": ["task-title-1", "task-title-2"],
              "acceptanceCriteria": ["Specific criteria for completion"],
              "technicalNotes": "Implementation notes and considerations"
            }
          ],
          "totalEstimatedEffort": 64,
          "suggestedSprint": {
            "name": "Sprint Name Based on Business Spec",
            "duration": 14,
            "capacity": 80
          }
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const result = this.parseAIResponse(response);

      return {
        tasks: result.tasks || [],
        totalEstimatedEffort: result.totalEstimatedEffort || 0,
        suggestedSprint: result.suggestedSprint || {
          name: `Sprint: ${businessSpec.title}`,
          duration: 14,
          capacity: 80,
        },
      };
    } catch (error) {
      console.error('Error generating tasks from business spec:', error);
      return this.getFallbackTaskGeneration(businessSpec);
    }
  }

  /**
   * Analyze task context for PR generation
   */
  async analyzeTaskForPR(
    task: Task,
    codebaseContext: any,
    repositoryInfo: any
  ): Promise<{
    branchName: string;
    commitMessage: string;
    prTitle: string;
    prDescription: string;
    suggestedFiles: string[];
    implementationNotes: string[];
  }> {
    try {
      const prompt = `
        Analyze the following task and generate PR template information:

        Task Details:
        - Title: ${task.title}
        - Description: ${task.description}
        - Type: ${task.type}
        - Priority: ${task.priority}
        - Acceptance Criteria: ${task.acceptanceCriteria?.join(', ') || 'None specified'}
        - Technical Notes: ${task.technicalNotes || 'None'}

        Repository Context:
        ${JSON.stringify(repositoryInfo, null, 2)}

        Codebase Structure:
        ${JSON.stringify(codebaseContext, null, 2)}

        Generate:
        1. A descriptive branch name following git conventions
        2. A clear, conventional commit message
        3. A professional PR title
        4. A comprehensive PR description with context and changes
        5. Suggested files that might need modification
        6. Implementation notes and considerations

        Follow these conventions:
        - Branch names: feature/task-description, bugfix/issue-description, etc.
        - Commit messages: type(scope): description
        - PR titles: Clear, descriptive, and professional
        - PR descriptions: Include context, changes, testing notes

        Return a JSON response:
        {
          "branchName": "feature/implement-user-authentication",
          "commitMessage": "feat(auth): implement user authentication system",
          "prTitle": "Implement User Authentication System",
          "prDescription": "## Overview\\n\\nThis PR implements...\\n\\n## Changes\\n\\n- Added...\\n\\n## Testing\\n\\n- Tested...",
          "suggestedFiles": ["src/auth/", "src/components/auth/"],
          "implementationNotes": ["Consider security implications", "Add proper error handling"]
        }
      `;

      const response = await groqService.generateResponse(prompt);
      const result = this.parseAIResponse(response);

      return {
        branchName: result.branchName || this.generateFallbackBranchName(task),
        commitMessage: result.commitMessage || this.generateFallbackCommitMessage(task),
        prTitle: result.prTitle || task.title,
        prDescription: result.prDescription || task.description,
        suggestedFiles: result.suggestedFiles || [],
        implementationNotes: result.implementationNotes || [],
      };
    } catch (error) {
      console.error('Error analyzing task for PR:', error);
      return this.getFallbackPRAnalysis(task);
    }
  }

  /**
   * Extract key information from text using NLP
   */
  async extractKeyInformation(
    text: string,
    extractionType: 'requirements' | 'features' | 'issues' | 'dependencies'
  ): Promise<string[]> {
    try {
      const prompt = `
        Extract ${extractionType} from the following text:

        Text:
        ${text}

        Extract and return a list of ${extractionType} mentioned in the text.
        Focus on:
        ${extractionType === 'requirements' ? 'Technical and functional requirements' :
          extractionType === 'features' ? 'Features and capabilities mentioned' :
          extractionType === 'issues' ? 'Problems, bugs, or issues identified' :
          'Dependencies, prerequisites, or related components'}

        Return a JSON array of strings:
        ["item1", "item2", "item3"]
      `;

      const response = await groqService.generateResponse(prompt);
      const items = this.parseAIResponse(response);

      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.error(`Error extracting ${extractionType}:`, error);
      return [];
    }
  }

  // Helper methods

  private parseAIResponse(response: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Try to parse the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }

  private getFallbackBusinessSpecAnalysis(changes: DocumentationChange[]): BusinessSpecAnalysis {
    return {
      suggestedTitle: `Documentation Update - ${changes[0]?.documentTitle || 'Multiple Documents'}`,
      description: 'Business specification generated from documentation changes. Please review and update as needed.',
      acceptanceCriteria: [
        'Documentation changes are implemented',
        'All affected systems are updated',
        'Changes are tested and verified',
      ],
      technicalRequirements: [
        'Update relevant documentation',
        'Implement necessary code changes',
        'Add appropriate tests',
      ],
      priority: 'medium',
      estimatedEffort: Math.max(8, changes.length * 4),
      tags: ['documentation', 'update'],
      changeImpact: 'medium',
      affectedSystems: ['documentation'],
    };
  }

  private getFallbackTaskGeneration(businessSpec: BusinessSpec): TaskGenerationResult {
    return {
      tasks: [
        {
          title: `Implement ${businessSpec.title}`,
          description: businessSpec.description,
          type: 'feature',
          priority: businessSpec.priority,
          estimatedEffort: businessSpec.estimatedEffort || 16,
          requiredSkills: ['Frontend', 'Backend'],
          dependencies: [],
          acceptanceCriteria: businessSpec.acceptanceCriteria,
          technicalNotes: 'Generated from business specification. Please review and refine.',
        },
      ],
      totalEstimatedEffort: businessSpec.estimatedEffort || 16,
      suggestedSprint: {
        name: `Sprint: ${businessSpec.title}`,
        duration: 14,
        capacity: 80,
      },
    };
  }

  private getFallbackPRAnalysis(task: Task): {
    branchName: string;
    commitMessage: string;
    prTitle: string;
    prDescription: string;
    suggestedFiles: string[];
    implementationNotes: string[];
  } {
    return {
      branchName: this.generateFallbackBranchName(task),
      commitMessage: this.generateFallbackCommitMessage(task),
      prTitle: task.title,
      prDescription: `## Overview\n\n${task.description}\n\n## Changes\n\n- Implement ${task.title}\n\n## Testing\n\n- [ ] Manual testing completed\n- [ ] Unit tests added`,
      suggestedFiles: [],
      implementationNotes: ['Review implementation approach', 'Add appropriate tests', 'Update documentation'],
    };
  }

  private generateFallbackBranchName(task: Task): string {
    const prefix = task.type === 'bug' ? 'bugfix' : 
                   task.type === 'feature' ? 'feature' :
                   task.type === 'refactor' ? 'refactor' : 'task';
    
    const sanitizedTitle = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `${prefix}/${sanitizedTitle}`;
  }

  private generateFallbackCommitMessage(task: Task): string {
    const type = task.type === 'bug' ? 'fix' :
                 task.type === 'feature' ? 'feat' :
                 task.type === 'docs' ? 'docs' :
                 task.type === 'test' ? 'test' :
                 task.type === 'refactor' ? 'refactor' : 'chore';
    
    return `${type}: ${task.title.toLowerCase()}`;
  }
}

export const nlpProcessor = new NLPProcessor();