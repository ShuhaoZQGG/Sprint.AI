import { groqService } from './groq';
import { useAppStore } from '../stores/useAppStore';
import { Repository, Developer, Task, BusinessSpec } from '../types';
import { RepositoryAnalysis } from '../types/github';

export interface QueryIntent {
  type: 'task_generation' | 'documentation' | 'team_assignment' | 'pr_generation' | 'analysis' | 'general';
  confidence: number;
  entities: QueryEntity[];
  context: QueryContext;
}

export interface QueryEntity {
  type: 'repository' | 'developer' | 'task' | 'technology' | 'timeframe' | 'priority';
  value: string;
  confidence: number;
}

export interface QueryContext {
  repositories: Repository[];
  developers: Developer[];
  tasks: Task[];
  currentRepository?: Repository;
  businessSpecs: BusinessSpec[];
}

export interface ProcessedQuery {
  intent: QueryIntent;
  response: string;
  suggestedActions: SuggestedAction[];
  needsMoreInfo: boolean;
  followUpQuestions: string[];
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  action: string;
  parameters?: Record<string, any>;
}

export interface TaskGenerationRequest {
  businessSpec: BusinessSpec;
  codebaseContext?: any;
  teamSkills: string[];
  additionalContext?: string;
}

export interface TaskGenerationResponse {
  tasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[];
  reasoning: string;
  confidence: number;
}

class NLPProcessor {
  private intentPatterns = {
    task_generation: [
      /create\s+(task|tasks|ticket|tickets)/i,
      /generate\s+(task|tasks)/i,
      /break\s+down/i,
      /convert.*to.*task/i,
      /need.*task/i,
      /implement.*feature/i,
      /build.*feature/i,
    ],
    documentation: [
      /document/i,
      /docs/i,
      /documentation/i,
      /generate.*doc/i,
      /update.*doc/i,
      /api.*doc/i,
      /readme/i,
    ],
    team_assignment: [
      /assign/i,
      /who.*should/i,
      /best.*developer/i,
      /team.*member/i,
      /capacity/i,
      /workload/i,
      /available/i,
    ],
    pr_generation: [
      /pull.*request/i,
      /pr/i,
      /branch/i,
      /commit/i,
      /scaffold/i,
      /template/i,
    ],
    analysis: [
      /analyze/i,
      /analysis/i,
      /review/i,
      /quality/i,
      /performance/i,
      /metrics/i,
      /insights/i,
    ],
  };

  private entityPatterns = {
    repository: /repo(?:sitory)?\s+(\w+)/i,
    developer: /(?:developer|dev|engineer|team member)\s+(\w+)/i,
    technology: /(?:using|with|in)\s+(react|typescript|python|javascript|node|vue|angular|java|go|rust|php)/i,
    priority: /(urgent|high|medium|low|critical)\s+priority/i,
    timeframe: /(?:in|within|by)\s+(\d+\s+(?:day|week|month|hour)s?)/i,
  };

  /**
   * Process a natural language query and return structured intent and response
   */
  async processQuery(query: string, context: QueryContext): Promise<ProcessedQuery> {
    try {
      // Extract intent and entities
      const intent = this.extractIntent(query, context);
      const entities = this.extractEntities(query);
      
      intent.entities = entities;

      // Generate contextual response based on intent
      const response = await this.generateResponse(query, intent, context);
      
      // Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(intent, context);
      
      // Determine if more information is needed
      const needsMoreInfo = this.needsMoreInformation(intent, context);
      
      // Generate follow-up questions if needed
      const followUpQuestions = needsMoreInfo ? this.generateFollowUpQuestions(intent, context) : [];

      return {
        intent,
        response,
        suggestedActions,
        needsMoreInfo,
        followUpQuestions,
      };
    } catch (error) {
      console.error('NLP processing error:', error);
      return this.createFallbackResponse(query, context);
    }
  }

  /**
   * Generate tasks from business specification using AI
   */
  async generateTasksFromBusinessSpec(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    if (!groqService.isAvailable()) {
      throw new Error('AI service is not available');
    }

    try {
      const prompt = `
        Generate technical tasks from the following business specification:

        Title: ${request.businessSpec.title}
        Description: ${request.businessSpec.description}
        
        Acceptance Criteria:
        ${request.businessSpec.acceptanceCriteria.map(criteria => `- ${criteria}`).join('\n')}
        
        Technical Requirements:
        ${request.businessSpec.technicalRequirements?.map(req => `- ${req}`).join('\n') || 'None specified'}
        
        Team Skills Available:
        ${request.teamSkills.join(', ')}
        
        ${request.additionalContext ? `Additional Context:\n${request.additionalContext}` : ''}
        
        Generate 3-5 technical tasks that implement this business specification.
        Each task should be:
        1. Specific and actionable
        2. Appropriately sized (4-16 hours)
        3. Assigned appropriate type (feature, bug, refactor, docs, test, devops)
        4. Given realistic priority (low, medium, high, critical)
        
        Consider the team's skills when determining task complexity and type.
        Break down complex features into smaller, manageable tasks.
        Include testing and documentation tasks where appropriate.
        
        Return a JSON array of tasks:
        [
          {
            "title": "Task title",
            "description": "Detailed task description with implementation notes",
            "type": "feature|bug|refactor|docs|test|devops",
            "priority": "low|medium|high|critical",
            "estimatedEffort": 8
          }
        ]
      `;

      const response = await groqService.makeCompletion(prompt, 2048);
      
      try {
        // Try to parse the JSON response
        const tasksData = this.parseAIResponse(response);
        
        if (!Array.isArray(tasksData)) {
          throw new Error('Expected array of tasks');
        }

        const tasks = tasksData.map((taskData: any) => ({
          title: taskData.title || 'Untitled Task',
          description: taskData.description || '',
          type: taskData.type || 'feature',
          businessSpecId: request.businessSpec.id,
          repositoryId: request.codebaseContext?.repositoryId,
          priority: taskData.priority || 'medium',
          status: 'backlog' as const,
          estimatedEffort: Math.max(1, Math.min(40, taskData.estimatedEffort || 8)),
        }));

        return {
          tasks,
          reasoning: `Generated ${tasks.length} tasks based on business specification analysis`,
          confidence: 0.85,
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        
        // Fallback: create a single task from the business spec
        return {
          tasks: [{
            title: request.businessSpec.title,
            description: request.businessSpec.description,
            type: 'feature',
            priority: request.businessSpec.priority || 'medium',
            status: 'backlog' as const,
            estimatedEffort: request.businessSpec.estimatedEffort || 8,
          }],
          reasoning: 'Created single task due to AI parsing issues',
          confidence: 0.6,
        };
      }
    } catch (error) {
      console.error('Error generating tasks from business spec:', error);
      throw error;
    }
  }

  /**
   * Analyze documentation changes and suggest business spec updates
   */
  async analyzeDocumentationChanges(
    oldContent: string,
    newContent: string,
    sectionTitle: string
  ): Promise<{
    hasSignificantChanges: boolean;
    suggestedSpec?: Partial<BusinessSpec>;
    changeAnalysis: string;
  }> {
    if (!groqService.isAvailable()) {
      return {
        hasSignificantChanges: false,
        changeAnalysis: 'AI service not available for analysis',
      };
    }

    try {
      const prompt = `
        Analyze the following documentation changes and determine if they warrant a new business specification:

        Section: ${sectionTitle}
        
        Original Content:
        ${oldContent}
        
        Updated Content:
        ${newContent}
        
        Analyze the changes and determine:
        1. Are there significant functional changes that require new development work?
        2. Do the changes introduce new features or modify existing behavior?
        3. Are there new requirements or acceptance criteria implied?
        
        If significant changes are detected, generate a business specification.
        
        Return JSON:
        {
          "hasSignificantChanges": boolean,
          "changeAnalysis": "Description of what changed",
          "suggestedSpec": {
            "title": "Spec title",
            "description": "Detailed description",
            "acceptanceCriteria": ["criteria 1", "criteria 2"],
            "technicalRequirements": ["requirement 1", "requirement 2"],
            "priority": "low|medium|high|critical"
          }
        }
      `;

      const response = await groqService.makeCompletion(prompt, 1024, {
        type: 'json_object',
      });
      const analysis = this.parseAIResponse(response);

      return {
        hasSignificantChanges: analysis.hasSignificantChanges || false,
        suggestedSpec: analysis.suggestedSpec,
        changeAnalysis: analysis.changeAnalysis || 'No significant changes detected',
      };
    } catch (error) {
      console.error('Error analyzing documentation changes:', error);
      return {
        hasSignificantChanges: false,
        changeAnalysis: 'Error analyzing changes',
      };
    }
  }

  /**
   * Extract intent from user query
   */
  private extractIntent(query: string, context: QueryContext): QueryIntent {
    let bestMatch: { type: keyof typeof this.intentPatterns; confidence: number } = {
      type: 'general',
      confidence: 0,
    };

    // Check each intent pattern
    Object.entries(this.intentPatterns).forEach(([intentType, patterns]) => {
      const matches = patterns.filter(pattern => pattern.test(query));
      if (matches.length > 0) {
        const confidence = matches.length / patterns.length;
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type: intentType as keyof typeof this.intentPatterns,
            confidence,
          };
        }
      }
    });

    // Boost confidence based on context
    const contextBoost = this.calculateContextBoost(bestMatch.type, context);
    
    return {
      type: bestMatch.type,
      confidence: Math.min(1.0, bestMatch.confidence + contextBoost),
      entities: [],
      context,
    };
  }

  /**
   * Extract entities from user query
   */
  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];

    Object.entries(this.entityPatterns).forEach(([entityType, pattern]) => {
      const match = query.match(pattern);
      if (match) {
        entities.push({
          type: entityType as QueryEntity['type'],
          value: match[1] || match[0],
          confidence: 0.8,
        });
      }
    });

    return entities;
  }

  /**
   * Calculate context boost for intent confidence
   */
  private calculateContextBoost(intentType: string, context: QueryContext): number {
    let boost = 0;

    switch (intentType) {
      case 'documentation':
        if (context.repositories.length > 0) boost += 0.2;
        if (context.currentRepository) boost += 0.1;
        break;
      case 'team_assignment':
        if (context.developers.length > 0) boost += 0.2;
        if (context.tasks.length > 0) boost += 0.1;
        break;
      case 'task_generation':
        if (context.businessSpecs.length > 0) boost += 0.2;
        if (context.currentRepository) boost += 0.1;
        break;
    }

    return boost;
  }

  /**
   * Generate contextual AI response
   */
  private async generateResponse(query: string, intent: QueryIntent, context: QueryContext): Promise<string> {
    if (!groqService.isAvailable()) {
      return this.generateStaticResponse(intent, context);
    }

    try {
      const contextPrompt = this.buildContextPrompt(query, intent, context);
      const response = await groqService.makeCompletion(contextPrompt, 512);
      return response;
    } catch (error) {
      console.error('AI response generation failed:', error);
      return this.generateStaticResponse(intent, context);
    }
  }

  /**
   * Build context-aware prompt for AI response
   */
  private buildContextPrompt(query: string, intent: QueryIntent, context: QueryContext): string {
    const contextInfo = {
      repositories: context.repositories.length,
      developers: context.developers.length,
      tasks: context.tasks.length,
      currentRepo: context.currentRepository?.name || 'none',
      businessSpecs: context.businessSpecs.length,
    };

    return `
You are an AI assistant for a development platform. A user asked: "${query}"

Context:
- Intent: ${intent.type} (confidence: ${intent.confidence.toFixed(2)})
- Repositories connected: ${contextInfo.repositories}
- Team members: ${contextInfo.developers}
- Active tasks: ${contextInfo.tasks}
- Current repository: ${contextInfo.currentRepo}
- Business specifications: ${contextInfo.businessSpecs}

Entities found: ${intent.entities.map(e => `${e.type}: ${e.value}`).join(', ') || 'none'}

Provide a helpful, concise response (max 100 words) that:
1. Acknowledges their request
2. Explains what you can help with
3. Suggests next steps if appropriate

Be conversational and helpful.
    `;
  }

  /**
   * Generate static response when AI is not available
   */
  private generateStaticResponse(intent: QueryIntent, context: QueryContext): string {
    switch (intent.type) {
      case 'task_generation':
        return `I can help you generate technical tasks from business requirements. ${
          context.businessSpecs.length > 0 
            ? `You have ${context.businessSpecs.length} business spec(s) I can work with.` 
            : 'Please provide a business specification or feature description.'
        }`;
      
      case 'documentation':
        return `I can generate and update documentation for your repositories. ${
          context.repositories.length > 0
            ? `You have ${context.repositories.length} connected repository(ies).`
            : 'Please connect a repository first.'
        }`;
      
      case 'team_assignment':
        return `I can help assign tasks based on team capacity and skills. ${
          context.developers.length > 0
            ? `Your team has ${context.developers.length} member(s).`
            : 'Please add team members to get assignment suggestions.'
        }`;
      
      case 'pr_generation':
        return `I can create PR templates with branch names, commit messages, and file scaffolds. What feature or task would you like to implement?`;
      
      case 'analysis':
        return `I can analyze your codebase, team performance, and project metrics. What would you like me to analyze?`;
      
      default:
        return `I'm here to help with your development workflow! I can generate tasks, update documentation, assign team members, create PR templates, and provide project insights. What would you like to work on?`;
    }
  }

  /**
   * Generate suggested actions based on intent
   */
  private generateSuggestedActions(intent: QueryIntent, context: QueryContext): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    switch (intent.type) {
      case 'task_generation':
        if (context.businessSpecs.length > 0) {
          actions.push({
            id: 'generate-from-spec',
            title: 'Generate from Business Spec',
            description: 'Convert existing business specifications into tasks',
            action: 'generate-tasks-from-specs',
          });
        }
        actions.push({
          id: 'create-new-spec',
          title: 'Create New Specification',
          description: 'Write a new business spec and generate tasks',
          action: 'create-business-spec',
        });
        break;

      case 'documentation':
        if (context.currentRepository) {
          actions.push({
            id: 'generate-docs',
            title: 'Generate Documentation',
            description: `Generate docs for ${context.currentRepository.name}`,
            action: 'generate-documentation',
            parameters: { repositoryId: context.currentRepository.id },
          });
        }
        if (context.repositories.length > 1) {
          actions.push({
            id: 'select-repository',
            title: 'Select Repository',
            description: 'Choose which repository to document',
            action: 'select-repository',
          });
        }
        break;

      case 'team_assignment':
        if (context.tasks.filter(t => !t.assignee).length > 0) {
          actions.push({
            id: 'auto-assign',
            title: 'Auto-assign Tasks',
            description: 'Automatically assign unassigned tasks',
            action: 'auto-assign-tasks',
          });
        }
        actions.push({
          id: 'capacity-analysis',
          title: 'Analyze Team Capacity',
          description: 'Review current workload and availability',
          action: 'analyze-capacity',
        });
        break;

      case 'pr_generation':
        if (context.tasks.length > 0) {
          actions.push({
            id: 'generate-pr-from-task',
            title: 'Generate PR from Task',
            description: 'Create PR template for an existing task',
            action: 'generate-pr-template',
          });
        }
        actions.push({
          id: 'create-feature-pr',
          title: 'Create Feature PR',
          description: 'Generate PR template for a new feature',
          action: 'create-feature-pr',
        });
        break;
    }

    return actions;
  }

  /**
   * Determine if more information is needed
   */
  private needsMoreInformation(intent: QueryIntent, context: QueryContext): boolean {
    switch (intent.type) {
      case 'task_generation':
        return context.businessSpecs.length === 0 && intent.entities.length === 0;
      case 'documentation':
        return context.repositories.length === 0;
      case 'team_assignment':
        return context.developers.length === 0 || context.tasks.length === 0;
      case 'pr_generation':
        return intent.entities.length === 0;
      default:
        return false;
    }
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(intent: QueryIntent, context: QueryContext): string[] {
    const questions: string[] = [];

    switch (intent.type) {
      case 'task_generation':
        if (context.businessSpecs.length === 0) {
          questions.push('What feature or functionality would you like to implement?');
          questions.push('Do you have any specific requirements or acceptance criteria?');
        }
        break;
      case 'documentation':
        if (context.repositories.length === 0) {
          questions.push('Which repository would you like to document?');
          questions.push('Would you like to connect a GitHub repository first?');
        }
        break;
      case 'team_assignment':
        if (context.developers.length === 0) {
          questions.push('Who are the available team members?');
        }
        if (context.tasks.length === 0) {
          questions.push('What tasks need to be assigned?');
        }
        break;
      case 'pr_generation':
        questions.push('What feature or task would you like to create a PR for?');
        questions.push('Which repository should this PR target?');
        break;
    }

    return questions;
  }

  /**
   * Create fallback response for errors
   */
  private createFallbackResponse(query: string, context: QueryContext): ProcessedQuery {
    return {
      intent: {
        type: 'general',
        confidence: 0.5,
        entities: [],
        context,
      },
      response: "I'm here to help! I can assist with generating tasks, updating documentation, assigning team members, and creating PR templates. Could you please rephrase your request or try one of the quick actions?",
      suggestedActions: [
        {
          id: 'generate-tasks',
          title: 'Generate Tasks',
          description: 'Convert business requirements into technical tasks',
          action: 'generate-tasks',
        },
        {
          id: 'update-docs',
          title: 'Update Documentation',
          description: 'Generate or refresh project documentation',
          action: 'update-docs',
        },
      ],
      needsMoreInfo: true,
      followUpQuestions: ['What would you like me to help you with?'],
    };
  }

  /**
   * Parse AI response with error handling
   */
  private parseAIResponse(response: string): any {
    try {
      // Extract JSON from response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {};
    }
  }
}

export const nlpProcessor = new NLPProcessor();