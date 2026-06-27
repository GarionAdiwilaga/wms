import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface KeyboardShortcutOptions {
  key: string;
  onKeyPressed: KeyHandler;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(options: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === options.key) {
        if (options.ctrlKey && !e.ctrlKey) return;
        if (options.metaKey && !e.metaKey) return;
        if (options.shiftKey && !e.shiftKey) return;
        if (options.altKey && !e.altKey) return;
        
        if (options.preventDefault) {
          e.preventDefault();
        }
        options.onKeyPressed(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [options]);
}
