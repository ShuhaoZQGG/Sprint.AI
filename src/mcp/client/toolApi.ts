import { MCPToolCall, MCPToolResult, MCPMessage } from '../../types/mcp';
import { MCPExecutionContext } from '../server/types';
import { mcpServer } from '../server';

export interface ToolApiConfig {
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

class ToolApi {
  private config: ToolApiConfig;

  constructor(config: Partial<ToolApiConfig> = {}) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
      ...config,
    };
  }

  async callTool(
    toolId: string,
    parameters: Record<string, any>,
    context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    const toolCall: MCPToolCall = {
      id: this.generateId(),
      toolId,
      parameters,
      timestamp: new Date(),
    };

    if (this.config.enableLogging) {
      console.log(`[MCP] Calling tool: ${toolId}`, parameters);
    }

    try {
      const result = await this.executeWithTimeout(
        mcpServer.executeTool(toolCall, context),
        this.config.timeout
      );

      const toolResult: MCPToolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: new Date(),
      };

      if (this.config.enableLogging) {
        console.log(`[MCP] Tool result:`, toolResult);
      }

      return toolResult;
    } catch (error) {
      const toolResult: MCPToolResult = {
        id: this.generateId(),
        toolCallId: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      if (this.config.enableLogging) {
        console.error(`[MCP] Tool error:`, error);
      }

      return toolResult;
    }
  }

  async callMultipleTools(
    toolCalls: Array<{ toolId: string; parameters: Record<string, any> }>,
    context: MCPExecutionContext
  ): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    for (const { toolId, parameters } of toolCalls) {
      const result = await this.callTool(toolId, parameters, context);
      results.push(result);
    }

    return results;
  }

  async callToolWithRetry(
    toolId: string,
    parameters: Record<string, any>,
    context: MCPExecutionContext
  ): Promise<MCPToolResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.callTool(toolId, parameters, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (this.config.enableLogging) {
          console.warn(`[MCP] Tool call attempt ${attempt} failed:`, error);
        }

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  getAvailableTools(): any[] {
    return mcpServer.getTools();
  }

  getToolDocumentation(): string {
    return mcpServer.getToolDocumentation();
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const toolApi = new ToolApi();