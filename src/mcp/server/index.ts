import { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp';
import { MCPExecutionContext, MCPExecutionResult } from './types';
import { mcpRegistry } from './registry';
import { mcpOrchestrator } from './orchestrator';

class MCPServer {
  private config: MCPServerConfig;

  constructor() {
    this.config = {
      name: 'Sprint.AI MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for Sprint.AI platform services',
      tools: mcpRegistry.getAllTools().map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        returns: tool.returns,
      })),
    };
  }

  getConfig(): MCPServerConfig {
    return this.config;
  }

  getTools(): any[] {
    return mcpRegistry.getAllToolSchemas();
  }

  async executeTool(
    toolCall: MCPToolCall,
    context: MCPExecutionContext
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    
    try {
      const tool = mcpRegistry.getTool(toolCall.toolId);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.toolId}`);
      }

      // Validate parameters
      this.validateParameters(tool.parameters, toolCall.parameters);

      // Check for missing required parameters and try to resolve them
      const missingParams = this.getMissingRequiredParameters(tool.parameters, toolCall.parameters);
      if (missingParams.length > 0) {
        // Try to resolve missing parameters using orchestrator
        const { planId, plan } = await mcpOrchestrator.createSmartPlan(toolCall, context);
        const results = await mcpOrchestrator.executePlan(planId);
        
        // If the plan failed, return the error
        if (plan.status === 'failed') {
          throw new Error(`Failed to resolve missing parameters: ${plan.error}`);
        }
        
        // Get the final result (last step in the plan)
        const finalResult = results[results.length - 1];
        return finalResult;
      }

      // Execute the tool
      const result = await tool.handler(toolCall.parameters, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          toolId: toolCall.toolId,
          parameters: toolCall.parameters,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime,
          toolId: toolCall.toolId,
          parameters: toolCall.parameters,
        },
      };
    }
  }

  private validateParameters(schema: any, parameters: Record<string, any>): void {
    if (!schema.required) return;

    for (const requiredParam of schema.required) {
      if (!(requiredParam in parameters) || parameters[requiredParam] === undefined) {
        throw new Error(`Missing required parameter: ${requiredParam}`);
      }
    }

    // Additional type validation could be added here
    for (const [key, value] of Object.entries(parameters)) {
      const paramSchema = schema.properties[key];
      if (paramSchema && paramSchema.enum && !paramSchema.enum.includes(value)) {
        throw new Error(`Invalid value for parameter ${key}: ${value}. Must be one of: ${paramSchema.enum.join(', ')}`);
      }
    }
  }

  private getMissingRequiredParameters(schema: any, parameters: Record<string, any>): string[] {
    if (!schema.required) return [];
    
    return schema.required.filter(param => 
      !(param in parameters) || parameters[param] === undefined
    );
  }

  async executeMultipleTools(
    toolCalls: MCPToolCall[],
    context: MCPExecutionContext
  ): Promise<MCPExecutionResult[]> {
    // Create an orchestration plan
    const { planId } = await mcpOrchestrator.createPlan(toolCalls, context);
    
    // Execute the plan
    return await mcpOrchestrator.executePlan(planId);
  }

  async executeToolWithDependencyResolution(
    toolCall: MCPToolCall,
    context: MCPExecutionContext
  ): Promise<MCPExecutionResult> {
    // Create a smart plan that resolves dependencies
    const { planId } = await mcpOrchestrator.createSmartPlan(toolCall, context);
    
    // Execute the plan
    const results = await mcpOrchestrator.executePlan(planId);
    
    // Return the final result (the original tool call)
    return results[results.length - 1];
  }

  getToolDocumentation(): string {
    const tools = mcpRegistry.getAllTools();
    let docs = '# Sprint.AI MCP Server Tools\n\n';
    
    const categories = ['generation', 'analysis', 'automation', 'management'];
    
    for (const category of categories) {
      const categoryTools = tools.filter(tool => tool.category === category);
      if (categoryTools.length === 0) continue;
      
      docs += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n\n`;
      
      for (const tool of categoryTools) {
        docs += `### ${tool.name}\n`;
        docs += `**ID**: \`${tool.id}\`\n`;
        docs += `**Description**: ${tool.description}\n\n`;
        
        if (tool.parameters.required && tool.parameters.required.length > 0) {
          docs += `**Required Parameters**:\n`;
          for (const param of tool.parameters.required) {
            const paramSchema = tool.parameters.properties[param];
            docs += `- \`${param}\` (${paramSchema.type}): ${paramSchema.description}\n`;
          }
          docs += '\n';
        }
        
        const optionalParams = Object.keys(tool.parameters.properties).filter(
          param => !tool.parameters.required?.includes(param)
        );
        
        if (optionalParams.length > 0) {
          docs += `**Optional Parameters**:\n`;
          for (const param of optionalParams) {
            const paramSchema = tool.parameters.properties[param];
            docs += `- \`${param}\` (${paramSchema.type}): ${paramSchema.description}\n`;
          }
          docs += '\n';
        }
        
        docs += `**Returns**: ${tool.returns.description}\n\n`;
        docs += '---\n\n';
      }
    }
    
    return docs;
  }
}

export const mcpServer = new MCPServer();