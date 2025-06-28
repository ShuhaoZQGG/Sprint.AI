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

export interface MCPDependencyResolution {
  parameterName: string;
  toolId: string;
  parameters: Record<string, any>;
}

export interface MCPParameterConstraint {
  type: 'required' | 'enum' | 'format' | 'range';
  value?: any;
  message: string;
}

export interface MCPToolSchema {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
      enum?: string[];
      constraints?: MCPParameterConstraint[];
    }>;
    required?: string[];
  };
  returns: {
    type: string;
    description: string;
    schema?: Record<string, any>;
  };
  dependencies?: {
    tools?: string[];
    parameters?: Record<string, MCPDependencyResolution>;
  };
  category: string;
}