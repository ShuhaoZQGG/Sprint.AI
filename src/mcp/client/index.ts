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
      const toolResults = [];
      
      // Use orchestrator for multi-step tool execution
      try {
        const { planId } = await mcpOrchestrator.createPlan(toolCalls, context);
        const executionResults = await mcpOrchestrator.executePlan(planId);
        
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
        // Fall back to individual tool execution if orchestration fails
        for (const toolCall of toolCalls) {
          try {
            const result = await toolApi.callTool(
              toolCall.toolId,
              toolCall.parameters,
              context
            );
            toolResults.push(result);
          } catch (error) {
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

      // Add tool results to conversation
      const toolMessage: MCPMessage = {
        id: this.generateId(),
        role: 'tool',
        content: 'Tool execution completed',
        toolCalls,
        toolResults,
        timestamp: new Date(),
      };
      
      conversation.messages.push(toolMessage);
      conversation.updatedAt = new Date();
      
      return toolMessage;
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
    const conversation = this.getOrCreateConversation(conversationId, context);
    
    let toolResults: MCPToolResult[] = [];
    
    // Use orchestrator for multi-step tool execution
    try {
      const { planId } = await mcpOrchestrator.createPlan(toolCalls, context);
      const executionResults = await mcpOrchestrator.executePlan(planId);
      
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
      // Fall back to individual tool execution if orchestration fails
      for (const toolCall of toolCalls) {
        try {
          const result = await toolApi.callTool(
            toolCall.toolId,
            toolCall.parameters,
            context
          );
          toolResults.push(result);
        } catch (error) {
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

    const toolMessage: MCPMessage = {
      id: this.generateId(),
      role: 'tool',
      content: `Executed ${toolCalls.length} tool(s)`,
      toolCalls,
      toolResults,
      timestamp: new Date(),
    };
    
    conversation.messages.push(toolMessage);
    conversation.updatedAt = new Date();
    
    return toolMessage;
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
      const result = await mcpOrchestrator.createSmartPlan(toolCall, context)
        .then(({ planId }) => mcpOrchestrator.executePlan(planId))
        .then(results => results[results.length - 1]);
      
      toolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: new Date(),
      };
    } catch (error) {
      toolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
    
    const toolMessage: MCPMessage = {
      id: this.generateId(),
      role: 'tool',
      content: `Executed tool: ${toolId}`,
      toolCalls: [toolCall],
      toolResults: [toolResult],
      timestamp: new Date(),
    };
    
    conversation.messages.push(toolMessage);
    conversation.updatedAt = new Date();
    
    return toolMessage;
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