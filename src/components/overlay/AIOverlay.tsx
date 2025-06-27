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
  Lightbulb
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { useRepositories } from '../../hooks/useRepositories';
import { useBusinessSpecs } from '../../hooks/useBusinessSpecs';
import { useDevelopers } from '../../hooks/useDevelopers';
import { useTasks } from '../../hooks/useTasks';
import { nlpProcessor, ProcessedQuery, QueryContext, TaskGenerationRequest } from '../../services/nlpProcessor';
import { TaskReviewModal } from './TaskReviewModal';
import { Task } from '../../types';
import toast from 'react-hot-toast';

export const AIOverlay: React.FC = () => {
  const { overlayOpen, setOverlayOpen } = useAppStore();
  const { repositories, currentRepository } = useRepositories();
  const { businessSpecs, generateTasksFromSpec } = useBusinessSpecs();
  const { developers } = useDevelopers();
  const { tasks } = useTasks();
  
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processedQuery, setProcessedQuery] = useState<ProcessedQuery | null>(null);
  const [showTaskReview, setShowTaskReview] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
  const [selectedSpecTitle, setSelectedSpecTitle] = useState('');
  
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
      
      // If the intent is task generation and we have business specs, offer to generate tasks
      if (result.intent.type === 'task_generation' && businessSpecs.length > 0) {
        const specEntity = result.intent.entities.find(e => e.type === 'repository');
        if (specEntity) {
          const matchingSpec = businessSpecs.find(spec => 
            spec.title.toLowerCase().includes(specEntity.value.toLowerCase())
          );
          
          if (matchingSpec) {
            handleGenerateTasks(matchingSpec.id, matchingSpec.title);
          }
        }
      }
    } catch (error) {
      console.error('Error processing query:', error);
      toast.error('Failed to process your request');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateTasks = async (specId: string, specTitle: string) => {
    try {
      setProcessing(true);
      const response = await generateTasksFromSpec(specId);
      setGeneratedTasks(response.tasks);
      setSelectedSpecTitle(specTitle);
      setShowTaskReview(true);
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast.error('Failed to generate tasks');
    } finally {
      setProcessing(false);
    }
  };

  const handleActionClick = async (action: string, parameters?: Record<string, any>) => {
    switch (action) {
      case 'generate-tasks-from-specs':
        if (businessSpecs.length > 0) {
          const spec = businessSpecs[0]; // For demo, use first spec
          handleGenerateTasks(spec.id, spec.title);
        }
        break;
      
      case 'generate-documentation':
        toast.success('Documentation generation initiated');
        setOverlayOpen(false);
        break;
      
      case 'auto-assign-tasks':
        toast.success('Auto-assigning tasks to team members');
        setOverlayOpen(false);
        break;
      
      case 'generate-pr-template':
        toast.success('PR template generation initiated');
        setOverlayOpen(false);
        break;
      
      default:
        toast.info(`Action "${action}" not implemented yet`);
    }
  };

  const handleTasksCreated = (createdTasks: Task[]) => {
    setShowTaskReview(false);
    setOverlayOpen(false);
    setQuery('');
    setProcessedQuery(null);
    toast.success(`${createdTasks.length} tasks created successfully!`);
  };

  if (!overlayOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setOverlayOpen(false)}
      >
        <div 
          className="w-full max-w-2xl bg-dark-800 border border-dark-700 rounded-lg shadow-xl overflow-hidden"
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
                <p className="text-xs text-dark-400">Ask anything about your project</p>
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
                      {processedQuery.suggestedActions.map((action) => (
                        <Card
                          key={action.id}
                          hover
                          className="cursor-pointer"
                          onClick={() => handleActionClick(action.action, action.parameters)}
                        >
                          <CardContent className="p-3 flex items-center space-x-3">
                            <div className="w-8 h-8 bg-dark-700 rounded-lg flex items-center justify-center">
                              {action.action.includes('task') ? (
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
                              <p className="text-xs text-dark-400">{action.description}</p>
                            </div>
                            <ArrowRight size={14} className="text-dark-400" />
                          </CardContent>
                        </Card>
                      ))}
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
                  <p className="text-dark-400 mb-6">Ask me anything about your project</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-dark-300">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Card hover className="cursor-pointer" onClick={() => setQuery('Generate tasks from business spec')}>
                      <CardContent className="p-3 flex items-center space-x-3">
                        <CheckSquare size={16} className="text-primary-400" />
                        <span className="text-sm text-dark-300">Generate tasks from spec</span>
                      </CardContent>
                    </Card>
                    <Card hover className="cursor-pointer" onClick={() => setQuery('Generate documentation for repository')}>
                      <CardContent className="p-3 flex items-center space-x-3">
                        <FileText size={16} className="text-secondary-400" />
                        <span className="text-sm text-dark-300">Generate documentation</span>
                      </CardContent>
                    </Card>
                    <Card hover className="cursor-pointer" onClick={() => setQuery('Create PR template for task')}>
                      <CardContent className="p-3 flex items-center space-x-3">
                        <GitBranch size={16} className="text-accent-400" />
                        <span className="text-sm text-dark-300">Create PR template</span>
                      </CardContent>
                    </Card>
                    <Card hover className="cursor-pointer" onClick={() => setQuery('Assign tasks to team members')}>
                      <CardContent className="p-3 flex items-center space-x-3">
                        <Users size={16} className="text-warning-400" />
                        <span className="text-sm text-dark-300">Assign tasks to team</span>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-dark-700 text-xs text-dark-400 flex items-center justify-between">
            <div>
              Press <kbd className="px-1.5 py-0.5 bg-dark-700 rounded text-xs">Esc</kbd> to close
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