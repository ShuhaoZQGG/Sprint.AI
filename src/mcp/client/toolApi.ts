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
  private executingTools: Set<string> = new Set();

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
    // Check if this tool is already being executed
    const toolKey = `${toolId}_${JSON.stringify(parameters)}`;
    if (this.executingTools.has(toolKey)) {
      console.log(`[MCP] Tool ${toolId} is already being executed with the same parameters, skipping duplicate call`);
      return {
        id: this.generateId(),
        toolCallId: `skipped_${this.generateId()}`,
        success: false,
        error: 'Duplicate tool execution prevented',
        timestamp: new Date(),
      };
    }

    // Mark tool as executing
    this.executingTools.add(toolKey);

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
        console.log(`[MCP] Creating smart plan for tool: ${toolId}`, parameters);
        const { planId, plan } = await mcpOrchestrator.createSmartPlan(toolCall, context);
        console.log(`[MCP] Executing plan ${planId} with ${plan.steps.length} steps`);
        const results = await mcpOrchestrator.executePlan(planId);
        console.log(`[MCP] Plan execution completed with ${results.length} results`);
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
        metadata: result.metadata,
        timestamp: new Date(),
      };

      if (this.config.enableLogging) {
        console.log(`[MCP] Tool result:`, toolResult);
      }

      return toolResult;
    } catch (error) {
      console.error(`[MCP] Tool execution error for ${toolId}:`, error);
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
    } finally {
      // Remove tool from executing set
      this.executingTools.delete(toolKey);
    }
  }

  async callMultipleTools(
    toolCalls: Array<{ toolId: string; parameters: Record<string, any>; confidence?: number }>,
    context: MCPExecutionContext
  ): Promise<MCPToolResult[]> {
    console.log(`[MCP] Calling multiple tools:`, toolCalls.map(t => t.toolId));
    
    // Deduplicate tool calls with the same toolId and parameters
    const uniqueToolCalls = this.deduplicateToolCalls(toolCalls);
    
    if (uniqueToolCalls.length < toolCalls.length) {
      console.log(`[MCP] Removed ${toolCalls.length - uniqueToolCalls.length} duplicate tool calls`);
    }
    
    // Convert to MCPToolCall format
    const formattedToolCalls: MCPToolCall[] = uniqueToolCalls.map(call => ({
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toolId: call.toolId,
      parameters: call.parameters || {},
      timestamp: new Date(),
    }));

    try {
      // Use the orchestrator for multi-step execution
      console.log(`[MCP] Creating orchestration plan for ${formattedToolCalls.length} tools`);
      const { planId } = await mcpOrchestrator.createPlan(formattedToolCalls, context);
      console.log(`[MCP] Created plan ${planId} for multiple tools`);
      const results = await mcpOrchestrator.executePlan(planId);
      console.log(`[MCP] Multiple tool execution completed with ${results.length} results`);
      
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
      console.error('[MCP] Error in multiple tool execution:', error);
      // Fall back to sequential execution
      console.warn(`[MCP] Orchestration failed, falling back to sequential execution: ${error}`);
      const results: MCPToolResult[] = [];

      for (const call of formattedToolCalls) {
        console.log(`[MCP] Sequential execution of tool: ${call.toolId}`);
        try {
          const result = await this.callTool(
            call.toolId,
            call.parameters,
            context
          );
          results.push(result);
          
          // If this tool creates something that might be needed by subsequent tools,
          // update the context with the result
          if (result.success && result.data) {
            this.updateContextWithResult(context, call.toolId, result.data);
          }
        } catch (error) {
          console.error(`[MCP] Sequential tool execution failed for ${call.toolId}:`, error);
          results.push({
            id: this.generateId(),
            toolCallId: call.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
        }
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
    console.log(`[MCP] Suggesting tools for query: "${query}"`);
    const lowerQuery = query.toLowerCase();
    const suggestions = [];

    // Check if we have enhanced context from AIOverlay
    const hasEnhancedContext = 'aiContext' in context && typeof context.aiContext === 'string';
    console.log(`[MCP] Has enhanced context: ${hasEnhancedContext}`);
    
    if (hasEnhancedContext) {
      console.log(`[MCP] Using enhanced context for tool suggestions: ${(context.aiContext as string).substring(0, 100)}...`);
    }

    // Repository analysis queries
    if (lowerQuery.includes('analyze') && (lowerQuery.includes('repo') || lowerQuery.includes('code'))) {
      // Try to find repository by name in the query
      const repoName = this.extractRepositoryName(query, context);
      console.log(`[MCP] Extracted repository name: "${repoName}"`);
      
      if (repoName && context.repositories?.length > 0) {
        const matchingRepo = context.repositories.find(repo => 
          repo.name.toLowerCase() === repoName.toLowerCase() ||
          repo.name.toLowerCase().includes(repoName.toLowerCase())
        );
        
        if (matchingRepo) {
          console.log(`[MCP] Found matching repository: ${matchingRepo.name} (${matchingRepo.id})`);
          suggestions.push({
            toolId: 'analyze-codebase',
            parameters: { 
              repositoryId: matchingRepo.id,
              analysisType: 'all'
            },
            confidence: 0.9,
          });
        } else {
          console.log(`[MCP] No exact repository match found, suggesting repository listing`);
          // If no exact match, list repositories first
          suggestions.push({
            toolId: 'list-repositories',
            parameters: { limit: 5 },
            confidence: 0.8,
          });
        }
      } else if (context.currentRepository) {
        console.log(`[MCP] Using current repository: ${context.currentRepository.name}`);
        // Use current repository if available
        suggestions.push({
          toolId: 'analyze-codebase',
          parameters: { 
            repositoryId: context.currentRepository.id,
            analysisType: 'all'
          },
          confidence: 0.85,
        });
      } else if (context.repositories?.length > 0) {
        console.log(`[MCP] No specific repository mentioned, using first available: ${context.repositories[0].name}`);
        // Use first repository if no specific one mentioned
        suggestions.push({
          toolId: 'analyze-codebase',
          parameters: { 
            repositoryId: context.repositories[0].id,
            analysisType: 'all'
          },
          confidence: 0.7,
        });
      } else {
        console.log(`[MCP] No repositories available, suggesting repository listing`);
        // List repositories if none available
        suggestions.push({
          toolId: 'list-repositories',
          parameters: { limit: 5 },
          confidence: 0.8,
        });
      }
    }

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

    // PR template generation queries
    if (lowerQuery.includes('pr') || lowerQuery.includes('pull request') || lowerQuery.includes('template')) {
      // If we have a specific task mentioned
      const taskTitle = this.extractTaskTitle(query);
      console.log(`[MCP] Extracted task title for PR: "${taskTitle}"`);
      
      // Try to extract repository name
      const repoName = this.extractRepositoryName(query, context);
      console.log(`[MCP] Extracted repository name for PR: "${repoName}"`);
      
      let repositoryId = context.currentRepository?.id;
      
      // If repository name was mentioned, try to find it
      if (repoName && context.repositories?.length > 0) {
        const matchingRepo = context.repositories.find(repo => 
          repo.name.toLowerCase() === repoName.toLowerCase() ||
          repo.name.toLowerCase().includes(repoName.toLowerCase())
        );
        
        if (matchingRepo) {
          console.log(`[MCP] Found matching repository for PR: ${matchingRepo.name} (${matchingRepo.id})`);
          repositoryId = matchingRepo.id;
        }
      }
      
      if (taskTitle && repositoryId) {
        // First check if we have an existing task with this title
        const matchingTask = context.tasks?.find((task: any) => 
          task.title.toLowerCase().includes(taskTitle.toLowerCase())
        );
        
        if (matchingTask) {
          console.log(`[MCP] Found matching task for PR: ${matchingTask.title} (${matchingTask.id})`);
          // Use existing task
          suggestions.push({
            toolId: 'generate-pr-template',
            parameters: {
              taskId: matchingTask.id,
              repositoryId: repositoryId,
              includeScaffolds: true,
            },
            confidence: 0.9,
          });
        } else {
          console.log(`[MCP] No matching task found, suggesting task creation followed by PR generation`);
          // Suggest creating a task first, then generating PR
          suggestions.push({
            toolId: 'create-task',
            parameters: {
              title: taskTitle,
              description: `Task created for PR: ${taskTitle}`,
              type: this.inferTaskType(query) || 'feature',
              priority: this.inferPriority(query) || 'medium',
              estimatedEffort: 8,
              repositoryId: repositoryId,
            },
            confidence: 0.85,
          });
          
          // Then suggest PR template generation (will be handled by orchestrator)
          suggestions.push({
            toolId: 'generate-pr-template',
            parameters: {
              // taskId will be filled in by orchestrator after task creation
              repositoryId: repositoryId,
              includeScaffolds: true,
              title: taskTitle, // Pass title for orchestrator to use
              description: `Task created for PR: ${taskTitle}`, // Pass description for orchestrator
            },
            confidence: 0.8,
          });
        }
      } else if (context.tasks?.length > 0) {
        // If no specific task mentioned but we have tasks, suggest using the first task
        const unassignedTasks = context.tasks.filter((task: any) => task.status === 'todo');
        if (unassignedTasks.length > 0 && context.currentRepository) {
          suggestions.push({
            toolId: 'generate-pr-template',
            parameters: {
              taskId: unassignedTasks[0].id,
              repositoryId: context.currentRepository.id,
              includeScaffolds: true,
            },
            confidence: 0.75,
          });
        }
      } else {
        // If no tasks available, suggest creating one first
        suggestions.push({
          toolId: 'create-task',
          parameters: {
            title: 'New Task',
            description: 'Task created for PR generation',
            type: 'feature',
            priority: 'medium',
            estimatedEffort: 8,
          },
          confidence: 0.7,
        });
      }
    }

    // Documentation queries
    if (lowerQuery.includes('doc') || lowerQuery.includes('documentation')) {
      // Try to find repository by name in the query
      const repoName = this.extractRepositoryName(query, context);
      
      if (repoName && context.repositories?.length > 0) {
        const matchingRepo = context.repositories.find(repo => 
          repo.name.toLowerCase() === repoName.toLowerCase() ||
          repo.name.toLowerCase().includes(repoName.toLowerCase())
        );
        
        if (matchingRepo) {
          suggestions.push({
            toolId: 'generate-documentation',
            parameters: { repositoryId: matchingRepo.id },
            confidence: 0.9,
          });
        }
      } else if (context.currentRepository) {
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

    // If we have enhanced context, boost confidence for relevant tools
    if (hasEnhancedContext) {
      const aiContext = context.aiContext as string;
      const recentActions = context.recentActions as string[] || [];
      
      // Boost confidence for tools related to recent actions
      for (const suggestion of suggestions) {
        // Check if this tool is related to recent actions
        const isRelatedToRecentActions = recentActions.some(action => 
          action.includes(suggestion.toolId) || 
          (suggestion.toolId.includes('list') && action.includes('list'))
        );
        
        if (isRelatedToRecentActions) {
          suggestion.confidence = Math.min(1.0, suggestion.confidence + 0.1);
          console.log(`[MCP] Boosted confidence for ${suggestion.toolId} based on recent actions`);
        }
        
        // Check if this tool is mentioned in AI context
        if (aiContext.toLowerCase().includes(suggestion.toolId.toLowerCase())) {
          suggestion.confidence = Math.min(1.0, suggestion.confidence + 0.1);
          console.log(`[MCP] Boosted confidence for ${suggestion.toolId} based on AI context`);
        }
      }
    }

    // Sort by confidence
    const sortedSuggestions = suggestions.sort((a, b) => b.confidence - a.confidence);
    console.log(`[MCP] Generated ${sortedSuggestions.length} tool suggestions`);
    return sortedSuggestions;
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

  // Deduplicate tool calls with the same toolId and parameters
  private deduplicateToolCalls(toolCalls: Array<{ toolId: string; parameters: Record<string, any>; confidence?: number }>): Array<{ toolId: string; parameters: Record<string, any>; confidence?: number }> {
    const uniqueToolCalls: Array<{ toolId: string; parameters: Record<string, any>; confidence?: number }> = [];
    const toolKeys = new Set<string>();
    
    for (const call of toolCalls) {
      const key = `${call.toolId}_${JSON.stringify(call.parameters)}`;
      if (!toolKeys.has(key)) {
        toolKeys.add(key);
        uniqueToolCalls.push(call);
      }
    }
    
    return uniqueToolCalls;
  }

  // Update context with tool result data for sequential execution
  private updateContextWithResult(
    context: MCPExecutionContext,
    toolId: string,
    resultData: any
  ): void {
    // Update context based on tool type
    if (toolId === 'create-task' && resultData) {
      console.log(`[MCP] Adding new task to context: ${resultData.title}`);
      context.tasks = [
        resultData,
        ...(context.tasks || []),
      ];
    } else if (toolId === 'list-repositories' && resultData.repositories) {
      console.log(`[MCP] Updating context with ${resultData.repositories.length} repositories`);
      context.repositories = this.mergeArraysById(
        context.repositories || [],
        resultData.repositories
      );
    } else if (toolId === 'list-tasks' && resultData.tasks) {
      console.log(`[MCP] Updating context with ${resultData.tasks.length} tasks`);
      context.tasks = this.mergeArraysById(
        context.tasks || [],
        resultData.tasks
      );
    }
  }

  // Merge arrays by ID to avoid duplicates
  private mergeArraysById(existing: any[], newItems: any[]): any[] {
    if (!existing || existing.length === 0) return newItems;
    if (!newItems || newItems.length === 0) return existing;
    
    const merged = [...existing];
    const existingIds = new Set(existing.map(item => item.id));
    
    for (const item of newItems) {
      if (item.id && !existingIds.has(item.id)) {
        merged.push(item);
        existingIds.add(item.id);
      }
    }
    
    return merged;
  }

  // Helper methods for parameter inference
  private extractTaskTitle(query: string): string | null {
    // Extract task title from queries like "create a task to implement login"
    const patterns = [
      /create\s+(?:a\s+)?task\s+(?:to\s+)?(.*)/i,
      /add\s+(?:a\s+)?task\s+(?:to\s+)?(.*)/i,
      /new\s+task\s+(?:to\s+)?(.*)/i,
      /generate\s+(?:a\s+)?pr\s+(?:for\s+)?(.*)/i,
      /create\s+(?:a\s+)?pr\s+(?:for\s+)?(.*)/i,
      /pull\s+request\s+(?:for\s+)?(.*)/i,
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted title
        let title = match[1].trim();
        
        // Remove repository references if they exist
        const repoPatterns = [
          /\s+(?:in|for|on|to)\s+(?:the\s+)?(?:repo|repository)\s+["']?([a-zA-Z0-9_-]+)["']?/i,
          /\s+(?:in|for|on|to)\s+["']?([a-zA-Z0-9_-]+)["']?\s+(?:repo|repository)/i,
        ];
        
        for (const repoPattern of repoPatterns) {
          const repoMatch = title.match(repoPattern);
          if (repoMatch) {
            title = title.replace(repoMatch[0], '');
          }
        }
        
        return title.trim();
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

  /**
   * Extract repository name from query
   */
  private extractRepositoryName(query: string, context: MCPExecutionContext): string | null {
    const lowerQuery = query.toLowerCase();
    console.log(`[MCP] Extracting repository name from: "${query}"`);
    
    // Try to find repository name in the query
    if (context.repositories?.length > 0) {
      // First try exact matches
      for (const repo of context.repositories) {
        if (lowerQuery.includes(repo.name.toLowerCase())) {
          console.log(`[MCP] Found exact repository name match: ${repo.name}`);
          return repo.name;
        }
      }
      
      // Then try partial matches with longer names first (to avoid matching substrings)
      const sortedRepos = [...context.repositories].sort((a, b) => b.name.length - a.name.length);
      for (const repo of sortedRepos) {
        // Only consider repo names with at least 3 characters to avoid false matches
        if (repo.name.length >= 3) {
          const repoNameLower = repo.name.toLowerCase();
          const words = lowerQuery.split(/\s+/);
          
          for (const word of words) {
            if (word.length >= 3 && (
              word === repoNameLower || 
              word.includes(repoNameLower) || 
              repoNameLower.includes(word)
            )) {
              console.log(`[MCP] Found partial repository name match: ${repo.name} (from word: ${word})`);
              return repo.name;
            }
          }
        }
      }
    }
    
    // Try to extract repository name using patterns
    const patterns = [
      /(?:analyze|check|review)\s+(?:the\s+)?(?:repo|repository)\s+(?:named\s+)?["']?([a-zA-Z0-9_-]+)["']?/i,
      /(?:repo|repository)\s+(?:named\s+)?["']?([a-zA-Z0-9_-]+)["']?/i,
      /["']?([a-zA-Z0-9_-]+)["']?\s+(?:repo|repository)/i,
      /(?:generate|create)\s+(?:a\s+)?pr\s+(?:for\s+)?(?:the\s+)?(?:repo|repository)?\s*["']?([a-zA-Z0-9_-]+)["']?/i,
      /(?:in|for|on|to)\s+(?:the\s+)?(?:repo|repository)\s+["']?([a-zA-Z0-9_-]+)["']?/i,
      /(?:in|for|on|to)\s+["']?([a-zA-Z0-9_-]+)["']?\s+(?:repo|repository)/i,
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        console.log(`[MCP] Extracted repository name via pattern: ${match[1]}`);
        return match[1].trim();
      }
    }
    
    console.log(`[MCP] No repository name found in query`);
    return null;
  }
}

export const toolApi = new ToolApi();