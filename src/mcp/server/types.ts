import { MCPTool, MCPToolHandler, MCPServiceExport } from '../../types/mcp';

export interface MCPServerTool extends MCPTool {
  handler: MCPToolHandler;
  category: string;
}

export interface MCPServerRegistry {
  tools: Map<string, MCPServerTool>;
  categories: Map<string, MCPServerTool[]>;
}

export interface MCPExecutionContext {
  userId?: string;
  teamId?: string;
  repositories: any[];
  currentRepository?: any;
  developers: any[];
  tasks: any[];
  businessSpecs: any[];
  timestamp: Date;
}

export interface MCPExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime: number;
    toolId: string;
    parameters: Record<string, any>;
  };
}