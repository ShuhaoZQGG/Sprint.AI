import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import toast from 'react-hot-toast';

interface ShortcutAction {
  key: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'actions' | 'ai' | 'general';
  modifiers?: ('ctrl' | 'shift' | 'alt')[];
}

export const useGlobalShortcuts = () => {
  const { setCurrentView, setOverlayOpen, sidebarOpen, setSidebarOpen } = useAppStore();

  const shortcuts: ShortcutAction[] = [
    // Navigation shortcuts
    {
      key: '1',
      description: 'Go to Dashboard',
      action: () => setCurrentView('dashboard'),
      category: 'navigation',
      modifiers: ['ctrl'],
    },
    {
      key: '2',
      description: 'Go to Tasks',
      action: () => setCurrentView('tasks'),
      category: 'navigation',
      modifiers: ['ctrl'],
    },
    {
      key: '3',
      description: 'Go to Documentation',
      action: () => setCurrentView('docs'),
      category: 'navigation',
      modifiers: ['ctrl'],
    },
    {
      key: '4',
      description: 'Go to Team Profile',
      action: () => setCurrentView('profile'),
      category: 'navigation',
      modifiers: ['ctrl'],
    },
    {
      key: '5',
      description: 'Go to Sprints',
      action: () => setCurrentView('sprints'),
      category: 'navigation',
      modifiers: ['ctrl'],
    },

    // AI shortcuts
    {
      key: '.',
      description: 'Open AI Assistant',
      action: () => setOverlayOpen(true),
      category: 'ai',
      modifiers: ['ctrl'],
    },
    {
      key: 'k',
      description: 'Quick Command',
      action: () => setOverlayOpen(true),
      category: 'ai',
      modifiers: ['ctrl'],
    },

    // Action shortcuts
    {
      key: 'n',
      description: 'New Task',
      action: () => {
        // This would open a task creation modal
        toast.success('New task shortcut triggered');
      },
      category: 'actions',
      modifiers: ['ctrl'],
    },
    {
      key: 's',
      description: 'New Sprint',
      action: () => {
        // This would open a sprint creation modal
        toast.success('New sprint shortcut triggered');
      },
      category: 'actions',
      modifiers: ['ctrl', 'shift'],
    },

    // General shortcuts
    {
      key: 'b',
      description: 'Toggle Sidebar',
      action: () => setSidebarOpen(!sidebarOpen),
      category: 'general',
      modifiers: ['ctrl'],
    },
    {
      key: '/',
      description: 'Search',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      category: 'general',
    },
    {
      key: 'Escape',
      description: 'Close Modals/Overlays',
      action: () => setOverlayOpen(false),
      category: 'general',
    },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const shortcut = shortcuts.find(s => {
      const keyMatches = s.key.toLowerCase() === event.key.toLowerCase();
      const modifiersMatch = s.modifiers?.every(modifier => {
        switch (modifier) {
          case 'ctrl': return event.ctrlKey || event.metaKey;
          case 'shift': return event.shiftKey;
          case 'alt': return event.altKey;
          default: return false;
        }
      }) ?? true;

      return keyMatches && modifiersMatch;
    });

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
    }
  }, [shortcuts, sidebarOpen, setSidebarOpen, setCurrentView, setOverlayOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    getShortcutsByCategory: (category: ShortcutAction['category']) => 
      shortcuts.filter(s => s.category === category),
    formatShortcut: (shortcut: ShortcutAction) => {
      const modifiers = shortcut.modifiers?.map(m => {
        switch (m) {
          case 'ctrl': return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
          case 'shift': return '⇧';
          case 'alt': return navigator.platform.includes('Mac') ? '⌥' : 'Alt';
          default: return m;
        }
      }) || [];
      
      return [...modifiers, shortcut.key.toUpperCase()].join(' + ');
    },
  };
};