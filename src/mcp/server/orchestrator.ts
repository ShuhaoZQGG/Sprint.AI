import { MCPToolCall, MCPToolResult } from '../../types/mcp';
import { MCPExecutionContext, MCPExecutionResult } from './types';
import { mcpServer } from './index';
import { mcpRegistry } from './registry';

export interface OrchestrationStep {
  toolId: string;
  parameters: Record<string, any>;
  dependsOn?: string[]; // IDs of steps this step depends on
  results?: MCPExecutionResult;
}

export interface OrchestrationPlan {
  steps: OrchestrationStep[];
  context: MCPExecutionContext;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

class MCPOrchestrator {
  private activePlans: Map<string, OrchestrationPlan> = new Map();

  /**
   * Create a plan for executing multiple tools in sequence or parallel
   */
  createPlan(
    toolCalls: MCPToolCall[],
    context: MCPExecutionContext
  ): { planId: string; plan: OrchestrationPlan } {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Convert tool calls to orchestration steps
    const steps = toolCalls.map(call => ({
      toolId: call.toolId,
      parameters: call.parameters,
      dependsOn: this.inferDependencies(call, toolCalls),
    }));

    const plan: OrchestrationPlan = {
      steps,
      context,
      startedAt: new Date(),
      status: 'pending',
    };

    this.activePlans.set(planId, plan);
    return { planId, plan };
  }

  /**
   * Create a plan with automatic parameter resolution
   */
  async createSmartPlan(
    primaryToolCall: MCPToolCall,
    context: MCPExecutionContext
  ): Promise<{ planId: string; plan: OrchestrationPlan }> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get the tool schema to check required parameters
    const tool = mcpRegistry.getTool(primaryToolCall.toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${primaryToolCall.toolId}`);
    }

    const steps: OrchestrationStep[] = [];
    const missingParams = this.identifyMissingParameters(primaryToolCall.parameters, tool.parameters);
    
    // For each missing parameter, add a step to resolve it
    for (const param of missingParams) {
      const resolutionStep = await this.createParameterResolutionStep(param, primaryToolCall, context);
      if (resolutionStep) {
        steps.push(resolutionStep);
      }
    }

    // Add the primary tool call as the final step
    steps.push({
      toolId: primaryToolCall.toolId,
      parameters: primaryToolCall.parameters,
      dependsOn: steps.map((_, index) => `step_${index}`),
    });

    const plan: OrchestrationPlan = {
      steps,
      context,
      startedAt: new Date(),
      status: 'pending',
    };

    this.activePlans.set(planId, plan);
    return { planId, plan };
  }

  /**
   * Execute a plan
   */
  async executePlan(planId: string): Promise<MCPExecutionResult[]> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    plan.status = 'in-progress';
    const results: MCPExecutionResult[] = [];

    try {
      // Create a copy of the context that will be updated as steps execute
      let updatedContext = { ...plan.context };
      
      // Execute steps in dependency order
      const executedSteps = new Set<number>();
      const totalSteps = plan.steps.length;
      
      while (executedSteps.size < totalSteps) {
        let executedAnyStep = false;
        
        for (let i = 0; i < totalSteps; i++) {
          if (executedSteps.has(i)) continue;
          
          const step = plan.steps[i];
          const dependencies = step.dependsOn || [];
          const allDependenciesMet = dependencies.every(depId => {
            const depIndex = plan.steps.findIndex((s, idx) => `step_${idx}` === depId);
            return depIndex === -1 || executedSteps.has(depIndex);
          });
          
          if (allDependenciesMet) {
            // Update parameters with results from previous steps
            const resolvedParameters = await this.resolveParametersFromPreviousSteps(
              step.parameters,
              plan.steps,
              executedSteps,
              results
            );
            
            // Execute the step
            const result = await mcpServer.executeTool(
              {
                id: `step_${i}`,
                toolId: step.toolId,
                parameters: resolvedParameters,
                timestamp: new Date(),
              },
              updatedContext
            );
            
            // Store the result
            plan.steps[i].results = result;
            results.push(result);
            executedSteps.add(i);
            executedAnyStep = true;
            
            // Update context with result data if successful
            if (result.success && result.data) {
              updatedContext = this.updateContextWithResult(updatedContext, step.toolId, result.data);
            }
          }
        }
        
        // If we couldn't execute any steps in this iteration, we have a circular dependency
        if (!executedAnyStep && executedSteps.size < totalSteps) {
          throw new Error('Circular dependency detected in orchestration plan');
        }
      }
      
      plan.status = 'completed';
      plan.completedAt = new Date();
      
      return results;
    } catch (error) {
      plan.status = 'failed';
      plan.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Get all active plans
   */
  getAllPlans(): OrchestrationPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Clear completed plans
   */
  clearCompletedPlans(): void {
    for (const [planId, plan] of this.activePlans.entries()) {
      if (plan.status === 'completed' || plan.status === 'failed') {
        this.activePlans.delete(planId);
      }
    }
  }

  // Private helper methods

  /**
   * Infer dependencies between tool calls
   */
  private inferDependencies(
    call: MCPToolCall,
    allCalls: MCPToolCall[]
  ): string[] {
    const dependencies: string[] = [];
    
    // Get the tool schema
    const tool = mcpRegistry.getTool(call.toolId);
    if (!tool) return dependencies;
    
    // Check if this tool requires outputs from other tools
    const requiredParams = tool.parameters.required || [];
    
    for (const param of requiredParams) {
      // If parameter is missing, look for a tool that might provide it
      if (!(param in call.parameters) || call.parameters[param] === undefined) {
        for (let i = 0; i < allCalls.length; i++) {
          const otherCall = allCalls[i];
          if (otherCall.id === call.id) continue;
          
          const otherTool = mcpRegistry.getTool(otherCall.toolId);
          if (!otherTool) continue;
          
          // Check if the other tool's output might provide this parameter
          if (this.canToolProvideParameter(otherTool, param)) {
            dependencies.push(otherCall.id);
          }
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Check if a tool can provide a specific parameter
   */
  private canToolProvideParameter(tool: any, paramName: string): boolean {
    // This is a simplified check - in a real implementation, you'd have more sophisticated logic
    // based on the tool's return type and structure
    
    const outputType = tool.returns.type;
    
    if (outputType === 'object') {
      // For object returns, check if the parameter name matches a common pattern
      const commonOutputs = ['id', 'name', 'data', 'result', 'items', 'list'];
      return commonOutputs.includes(paramName) || 
             paramName.endsWith('Id') || 
             paramName.endsWith('s'); // Plurals like 'tasks', 'repositories'
    }
    
    if (outputType === 'array') {
      // For array returns, check if the parameter name is plural
      return paramName.endsWith('s');
    }
    
    // For primitive returns, check if the parameter name matches the tool name
    const toolNameParts = tool.id.split('-');
    return paramName.includes(toolNameParts[toolNameParts.length - 1]);
  }

  /**
   * Identify missing required parameters for a tool
   */
  private identifyMissingParameters(
    parameters: Record<string, any>,
    parameterSchema: any
  ): string[] {
    if (!parameterSchema.required) return [];
    
    return parameterSchema.required.filter(param => 
      !(param in parameters) || parameters[param] === undefined
    );
  }

  /**
   * Create a step to resolve a missing parameter
   */
  private async createParameterResolutionStep(
    paramName: string,
    primaryToolCall: MCPToolCall,
    context: MCPExecutionContext
  ): Promise<OrchestrationStep | null> {
    // Determine which tool to use to resolve this parameter
    const resolutionToolId = this.findParameterResolutionTool(paramName, primaryToolCall.toolId, context);
    if (!resolutionToolId) return null;
    
    // Create parameters for the resolution tool
    const resolutionParams = this.createResolutionToolParameters(paramName, primaryToolCall, context);
    
    return {
      toolId: resolutionToolId,
      parameters: resolutionParams,
    };
  }

  /**
   * Find a tool that can provide a missing parameter
   */
  private findParameterResolutionTool(
    paramName: string,
    targetToolId: string,
    context: MCPExecutionContext
  ): string | null {
    // Map common parameter types to resolution tools
    const paramToToolMap: Record<string, string> = {
      // Repository-related parameters
      'repositoryId': 'list-repositories',
      'repoId': 'list-repositories',
      
      // Task-related parameters
      'taskId': 'list-tasks',
      
      // Business spec related parameters
      'specId': 'list-business-specs',
      'businessSpecId': 'list-business-specs',
      
      // Developer-related parameters
      'developerId': 'list-developers',
      
      // Sprint-related parameters
      'sprintId': 'list-sprints',
    };
    
    // Check for exact matches
    if (paramName in paramToToolMap) {
      return paramToToolMap[paramName];
    }
    
    // Check for pattern matches
    if (paramName.endsWith('Id')) {
      const entity = paramName.slice(0, -2).toLowerCase();
      if (entity === 'repository' || entity === 'repo') return 'list-repositories';
      if (entity === 'task') return 'list-tasks';
      if (entity === 'spec' || entity === 'businessSpec') return 'list-business-specs';
      if (entity === 'developer') return 'list-developers';
      if (entity === 'sprint') return 'list-sprints';
    }
    
    return null;
  }

  /**
   * Create parameters for a resolution tool
   */
  private createResolutionToolParameters(
    paramName: string,
    primaryToolCall: MCPToolCall,
    context: MCPExecutionContext
  ): Record<string, any> {
    // Default parameters for list operations
    return {
      limit: 5,
    };
  }

  /**
   * Resolve parameters using results from previous steps
   */
  private async resolveParametersFromPreviousSteps(
    parameters: Record<string, any>,
    steps: OrchestrationStep[],
    executedSteps: Set<number>,
    results: MCPExecutionResult[]
  ): Promise<Record<string, any>> {
    const resolvedParams = { ...parameters };
    
    // For each parameter that's undefined or null
    for (const [paramName, paramValue] of Object.entries(resolvedParams)) {
      if (paramValue !== undefined && paramValue !== null) continue;
      
      // Look for a previous step that might provide this parameter
      for (const stepIndex of executedSteps) {
        const step = steps[stepIndex];
        const result = step.results;
        
        if (!result || !result.success || !result.data) continue;
        
        // Try to extract the parameter from the result data
        const extractedValue = this.extractParameterFromResult(paramName, result.data, step.toolId);
        if (extractedValue !== undefined) {
          resolvedParams[paramName] = extractedValue;
          break;
        }
      }
    }
    
    return resolvedParams;
  }

  /**
   * Extract a parameter value from a result
   */
  private extractParameterFromResult(
    paramName: string,
    resultData: any,
    toolId: string
  ): any {
    // Direct match in result data
    if (paramName in resultData) {
      return resultData[paramName];
    }
    
    // For list operations, try to extract the first item
    if (toolId.startsWith('list-')) {
      const entityType = toolId.slice(5); // Remove 'list-'
      
      // Check for common patterns in list results
      if (resultData[entityType]) {
        // If the result has an array with the entity name (e.g., {repositories: [...]})
        const items = resultData[entityType];
        if (Array.isArray(items) && items.length > 0) {
          // If looking for an ID, return the ID of the first item
          if (paramName.endsWith('Id') && items[0].id) {
            return items[0].id;
          }
        }
      } else if (Array.isArray(resultData) && resultData.length > 0) {
        // If the result is directly an array
        if (paramName.endsWith('Id') && resultData[0].id) {
          return resultData[0].id;
        }
      }
    }
    
    return undefined;
  }

  /**
   * Update context with result data
   */
  private updateContextWithResult(
    context: MCPExecutionContext,
    toolId: string,
    resultData: any
  ): MCPExecutionContext {
    const updatedContext = { ...context };
    
    // Update context based on tool type
    if (toolId === 'list-repositories' && resultData.repositories) {
      updatedContext.repositories = [
        ...(updatedContext.repositories || []),
        ...resultData.repositories,
      ];
    } else if (toolId === 'list-tasks' && resultData.tasks) {
      updatedContext.tasks = [
        ...(updatedContext.tasks || []),
        ...resultData.tasks,
      ];
    } else if (toolId === 'list-business-specs' && resultData.specs) {
      updatedContext.businessSpecs = [
        ...(updatedContext.businessSpecs || []),
        ...resultData.specs,
      ];
    } else if (toolId === 'create-task' && resultData) {
      updatedContext.tasks = [
        resultData,
        ...(updatedContext.tasks || []),
      ];
    } else if (toolId === 'create-business-spec' && resultData) {
      updatedContext.businessSpecs = [
        resultData,
        ...(updatedContext.businessSpecs || []),
      ];
    } else if (toolId === 'connect-repository' && resultData.repository) {
      updatedContext.repositories = [
        resultData.repository,
        ...(updatedContext.repositories || []),
      ];
    }
    
    return updatedContext;
  }
}

export const mcpOrchestrator = new MCPOrchestrator();