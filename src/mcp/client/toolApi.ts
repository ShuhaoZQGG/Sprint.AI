import { MCPToolCall, MCPToolResult, MCPMessage } from '../../types/mcp';
import { MCPExecutionContext } from '../server/types';
import { mcpServer } from '../server';
import { mcpOrchestrator } from '../server/orchestrator';

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
      // Try to use the orchestrator for smart parameter resolution
      let result;
      try {
        const { planId } = await mcpOrchestrator.createSmartPlan(toolCall, context);
        const results = await mcpOrchestrator.executePlan(planId);
        result = results[results.length - 1];
      } catch (orchestratorError) {
        // Fall back to direct execution if orchestration fails
        console.warn(`[MCP] Orchestration failed, falling back to direct execution: ${orchestratorError}`);
        result = await this.executeWithTimeout(
          mcpServer.executeTool(toolCall, context),
          this.config.timeout
        );
      }

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
    // Convert to MCPToolCall format
    const formattedToolCalls: MCPToolCall[] = toolCalls.map(call => ({
      id: this.generateId(),
      toolId: call.toolId,
      parameters: call.parameters,
      timestamp: new Date(),
    }));

    try {
      // Use the orchestrator for multi-step execution
      const { planId } = await mcpOrchestrator.createPlan(formattedToolCalls, context);
      const results = await mcpOrchestrator.executePlan(planId);
      
      // Map results to MCPToolResult format
      return formattedToolCalls.map((call, index) => ({
        id: this.generateId(),
        toolCallId: call.id,
        success: results[index]?.success || false,
        data: results[index]?.data,
        error: results[index]?.error,
        timestamp: new Date(),
      }));
    } catch (error) {
      // Fall back to sequential execution
      console.warn(`[MCP] Orchestration failed, falling back to sequential execution: ${error}`);
      const results: MCPToolResult[] = [];

      for (const { toolId, parameters } of toolCalls) {
        const result = await this.callTool(toolId, parameters, context);
        results.push(result);
      }

      return results;
    }
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

  /**
   * Suggest tools based on user query and context
   */
  suggestTools(
    query: string,
    context: MCPExecutionContext
  ): Array<{ toolId: string; parameters: Record<string, any>; confidence: number }> {
    const lowerQuery = query.toLowerCase();
    const suggestions = [];

    // Task-related queries
    if (lowerQuery.includes('task') || lowerQuery.includes('create') || lowerQuery.includes('todo')) {
      if (lowerQuery.includes('from spec') && context.businessSpecs?.length > 0) {
        // Suggest generating tasks from business specs
        const approvedSpecs = context.businessSpecs.filter((spec: any) => spec.status === 'approved');
        if (approvedSpecs.length > 0) {
          suggestions.push({
            toolId: 'generate-tasks-from-specs',
            parameters: { specId: approvedSpecs[0].id },
            confidence: 0.9,
          });
        }
      } else {
        // Suggest creating a new task
        suggestions.push({
          toolId: 'create-task',
          parameters: {
            title: this.extractTaskTitle(query) || 'New Task',
            description: 'Task created from AI query',
            type: this.inferTaskType(query) || 'feature',
            priority: this.inferPriority(query) || 'medium',
            estimatedEffort: 8,
          },
          confidence: 0.8,
        });
      }
    }

    // Documentation queries
    if (lowerQuery.includes('doc') || lowerQuery.includes('documentation')) {
      if (context.currentRepository) {
        suggestions.push({
          toolId: 'generate-documentation',
          parameters: { repositoryId: context.currentRepository.id },
          confidence: 0.9,
        });
      } else if (context.repositories?.length > 0) {
        suggestions.push({
          toolId: 'generate-documentation',
          parameters: { repositoryId: context.repositories[0].id },
          confidence: 0.7,
        });
      } else {
        suggestions.push({
          toolId: 'list-repositories',
          parameters: { limit: 5 },
          confidence: 0.6,
        });
      }
    }

    // Analysis queries
    if (lowerQuery.includes('analyze') || lowerQuery.includes('performance') || lowerQuery.includes('team')) {
      suggestions.push({
        toolId: 'analyze-team-performance',
        parameters: { timeframe: 'month', includeRecommendations: true },
        confidence: 0.8,
      });
    }

    // Sprint queries
    if (lowerQuery.includes('sprint') || lowerQuery.includes('capacity')) {
      if (lowerQuery.includes('create') || lowerQuery.includes('new')) {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        suggestions.push({
          toolId: 'create-optimized-sprint',
          parameters: {
            name: 'AI Generated Sprint',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            autoAssign: true,
          },
          confidence: 0.85,
        });
      } else {
        suggestions.push({
          toolId: 'analyze-sprint-capacity',
          parameters: { duration: 14, bufferPercentage: 20 },
          confidence: 0.8,
        });
      }
    }

    // PR queries
    if (lowerQuery.includes('pr') || lowerQuery.includes('pull request')) {
      if (context.tasks?.length > 0) {
        const unassignedTasks = context.tasks.filter((task: any) => task.status === 'todo');
        if (unassignedTasks.length > 0 && context.currentRepository) {
          suggestions.push({
            toolId: 'generate-pr-template',
            parameters: {
              taskId: unassignedTasks[0].id,
              repositoryId: context.currentRepository.id,
              includeScaffolds: true,
            },
            confidence: 0.85,
          });
        }
      }
    }

    // Repository listing
    if (lowerQuery.includes('list') && lowerQuery.includes('repo')) {
      suggestions.push({
        toolId: 'list-repositories',
        parameters: { limit: 5 },
        confidence: 0.9,
      });
    }

    // Task listing
    if (lowerQuery.includes('list') && lowerQuery.includes('task')) {
      const status = this.extractTaskStatus(query);
      suggestions.push({
        toolId: 'list-tasks',
        parameters: { 
          limit: 5,
          ...(status ? { status } : {})
        },
        confidence: 0.9,
      });
    }

    // Business spec listing
    if (lowerQuery.includes('list') && lowerQuery.includes('spec')) {
      suggestions.push({
        toolId: 'list-business-specs',
        parameters: { limit: 5 },
        confidence: 0.9,
      });
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
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

  // Helper methods for parameter inference
  private extractTaskTitle(query: string): string | null {
    // Extract task title from queries like "create a task to implement login"
    const patterns = [
      /create\s+(?:a\s+)?task\s+(?:to\s+)?(.*)/i,
      /add\s+(?:a\s+)?task\s+(?:to\s+)?(.*)/i,
      /new\s+task\s+(?:to\s+)?(.*)/i,
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private inferTaskType(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('bug') || lowerQuery.includes('fix')) return 'bug';
    if (lowerQuery.includes('feature') || lowerQuery.includes('implement')) return 'feature';
    if (lowerQuery.includes('refactor')) return 'refactor';
    if (lowerQuery.includes('document') || lowerQuery.includes('docs')) return 'docs';
    if (lowerQuery.includes('test')) return 'test';
    if (lowerQuery.includes('devops') || lowerQuery.includes('deploy')) return 'devops';
    
    return null;
  }

  private inferPriority(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('critical') || lowerQuery.includes('urgent')) return 'critical';
    if (lowerQuery.includes('high')) return 'high';
    if (lowerQuery.includes('medium')) return 'medium';
    if (lowerQuery.includes('low')) return 'low';
    
    return null;
  }

  private extractTaskStatus(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('backlog')) return 'backlog';
    if (lowerQuery.includes('todo')) return 'todo';
    if (lowerQuery.includes('in progress') || lowerQuery.includes('in-progress')) return 'in-progress';
    if (lowerQuery.includes('review')) return 'review';
    if (lowerQuery.includes('done') || lowerQuery.includes('completed')) return 'done';
    
    return null;
  }
}

export const toolApi = new ToolApi();