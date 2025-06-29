import { Repository, Developer, Task, BusinessSpec } from '../types';
import { GeneratedDocumentation } from './docGenerator';
import { mcpClient } from '../mcp/client';
import { toolApi } from '../mcp/client/toolApi';
import { contextMemory } from './contextMemory';
import { MCPToolCall, MCPToolResult } from '../types/mcp';
import { MCPExecutionContext } from '../mcp/server/types';
import { mcpOrchestrator } from '../mcp/server/orchestrator';

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
  private executingQueries: Set<string> = new Set();

  /**
   * Process a natural language query and return structured response
   * This method uses MCP-based processing
   */
  async processQuery(query: string, context: QueryContext, conversationId?: string): Promise<ProcessedQuery> {
    // Create a unique key for this query to prevent duplicate processing
    const queryKey = `${query}_${Date.now()}`;
    
    if (this.executingQueries.has(queryKey)) {
      console.log(`[NLPProcessor] Duplicate query detected, skipping: "${query}"`);
      return this.createFallbackResponse(query, context);
    }
    
    this.executingQueries.add(queryKey);
    
    try {
      console.log(`[NLPProcessor] Processing query: "${query}"`);
      // If no conversationId is provided, generate one
      const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return await this.processQueryWithMCP(query, context, convId);
    } catch (error) {
      console.error('MCP processing error:', error);
      return this.createFallbackResponse(query, context);
    } finally {
      this.executingQueries.delete(queryKey);
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
      console.log(`[NLPProcessor] Processing query with MCP: "${query}"`);
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
      console.log(`[NLPProcessor] Processing user message through MCP client`);
      const userMessage = await mcpClient.processMessage(
        conversationId,
        query,
        mcpContext
      );

      // Generate AI context for better tool selection
      const aiContext = contextMemory.generateAIContext(conversationId);
      
      // Use the context to enhance tool suggestions
      const enhancedContext = {
        ...mcpContext,
        aiContext,
        recentActions: contextMemory.getConversationContext(conversationId).recentActions,
        conversationHistory: [{ role: 'user', content: query }]
      };
      
      // Suggest tools based on query using the enhanced tool suggestion system
      console.log(`[NLPProcessor] Getting tool suggestions for query with enhanced context`);
      const suggestedTools = toolApi.suggestTools(query, enhancedContext);
      console.log(`[NLPProcessor] Got ${suggestedTools.length} tool suggestions`);
      
      // Execute high confidence tools
      let toolResults: MCPToolResult[] = [];
      if (suggestedTools.length > 0) {
        // Use callMultipleTools for better orchestration
        try {
          // Filter to high confidence suggestions
          const highConfidenceSuggestions = suggestedTools
            .filter(tool => tool.confidence > 0.7) // Limit to top 2 high confidence suggestions to avoid duplicates
          
          if (highConfidenceSuggestions.length > 0) {
            console.log(`[NLPProcessor] Executing ${highConfidenceSuggestions.length} high confidence tools using callMultipleTools`);
            
            // Use callMultipleTools to execute all high confidence tools in one go
            toolResults = await toolApi.callMultipleTools(
              highConfidenceSuggestions,
              mcpContext
            );
            
            console.log(`[NLPProcessor] Multiple tool execution completed with ${toolResults.length} results`);
            
            // Create tool message
            const toolCalls = highConfidenceSuggestions.map((suggestion, index) => ({
              id: toolResults[index]?.toolCallId || `call_${Date.now()}_${index}`,
              toolId: suggestion.toolId,
              parameters: suggestion.parameters || {},
              timestamp: new Date(),
            }));
            
            // Store in conversation
            await mcpClient.processMessage(
              conversationId,
              '',
              mcpContext,
              toolCalls
            );
            
            // Store tool results in context memory
            toolResults.forEach(result => {
              contextMemory.storeToolResult(conversationId, result.toolCallId, result);
            });
          }
        } catch (error) {
          console.error('Error in multiple tool execution:', error);
          // Fall back to orchestrator for more complex scenarios
          try {
            // Create tool calls from suggestions
            const toolCalls: MCPToolCall[] = suggestedTools
              .filter(tool => tool.confidence > 0.7) // Only use high confidence suggestions
              .slice(0, 2) // Limit to top 2 to avoid duplicates
              .map(tool => ({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                toolId: tool.toolId,
                parameters: tool.parameters || {},
                timestamp: new Date(),
              }));
            
            if (toolCalls.length > 0) {
              console.log(`[NLPProcessor] Creating orchestration plan for ${toolCalls.length} tools`);
              // Create an orchestration plan
              const { planId } = await mcpOrchestrator.createPlan(toolCalls, mcpContext);
              
              // Execute the plan
              console.log(`[NLPProcessor] Executing plan ${planId}`);
              const executionResults = await mcpOrchestrator.executePlan(planId);
              console.log(`[NLPProcessor] Plan execution completed with ${executionResults.length} results`);
              
              // Map execution results to tool results
              toolResults = toolCalls.map((call, index) => ({
                id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                toolCallId: call.id,
                success: executionResults[index]?.success || false,
                data: executionResults[index]?.data,
                error: executionResults[index]?.error,
                timestamp: new Date(),
              }));
              
              // Create tool message
              const toolMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: 'tool' as const,
                content: this.generateUserFriendlyResponse(query, toolResults),
                toolCalls,
                toolResults,
                timestamp: new Date(),
              };
              
              // Store in conversation
              await mcpClient.processMessage(
                conversationId,
                '',
                mcpContext,
                toolCalls
              );
              
              // Store tool results in context memory
              toolResults.forEach(result => {
                contextMemory.storeToolResult(conversationId, result.toolCallId, result);
              });
            }
          } catch (error) {
            console.error('Error in orchestrated tool execution:', error);
            // Fall back to individual tool execution
            for (const suggestion of suggestedTools.filter(s => s.confidence > 0.7).slice(0, 1)) {
              console.log(`[NLPProcessor] Falling back to individual tool execution: ${suggestion.toolId}`);
              const result = await toolApi.callTool(
                suggestion.toolId,
                suggestion.parameters,
                mcpContext
              );
              toolResults.push(result);
            }
          }
        }
      }

      // Generate response based on tool results
      const response = this.generateUserFriendlyResponse(query, toolResults);
      console.log(`[NLPProcessor] Generated response: "${response.substring(0, 100)}..."`);
      
      // Convert tool suggestions to suggested actions
      const suggestedActions = suggestedTools.map(tool => ({
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `Execute ${tool.toolId}`,
        description: `Run the ${tool.toolId} tool with provided parameters`,
        action: tool.toolId,
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
   * Generate tasks from business specification using MCP
   */
  async generateTasksFromBusinessSpec(request: TaskGenerationRequest): Promise<TaskGenerationResponse> {
    try {
      console.log(`[NLPProcessor] Generating tasks from business spec: ${request.businessSpec.title}`);
      const mcpContext: MCPExecutionContext = {
        userId: 'user-id',
        teamId: 'team-id',
        repositories: [],
        developers: [],
        tasks: [],
        businessSpecs: [request.businessSpec],
        timestamp: new Date(),
      };

      // Use orchestrator for more robust execution
      const toolCall: MCPToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toolId: 'generate-tasks-from-specs',
        parameters: { 
          specId: request.businessSpec.id,
          includeReasoning: true,
          teamSkills: request.teamSkills,
        },
        timestamp: new Date(),
      };

      console.log(`[NLPProcessor] Creating smart plan for task generation`);
      const { planId } = await mcpOrchestrator.createSmartPlan(toolCall, mcpContext);
      console.log(`[NLPProcessor] Executing plan ${planId}`);
      const results = await mcpOrchestrator.executePlan(planId);
      const result = results[results.length - 1];

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate tasks');
      }

      console.log(`[NLPProcessor] Generated ${result.data.tasks?.length || 0} tasks`);
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
      console.log(`[NLPProcessor] Analyzing documentation changes for section: ${sectionTitle}`);
      const mcpContext: MCPExecutionContext = {
        userId: 'user-id',
        teamId: 'team-id',
        repositories: [],
        developers: [],
        tasks: [],
        businessSpecs: [],
        timestamp: new Date(),
      };

      const toolCall: MCPToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toolId: 'analyze-documentation-changes',
        parameters: {
          oldContent,
          newContent,
          sectionTitle,
          generateSpec: true,
        },
        timestamp: new Date(),
      };

      // Use orchestrator for more robust execution
      console.log(`[NLPProcessor] Creating smart plan for documentation analysis`);
      const { planId } = await mcpOrchestrator.createSmartPlan(toolCall, mcpContext);
      console.log(`[NLPProcessor] Executing plan ${planId}`);
      const results = await mcpOrchestrator.executePlan(planId);
      const result = results[results.length - 1];

      if (!result.success) {
        return {
          hasSignificantChanges: false,
          changeAnalysis: result.error || 'Failed to analyze changes',
        };
      }

      console.log(`[NLPProcessor] Documentation analysis completed, significant changes: ${result.data.hasSignificantChanges}`);
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
   * Generate user-friendly response from tool results
   */
  private generateUserFriendlyResponse(
    query: string,
    toolResults: MCPToolResult[]
  ): string {
    console.log(`[NLPProcessor] Generating user-friendly response from ${toolResults.length} tool results`);
    
    // If no tool results, generate a generic response
    if (toolResults.length === 0) {
      return "I'm here to help with your development workflow! I can generate tasks, update documentation, assign team members, create PR templates, and provide project insights. What would you like to work on?";
    }

    // Check if all tools succeeded
    const allSucceeded = toolResults.every(result => result.success);
    
    if (allSucceeded) {
      // Generate response based on successful tool executions
      let response = "";
      
      // Look for specific tool types to generate appropriate responses
      const toolTypes = toolResults.map(result => result.toolCallId.split('_')[0]);
      
      // Handle repository analysis
      if (toolResults.some(r => r.toolCallId.includes('analyze-codebase'))) {
        const result = toolResults.find(r => r.toolCallId.includes('analyze-codebase'));
        if (result && result.data) {
          const data = result.data;
          response = `I've analyzed the codebase and found ${data.modules?.length || 0} modules and ${data.services?.length || 0} services. `;
          
          if (data.summary) {
            response += `${data.summary} `;
          }
          
          if (data.dependencies?.length > 0) {
            response += `The project uses ${data.dependencies.length} dependencies including ${data.dependencies.slice(0, 3).map((d: any) => d.name).join(', ')}.`;
          }
        }
      }
      // Handle PR template generation
      else if (toolResults.some(r => r.toolCallId.includes('generate-pr-template'))) {
        const result = toolResults.find(r => r.toolCallId.includes('generate-pr-template'));
        if (result && result.data) {
          const data = result.data;
          response = `I've generated a PR template for "${data.task?.title || 'your task'}" in the ${data.repository?.name || 'repository'}. `;
          
          if (data.template?.fileScaffolds?.length > 0) {
            response += `The PR includes ${data.template.fileScaffolds.length} file scaffolds. `;
          }
          
          response += `The branch name is \`${data.template?.branchName || 'feature/branch'}\`. `;
          
          if (data.message) {
            response += data.message;
          }
        }
      }
      // Handle task creation
      else if (toolResults.some(r => r.toolCallId.includes('create-task'))) {
        const result = toolResults.find(r => r.toolCallId.includes('create-task'));
        if (result && result.data) {
          const task = result.data;
          response = `I've created a new ${task.type} task: "${task.title}". `;
          
          if (task.assignee) {
            response += `It's assigned to ${task.assignee.name}. `;
          } else {
            response += `It's currently unassigned. `;
          }
          
          response += `The task has ${task.priority} priority and an estimated effort of ${task.estimatedEffort} hours.`;
          
          if (task.message) {
            response += ` ${task.message}`;
          }
        }
      }
      // Handle repository listing
      else if (toolResults.some(r => r.toolCallId.includes('list-repositories'))) {
        const result = toolResults.find(r => r.toolCallId.includes('list-repositories'));
        if (result && result.data && result.data.repositories) {
          const repos = result.data.repositories;
          response = `I found ${repos.length} repositories: `;
          
          if (repos.length > 0) {
            response += repos.map((repo: any) => `"${repo.name}"`).join(', ');
          } else {
            response += "No repositories found.";
          }
          
          if (result.data.message) {
            response += ` ${result.data.message}`;
          }
        }
      }
      // Handle task listing
      else if (toolResults.some(r => r.toolCallId.includes('list-tasks'))) {
        const result = toolResults.find(r => r.toolCallId.includes('list-tasks'));
        if (result && result.data && result.data.tasks) {
          const tasks = result.data.tasks;
          response = `I found ${tasks.length} tasks: `;
          
          if (tasks.length > 0) {
            response += tasks.map((task: any) => `"${task.title}"`).join(', ');
          } else {
            response += "No tasks found.";
          }
          
          if (result.data.message) {
            response += ` ${result.data.message}`;
          }
        }
      }
      // Generic successful response
      else {
        // Try to extract message from result data
        const messages = toolResults
          .filter(r => r.data && r.data.message)
          .map(r => r.data.message);
        
        if (messages.length > 0) {
          response = messages.join(' ');
        } else {
          const toolNames = [...new Set(toolResults.map(r => {
            const parts = r.toolCallId.split('_')[0].split('-');
            return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          }))];
          
          response = `I've successfully completed the ${toolNames.join(' and ')} operation. `;
          
          if (query) {
            response += `This should address your request about "${query}".`;
          }
        }
      }
      
      return response;
    } else {
      // Generate response for failed tool executions
      const failedResults = toolResults.filter(result => !result.success);
      const errorMessages = failedResults.map(result => result.error).filter(Boolean);
      
      let response = "I encountered some issues while processing your request. ";
      
      if (errorMessages.length > 0) {
        response += `Specifically: ${errorMessages.join(', ')}. `;
      }
      
      // Add suggestions for fixing the issues
      if (failedResults.some(r => r.error?.includes('Repository not found'))) {
        response += "Please make sure you've connected a repository or specify which repository you want to work with. ";
      } else if (failedResults.some(r => r.error?.includes('Task not found'))) {
        response += "Please make sure you've created a task or specify which task you want to work with. ";
      }
      
      response += "Please try again with more specific information.";
      
      return response;
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