import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';

export const useKeyboardShortcuts = () => {
  const { setOverlayOpen } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // AI Overlay - Ctrl + .
      if (event.ctrlKey && event.key === '.') {
        event.preventDefault();
        setOverlayOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setOverlayOpen]);
};