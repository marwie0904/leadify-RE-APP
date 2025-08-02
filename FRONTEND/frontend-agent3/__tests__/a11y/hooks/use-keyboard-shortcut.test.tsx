import React, { useEffect } from 'react';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useKeyboardShortcut } from '@/lib/a11y/hooks/use-keyboard-shortcut';
import { KeyboardShortcut, ShortcutCategory } from '@/lib/a11y/core/types';

// Mock the KeyboardShortcutManager
const mockKeyboardManager = {
  register: jest.fn(),
  unregister: jest.fn(),
  setActiveContext: jest.fn(),
  clearContext: jest.fn(),
  isShortcutRegistered: jest.fn(),
  getRegisteredShortcuts: jest.fn(),
  destroy: jest.fn(),
  enableShortcut: jest.fn(),
  disableShortcut: jest.fn(),
  toggleShortcut: jest.fn(),
};

jest.mock('@/lib/a11y/keyboard/shortcuts', () => ({
  KeyboardShortcutManager: jest.fn(() => mockKeyboardManager),
}));

describe('useKeyboardShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKeyboardManager.register.mockReturnValue('mock-shortcut-id');
    mockKeyboardManager.isShortcutRegistered.mockReturnValue(false);
    mockKeyboardManager.getRegisteredShortcuts.mockReturnValue([]);
  });

  describe('Single Shortcut Registration', () => {
    it('should register a single keyboard shortcut', () => {
      const callback = jest.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: callback,
        description: 'Test shortcut',
        category: 'custom',
      };

      renderHook(() => useKeyboardShortcut(shortcut));

      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'k',
          modifiers: ['ctrl'],
          action: callback,
          description: 'Test shortcut',
          category: 'custom',
        })
      );
    });

    it('should unregister shortcut on unmount', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { unmount } = renderHook(() => useKeyboardShortcut(shortcut));
      
      unmount();

      expect(mockKeyboardManager.unregister).toHaveBeenCalledWith('mock-shortcut-id');
    });

    it('should update shortcut when dependencies change', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const { rerender } = renderHook(
        ({ callback }) => useKeyboardShortcut({
          key: 'k',
          modifiers: ['ctrl'],
          action: callback,
          description: 'Test shortcut',
          category: 'custom',
        }),
        { initialProps: { callback: callback1 } }
      );

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(1);
      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(0);

      // Update callback
      rerender({ callback: callback2 });

      expect(mockKeyboardManager.unregister).toHaveBeenCalledWith('mock-shortcut-id');
      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(2);
    });

    it('should handle disabled state', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
        enabled: false,
      };

      renderHook(() => useKeyboardShortcut(shortcut));

      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });

  describe('Multiple Shortcuts Registration', () => {
    it('should register multiple keyboard shortcuts', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'k',
          modifiers: ['ctrl'],
          action: jest.fn(),
          description: 'First shortcut',
          category: 'custom',
        },
        {
          key: 's',
          modifiers: ['ctrl'],
          action: jest.fn(),
          description: 'Second shortcut',
          category: 'action',
        },
      ];

      renderHook(() => useKeyboardShortcut(shortcuts));

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(2);
      expect(mockKeyboardManager.register).toHaveBeenNthCalledWith(1, expect.objectContaining({
        key: 'k',
        description: 'First shortcut',
      }));
      expect(mockKeyboardManager.register).toHaveBeenNthCalledWith(2, expect.objectContaining({
        key: 's',
        description: 'Second shortcut',
      }));
    });

    it('should unregister all shortcuts on unmount', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'k', modifiers: ['ctrl'], action: jest.fn(), description: 'First', category: 'custom' },
        { key: 's', modifiers: ['ctrl'], action: jest.fn(), description: 'Second', category: 'action' },
      ];

      const { unmount } = renderHook(() => useKeyboardShortcut(shortcuts));
      
      unmount();

      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(2);
    });

    it('should handle shortcuts array changes', () => {
      const initialShortcuts: KeyboardShortcut[] = [
        { key: 'k', modifiers: ['ctrl'], action: jest.fn(), description: 'First', category: 'custom' },
      ];

      const updatedShortcuts: KeyboardShortcut[] = [
        { key: 'k', modifiers: ['ctrl'], action: jest.fn(), description: 'First', category: 'custom' },
        { key: 's', modifiers: ['ctrl'], action: jest.fn(), description: 'Second', category: 'action' },
      ];

      const { rerender } = renderHook(
        ({ shortcuts }) => useKeyboardShortcut(shortcuts),
        { initialProps: { shortcuts: initialShortcuts } }
      );

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(1);
      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(0);

      rerender({ shortcuts: updatedShortcuts });

      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(1);
      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(3); // 1 initial + 2 new
    });
  });

  describe('Hook Options', () => {
    it('should set active context when provided', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      renderHook(() => useKeyboardShortcut(shortcut, {
        context: 'modal',
      }));

      expect(mockKeyboardManager.setActiveContext).toHaveBeenCalledWith('modal');
    });

    it('should clear context on unmount when provided', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { unmount } = renderHook(() => useKeyboardShortcut(shortcut, {
        context: 'modal',
      }));

      unmount();

      expect(mockKeyboardManager.clearContext).toHaveBeenCalledWith('modal');
    });

    it('should handle global shortcuts', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Global shortcut',
        category: 'custom',
        global: true,
      };

      renderHook(() => useKeyboardShortcut(shortcut, {
        global: true,
      }));

      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ global: true })
      );
    });

    it('should enable shortcuts by default', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      renderHook(() => useKeyboardShortcut(shortcut, {
        enabled: true,
      }));

      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it('should disable shortcuts when enabled is false', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      renderHook(() => useKeyboardShortcut(shortcut, {
        enabled: false,
      }));

      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });
  });

  describe('Hook Return Values', () => {
    it('should return shortcut management functions', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      expect(result.current).toHaveProperty('enable');
      expect(result.current).toHaveProperty('disable');
      expect(result.current).toHaveProperty('toggle');
      expect(result.current).toHaveProperty('isRegistered');
      expect(result.current).toHaveProperty('getShortcuts');
      expect(result.current).toHaveProperty('setContext');
      expect(result.current).toHaveProperty('clearContext');
    });

    it('should enable shortcuts through returned function', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
        id: 'test-shortcut',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      act(() => {
        result.current.enable('test-shortcut');
      });

      expect(mockKeyboardManager.enableShortcut).toHaveBeenCalledWith('test-shortcut');
    });

    it('should disable shortcuts through returned function', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
        id: 'test-shortcut',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      act(() => {
        result.current.disable('test-shortcut');
      });

      expect(mockKeyboardManager.disableShortcut).toHaveBeenCalledWith('test-shortcut');
    });

    it('should toggle shortcuts through returned function', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
        id: 'test-shortcut',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      act(() => {
        result.current.toggle('test-shortcut');
      });

      expect(mockKeyboardManager.toggleShortcut).toHaveBeenCalledWith('test-shortcut');
    });

    it('should check if shortcut is registered', () => {
      mockKeyboardManager.isShortcutRegistered.mockReturnValue(true);

      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
        id: 'test-shortcut',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      expect(result.current.isRegistered('test-shortcut')).toBe(true);
      expect(mockKeyboardManager.isShortcutRegistered).toHaveBeenCalledWith('test-shortcut');
    });

    it('should get registered shortcuts', () => {
      const mockShortcuts = [
        { key: 'k', modifiers: ['ctrl'], description: 'Test' },
        { key: 's', modifiers: ['ctrl'], description: 'Save' },
      ];
      mockKeyboardManager.getRegisteredShortcuts.mockReturnValue(mockShortcuts);

      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      expect(result.current.getShortcuts()).toEqual(mockShortcuts);
    });

    it('should set context through returned function', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      act(() => {
        result.current.setContext('new-context');
      });

      expect(mockKeyboardManager.setActiveContext).toHaveBeenCalledWith('new-context');
    });

    it('should clear context through returned function', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { result } = renderHook(() => useKeyboardShortcut(shortcut));

      act(() => {
        result.current.clearContext('test-context');
      });

      expect(mockKeyboardManager.clearContext).toHaveBeenCalledWith('test-context');
    });
  });

  describe('Integration with Components', () => {
    const TestComponent = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => {
      useKeyboardShortcut([
        {
          key: 's',
          modifiers: ['ctrl'],
          action: onSave,
          description: 'Save',
          category: 'action',
        },
        {
          key: 'Escape',
          action: onCancel,
          description: 'Cancel',
          category: 'navigation',
        },
      ]);

      return (
        <div>
          <button onClick={onSave}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      );
    };

    it('should work with React components', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      render(<TestComponent onSave={onSave} onCancel={onCancel} />);

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(2);
      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 's',
          modifiers: ['ctrl'],
          description: 'Save',
        })
      );
      expect(mockKeyboardManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Escape',
          description: 'Cancel',
        })
      );
    });

    it('should cleanup shortcuts when component unmounts', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();

      const { unmount } = render(<TestComponent onSave={onSave} onCancel={onCancel} />);

      unmount();

      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conditional Shortcuts', () => {
    it('should register shortcuts conditionally', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcut(enabled ? {
          key: 'k',
          modifiers: ['ctrl'],
          action: jest.fn(),
          description: 'Conditional shortcut',
          category: 'custom',
        } : null),
        { initialProps: { enabled: false } }
      );

      expect(mockKeyboardManager.register).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined shortcuts gracefully', () => {
      expect(() => {
        renderHook(() => useKeyboardShortcut(undefined));
      }).not.toThrow();

      expect(mockKeyboardManager.register).not.toHaveBeenCalled();
    });

    it('should handle empty shortcuts array', () => {
      renderHook(() => useKeyboardShortcut([]));

      expect(mockKeyboardManager.register).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not re-register shortcuts unnecessarily', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { rerender } = renderHook(() => useKeyboardShortcut(shortcut));

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(1);

      // Re-render without changes
      rerender();

      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(1);
      expect(mockKeyboardManager.unregister).not.toHaveBeenCalled();
    });

    it('should handle rapid shortcut changes efficiently', () => {
      const { rerender } = renderHook(
        ({ count }) => useKeyboardShortcut({
          key: 'k',
          modifiers: ['ctrl'],
          action: () => console.log(count),
          description: 'Test shortcut',
          category: 'custom',
        }),
        { initialProps: { count: 0 } }
      );

      // Rapid re-renders
      for (let i = 1; i <= 5; i++) {
        rerender({ count: i });
      }

      // Should unregister old and register new for each change
      expect(mockKeyboardManager.unregister).toHaveBeenCalledTimes(5);
      expect(mockKeyboardManager.register).toHaveBeenCalledTimes(6); // 1 initial + 5 updates
    });
  });

  describe('Error Handling', () => {
    it('should handle manager errors gracefully', () => {
      mockKeyboardManager.register.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      // Should not throw, but handle the error gracefully
      expect(() => {
        renderHook(() => useKeyboardShortcut(shortcut));
      }).not.toThrow();
    });

    it('should handle cleanup errors gracefully', () => {
      mockKeyboardManager.unregister.mockImplementation(() => {
        throw new Error('Unregistration failed');
      });

      const shortcut: KeyboardShortcut = {
        key: 'k',
        modifiers: ['ctrl'],
        action: jest.fn(),
        description: 'Test shortcut',
        category: 'custom',
      };

      const { unmount } = renderHook(() => useKeyboardShortcut(shortcut));

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});