import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  Command, 
  Search, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Users,
  ArrowRight,
  X
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const aiSuggestions = [
  {
    id: '1',
    title: 'Generate Technical Tasks',
    description: 'Convert business requirements into actionable development tasks',
    icon: CheckSquare,
    action: 'generate-tasks',
  },
  {
    id: '2',
    title: 'Update Documentation',
    description: 'Analyze codebase and refresh living documentation',
    icon: FileText,
    action: 'update-docs',
  },
  {
    id: '3',
    title: 'Assign Team Members',
    description: 'Auto-assign tasks based on developer profiles and capacity',
    icon: Users,
    action: 'assign-team',
  },
  {
    id: '4',
    title: 'Generate PR Template',
    description: 'Create branch, commit message, and file scaffolds for a task',
    icon: Sparkles,
    action: 'generate-pr',
  },
];

export const AIOverlay: React.FC = () => {
  const { overlayOpen, setOverlayOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSuggestionClick = async (action: string) => {
    setLoading(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setOverlayOpen(false);
  };

  if (!overlayOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center pt-16 px-4">
        <div
          className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm transition-opacity"
          onClick={() => setOverlayOpen(false)}
        />
        
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-dark-800 border border-dark-700 shadow-xl transition-all animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Command className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            </div>
            <button
              onClick={() => setOverlayOpen(false)}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Input */}
          <div className="px-6 py-4 border-b border-dark-700">
            <Input
              placeholder="Describe what you want to accomplish..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search size={16} />}
              className="text-base"
            />
          </div>

          {/* AI Suggestions */}
          <div className="px-6 py-4">
            <h4 className="text-sm font-medium text-dark-300 mb-4">Quick Actions</h4>
            <div className="space-y-2">
              {aiSuggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.action)}
                    disabled={loading}
                    className={clsx(
                      'w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200',
                      'border-dark-600 hover:border-primary-500 hover:bg-dark-700/50',
                      'text-left group'
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                        <Icon size={16} className="text-dark-300 group-hover:text-white" />
                      </div>
                      <div>
                        <h5 className="font-medium text-white">{suggestion.title}</h5>
                        <p className="text-sm text-dark-400">{suggestion.description}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-dark-500 group-hover:text-primary-400" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-dark-700 bg-dark-900/50">
            <div className="flex items-center justify-between">
              <p className="text-xs text-dark-400">
                Press <kbd className="px-1.5 py-0.5 bg-dark-700 border border-dark-600 rounded text-xs">Ctrl+.</kbd> to toggle
              </p>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                disabled={!query.trim()}
                onClick={() => handleSuggestionClick('process-query')}
              >
                Process with AI
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};