import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  scope?: 'global' | 'local';
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  scope = 'global'
}: UseKeyboardShortcutsOptions) => {
  const elementRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input field (unless it's a global shortcut)
      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isContentEditable = target.contentEditable === 'true';

      shortcuts.forEach((shortcut) => {
        // Skip if shortcut is disabled
        if (shortcut.enabled === false) return;

        // Check if all modifier keys match
        const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
        const metaMatch = shortcut.metaKey ? event.metaKey : true;
        const shiftMatch = shortcut.shiftKey === event.shiftKey;
        const altMatch = shortcut.altKey === event.altKey;

        // Check if the key matches (case-insensitive)
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        // Special handling for certain keys in input fields
        const isEscape = shortcut.key === 'Escape';
        const isGlobalShortcut = shortcut.ctrlKey || shortcut.metaKey;

        // Skip if we're in an input field and it's not a global shortcut or Escape
        if ((isInput || isContentEditable) && !isGlobalShortcut && !isEscape) {
          return;
        }

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          shortcut.handler(event);
        }
      });
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    const target = scope === 'global' ? window : elementRef.current;
    if (!target) return;

    target.addEventListener('keydown', handleKeyDown as any);

    return () => {
      target.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [handleKeyDown, enabled, scope]);

  return { elementRef };
};

// Pre-defined common shortcuts
export const commonShortcuts = {
  search: { key: 'k', ctrlKey: true, description: 'Open search' },
  escape: { key: 'Escape', description: 'Close modal/dialog' },
  save: { key: 's', ctrlKey: true, description: 'Save' },
  new: { key: 'n', ctrlKey: true, description: 'Create new' },
  delete: { key: 'd', ctrlKey: true, description: 'Delete' },
  copy: { key: 'c', ctrlKey: true, description: 'Copy' },
  paste: { key: 'v', ctrlKey: true, description: 'Paste' },
  undo: { key: 'z', ctrlKey: true, description: 'Undo' },
  redo: { key: 'z', ctrlKey: true, shiftKey: true, description: 'Redo' },
  help: { key: '?', shiftKey: true, description: 'Show help' },
  focus: { key: '/', description: 'Focus search' }
};

// Hook for global app shortcuts
export const useGlobalShortcuts = () => {
  const shortcuts: KeyboardShortcut[] = [
    {
      ...commonShortcuts.search,
      handler: () => {
        // Trigger global search - will be connected to GlobalCommandCenter
        const event = new CustomEvent('openGlobalSearch');
        window.dispatchEvent(event);
      }
    },
    {
      ...commonShortcuts.help,
      handler: () => {
        // Show keyboard shortcuts help
        const event = new CustomEvent('showKeyboardHelp');
        window.dispatchEvent(event);
      }
    },
    {
      key: '/',
      handler: () => {
        // Focus on search input
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    },
    {
      key: 'n',
      ctrlKey: true,
      handler: () => {
        // New student
        const event = new CustomEvent('createNewStudent');
        window.dispatchEvent(event);
      },
      description: 'Add new student'
    },
    {
      key: 'l',
      ctrlKey: true,
      handler: () => {
        // Schedule lesson
        const event = new CustomEvent('scheduleLesson');
        window.dispatchEvent(event);
      },
      description: 'Schedule lesson'
    },
    {
      key: 'p',
      ctrlKey: true,
      handler: () => {
        // Record payment
        const event = new CustomEvent('recordPayment');
        window.dispatchEvent(event);
      },
      description: 'Record payment'
    }
  ];

  useKeyboardShortcuts({ shortcuts, enabled: true, scope: 'global' });
};

// Hook to listen for keyboard shortcut events
export const useKeyboardShortcutListener = (
  eventName: string,
  handler: () => void,
  deps: any[] = []
) => {
  useEffect(() => {
    const handleEvent = () => handler();
    window.addEventListener(eventName, handleEvent);
    return () => window.removeEventListener(eventName, handleEvent);
  }, deps);
};

// Utility to format shortcut for display
export const formatShortcut = (shortcut: Partial<KeyboardShortcut>): string => {
  const keys = [];

  // Use ⌘ for Mac, Ctrl for others
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrlKey || shortcut.metaKey) {
    keys.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) keys.push('⇧');
  if (shortcut.altKey) keys.push(isMac ? '⌥' : 'Alt');

  if (shortcut.key) {
    // Format special keys
    const keyMap: { [key: string]: string } = {
      'escape': 'Esc',
      'enter': '↵',
      'arrowup': '↑',
      'arrowdown': '↓',
      'arrowleft': '←',
      'arrowright': '→',
      ' ': 'Space'
    };

    const formattedKey = keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase();
    keys.push(formattedKey);
  }

  return keys.join(isMac ? '' : '+');
};