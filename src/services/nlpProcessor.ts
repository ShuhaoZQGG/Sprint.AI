import { Repository, Developer, Task, BusinessSpec } from '../types';
import { GeneratedDocumentation } from './docGenerator';
import { mcpClient } from '../mcp/client';
import { toolApi } from '../mcp/client/toolApi';
import { contextMemory } from './contextMemory';
import { MCPToolCall, MCPToolResult } from '../types/mcp';
import { MCPExecutionContext } from '../mcp/server/types';

export interface QueryContext {
  repositories: Repository[];
  developers: Developer[];
  tasks: Task[];
  documentation: GeneratedDocumentation[];
  currentRepository?: Repository;
  businessSpecs: BusinessSpec[];
}

export interface ProcessedQuery {
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
  /**
   * Process a natural language query and return structured response
   * This method uses MCP-based processing
   */
  async processQuery(query: string, context: QueryContext, conversationId?: string): Promise<ProcessedQuery> {
    try {
      // If no conversationId is provided, generate one
      const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return await this.processQueryWithMCP(query, context, convId);
    } catch (error) {
      console.error('MCP processing error:', error);
      return this.createFallbackResponse(query, context);
    }
  }

  /**
   * Process query using MCP tools
   */
  async processQueryWithMCP(
    query: string, 
    context: QueryContext, 
    conversationId: string
  ): Promise<ProcessedQuery> {
    try {
      // Update conversation context in memory
      contextMemory.updateConversationContext(conversationId, {
        userId: 'user-id', // This would come from auth
        teamId: 'team-id', // This would come from auth
        repositories: context.repositories,
        currentRepository: context.currentRepository,
        developers: context.developers,
        tasks: context.tasks,
        businessSpecs: context.businessSpecs,
      });

      // Create MCP execution context
      const mcpContext: MCPExecutionContext = {
        userId: 'user-id', // This would come from auth
        teamId: 'team-id', // This would come from auth
        repositories: context.repositories,
        currentRepository: context.currentRepository,
        developers: context.developers,
        tasks: context.tasks,
        businessSpecs: context.businessSpecs,
        timestamp: new Date(),
      };

      // Process user message through MCP client
      const userMessage = await mcpClient.processMessage(
        conversationId,
        query,
        mcpContext
      );

      // Suggest tools based on query
      const suggestedTools = this.suggestToolsForQuery(query, context);
      
      // Execute suggested tools if available
      let toolResults: MCPToolResult[] = [];
      if (suggestedTools.length > 0) {
        const toolCalls: MCPToolCall[] = suggestedTools.map(tool => ({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          toolId: tool.id,
          parameters: tool.parameters || {},
          timestamp: new Date(),
        }));
        
        const toolMessage = await mcpClient.executeToolsFromMessage(
          conversationId,
          toolCalls,
          mcpContext
        );
        
        if (toolMessage.toolResults) {
          toolResults = toolMessage.toolResults;
          
          // Store tool results in context memory
          toolResults.forEach(result => {
            contextMemory.storeToolResult(conversationId, result.toolCallId, result);
          });
        }
      }

      // Generate response based on tool results
      const response = this.generateResponseFromToolResults(query, toolResults);
      
      // Convert tool suggestions to suggested actions
      const suggestedActions = suggestedTools.map(tool => ({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `Execute ${tool.id}`,
        description: `Run the ${tool.id} tool with provided parameters`,
        action: tool.id,
        parameters: tool.parameters || {},
      }));

      // Determine if more information is needed
      const needsMoreInfo = this.needsMoreInformation(query, context);
      
      // Generate follow-up questions if needed
      const followUpQuestions = needsMoreInfo ? this.generateFollowUpQuestions(query, context) : [];

      return {
        response,
        suggestedActions,
        needsMoreInfo,
        followUpQuestions,
      };
    } catch (error) {
      console.error('MCP query processing error:', error);
      return this.createFallbackResponse(query, context);
    }
  }

  /**
   * Suggest tools based on query content
   */
  private suggestToolsForQuery(
    query: string,
    context: QueryContext
  ): Array<{ id: string; parameters: Record<string, any> }> {
    const lowerQuery = query.toLowerCase();
    const tools = [];

    // Task-related queries
    if (lowerQuery.includes('task') || lowerQuery.includes('create') || lowerQuery.includes('todo')) {
      if (lowerQuery.includes('from spec') && context.businessSpecs.length > 0) {
        // Suggest generating tasks from business specs
        const approvedSpecs = context.businessSpecs.filter(spec => spec.status === 'approved');
        if (approvedSpecs.length > 0) {
          tools.push({
            id: 'generate-tasks-from-specs',
            parameters: { specId: approvedSpecs[0].id },
          });
        }
      } else {
        // Suggest creating a new task
        tools.push({
          id: 'create-task',
          parameters: {
            title: 'New Task',
            description: 'Task created from AI query',
            type: 'feature',
            priority: 'medium',
            estimatedEffort: 8,
          },
        });
      }
    }

    // Documentation queries
    if (lowerQuery.includes('doc') || lowerQuery.includes('documentation')) {
      if (context.currentRepository) {
        tools.push({
          id: 'generate-documentation',
          parameters: { repositoryId: context.currentRepository.id },
        });
      }
    }

    // Analysis queries
    if (lowerQuery.includes('analyze') || lowerQuery.includes('performance') || lowerQuery.includes('team')) {
      tools.push({
        id: 'analyze-team-performance',
        parameters: { timeframe: 'month', includeRecommendations: true },
      });
    }

    // Sprint queries
    if (lowerQuery.includes('sprint') || lowerQuery.includes('capacity')) {
      if (lowerQuery.includes('create') || lowerQuery.includes('new')) {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        tools.push({
          id: 'create-optimized-sprint',
          parameters: {
            name: 'AI Generated Sprint',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            autoAssign: true,
          },
        });
      } else {
        tools.push({
          id: 'analyze-sprint-capacity',
          parameters: { duration: 14, bufferPercentage: 20 },
        });
      }
    }

    // PR queries
    if (lowerQuery.includes('pr') || lowerQuery.includes('pull request')) {
      if (context.tasks.length > 0) {
        const unassignedTasks = context.tasks.filter(task => task.status === 'todo');
        if (unassignedTasks.length > 0 && context.currentRepository) {
          tools.push({
            id: 'generate-pr-template',
            parameters: {
              taskId: unassignedTasks[0].id,
              repositoryId: context.currentRepository.id,
              includeScaffolds: true,
            },
          });
        }
      }
    }

    // Repository listing
    if (lowerQuery.includes('list') && lowerQuery.includes('repo')) {
      tools.push({
        id: 'list-repositories',
        parameters: { limit: 5 },
      });
    }

    // Task listing
    if (lowerQuery.includes('list') && lowerQuery.includes('task')) {
      tools.push({
        id: 'list-tasks',
        parameters: { limit: 5 },
      });
    }

    // Business spec listing
    if (lowerQuery.includes('list') && lowerQuery.includes('spec')) {
      tools.push({
        id: 'list-business-specs',
        parameters: { limit: 5 },
      });
    }

    return tools;
  }

  /**
   * Generate response from tool results
   */
  private generateResponseFromToolResults(
    query: string,
    toolResults: MCPToolResult[]
  ): string {
    // If no tool results, generate a generic response
    if (toolResults.length === 0) {
      return "I'm here to help with your development workflow! I can generate tasks, update documentation, assign team members, create PR templates, and provide project insights. What would you like to work on?";
    }

    // Check if all tools succeeded
    const allSucceeded = toolResults.every(result => result.success);
    
    if (allSucceeded) {
      // Generate response based on successful tool executions
      const toolTypes = toolResults.map(result => result.toolCallId.split('_')[0]).join(', ');
      return `I've successfully processed your request using ${toolTypes}. You can review the results and take further actions based on the suggestions.`;
    } else {
      // Generate response for failed tool executions
      const failedResults = toolResults.filter(result => !result.success);
      const errorMessages = failedResults.map(result => result.error).join(', ');
      
      return `I encountered some issues while processing your request: ${errorMessages}. Please try again or modify your request.`;
    }
  }

  /**
   * Generate tasks from business specification using MCP
   */
  async generateTasksFromBusinessSpec(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    try {
      const mcpContext: MCPExecutionContext = {
        userId: 'user-id',
        teamId: 'team-id',
        repositories: [],
        developers: [],
        tasks: [],
        businessSpecs: [request.businessSpec],
        timestamp: new Date(),
      };

      const result = await toolApi.callTool(
        'generate-tasks-from-specs',
        { specId: request.businessSpec.id },
        mcpContext
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate tasks');
      }

      return {
        tasks: result.data.tasks || [],
        reasoning: result.data.reasoning || 'Generated tasks based on business specification',
        confidence: result.data.confidence || 0.8,
      };
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
    try {
      const mcpContext: MCPExecutionContext = {
        userId: 'user-id',
        teamId: 'team-id',
        repositories: [],
        developers: [],
        tasks: [],
        businessSpecs: [],
        timestamp: new Date(),
      };

      const result = await toolApi.callTool(
        'analyze-documentation-changes',
        {
          oldContent,
          newContent,
          sectionTitle,
        },
        mcpContext
      );

      if (!result.success) {
        return {
          hasSignificantChanges: false,
          changeAnalysis: result.error || 'Failed to analyze changes',
        };
      }

      return {
        hasSignificantChanges: result.data.hasSignificantChanges || false,
        suggestedSpec: result.data.suggestedSpec,
        changeAnalysis: result.data.changeAnalysis || 'No significant changes detected',
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
   * Determine if more information is needed
   */
  private needsMoreInformation(query: string, context: QueryContext): boolean {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('task') && context.businessSpecs.length === 0) {
      return true;
    }
    
    if (lowerQuery.includes('documentation') && context.repositories.length === 0) {
      return true;
    }
    
    if (lowerQuery.includes('assign') && (context.developers.length === 0 || context.tasks.length === 0)) {
      return true;
    }
    
    if (lowerQuery.includes('pr') && context.tasks.length === 0) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(query: string, context: QueryContext): string[] {
    const lowerQuery = query.toLowerCase();
    const questions: string[] = [];

    if (lowerQuery.includes('task')) {
      if (context.businessSpecs.length === 0) {
        questions.push('What feature or functionality would you like to implement?');
        questions.push('Do you have any specific requirements or acceptance criteria?');
      }
    }
    
    if (lowerQuery.includes('documentation')) {
      if (context.repositories.length === 0) {
        questions.push('Which repository would you like to document?');
        questions.push('Would you like to connect a GitHub repository first?');
      }
    }
    
    if (lowerQuery.includes('assign')) {
      if (context.developers.length === 0) {
        questions.push('Who are the available team members?');
      }
      if (context.tasks.length === 0) {
        questions.push('What tasks need to be assigned?');
      }
    }
    
    if (lowerQuery.includes('pr')) {
      questions.push('What feature or task would you like to create a PR for?');
      questions.push('Which repository should this PR target?');
    }

    return questions;
  }

  /**
   * Create fallback response for errors
   */
  private createFallbackResponse(query: string, context: QueryContext): ProcessedQuery {
    return {
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
}

export const nlpProcessor = new NLPProcessor();