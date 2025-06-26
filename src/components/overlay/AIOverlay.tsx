import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { 
  Command, 
  Send, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Users,
  X,
  Zap,
  MessageSquare,
  Lightbulb,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useRepositories } from '../../hooks/useRepositories';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { useTasks } from '../../hooks/useTasks';
import { Button } from '../ui/Button';
import { TaskGenerator } from './TaskGenerator';
import { nlpProcessor, ProcessedQuery } from '../../services/nlpProcessor';
import toast from 'react-hot-toast';

const aiSuggestions = [
  {
    id: '1',
    title: 'Generate Tasks',
    description: 'Convert business requirements into technical tasks',
    icon: CheckSquare,
    action: 'generate-tasks',
    color: 'bg-primary-500',
  },
  {
    id: '2',
    title: 'Update Docs',
    description: 'Refresh documentation from codebase',
    icon: FileText,
    action: 'update-docs',
    color: 'bg-secondary-500',
  },
  {
    id: '3',
    title: 'Assign Team',
    description: 'Auto-assign based on capacity',
    icon: Users,
    action: 'assign-team',
    color: 'bg-accent-500',
  },
  {
    id: '4',
    title: 'Generate PR',
    description: 'Create branch and file scaffolds',
    icon: Sparkles,
    action: 'generate-pr',
    color: 'bg-warning-500',
  },
];

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  processedQuery?: ProcessedQuery;
}

export const AIOverlay: React.FC = () => {
  const { 
    overlayOpen, 
    setOverlayOpen, 
    developers, 
    currentRepository,
    setCurrentView
  } = useAppStore();
  
  const { repositories } = useRepositories();
  const { businessSpecs } = useBusinessSpecs();
  const { tasks } = useTasks();
  
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTaskGenerator, setShowTaskGenerator] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! I\'m your AI assistant. I can help you generate tasks, update documentation, assign team members, and create PR templates. What would you like to work on?',
      type: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === '.') {
        event.preventDefault();
        setOverlayOpen(!overlayOpen);
      }
      if (event.key === 'Escape') {
        setOverlayOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [overlayOpen, setOverlayOpen]);

  useEffect(() => {
    if (overlayOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [overlayOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getQueryContext = () => ({
    repositories,
    developers,
    tasks,
    businessSpecs,
    currentRepository: currentRepository || undefined,
  });

  const handleSendMessage = async () => {
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: query,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setLoading(true);

    try {
      // Process query with NLP
      const processedQuery = await nlpProcessor.processQuery(currentQuery, getQueryContext());
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedQuery.response,
        type: 'assistant',
        timestamp: new Date(),
        processedQuery,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show follow-up questions if needed
      if (processedQuery.needsMoreInfo && processedQuery.followUpQuestions.length > 0) {
        setTimeout(() => {
          const followUpMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: `To help you better, could you clarify:\n\n${processedQuery.followUpQuestions.map(q => `• ${q}`).join('\n')}`,
            type: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, followUpMessage]);
        }, 1000);
      }

    } catch (error) {
      console.error('Query processing error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error processing your request. Please try again or use one of the quick actions below.',
        type: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process your request');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (action: string, title: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: title,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Process the action as a query
      const processedQuery = await nlpProcessor.processQuery(title, getQueryContext());
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedQuery.response,
        type: 'assistant',
        timestamp: new Date(),
        processedQuery,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Action processing error:', error);
      toast.error('Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (actionId: string, parameters?: Record<string, any>) => {
    // Handle specific actions based on actionId
    switch (actionId) {
      case 'generate-tasks-from-specs':
      case 'create-business-spec':
        setShowTaskGenerator(true);
        break;
      case 'generate-documentation':
        setCurrentView('docs');
        setOverlayOpen(false);
        toast.success('Opening documentation generator...');
        break;
      case 'auto-assign-tasks':
        toast.success('Auto-assigning tasks...');
        break;
      case 'select-repository':
        setCurrentView('docs');
        setOverlayOpen(false);
        toast.success('Please select a repository in the docs view');
        break;
      case 'analyze-capacity':
        setCurrentView('profile');
        setOverlayOpen(false);
        toast.success('Opening team capacity analysis...');
        break;
      default:
        toast.success(`Action: ${actionId}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!overlayOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="flex min-h-full items-start justify-center pt-8 px-4">
          <div
            className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm transition-opacity"
            onClick={() => setOverlayOpen(false)}
          />
          
          <div className="relative w-full max-w-4xl h-[80vh] transform overflow-hidden rounded-lg bg-dark-800 border border-dark-700 shadow-xl transition-all animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-900/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
                  <p className="text-sm text-dark-400">Your intelligent development companion</p>
                </div>
              </div>
              <button
                onClick={() => setOverlayOpen(false)}
                className="text-dark-400 hover:text-white transition-colors p-2 hover:bg-dark-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <div
                    className={clsx(
                      'flex',
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={clsx(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        message.type === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-dark-700 text-dark-100 border border-dark-600'
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                      <p className={clsx(
                        'text-xs mt-2',
                        message.type === 'user' ? 'text-primary-200' : 'text-dark-500'
                      )}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  {message.processedQuery?.suggestedActions && message.processedQuery.suggestedActions.length > 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] space-y-2">
                        <p className="text-xs text-dark-400 px-2">Suggested actions:</p>
                        <div className="space-y-2">
                          {message.processedQuery.suggestedActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => handleActionClick(action.action, action.parameters)}
                              className="w-full flex items-center justify-between p-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-primary-500 rounded-lg transition-all duration-200 text-left group"
                            >
                              <div>
                                <h5 className="text-sm font-medium text-white">{action.title}</h5>
                                <p className="text-xs text-dark-400">{action.description}</p>
                              </div>
                              <ArrowRight size={14} className="text-dark-500 group-hover:text-primary-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Intent Information (Debug) */}
                  {message.processedQuery && process.env.NODE_ENV === 'development' && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-2 bg-dark-800 border border-dark-600 rounded text-xs text-dark-400">
                        Intent: {message.processedQuery.intent.type} ({(message.processedQuery.intent.confidence * 100).toFixed(0)}%)
                        {message.processedQuery.intent.entities.length > 0 && (
                          <span> | Entities: {message.processedQuery.intent.entities.map(e => `${e.type}:${e.value}`).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-dark-300">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && (
              <div className="px-6 py-3 border-t border-dark-700 bg-dark-900/30">
                <h4 className="text-sm font-medium text-dark-300 mb-2 flex items-center">
                  <Lightbulb size={14} className="mr-2" />
                  Quick Actions
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {aiSuggestions.map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion.action, suggestion.title)}
                        disabled={loading}
                        className="flex flex-col items-center p-2 rounded-lg border border-dark-600 hover:border-primary-500 hover:bg-dark-700/50 transition-all duration-200 text-center group"
                      >
                        <div className={clsx(
                          'w-6 h-6 rounded-lg flex items-center justify-center mb-1 transition-colors',
                          suggestion.color,
                          'group-hover:scale-110'
                        )}>
                          <Icon size={12} className="text-white" />
                        </div>
                        <h5 className="text-xs font-medium text-white mb-0.5">{suggestion.title}</h5>
                        <p className="text-xs text-dark-400 leading-tight">{suggestion.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-dark-700 bg-dark-900/50">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ask me anything about your project..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors resize-none"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <kbd className="px-2 py-1 bg-dark-600 border border-dark-500 rounded text-xs text-dark-300">
                        Enter
                      </kbd>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!query.trim() || loading}
                  className="px-4 py-3"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-dark-500">
                  Press <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-600 rounded text-xs">Ctrl+.</kbd> to toggle
                </p>
                <div className="flex items-center space-x-2 text-xs text-dark-500">
                  <Zap size={12} />
                  <span>Powered by AI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Generator Modal */}
      <TaskGenerator
        isOpen={showTaskGenerator}
        onClose={() => setShowTaskGenerator(false)}
      />
    </>
  );
};