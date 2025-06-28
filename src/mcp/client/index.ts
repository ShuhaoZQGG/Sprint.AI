import { MCPClientConfig, MCPConversation, MCPMessage, MCPToolCall } from '../../types/mcp';
import { MCPExecutionContext } from '../server/types';
import { toolApi } from './toolApi';

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
      
      for (const toolCall of toolCalls) {
        const result = await toolApi.callTool(
          toolCall.toolId,
          toolCall.parameters,
          context
        );
        toolResults.push(result);
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
    
    const toolResults = [];
    
    for (const toolCall of toolCalls) {
      const result = await toolApi.callTool(
        toolCall.toolId,
        toolCall.parameters,
        context
      );
      toolResults.push(result);
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