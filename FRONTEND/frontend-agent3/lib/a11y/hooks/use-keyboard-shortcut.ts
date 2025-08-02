import { useEffect, useRef, useCallback, useMemo } from 'react';
import { KeyboardShortcutManager } from '../keyboard/shortcuts';
import { KeyboardShortcut } from '../core/types';

export interface UseKeyboardShortcutOptions {
  /**
   * Context name for grouping shortcuts
   */
  context?: string;
  
  /**
   * Whether shortcuts should be global (work even when not focused)
   */
  global?: boolean;
  
  /**
   * Whether shortcuts are enabled by default
   */
  enabled?: boolean;
}

export interface UseKeyboardShortcutReturn {
  /**
   * Enable a specific shortcut by ID
   */
  enable: (id: string) => void;
  
  /**
   * Disable a specific shortcut by ID
   */
  disable: (id: string) => void;
  
  /**
   * Toggle a specific shortcut by ID
   */
  toggle: (id: string) => void;
  
  /**
   * Check if a shortcut is registered
   */
  isRegistered: (id: string) => boolean;
  
  /**
   * Get all registered shortcuts
   */
  getShortcuts: () => KeyboardShortcut[];
  
  /**
   * Set the active context for shortcuts
   */
  setContext: (context: string) => void;
  
  /**
   * Clear a specific context
   */
  clearContext: (context: string) => void;
}

/**
 * Custom hook for managing keyboard shortcuts
 * Handles registration, cleanup, and provides utility functions
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut | KeyboardShortcut[] | null | undefined,
  options: UseKeyboardShortcutOptions = {}
): UseKeyboardShortcutReturn {
  const managerRef = useRef<KeyboardShortcutManager | null>(null);
  const registeredIdsRef = useRef<string[]>([]);
  const contextRef = useRef<string | undefined>(options.context);

  // Initialize manager if not exists
  if (!managerRef.current) {
    managerRef.current = new KeyboardShortcutManager();
  }

  const manager = managerRef.current;

  // Normalize shortcuts to array
  const normalizedShortcuts = useMemo(() => {
    if (!shortcuts) return [];
    return Array.isArray(shortcuts) ? shortcuts : [shortcuts];
  }, [shortcuts]);

  // Create shortcuts with options applied
  const processedShortcuts = useMemo(() => {
    return normalizedShortcuts.map(shortcut => ({
      ...shortcut,
      global: shortcut.global ?? options.global,
      enabled: shortcut.enabled ?? options.enabled ?? true,
    }));
  }, [normalizedShortcuts, options.global, options.enabled]);

  // Register shortcuts effect
  useEffect(() => {
    if (processedShortcuts.length === 0) {
      return;
    }

    const newIds: string[] = [];

    try {
      processedShortcuts.forEach(shortcut => {
        const id = manager.register(shortcut);
        newIds.push(id);
      });

      registeredIdsRef.current = newIds;
    } catch (error) {
      console.warn('Failed to register keyboard shortcuts:', error);
      // Clean up any successfully registered shortcuts
      newIds.forEach(id => {
        try {
          manager.unregister(id);
        } catch (cleanupError) {
          console.warn('Failed to cleanup shortcut during error recovery:', cleanupError);
        }
      });
      registeredIdsRef.current = [];
    }

    // Cleanup function
    return () => {
      registeredIdsRef.current.forEach(id => {
        try {
          manager.unregister(id);
        } catch (error) {
          console.warn('Failed to unregister keyboard shortcut:', error);
        }
      });
      registeredIdsRef.current = [];
    };
  }, [processedShortcuts, manager]);

  // Context management effect
  useEffect(() => {
    if (options.context) {
      try {
        manager.setActiveContext(options.context);
        contextRef.current = options.context;
      } catch (error) {
        console.warn('Failed to set keyboard shortcut context:', error);
      }
    }

    return () => {
      if (contextRef.current) {
        try {
          manager.clearContext(contextRef.current);
        } catch (error) {
          console.warn('Failed to clear keyboard shortcut context:', error);
        }
      }
    };
  }, [options.context, manager]);

  // Utility functions
  const enable = useCallback((id: string) => {
    try {
      manager.enableShortcut(id);
    } catch (error) {
      console.warn(`Failed to enable keyboard shortcut ${id}:`, error);
    }
  }, [manager]);

  const disable = useCallback((id: string) => {
    try {
      manager.disableShortcut(id);
    } catch (error) {
      console.warn(`Failed to disable keyboard shortcut ${id}:`, error);
    }
  }, [manager]);

  const toggle = useCallback((id: string) => {
    try {
      manager.toggleShortcut(id);
    } catch (error) {
      console.warn(`Failed to toggle keyboard shortcut ${id}:`, error);
    }
  }, [manager]);

  const isRegistered = useCallback((id: string) => {
    try {
      return manager.isShortcutRegistered(id);
    } catch (error) {
      console.warn(`Failed to check if keyboard shortcut ${id} is registered:`, error);
      return false;
    }
  }, [manager]);

  const getShortcuts = useCallback(() => {
    try {
      return manager.getRegisteredShortcuts();
    } catch (error) {
      console.warn('Failed to get registered keyboard shortcuts:', error);
      return [];
    }
  }, [manager]);

  const setContext = useCallback((context: string) => {
    try {
      manager.setActiveContext(context);
      contextRef.current = context;
    } catch (error) {
      console.warn(`Failed to set keyboard shortcut context ${context}:`, error);
    }
  }, [manager]);

  const clearContext = useCallback((context: string) => {
    try {
      manager.clearContext(context);
      if (contextRef.current === context) {
        contextRef.current = undefined;
      }
    } catch (error) {
      console.warn(`Failed to clear keyboard shortcut context ${context}:`, error);
    }
  }, [manager]);

  // Cleanup manager on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        try {
          managerRef.current.destroy();
        } catch (error) {
          console.warn('Failed to destroy keyboard shortcut manager:', error);
        }
        managerRef.current = null;
      }
    };
  }, []);

  return {
    enable,
    disable,
    toggle,
    isRegistered,
    getShortcuts,
    setContext,
    clearContext,
  };
}

/**
 * Hook variant for single shortcut with simpler API
 */
export function useKeyboardShortcutSimple(
  key: string,
  callback: (event: KeyboardEvent) => void,
  options: {
    modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
    description?: string;
    category?: 'navigation' | 'action' | 'form' | 'custom';
    enabled?: boolean;
    global?: boolean;
    context?: string;
  } = {}
): UseKeyboardShortcutReturn {
  const shortcut: KeyboardShortcut = {
    key,
    modifiers: options.modifiers,
    action: callback,
    description: options.description || `Shortcut for ${key}`,
    category: options.category || 'custom',
    enabled: options.enabled,
    global: options.global,
  };

  return useKeyboardShortcut(shortcut, {
    context: options.context,
    global: options.global,
    enabled: options.enabled,
  });
}

/**
 * Hook for common keyboard shortcuts with predefined actions
 */
export function useCommonShortcuts(actions: {
  onSave?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onFind?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
}, options: UseKeyboardShortcutOptions = {}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.onSave) {
    shortcuts.push({
      key: 's',
      modifiers: ['ctrl'],
      action: actions.onSave,
      description: 'Save',
      category: 'action',
    });
  }

  if (actions.onCopy) {
    shortcuts.push({
      key: 'c',
      modifiers: ['ctrl'],
      action: actions.onCopy,
      description: 'Copy',
      category: 'action',
    });
  }

  if (actions.onPaste) {
    shortcuts.push({
      key: 'v',
      modifiers: ['ctrl'],
      action: actions.onPaste,
      description: 'Paste',
      category: 'action',
    });
  }

  if (actions.onCut) {
    shortcuts.push({
      key: 'x',
      modifiers: ['ctrl'],
      action: actions.onCut,
      description: 'Cut',
      category: 'action',
    });
  }

  if (actions.onUndo) {
    shortcuts.push({
      key: 'z',
      modifiers: ['ctrl'],
      action: actions.onUndo,
      description: 'Undo',
      category: 'action',
    });
  }

  if (actions.onRedo) {
    shortcuts.push({
      key: 'y',
      modifiers: ['ctrl'],
      action: actions.onRedo,
      description: 'Redo',
      category: 'action',
    });
  }

  if (actions.onSelectAll) {
    shortcuts.push({
      key: 'a',
      modifiers: ['ctrl'],
      action: actions.onSelectAll,
      description: 'Select All',
      category: 'action',
    });
  }

  if (actions.onFind) {
    shortcuts.push({
      key: 'f',
      modifiers: ['ctrl'],
      action: actions.onFind,
      description: 'Find',
      category: 'navigation',
    });
  }

  if (actions.onEscape) {
    shortcuts.push({
      key: 'Escape',
      action: actions.onEscape,
      description: 'Escape',
      category: 'navigation',
    });
  }

  if (actions.onEnter) {
    shortcuts.push({
      key: 'Enter',
      action: actions.onEnter,
      description: 'Enter',
      category: 'navigation',
    });
  }

  return useKeyboardShortcut(shortcuts, options);
}