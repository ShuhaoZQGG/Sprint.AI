import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useShortcutHelp } from '../components/ui/ShortcutHelper';
import { useGlobalShortcuts } from './useGlobalShortcuts';

export const useKeyboardShortcuts = () => {
  const { setOverlayOpen } = useAppStore();
  const { ShortcutHelperModal } = useShortcutHelp();
  
  // Initialize global shortcuts
  useGlobalShortcuts();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // AI Overlay - Ctrl + . (existing functionality)
      if (event.ctrlKey && event.key === '.') {
        event.preventDefault();
        setOverlayOpen(true);
      }

      // Quick search - Ctrl + /
      if (event.ctrlKey && event.key === '/') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Focus management - Tab navigation enhancement
      if (event.key === 'Tab') {
        // Add visual focus indicators for keyboard navigation
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      // Remove keyboard navigation class when mouse is used
      document.body.classList.remove('keyboard-navigation');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [setOverlayOpen]);

  return {
    ShortcutHelperModal,
  };
};