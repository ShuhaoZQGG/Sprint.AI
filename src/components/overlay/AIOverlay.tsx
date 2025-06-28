import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  Command, 
  Zap, 
  FileText, 
  GitBranch, 
  Users, 
  Calendar,
  CheckSquare,
  Loader,
  MessageSquare,
  ArrowRight,
  Lightbulb,
  Play,
  Settings,
  BarChart3,
  Cog,
  Brain,
  Cpu,
  Wrench
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useRepositories } from '../../hooks/useRepositories';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useTasks } from '../../hooks/useTasks';
import { TaskReviewModal } from './TaskReviewModal';
import { Task } from '../../types';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { useDocumentation } from '../../hooks/useDocumentation';
import { useAuth } from '../auth/AuthProvider';

// MCP Integration
import { mcpClient } from '../../mcp/client';
import { toolApi } from '../../mcp/client/toolApi';
import { contextMemory } from '../../services/contextMemory';
import { MCPToolCall, MCPMessage } from '../../types/mcp';
import { MCPExecutionContext } from '../../mcp/server/types';

export const AIOverlay: React.FC = () => {
  const { overlayOpen, setOverlayOpen } = useAppStore();
  const { repositories, currentRepository } = useRepositories();
  const { documentation } = useDocumentation();
  const { businessSpecs } = useBusinessSpecs();
  const { developers } = useDevelopers();
  const { tasks } = useTasks();
  const { user } = useAuth();
  
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showTaskReview, setShowTaskReview] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
  const [selectedSpecTitle, setSelectedSpecTitle] = useState('');
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [specForm, setSpecForm] = useState({ title: '', description: '' });
  const [pendingAction, setPendingAction] = useState<{ id: string, parameters: any } | null>(null);
  
  // MCP Integration State
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [mcpMessages, setMcpMessages] = useState<MCPMessage[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [toolExecutionHistory, setToolExecutionHistory] = useState<any[]>([]);
  const [suggestedTools, setSuggestedTools] = useState<Array<{ toolId: string; parameters: Record<string, any>; confidence: number }>>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize MCP context and tools
  useEffect(() => {
    if (overlayOpen) {
      console.log('[AIOverlay] Initializing MCP context and tools');
      // Update conversation context
      contextMemory.updateConversationContext(conversationId, {
        userId: user?.id,
        teamId: user?.profile?.team_id,
        repositories,
        currentRepository: currentRepository || undefined,
        developers,
        tasks,
        businessSpecs,
      });

      // Load available tools
      const tools = toolApi.getAvailableTools();
      setAvailableTools(tools);

      // Generate suggested tools based on context
      if (query) {
        updateSuggestedTools(query);
      }
    }
  }, [overlayOpen, conversationId, user, repositories, currentRepository, developers, tasks, businessSpecs, query]);

  // Focus input when overlay opens
  useEffect(() => {
    if (overlayOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [overlayOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverlayOpen(false);
      }
    };

    if (overlayOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [overlayOpen, setOverlayOpen]);

  const createMCPExecutionContext = (): MCPExecutionContext => ({
    userId: user?.id,
    teamId: user?.profile?.team_id,
    repositories,
    currentRepository: currentRepository || undefined,
    developers,
    tasks,
    businessSpecs,
    timestamp: new Date(),
  });

  const updateSuggestedTools = (userQuery: string) => {
    const context = createMCPExecutionContext();
    console.log('[AIOverlay] Updating suggested tools for query:', userQuery);
    const suggestions = toolApi.suggestTools(userQuery, context);
    setSuggestedTools(suggestions);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!query.trim()) return;
    
    setProcessing(true);
    
    try {
      console.log('[AIOverlay] Processing query:', query);
      await handleMCPQuery(query);
    } catch (error) {
      console.error('Error processing query:', error);
      toast.error('Failed to process your request');
    } finally {
      setProcessing(false);
    }
  };

  const handleMCPQuery = async (userQuery: string) => {
    try {
      const context = createMCPExecutionContext();
      
      // Store the user message
      const userMessage = await mcpClient.processMessage(
        conversationId,
        userQuery,
        context
      );
      
      setMcpMessages(prev => [...prev, userMessage]);
      
      // Generate AI context for better tool selection
      const aiContext = contextMemory.generateAIContext(conversationId);
      
      // Update suggested tools based on query
      updateSuggestedTools(userQuery);
      
      // Execute suggested tools if confidence is high
      const highConfidenceTools = suggestedTools.filter(tool => tool.confidence > 0.8);
      
      if (highConfidenceTools.length > 0) {
        console.log('[AIOverlay] Executing high confidence tools:', highConfidenceTools.map(t => t.toolId));
        // Execute suggested tools
        const toolCalls: MCPToolCall[] = highConfidenceTools.map(tool => ({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          toolId: tool.toolId,
          parameters: tool.parameters,
          timestamp: new Date(),
        }));
        
        const toolMessage = await mcpClient.executeToolsFromMessage(
          conversationId,
          toolCalls,
          context
        );
        
        setMcpMessages(prev => [...prev, toolMessage]);
        
        // Store tool results in context memory
        if (toolMessage.toolResults) {
          toolMessage.toolResults.forEach(result => {
            contextMemory.storeToolResult(conversationId, result.toolCallId, result);
          });
        }
        
        // Update tool execution history
        if (toolMessage.toolCalls) {
          setToolExecutionHistory(prev => [...prev, ...toolMessage.toolCalls]);
        }
        
        // Add to recent actions
        toolCalls.forEach(call => {
          contextMemory.addRecentAction(conversationId, `Executed tool: ${call.toolId}`);
        });
      }
      
      // Clear query after processing
      setQuery('');
      
    } catch (error) {
      console.error('Error in MCP query processing:', error);
      toast.error('Failed to process MCP query');
    }
  };

  const handleMCPToolExecution = async (toolId: string, parameters: any = {}) => {
    setExecutingAction(toolId);
    
    try {
      const context = createMCPExecutionContext();
      
      // Use smart tool execution with parameter resolution
      console.log('[AIOverlay] Executing tool:', toolId, parameters);
      const toolMessage = await mcpClient.executeSmartTool(
        conversationId,
        toolId,
        parameters,
        context
      );
      
      setMcpMessages(prev => [...prev, toolMessage]);
      
      if (toolMessage.toolResults && toolMessage.toolResults.length > 0) {
        const result = toolMessage.toolResults[0];
        
        if (result.success) {
          toast.success(`Tool ${toolId} executed successfully`);
          
          // Store in context memory
          contextMemory.storeToolResult(conversationId, result.toolCallId, result);
          contextMemory.addRecentAction(conversationId, `Executed tool: ${toolId}`);
          
          // Update tool execution history
          if (toolMessage.toolCalls) {
            setToolExecutionHistory(prev => [...prev, ...toolMessage.toolCalls]);
          }
        } else {
          toast.error(`Tool execution failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error executing MCP tool:', error);
      toast.error('Failed to execute tool');
    } finally {
      setExecutingAction(null);
    }
  };

  const handleTasksCreated = (createdTasks: Task[]) => {
    setShowTaskReview(false);
    setOverlayOpen(false);
    setQuery('');
    toast.success(`${createdTasks.length} tasks created successfully!`);
  };

  const getMCPToolIcon = (toolId: string) => {
    if (toolId.includes('generate')) return <Zap size={16} className="text-primary-400" />;
    if (toolId.includes('analyze')) return <BarChart3 size={16} className="text-secondary-400" />;
    if (toolId.includes('create')) return <Plus size={16} className="text-accent-400" />;
    if (toolId.includes('connect')) return <Settings size={16} className="text-warning-400" />;
    if (toolId.includes('list')) return <CheckSquare size={16} className="text-success-400" />;
    return <Wrench size={16} className="text-primary-400" />;
  };

  const getMCPTools = () => {
    // Show suggested tools first, then other available tools
    const suggestedToolIds = suggestedTools.map(tool => tool.toolId);
    const otherTools = availableTools.filter(tool => 
      !suggestedToolIds.includes(tool.function.name)
    );
    
    return [
      ...suggestedTools.map(suggestion => {
        const tool = availableTools.find(t => t.function.name === suggestion.toolId);
        return {
          ...tool,
          suggestion,
        };
      }),
      ...otherTools.slice(0, 8 - Math.min(suggestedTools.length, 4)),
    ].slice(0, 8); // Show max 8 tools
  };

  if (!overlayOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setOverlayOpen(false)}
      >
        <div 
          className="w-full max-w-4xl bg-dark-800 border border-dark-700 rounded-lg shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  AI Assistant
                </h2>
                <p className="text-xs text-dark-400">
                  Advanced tool calling with memory
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOverlayOpen(false)}
                className="text-dark-400 hover:text-white"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="p-4 border-b border-dark-700">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything - I can use advanced tools..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value) {
                      updateSuggestedTools(e.target.value);
                    }
                  }}
                  icon={<Command size={16} />}
                  className="pr-10"
                />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-white"
                  disabled={processing || !query.trim()}
                >
                  {processing ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                </Button>
              </div>
            </form>
          </div>
          
          {/* Content */}
          <div className="max-h-96 overflow-y-auto p-4">
            {mcpMessages.length > 0 ? (
              <div className="space-y-4">
                {/* MCP Conversation */}
                {mcpMessages.map((message, index) => (
                  
                  <div key={message.id} className="flex space-x-3">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' ? 'bg-dark-700' : 
                      message.role === 'tool' ? 'bg-secondary-600' : 'bg-primary-600'
                    }`}>
                      {message.role === 'user' ? (
                        <User size={16} className="text-white" />
                      ) : message.role === 'tool' ? (
                        <Wrench size={16} className="text-white" />
                      ) : (
                        <Brain size={16} className="text-white" />
                      )}
                    </div>
                    <div className={`flex-1 bg-dark-700 rounded-lg p-3 ${
                      message.role === 'user' ? 'bg-dark-700' : 
                      message.role === 'tool' ? 'bg-dark-700/50 border border-secondary-800' : 'bg-dark-700'
                    }`}>
                      <p className="text-white">{message.content}</p>
                      
                      {/* Tool Results */}
                      {message.toolResults && message.toolResults.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.toolResults.map(result => (
                            <div 
                              key={result.id}
                              className={`p-2 rounded text-sm ${
                                result.success ? 'bg-success-900/20 border border-success-800' : 
                                'bg-error-900/20 border border-error-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {result.success ? 'Success' : 'Error'}
                                </span>
                                <span className="text-xs opacity-70">
                                  {result.toolCallId.split('_')[0]}
                                </span>
                              </div>
                              {result.success ? (
                                <div className="mt-1 text-success-300">
                                  {typeof result.data === 'object' 
                                    ? 'Result: ' + JSON.stringify(result.data).substring(0, 100) + '...'
                                    : result.data}
                                </div>
                              ) : (
                                <div className="mt-1 text-error-300">
                                  {result.error}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Suggested Tools */}
                {suggestedTools.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium text-dark-300">Suggested Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {suggestedTools.slice(0, 4).map((tool) => {
                        const isExecuting = executingAction === tool.toolId;
                        const toolInfo = availableTools.find(t => t.function.name === tool.toolId);
                        
                        return (
                          <div
                            key={tool.toolId}
                            onClick={() => {
                              if (!isExecuting) {
                                handleMCPToolExecution(tool.toolId, tool.parameters);
                              }
                            }}
                          >
                            <Card
                              hover
                              className={`cursor-pointer transition-all duration-200 hover:border-primary-500 ${
                                tool.confidence > 0.8 ? 'border-primary-700' : ''
                              }`}
                            >
                              <CardContent className="p-3 flex items-center space-x-3">
                                <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                                  {isExecuting ? (
                                    <LoadingSpinner size="sm" />
                                  ) : (
                                    getMCPToolIcon(tool.toolId)
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-white">{toolInfo?.function.name || tool.toolId}</h4>
                                  <p className="text-xs text-dark-400">
                                    {toolInfo?.function.description || 'Execute this tool'}
                                  </p>
                                </div>
                                {!isExecuting && (
                                  <ArrowRight size={14} className="text-dark-400" />
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Tools */}
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium text-dark-300">Available Tools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getMCPTools().map((tool) => {
                      const isExecuting = executingAction === tool.function.name;
                      const isSuggested = tool.suggestion !== undefined;
                      
                      return (
                        <div
                          key={tool.function.name}
                          onClick={() => {
                            if (!isExecuting) {
                              handleMCPToolExecution(
                                tool.function.name, 
                                tool.suggestion?.parameters || {}
                              );
                            }
                          }}
                        >
                          <Card
                            hover
                            className={`cursor-pointer transition-all duration-200 hover:border-primary-500 ${
                              isSuggested ? 'border-primary-700' : ''
                            }`}
                          >
                            <CardContent className="p-3 flex items-center space-x-3">
                              <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                                {isExecuting ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  getMCPToolIcon(tool.function.name)
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-white">{tool.function.name}</h4>
                                <p className="text-xs text-dark-400">
                                  {tool.function.description}
                                </p>
                              </div>
                              {!isExecuting && (
                                <Play size={14} className="text-dark-400" />
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tool Execution History */}
                {toolExecutionHistory.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium text-dark-300">Recent Tool Executions</h3>
                    <div className="space-y-1">
                      {toolExecutionHistory.slice(0, 5).map((tool, index) => (
                        <div key={index} className="flex items-center space-x-2 text-xs text-dark-400 p-2 bg-dark-700 rounded">
                          <Wrench size={12} />
                          <span className="flex-1">{tool.toolId}</span>
                          <span className="text-dark-500">{new Date(tool.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Brain className="w-12 h-12 text-primary-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-1">
                    Advanced AI Assistant
                  </h3>
                  <p className="text-dark-400 mb-6">
                    Ask me anything or use advanced tools below
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark-300">
                    Available Tools
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* MCP Tools */}
                    {getMCPTools().map((tool) => {
                      const isExecuting = executingAction === tool.function.name;
                      
                      return (
                        <div
                          key={tool.function.name}
                          onClick={() => {
                            if (!isExecuting) {
                              handleMCPToolExecution(tool.function.name, {});
                            }
                          }}
                        >
                          <Card 
                            hover 
                            className="cursor-pointer transition-all duration-200 hover:border-primary-500"
                          >
                            <CardContent className="p-3 flex items-center space-x-3">
                              <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                                {isExecuting ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  getMCPToolIcon(tool.function.name)
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-white">{tool.function.name}</h4>
                                <p className="text-xs text-dark-400">
                                  {tool.function.description}
                                </p>
                              </div>
                              {!isExecuting && (
                                <Play size={14} className="text-dark-400" />
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-dark-700 text-xs text-dark-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>Press <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-xs">Esc</kbd> to close</span>
              <span>•</span>
              <span>
                {`${availableTools.length} tools available`}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Brain size={12} />
              <span>Powered by MCP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Review Modal */}
      <TaskReviewModal
        isOpen={showTaskReview}
        onClose={() => setShowTaskReview(false)}
        generatedTasks={generatedTasks}
        businessSpecTitle={selectedSpecTitle}
        onTasksCreated={handleTasksCreated}
      />

      {showSpecModal && (
        <Modal isOpen={true} onClose={() => setShowSpecModal(false)} title="Create New Specification">
          <form
            onSubmit={e => {
              e.preventDefault();
              setShowSpecModal(false);
              if (pendingAction) {
                handleMCPToolExecution(pendingAction.id, {
                  ...pendingAction.parameters,
                  ...specForm,
                });
                setPendingAction(null);
                setSpecForm({ title: '', description: '' });
              }
            }}
          >
            <Input
              label="Title"
              value={specForm.title}
              onChange={e => setSpecForm(f => ({ ...f, title: e.target.value }))}
              required
            />
            <Input
              label="Description"
              value={specForm.description}
              onChange={e => setSpecForm(f => ({ ...f, description: e.target.value }))}
              required
            />
            <div className="flex justify-end mt-4">
              <Button type="button" variant="ghost" onClick={() => setShowSpecModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="ml-2">
                Create
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

// Add missing User component
const User = (props: any) => {
  return <Users {...props} />;
};

// Add missing Plus component
const Plus = (props: any) => {
  return <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>;
};