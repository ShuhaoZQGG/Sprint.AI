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
  Lightbulb
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';

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
}

export const AIOverlay: React.FC = () => {
  const { overlayOpen, setOverlayOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSendMessage = async () => {
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: query,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: `I understand you want to "${query}". Let me help you with that. Based on your request, I can generate specific tasks, update documentation, or create PR templates. Would you like me to proceed with any of these actions?`,
      type: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setLoading(false);
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

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    let responseContent = '';
    switch (action) {
      case 'generate-tasks':
        responseContent = 'I\'ll help you generate technical tasks from your business requirements. Please provide the business specification or feature description, and I\'ll break it down into actionable development tasks with effort estimates.';
        break;
      case 'update-docs':
        responseContent = 'I\'ll analyze your connected repositories and update the documentation. This includes refreshing API docs, component documentation, and architecture overviews based on recent code changes.';
        break;
      case 'assign-team':
        responseContent = 'I\'ll analyze your team\'s capacity, skills, and current workload to suggest optimal task assignments. This ensures balanced distribution and matches tasks with developer strengths.';
        break;
      case 'generate-pr':
        responseContent = 'I\'ll create a complete PR template including branch name, commit messages, and file scaffolds. Just tell me about the feature or task you want to implement.';
        break;
      default:
        responseContent = 'I\'m ready to help! What specific action would you like me to take?';
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      type: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!overlayOpen) return null;

  return (
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
              <div
                key={message.id}
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
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={clsx(
                    'text-xs mt-2',
                    message.type === 'user' ? 'text-primary-200' : 'text-dark-500'
                  )}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
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
            <div className="px-6 py-4 border-t border-dark-700 bg-dark-900/30">
              <h4 className="text-sm font-medium text-dark-300 mb-3 flex items-center">
                <Lightbulb size={14} className="mr-2" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {aiSuggestions.map((suggestion) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion.action, suggestion.title)}
                      disabled={loading}
                      className="flex flex-col items-center p-3 rounded-lg border border-dark-600 hover:border-primary-500 hover:bg-dark-700/50 transition-all duration-200 text-center group"
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors',
                        suggestion.color,
                        'group-hover:scale-110'
                      )}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <h5 className="text-xs font-medium text-white mb-1">{suggestion.title}</h5>
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
  );
};