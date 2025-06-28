import { MCPClientConfig, MCPConversation, MCPMessage, MCPToolCall, MCPToolResult } from '../../types/mcp';
import { MCPExecutionContext } from '../server/types';
import { toolApi } from './toolApi';
import { mcpOrchestrator } from '../server/orchestrator';

class MCPClient {
  private config: MCPClientConfig;
  private conversations: Map<string, MCPConversation>;

  constructor(config: Partial<MCPClientConfig> = {}) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
      ...config,
    };
    
    this.conversations = new Map();
  }

  async processMessage(
    conversationId: string,
    message: string,
    context: MCPExecutionContext,
    toolCalls?: MCPToolCall[]
  ): Promise<MCPMessage> {
    console.log(`[MCPClient] Processing message in conversation ${conversationId}: "${message}"`);
    const conversation = this.getOrCreateConversation(conversationId, context);
    
    // Add user message to conversation
    const userMessage: MCPMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    conversation.messages.push(userMessage);

    // Process tool calls if provided
    if (toolCalls && toolCalls.length > 0) {
      console.log(`[MCPClient] Processing ${toolCalls.length} tool calls`);
      
      // Use callMultipleTools for better orchestration
      try {
        console.log(`[MCPClient] Using callMultipleTools for ${toolCalls.length} tools`);
        const toolResults = await toolApi.callMultipleTools(
          toolCalls.map(call => ({
            toolId: call.toolId,
            parameters: call.parameters
          })),
          context
        );
        
        console.log(`[MCPClient] callMultipleTools completed with ${toolResults.length} results`);
        
        // Add tool results to conversation
        const toolMessage: MCPMessage = {
          id: this.generateId(),
          role: 'tool',
          content: this.generateUserFriendlyResponse(toolResults, message),
          toolCalls,
          toolResults,
          timestamp: new Date(),
        };
        
        conversation.messages.push(toolMessage);
        conversation.updatedAt = new Date();
        
        console.log(`[MCPClient] Added tool message to conversation`);
        return toolMessage;
      } catch (error) {
        console.error(`[MCPClient] callMultipleTools failed, falling back to individual execution: ${error}`);
        
        // Fall back to individual tool execution
        const toolResults: MCPToolResult[] = [];
        for (const toolCall of toolCalls) {
          try {
            console.log(`[MCPClient] Executing individual tool: ${toolCall.toolId}`);
            const result = await toolApi.callTool(
              toolCall.toolId,
              toolCall.parameters,
              context
            );
            toolResults.push(result);
          } catch (error) {
            console.error(`[MCPClient] Individual tool execution failed: ${error}`);
            toolResults.push({
              id: this.generateId(),
              toolCallId: toolCall.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
            });
          }
        }
        
        // Add tool results to conversation
        const toolMessage: MCPMessage = {
          id: this.generateId(),
          role: 'tool',
          content: this.generateUserFriendlyResponse(toolResults, message),
          toolCalls,
          toolResults,
          timestamp: new Date(),
        };
        
        conversation.messages.push(toolMessage);
        conversation.updatedAt = new Date();
        
        console.log(`[MCPClient] Added tool message to conversation`);
        return toolMessage;
      }
    }

    // Return the user message if no tool calls
    conversation.updatedAt = new Date();
    return userMessage;
  }

  async executeToolsFromMessage(
    conversationId: string,
    toolCalls: MCPToolCall[],
    context: MCPExecutionContext
  ): Promise<MCPMessage> {
    console.log(`[MCPClient] Executing ${toolCalls.length} tools from message in conversation ${conversationId}`);
    const conversation = this.getOrCreateConversation(conversationId, context);
    
    // Use callMultipleTools for better orchestration
    try {
      console.log(`[MCPClient] Using callMultipleTools for ${toolCalls.length} tools`);
      const toolResults = await toolApi.callMultipleTools(
        toolCalls.map(call => ({
          toolId: call.toolId,
          parameters: call.parameters
        })),
        context
      );
      
      console.log(`[MCPClient] callMultipleTools completed with ${toolResults.length} results`);
      
      // Generate a user-friendly response based on the tool results
      const responseContent = this.generateUserFriendlyResponse(toolResults);
      
      const toolMessage: MCPMessage = {
        id: this.generateId(),
        role: 'tool',
        content: responseContent,
        toolCalls,
        toolResults,
        timestamp: new Date(),
      };
      
      conversation.messages.push(toolMessage);
      conversation.updatedAt = new Date();
      
      console.log(`[MCPClient] Added tool message to conversation with content: "${responseContent.substring(0, 100)}..."`);
      return toolMessage;
    } catch (error) {
      console.error(`[MCPClient] callMultipleTools failed, falling back to orchestration: ${error}`);
      
      // Fall back to orchestration
      let toolResults: MCPToolResult[] = [];
      
      // Use orchestrator for multi-step tool execution
      try {
        console.log(`[MCPClient] Creating orchestration plan for tools`);
        const { planId } = await mcpOrchestrator.createPlan(toolCalls, context);
        console.log(`[MCPClient] Executing plan ${planId}`);
        const executionResults = await mcpOrchestrator.executePlan(planId);
        console.log(`[MCPClient] Plan execution completed with ${executionResults.length} results`);
        
        // Map execution results to tool results
        for (let i = 0; i < toolCalls.length; i++) {
          const result = executionResults[i] || {
            success: false,
            error: 'Tool execution failed',
          };
          
          toolResults.push({
            id: this.generateId(),
            toolCallId: toolCalls[i].id,
            success: result.success,
            data: result.data,
            error: result.error,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error(`[MCPClient] Orchestration failed, falling back to individual tool execution: ${error}`);
        // Fall back to individual tool execution if orchestration fails
        for (const toolCall of toolCalls) {
          try {
            console.log(`[MCPClient] Executing individual tool: ${toolCall.toolId}`);
            const result = await toolApi.callTool(
              toolCall.toolId,
              toolCall.parameters,
              context
            );
            toolResults.push(result);
          } catch (error) {
            console.error(`[MCPClient] Individual tool execution failed: ${error}`);
            toolResults.push({
              id: this.generateId(),
              toolCallId: toolCall.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
            });
          }
        }
      }

      // Generate a user-friendly response based on the tool results
      const responseContent = this.generateUserFriendlyResponse(toolResults);

      const toolMessage: MCPMessage = {
        id: this.generateId(),
        role: 'tool',
        content: responseContent,
        toolCalls,
        toolResults,
        timestamp: new Date(),
      };
      
      conversation.messages.push(toolMessage);
      conversation.updatedAt = new Date();
      
      console.log(`[MCPClient] Added tool message to conversation with content: "${responseContent.substring(0, 100)}..."`);
      return toolMessage;
    }
  }

  /**
   * Execute a single tool with automatic parameter resolution
   */
  async executeSmartTool(
    conversationId: string,
    toolId: string,
    parameters: Record<string, any>,
    context: MCPExecutionContext
  ): Promise<MCPMessage> {
    console.log(`[MCPClient] Executing smart tool ${toolId} in conversation ${conversationId}`);
    const conversation = this.getOrCreateConversation(conversationId, context);
    
    const toolCall: MCPToolCall = {
      id: this.generateId(),
      toolId,
      parameters,
      timestamp: new Date(),
    };
    
    let toolResult: MCPToolResult;
    
    try {
      // Use orchestrator for smart parameter resolution
      console.log(`[MCPClient] Creating smart plan for tool: ${toolId}`);
      const result = await mcpOrchestrator.createSmartPlan(toolCall, context)
        .then(({ planId }) => {
          console.log(`[MCPClient] Executing plan ${planId}`);
          return mcpOrchestrator.executePlan(planId);
        })
        .then(results => {
          console.log(`[MCPClient] Plan execution completed with ${results.length} results`);
          return results[results.length - 1];
        });
      
      toolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[MCPClient] Smart tool execution failed: ${error}`);
      toolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
    
    // Generate a user-friendly response based on the tool result
    const responseContent = this.generateUserFriendlyResponse([toolResult]);
    
    const toolMessage: MCPMessage = {
      id: this.generateId(),
      role: 'tool',
      content: responseContent,
      toolCalls: [toolCall],
      toolResults: [toolResult],
      timestamp: new Date(),
    };
    
    conversation.messages.push(toolMessage);
    conversation.updatedAt = new Date();
    
    console.log(`[MCPClient] Added tool message to conversation with content: "${responseContent.substring(0, 100)}..."`);
    return toolMessage;
  }

  /**
   * Generate a user-friendly response from tool results
   */
  private generateUserFriendlyResponse(toolResults: MCPToolResult[], userQuery?: string): string {
    console.log(`[MCPClient] Generating user-friendly response from ${toolResults.length} tool results`);
    
    // If no tool results, return a generic response
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
          
          if (userQuery) {
            response += `This should address your request about "${userQuery}".`;
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

  getConversation(conversationId: string): MCPConversation | undefined {
    return this.conversations.get(conversationId);
  }

  getAllConversations(): MCPConversation[] {
    return Array.from(this.conversations.values());
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  clearAllConversations(): void {
    this.conversations.clear();
  }

  getAvailableTools(): any[] {
    return toolApi.getAvailableTools();
  }

  getToolDocumentation(): string {
    return toolApi.getToolDocumentation();
  }

  private getOrCreateConversation(
    conversationId: string,
    context: MCPExecutionContext
  ): MCPConversation {
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      conversation = {
        id: conversationId,
        messages: [],
        context: {
          userId: context.userId,
          teamId: context.teamId,
          timestamp: context.timestamp,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.conversations.set(conversationId, conversation);
    }
    
    return conversation;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const mcpClient = new MCPClient();