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
  Cog
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
import { nlpProcessor, ProcessedQuery, QueryContext } from '../../services/nlpProcessor';
import { quickActionService, QuickActionHandler, QuickActionResult } from '../../services/quickActionHandler';
import { TaskReviewModal } from './TaskReviewModal';
import { Task } from '../../types';
import toast from 'react-hot-toast';

export const AIOverlay: React.FC = () => {
  const { overlayOpen, setOverlayOpen } = useAppStore();
  const { repositories, currentRepository } = useRepositories();
  const { businessSpecs } = useBusinessSpecs();
  const { developers } = useDevelopers();
  const { tasks } = useTasks();
  
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processedQuery, setProcessedQuery] = useState<ProcessedQuery | null>(null);
  const [showTaskReview, setShowTaskReview] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
  const [selectedSpecTitle, setSelectedSpecTitle] = useState('');
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Map<string, QuickActionResult>>(new Map());
  
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!query.trim()) return;
    
    setProcessing(true);
    
    try {
      // Prepare context for NLP processor
      const context: QueryContext = {
        repositories,
        developers,
        tasks,
        currentRepository,
        businessSpecs,
      };
      
      // Process the query
      const result = await nlpProcessor.processQuery(query, context);
      setProcessedQuery(result);
      
    } catch (error) {
      console.error('Error processing query:', error);
      toast.error('Failed to process your request');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickActionClick = async (actionId: string, parameters: any = {}) => {
    setExecutingAction(actionId);
    
    try {
      const context = {
        repositories,
        currentRepository,
        developers,
        tasks,
        businessSpecs,
      };

      const result = await quickActionService.executeAction(actionId, parameters, context);
      
      // Store result for display
      setActionResults(prev => new Map(prev.set(actionId, result)));
      
      // Handle specific action results
      if (result.success) {
        switch (actionId) {
          case 'generate-tasks-from-specs':
            if (result.data?.tasksCreated > 0) {
              // Refresh tasks list or show success message
              setTimeout(() => {
                setOverlayOpen(false);
              }, 2000);
            }
            break;
          
          case 'generate-documentation':
            if (result.data) {
              // Could open documentation view
              console.log('Documentation generated:', result.data);
            }
            break;
          
          case 'generate-pr-template':
            if (result.data) {
              // Could open PR preview
              console.log('PR template generated:', result.data);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Error executing quick action:', error);
      toast.error('Failed to execute action');
    } finally {
      setExecutingAction(null);
    }
  };

  const handleTasksCreated = (createdTasks: Task[]) => {
    setShowTaskReview(false);
    setOverlayOpen(false);
    setQuery('');
    setProcessedQuery(null);
    toast.success(`${createdTasks.length} tasks created successfully!`);
  };

  const getActionIcon = (category: QuickActionHandler['category']) => {
    switch (category) {
      case 'generation': return <Zap size={16} className="text-primary-400" />;
      case 'analysis': return <BarChart3 size={16} className="text-secondary-400" />;
      case 'automation': return <Cog size={16} className="text-accent-400" />;
      case 'management': return <Settings size={16} className="text-warning-400" />;
      default: return <Lightbulb size={16} className="text-primary-400" />;
    }
  };

  const getQuickActions = () => {
    const allHandlers = quickActionService.getAllHandlers();
    
    // Filter and prioritize based on current context
    const contextualActions = allHandlers.filter(handler => {
      switch (handler.id) {
        case 'generate-tasks-from-specs':
          return businessSpecs.some(spec => spec.status === 'approved');
        case 'generate-documentation':
        case 'analyze-repository':
          return repositories.length > 0;
        case 'auto-assign-tasks':
        case 'balance-workload':
          return tasks.some(task => !task.assignee);
        case 'analyze-team-performance':
          return developers.length > 0;
        default:
          return true;
      }
    });

    return contextualActions.slice(0, 8); // Show top 8 contextual actions
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
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                <p className="text-xs text-dark-400">Ask anything or use quick actions</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOverlayOpen(false)}
              className="text-dark-400 hover:text-white"
            >
              <X size={20} />
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="p-4 border-b border-dark-700">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  ref={inputRef}
                  placeholder="Ask me anything about your project..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
            {processedQuery ? (
              <div className="space-y-4">
                {/* AI Response */}
                <div className="flex space-x-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 bg-dark-700 rounded-lg p-3">
                    <p className="text-white">{processedQuery.response}</p>
                  </div>
                </div>
                
                {/* Suggested Actions */}
                {processedQuery.suggestedActions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-dark-300">Suggested Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {processedQuery.suggestedActions.map((action) => {
                        const isExecuting = executingAction === action.action;
                        const result = actionResults.get(action.action);
                        
                        return (
                          <Card
                            key={action.id}
                            hover
                            className={`cursor-pointer transition-all duration-200 ${
                              result?.success ? 'border-success-500 bg-success-900/10' :
                              result?.success === false ? 'border-error-500 bg-error-900/10' :
                              'hover:border-primary-500'
                            }`}
                            onClick={() => !isExecuting && handleQuickActionClick(action.action, action.parameters)}
                          >
                            <CardContent className="p-3 flex items-center space-x-3">
                              <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                                {isExecuting ? (
                                  <LoadingSpinner size="sm" />
                                ) : result?.success ? (
                                  <CheckSquare size={16} className="text-success-400" />
                                ) : result?.success === false ? (
                                  <X size={16} className="text-error-400" />
                                ) : action.action.includes('task') ? (
                                  <CheckSquare size={16} className="text-primary-400" />
                                ) : action.action.includes('doc') ? (
                                  <FileText size={16} className="text-secondary-400" />
                                ) : action.action.includes('pr') ? (
                                  <GitBranch size={16} className="text-accent-400" />
                                ) : action.action.includes('assign') ? (
                                  <Users size={16} className="text-warning-400" />
                                ) : (
                                  <Lightbulb size={16} className="text-primary-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-white">{action.title}</h4>
                                <p className="text-xs text-dark-400">
                                  {result?.message || action.description}
                                </p>
                              </div>
                              {!isExecuting && !result && (
                                <ArrowRight size={14} className="text-dark-400" />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Follow-up Questions */}
                {processedQuery.followUpQuestions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-dark-300">Follow-up Questions</h3>
                    <div className="space-y-2">
                      {processedQuery.followUpQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-left text-dark-300 hover:text-white"
                          onClick={() => {
                            setQuery(question);
                            handleSubmit();
                          }}
                        >
                          <MessageSquare size={14} className="mr-2 flex-shrink-0" />
                          <span className="truncate">{question}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Command className="w-12 h-12 text-dark-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white mb-1">How can I help you?</h3>
                  <p className="text-dark-400 mb-6">Ask me anything or use quick actions below</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark-300">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getQuickActions().map((handler) => {
                      const isExecuting = executingAction === handler.id;
                      const result = actionResults.get(handler.id);
                      
                      return (
                        <Card 
                          key={handler.id}
                          hover 
                          className={`cursor-pointer transition-all duration-200 ${
                            result?.success ? 'border-success-500 bg-success-900/10' :
                            result?.success === false ? 'border-error-500 bg-error-900/10' :
                            'hover:border-primary-500'
                          }`}
                          onClick={() => !isExecuting && handleQuickActionClick(handler.id)}
                        >
                          <CardContent className="p-3 flex items-center space-x-3">
                            <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                              {isExecuting ? (
                                <LoadingSpinner size="sm" />
                              ) : result?.success ? (
                                <CheckSquare size={16} className="text-success-400" />
                              ) : result?.success === false ? (
                                <X size={16} className="text-error-400" />
                              ) : (
                                getActionIcon(handler.category)
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-white">{handler.title}</h4>
                              <p className="text-xs text-dark-400">
                                {result?.message || handler.description}
                              </p>
                            </div>
                            {!isExecuting && !result && (
                              <Play size={14} className="text-dark-400" />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Category Sections */}
                <div className="space-y-4">
                  {['generation', 'analysis', 'automation', 'management'].map(category => {
                    const categoryHandlers = quickActionService.getHandlersByCategory(category as any);
                    if (categoryHandlers.length === 0) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">
                          {category} Actions
                        </h4>
                        <div className="grid grid-cols-1 gap-1">
                          {categoryHandlers.slice(0, 3).map((handler) => (
                            <Button
                              key={handler.id}
                              variant="ghost"
                              size="sm"
                              className="justify-start text-dark-300 hover:text-white"
                              onClick={() => handleQuickActionClick(handler.id)}
                              disabled={executingAction === handler.id}
                            >
                              {executingAction === handler.id ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                              ) : (
                                getActionIcon(handler.category)
                              )}
                              <span className="ml-2 truncate">{handler.title}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-dark-700 text-xs text-dark-400 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>Press <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-xs">Esc</kbd> to close</span>
              <span>•</span>
              <span>{quickActionService.getAllHandlers().length} actions available</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap size={12} />
              <span>Powered by Groq AI</span>
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
    </>
  );
};