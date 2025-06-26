import React, { useState } from 'react';
import { Keyboard, X, Search } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';

interface ShortcutHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelper: React.FC<ShortcutHelperProps> = ({
  isOpen,
  onClose,
}) => {
  const { shortcuts, getShortcutsByCategory, formatShortcut } = useGlobalShortcuts();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖' },
    { id: 'actions', label: 'Actions', icon: '⚡' },
    { id: 'general', label: 'General', icon: '⚙️' },
  ] as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="space-y-6">
        {/* Search */}
        <Input
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search size={16} />}
        />

        {/* Shortcuts by Category */}
        <div className="space-y-6">
          {categories.map(category => {
            const categoryShortcuts = searchQuery
              ? filteredShortcuts.filter(s => s.category === category.id)
              : getShortcutsByCategory(category.id);

            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category.id}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${shortcut.key}-${index}`}
                      className="flex items-center justify-between p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-white font-medium">{shortcut.description}</div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-dark-400 text-sm">+</span>
                            )}
                            <kbd className="px-2 py-1 bg-dark-800 border border-dark-600 rounded text-xs font-mono text-white">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <div className="p-4 bg-primary-900/20 rounded-lg border border-primary-500">
          <h4 className="text-sm font-medium text-primary-400 mb-2 flex items-center">
            <Keyboard size={16} className="mr-2" />
            Pro Tips
          </h4>
          <ul className="text-sm text-dark-300 space-y-1">
            <li>• Press <kbd className="px-1 py-0.5 bg-dark-700 rounded text-xs">?</kbd> anytime to open this help</li>
            <li>• Shortcuts work from anywhere in the app (except when typing)</li>
            <li>• Use <kbd className="px-1 py-0.5 bg-dark-700 rounded text-xs">Ctrl + K</kbd> for quick command access</li>
            <li>• Press <kbd className="px-1 py-0.5 bg-dark-700 rounded text-xs">Esc</kbd> to close any modal or overlay</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-dark-700">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Global shortcut to open help
export const useShortcutHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Don't trigger when typing in inputs
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement ||
          (event.target as HTMLElement)?.contentEditable === 'true'
        ) {
          return;
        }
        
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    setIsOpen,
    ShortcutHelperModal: () => (
      <ShortcutHelper isOpen={isOpen} onClose={() => setIsOpen(false)} />
    ),
  };
};