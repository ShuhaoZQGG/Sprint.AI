export interface MCPTool {
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
    }>;
    required?: string[];
  };
  returns: {
    type: string;
    description: string;
  };
}

export interface MCPToolCall {
  id: string;
  toolId: string;
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface MCPToolResult {
  id: string;
  toolCallId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface MCPMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: MCPToolCall[];
  toolResults?: MCPToolResult[];
  timestamp: Date;
}

export interface MCPConversation {
  id: string;
  messages: MCPMessage[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  tools: MCPTool[];
}

export interface MCPClientConfig {
  serverUrl?: string;
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
}

export interface MCPToolHandler {
  (parameters: Record<string, any>, context: Record<string, any>): Promise<any>;
}

export interface MCPServiceExport {
  id: string;
  name: string;
  description: string;
  handler: MCPToolHandler;
  parameters: MCPTool['parameters'];
  returns: MCPTool['returns'];
  category: 'generation' | 'analysis' | 'automation' | 'management';
}

export interface MCPOrchestrationPlan {
  id: string;
  steps: MCPOrchestrationStep[];
  context: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export interface MCPOrchestrationStep {
  id: string;
  toolId: string;
  parameters: Record<string, any>;
  dependsOn?: string[];
  result?: any;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MCPParameterResolution {
  parameterName: string;
  value: any;
  source: 'user' | 'context' | 'tool' | 'default';
  confidence: number;
}

export interface MCPToolSuggestion {
  toolId: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning?: string;
}