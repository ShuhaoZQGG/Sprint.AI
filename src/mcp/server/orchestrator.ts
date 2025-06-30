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
    console.log(`[MCPOrchestrator] Creating plan ${planId} with ${toolCalls.length} tool calls`);
    
    // Convert tool calls to orchestration steps
    const steps = toolCalls.map(call => ({
      toolId: call.toolId,
      parameters: call.parameters,
      dependsOn: this.inferDependencies(call, toolCalls),
    }));

    // Special handling for PR template generation
    this.handlePRTemplateGeneration(steps, context);

    const plan: OrchestrationPlan = {
      steps,
      context,
      startedAt: new Date(),
      status: 'pending',
    };

    this.activePlans.set(planId, plan);
    console.log(`[MCPOrchestrator] Created plan with ${steps.length} steps`);
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
    console.log(`[MCPOrchestrator] Creating smart plan ${planId} for tool: ${primaryToolCall.toolId}`);
    
    // Get the tool schema to check required parameters
    const tool = mcpRegistry.getTool(primaryToolCall.toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${primaryToolCall.toolId}`);
    }

    // First, try to resolve parameters from context
    const resolvedParams = await this.resolveParametersFromContext(
      primaryToolCall.parameters,
      primaryToolCall.toolId,
      context
    );
    console.log(`[MCPOrchestrator] Resolved parameters from context:`, resolvedParams);

    const steps: OrchestrationStep[] = [];
    
    // Special handling for PR template generation
    if (primaryToolCall.toolId === 'generate-pr-template') {
      // If taskId is missing, we need to create a task first
      if (!resolvedParams.taskId) {
        console.log(`[MCPOrchestrator] PR template generation missing taskId, checking for title/description`);
        // Check if we have a title and description for creating a task
        if (resolvedParams.title && resolvedParams.description) {
          console.log(`[MCPOrchestrator] Adding task creation step for PR template`);
          // Add step to create a task
          steps.push({
            toolId: 'create-task',
            parameters: {
              title: resolvedParams.title,
              description: resolvedParams.description,
              type: resolvedParams.type || 'feature',
              priority: resolvedParams.priority || 'medium',
              estimatedEffort: resolvedParams.estimatedEffort || 8,
              repositoryId: resolvedParams.repositoryId,
            },
          });
          
          // The PR template generation will depend on the task creation
          // We'll update the parameters after the task is created
        }
      }
    }
    
    const missingParams = this.identifyMissingParameters(resolvedParams, tool.parameters);
    console.log(`[MCPOrchestrator] Identified missing parameters: ${missingParams.join(', ')}`);
    
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
      parameters: resolvedParams,
      dependsOn: steps.map((_, index) => `step_${index}`),
    });

    const plan: OrchestrationPlan = {
      steps,
      context,
      startedAt: new Date(),
      status: 'pending',
    };

    this.activePlans.set(planId, plan);
    console.log(`[MCPOrchestrator] Created smart plan with ${steps.length} steps`);
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
            console.log(`[MCPOrchestrator] Executing step ${i}: ${step.toolId}`);
            // Update parameters with results from previous steps
            const resolvedParameters = await this.resolveParametersFromPreviousSteps(
              step.parameters,
              plan.steps,
              executedSteps,
              results
            );
            
            // Special handling for PR template after task creation
            if (step.toolId === 'generate-pr-template' && !resolvedParameters.taskId && resolvedParameters.taskId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
              // Look for a create-task result in previous steps
              for (let j = 0; j < i; j++) {
                if (plan.steps[j].toolId === 'create-task' && results[j]?.success) {
                  // Use the created task's ID
                  console.log(`[MCPOrchestrator] Using taskId from previous task creation: ${results[j].data.id}`);
                  resolvedParameters.taskId = results[j].data.id;
                  break;
                }
              }
            }
            
            console.log(`[MCPOrchestrator] Executing ${step.toolId} with parameters:`, resolvedParameters);
            
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
            console.log(`[MCPOrchestrator] Step ${i} execution ${result.success ? 'succeeded' : 'failed'}`);
            
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
      console.log(`[MCPOrchestrator] Plan ${planId} execution completed successfully`);
      
      return results;
    } catch (error) {
      console.error(`[MCPOrchestrator] Plan ${planId} execution failed:`, error);
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
   * Special handling for PR template generation
   */
  private handlePRTemplateGeneration(steps: OrchestrationStep[], context: MCPExecutionContext): void {
    // Check if we have a PR template generation step
    const prTemplateIndex = steps.findIndex(step => step.toolId === 'generate-pr-template');
    if (prTemplateIndex === -1) return;
    
    const prTemplateStep = steps[prTemplateIndex];
    
    // Check if we're missing taskId but have title/description
    if (!prTemplateStep.parameters.taskId && 
        (prTemplateStep.parameters.title || prTemplateStep.parameters.description)) {
      console.log(`[MCPOrchestrator] PR template step is missing taskId but has title/description`);
      
      // Add a task creation step before PR template generation
      const taskCreationStep: OrchestrationStep = {
        toolId: 'create-task',
        parameters: {
          title: prTemplateStep.parameters.title || 'New Task',
          description: prTemplateStep.parameters.description || 'Task created for PR generation',
          type: prTemplateStep.parameters.type || 'feature',
          priority: prTemplateStep.parameters.priority || 'medium',
          estimatedEffort: prTemplateStep.parameters.estimatedEffort || 8,
          repositoryId: prTemplateStep.parameters.repositoryId,
        },
      };
      
      // Insert the task creation step before PR template generation
      steps.splice(prTemplateIndex, 0, taskCreationStep);
      
      // Update dependencies for PR template step
      if (!prTemplateStep.dependsOn) {
        prTemplateStep.dependsOn = [];
      }
      prTemplateStep.dependsOn.push(`step_${prTemplateIndex}`);
      
      console.log(`[MCPOrchestrator] Added task creation step before PR template generation`);
    }
  }

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
    
    // Special handling for PR template generation
    if (call.toolId === 'generate-pr-template') {
      // Look for task creation calls that should come before PR generation
      for (let i = 0; i < allCalls.length; i++) {
        const otherCall = allCalls[i];
        if (otherCall.id === call.id) continue;
        
        if (otherCall.toolId === 'create-task') {
          console.log(`[MCPOrchestrator] Adding dependency from PR template to task creation: ${otherCall.id}`);
          dependencies.push(otherCall.id);
        }
      }
    }
    
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
    console.log(`[MCPOrchestrator] Creating resolution step for parameter: ${paramName}`);
    // Determine which tool to use to resolve this parameter
    const resolutionToolId = this.findParameterResolutionTool(paramName, primaryToolCall.toolId, context);
    if (!resolutionToolId) {
      console.log(`[MCPOrchestrator] No resolution tool found for parameter: ${paramName}`);
      return null;
    }
    
    console.log(`[MCPOrchestrator] Using tool ${resolutionToolId} to resolve parameter ${paramName}`);
    
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
   * Resolve parameters from context before creating steps
   */
  private async resolveParametersFromContext(
    parameters: Record<string, any>,
    toolId: string,
    context: MCPExecutionContext
  ): Promise<Record<string, any>> {
    const resolvedParams = { ...parameters };
    
    // Get the tool schema
    const tool = mcpRegistry.getTool(toolId);
    if (!tool) return resolvedParams;
    
    // Check for missing repository ID but with context
    if (
      ('repositoryId' in tool.parameters.properties) && 
      !resolvedParams.repositoryId && 
      context.currentRepository
    ) {
      console.log(`[MCPOrchestrator] Resolving repositoryId from current repository: ${context.currentRepository.id}`);
      resolvedParams.repositoryId = context.currentRepository.id;
    }
    
    // Check for repository name in parameters that could be matched to a repository ID
    if (
      ('repositoryId' in tool.parameters.properties) && 
      !resolvedParams.repositoryId && 
      resolvedParams.repositoryName && 
      context.repositories?.length > 0
    ) {
      const matchingRepo = context.repositories.find(repo => 
        repo.name.toLowerCase() === resolvedParams.repositoryName.toLowerCase() ||
        repo.name.toLowerCase().includes(resolvedParams.repositoryName.toLowerCase())
      );
      
      if (matchingRepo) {
        console.log(`[MCPOrchestrator] Resolved repositoryId from name: ${matchingRepo.id}`);
        resolvedParams.repositoryId = matchingRepo.id;
        delete resolvedParams.repositoryName; // Remove the name parameter as we've resolved the ID
      }
    }
    
    // Similar logic for other entity types
    if (
      ('taskId' in tool.parameters.properties) && 
      !resolvedParams.taskId && 
      resolvedParams.taskName && 
      context.tasks?.length > 0
    ) {
      const matchingTask = context.tasks.find(task => 
        task.title.toLowerCase().includes(resolvedParams.taskName.toLowerCase())
      );
      
      if (matchingTask) {
        console.log(`[MCPOrchestrator] Resolved taskId from name: ${matchingTask.id}`);
        resolvedParams.taskId = matchingTask.id;
        delete resolvedParams.taskName;
      }
    }
    
    return resolvedParams;
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
          console.log(`[MCPOrchestrator] Resolved parameter ${paramName} from previous step ${step.toolId}: ${extractedValue}`);
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
    
    // Special handling for create-task tool
    if (toolId === 'create-task' && paramName === 'taskId' && resultData.id) {
      return resultData.id;
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
      console.log(`[MCPOrchestrator] Updating context with ${resultData.repositories.length} repositories`);
      updatedContext.repositories = this.mergeArraysById(
        updatedContext.repositories || [],
        resultData.repositories
      );
    } else if (toolId === 'list-tasks' && resultData.tasks) {
      console.log(`[MCPOrchestrator] Updating context with ${resultData.tasks.length} tasks`);
      updatedContext.tasks = this.mergeArraysById(
        updatedContext.tasks || [],
        resultData.tasks
      );
    } else if (toolId === 'list-business-specs' && resultData.specs) {
      console.log(`[MCPOrchestrator] Updating context with ${resultData.specs.length} business specs`);
      updatedContext.businessSpecs = this.mergeArraysById(
        updatedContext.businessSpecs || [],
        resultData.specs
      );
    } else if (toolId === 'create-task' && resultData) {
      console.log(`[MCPOrchestrator] Adding new task to context: ${resultData.title}`);
      updatedContext.tasks = [
        resultData,
        ...(updatedContext.tasks || []),
      ];
    } else if (toolId === 'create-business-spec' && resultData) {
      console.log(`[MCPOrchestrator] Adding new business spec to context: ${resultData.title}`);
      updatedContext.businessSpecs = [
        resultData,
        ...(updatedContext.businessSpecs || []),
      ];
    } else if (toolId === 'connect-repository' && resultData.repository) {
      console.log(`[MCPOrchestrator] Adding new repository to context: ${resultData.repository.name}`);
      updatedContext.repositories = [
        resultData.repository,
        ...(updatedContext.repositories || []),
      ];
    }
    
    return updatedContext;
  }

  /**
   * Merge arrays by ID to avoid duplicates
   */
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
}

export const mcpOrchestrator = new MCPOrchestrator();