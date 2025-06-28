import { MCPConversation, MCPMessage, MCPToolResult } from '../types/mcp';
import { mcpClient } from '../mcp/client';

export interface ConversationContext {
  conversationId: string;
  userId?: string;
  teamId?: string;
  repositories: any[];
  currentRepository?: any;
  developers: any[];
  tasks: any[];
  businessSpecs: any[];
  recentActions: string[];
  preferences: Record<string, any>;
}

export interface ContextMemoryEntry {
  key: string;
  value: any;
  timestamp: Date;
  expiresAt?: Date;
  tags: string[];
}

class ContextMemoryService {
  private memory: Map<string, ContextMemoryEntry>;
  private conversationContexts: Map<string, ConversationContext>;
  private maxMemorySize: number;
  private defaultTTL: number; // Time to live in milliseconds

  constructor() {
    this.memory = new Map();
    this.conversationContexts = new Map();
    this.maxMemorySize = 1000; // Maximum number of entries
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Store information in context memory
   */
  store(
    key: string,
    value: any,
    options: {
      ttl?: number;
      tags?: string[];
      conversationId?: string;
    } = {}
  ): void {
    const { ttl = this.defaultTTL, tags = [], conversationId } = options;
    
    const entry: ContextMemoryEntry = {
      key,
      value,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      tags: [...tags, ...(conversationId ? [`conversation:${conversationId}`] : [])],
    };

    this.memory.set(key, entry);
    this.cleanupExpiredEntries();
    this.enforceMemoryLimit();
  }

  /**
   * Retrieve information from context memory
   */
  retrieve(key: string): any | null {
    const entry = this.memory.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.memory.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Search memory by tags
   */
  searchByTags(tags: string[]): ContextMemoryEntry[] {
    const results: ContextMemoryEntry[] = [];
    
    for (const entry of this.memory.values()) {
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        continue; // Skip expired entries
      }
      
      const hasAllTags = tags.every(tag => entry.tags.includes(tag));
      if (hasAllTags) {
        results.push(entry);
      }
    }
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get or create conversation context
   */
  getConversationContext(conversationId: string): ConversationContext {
    let context = this.conversationContexts.get(conversationId);
    
    if (!context) {
      context = {
        conversationId,
        repositories: [],
        developers: [],
        tasks: [],
        businessSpecs: [],
        recentActions: [],
        preferences: {},
      };
      
      this.conversationContexts.set(conversationId, context);
    }
    
    return context;
  }

  /**
   * Update conversation context
   */
  updateConversationContext(
    conversationId: string,
    updates: Partial<ConversationContext>
  ): void {
    const context = this.getConversationContext(conversationId);
    Object.assign(context, updates);
    this.conversationContexts.set(conversationId, context);
  }

  /**
   * Add action to recent actions for a conversation
   */
  addRecentAction(conversationId: string, action: string): void {
    const context = this.getConversationContext(conversationId);
    context.recentActions.unshift(action);
    
    // Keep only last 10 actions
    if (context.recentActions.length > 10) {
      context.recentActions = context.recentActions.slice(0, 10);
    }
    
    this.conversationContexts.set(conversationId, context);
  }

  /**
   * Store tool execution result in memory
   */
  storeToolResult(
    conversationId: string,
    toolId: string,
    result: MCPToolResult
  ): void {
    const key = `tool_result:${conversationId}:${toolId}:${result.id}`;
    
    this.store(key, result, {
      tags: ['tool_result', `tool:${toolId}`, `conversation:${conversationId}`],
      ttl: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Get recent tool results for a conversation
   */
  getRecentToolResults(conversationId: string, limit: number = 5): MCPToolResult[] {
    const entries = this.searchByTags([`conversation:${conversationId}`, 'tool_result']);
    return entries.slice(0, limit).map(entry => entry.value);
  }

  /**
   * Store user preference
   */
  storeUserPreference(
    userId: string,
    key: string,
    value: any
  ): void {
    const prefKey = `user_pref:${userId}:${key}`;
    
    this.store(prefKey, value, {
      tags: ['user_preference', `user:${userId}`],
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  /**
   * Get user preference
   */
  getUserPreference(userId: string, key: string): any | null {
    const prefKey = `user_pref:${userId}:${key}`;
    return this.retrieve(prefKey);
  }

  /**
   * Store conversation summary for long-term memory
   */
  storeConversationSummary(
    conversationId: string,
    summary: string,
    keyPoints: string[]
  ): void {
    const key = `conversation_summary:${conversationId}`;
    
    this.store(key, { summary, keyPoints }, {
      tags: ['conversation_summary', `conversation:${conversationId}`],
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): { summary: string; keyPoints: string[] } | null {
    const key = `conversation_summary:${conversationId}`;
    return this.retrieve(key);
  }

  /**
   * Generate context for AI from conversation history
   */
  generateAIContext(conversationId: string): string {
    const context = this.getConversationContext(conversationId);
    const conversation = mcpClient.getConversation(conversationId);
    const recentResults = this.getRecentToolResults(conversationId, 3);
    const summary = this.getConversationSummary(conversationId);
    
    let contextString = '';
    
    // Add conversation summary if available
    if (summary) {
      contextString += `Previous conversation summary: ${summary.summary}\n`;
      if (summary.keyPoints.length > 0) {
        contextString += `Key points: ${summary.keyPoints.join(', ')}\n`;
      }
    }
    
    // Add recent actions
    if (context.recentActions.length > 0) {
      contextString += `Recent actions: ${context.recentActions.slice(0, 5).join(', ')}\n`;
    }
    
    // Add current project context
    contextString += `Current context:\n`;
    contextString += `- Repositories: ${context.repositories.length}\n`;
    contextString += `- Team members: ${context.developers.length}\n`;
    contextString += `- Active tasks: ${context.tasks.length}\n`;
    contextString += `- Business specs: ${context.businessSpecs.length}\n`;
    
    if (context.currentRepository) {
      contextString += `- Current repository: ${context.currentRepository.name}\n`;
    }
    
    // Add recent tool results
    if (recentResults.length > 0) {
      contextString += `Recent tool executions:\n`;
      recentResults.forEach(result => {
        contextString += `- ${result.toolCallId}: ${result.success ? 'Success' : 'Failed'}\n`;
      });
    }
    
    return contextString;
  }

  /**
   * Clear conversation memory
   */
  clearConversation(conversationId: string): void {
    // Remove conversation context
    this.conversationContexts.delete(conversationId);
    
    // Remove memory entries for this conversation
    const conversationEntries = this.searchByTags([`conversation:${conversationId}`]);
    conversationEntries.forEach(entry => {
      this.memory.delete(entry.key);
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memory.delete(key);
      }
    }
  }

  /**
   * Enforce memory size limit
   */
  private enforceMemoryLimit(): void {
    if (this.memory.size <= this.maxMemorySize) return;
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.memory.entries()).sort(
      (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
    );
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, this.memory.size - this.maxMemorySize);
    entriesToRemove.forEach(([key]) => {
      this.memory.delete(key);
    });
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalEntries: number;
    conversationCount: number;
    memoryUsage: string;
  } {
    return {
      totalEntries: this.memory.size,
      conversationCount: this.conversationContexts.size,
      memoryUsage: `${this.memory.size}/${this.maxMemorySize}`,
    };
  }
}

export const contextMemory = new ContextMemoryService();