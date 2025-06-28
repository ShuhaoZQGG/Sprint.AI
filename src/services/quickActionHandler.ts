import { Repository, Task, BusinessSpec, Developer } from '../types';
import toast from 'react-hot-toast';

// MCP Integration
import { mcpClient } from '../mcp/client';
import { toolApi } from '../mcp/client/toolApi';
import { contextMemory } from './contextMemory';
import { MCPExecutionContext } from '../mcp/server/types';
import { mcpOrchestrator } from '../mcp/server/orchestrator';

export interface QuickActionContext {
  repositories: Repository[];
  currentRepository?: Repository;
  developers: Developer[];
  tasks: Task[];
  businessSpecs: BusinessSpec[];
}

export interface QuickActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface QuickActionHandler {
  id: string;
  title: string;
  description: string;
  category: 'generation' | 'analysis' | 'automation' | 'management';
  requiredParameters?: string[];
  optionalParameters?: string[];
}

class QuickActionService {
  private handlers: Map<string, QuickActionHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers() {
    // Task Generation Actions
    this.registerHandler({
      id: 'generate-tasks-from-specs',
      title: 'Generate Tasks from Business Specs',
      description: 'Convert business specifications into technical tasks',
      category: 'generation',
      optionalParameters: ['specId'],
    });

    this.registerHandler({
      id: 'create-business-spec',
      title: 'Create Business Specification',
      description: 'Create a new business specification',
      category: 'generation',
      requiredParameters: ['title', 'description'],
      optionalParameters: ['acceptanceCriteria', 'technicalRequirements'],
    });

    // Documentation Actions
    this.registerHandler({
      id: 'generate-documentation',
      title: 'Generate Documentation',
      description: 'Generate comprehensive documentation for repository',
      category: 'generation',
      requiredParameters: ['repositoryId'],
    });

    this.registerHandler({
      id: 'update-documentation',
      title: 'Update Documentation',
      description: 'Update existing documentation with latest changes',
      category: 'generation',
      requiredParameters: ['repositoryId'],
      optionalParameters: ['sections'],
    });

    // PR Generation Actions
    this.registerHandler({
      id: 'generate-pr-template',
      title: 'Generate PR Template',
      description: 'Create PR template with scaffolds for task',
      category: 'generation',
      requiredParameters: ['taskId'],
      optionalParameters: ['includeScaffolds'],
    });

    this.registerHandler({
      id: 'create-feature-pr',
      title: 'Create Feature PR',
      description: 'Generate PR template for new feature',
      category: 'generation',
      requiredParameters: ['title', 'description'],
      optionalParameters: ['repositoryId'],
    });

    // Analysis Actions
    this.registerHandler({
      id: 'analyze-repository',
      title: 'Analyze Repository',
      description: 'Perform comprehensive repository analysis',
      category: 'analysis',
      requiredParameters: ['repositoryId'],
    });

    this.registerHandler({
      id: 'analyze-team-performance',
      title: 'Analyze Team Performance',
      description: 'Generate team performance insights and recommendations',
      category: 'analysis',
    });

    this.registerHandler({
      id: 'analyze-sprint-capacity',
      title: 'Analyze Sprint Capacity',
      description: 'Calculate team capacity and sprint recommendations',
      category: 'analysis',
      optionalParameters: ['sprintId'],
    });

    // Automation Actions
    this.registerHandler({
      id: 'auto-assign-tasks',
      title: 'Auto-assign Tasks',
      description: 'Automatically assign tasks based on capacity and skills',
      category: 'automation',
      optionalParameters: ['sprintId'],
    });

    this.registerHandler({
      id: 'create-optimized-sprint',
      title: 'Create Optimized Sprint',
      description: 'Create AI-optimized sprint with intelligent task selection',
      category: 'automation',
      requiredParameters: ['name', 'startDate', 'endDate'],
      optionalParameters: ['autoAssign', 'bufferPercentage'],
    });

    this.registerHandler({
      id: 'balance-workload',
      title: 'Balance Team Workload',
      description: 'Redistribute tasks to balance team workload',
      category: 'automation',
      requiredParameters: ['sprintId'],
    });

    // Management Actions
    this.registerHandler({
      id: 'connect-repository',
      title: 'Connect Repository',
      description: 'Connect and analyze a new GitHub repository',
      category: 'management',
      requiredParameters: ['url'],
      optionalParameters: ['analyze'],
    });

    this.registerHandler({
      id: 'update-developer-skills',
      title: 'Update Developer Skills',
      description: 'Update developer skills and preferences',
      category: 'management',
      requiredParameters: ['developerId', 'skills'],
    });
  }

  registerHandler(handler: QuickActionHandler) {
    this.handlers.set(handler.id, handler);
  }

  getHandler(actionId: string): QuickActionHandler | undefined {
    return this.handlers.get(actionId);
  }

  getAllHandlers(): QuickActionHandler[] {
    return Array.from(this.handlers.values());
  }

  getHandlersByCategory(category: QuickActionHandler['category']): QuickActionHandler[] {
    return this.getAllHandlers().filter(handler => handler.category === category);
  }

  /**
   * Execute an action using MCP
   */
  async executeAction(
    actionId: string, 
    parameters: any, 
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    const handler = this.getHandler(actionId);
    
    if (!handler) {
      return {
        success: false,
        message: `Unknown action: ${actionId}`,
        error: 'Action not found',
      };
    }

    // Validate required parameters
    if (handler.requiredParameters) {
      for (const param of handler.requiredParameters) {
        if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null) {
          return {
            success: false,
            message: `Missing required parameter: ${param}`,
            error: 'Invalid parameters',
          };
        }
      }
    }

    try {
      return await this.executeMCPAction(actionId, parameters, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const result = {
        success: false,
        message: `Failed to execute ${handler.title}: ${errorMessage}`,
        error: errorMessage,
      };
      
      toast.error(result.message);
      return result;
    }
  }

  /**
   * Execute action using MCP with orchestration
   */
  private async executeMCPAction(
    actionId: string,
    parameters: any,
    context: QuickActionContext
  ): Promise<QuickActionResult> {
    try {
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

      // Create tool call
      const toolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        toolId: actionId,
        parameters,
        timestamp: new Date(),
      };

      // Use orchestrator for intelligent parameter resolution
      const { planId } = await mcpOrchestrator.createSmartPlan(toolCall, mcpContext);
      const results = await mcpOrchestrator.executePlan(planId);
      const result = results[results.length - 1];

      if (result.success) {
        toast.success(`Successfully executed ${actionId}`);
        return {
          success: true,
          message: `Successfully executed ${actionId}`,
          data: result.data,
        };
      } else {
        toast.error(result.error || 'Failed to execute action');
        return {
          success: false,
          message: result.error || 'Failed to execute action',
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(errorMessage);
      return {
        success: false,
        message: `Failed to execute ${actionId}: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }
}

export const quickActionService = new QuickActionService();