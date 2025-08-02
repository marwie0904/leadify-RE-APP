import { KeyboardShortcutManager } from '@/lib/a11y/keyboard/shortcuts';
import { 
  KeyboardShortcut,
  ShortcutContext,
  ShortcutOptions,
  AccessibilityError
} from '@/lib/a11y/core/types';

describe('KeyboardShortcutManager', () => {
  let manager: KeyboardShortcutManager;

  beforeEach(() => {
    manager = new KeyboardShortcutManager();
    // Mock window.navigator.platform
    Object.defineProperty(window.navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Registration', () => {
    it('should register a simple shortcut', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        id: 'test-shortcut',
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test shortcut',
      });

      expect(shortcut.id).toBe('test-shortcut');
      expect(manager.getShortcut('test-shortcut')).toBe(shortcut);
    });

    it('should generate ID if not provided', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test shortcut',
      });

      expect(shortcut.id).toMatch(/^shortcut-/);
    });

    it('should throw error for duplicate shortcuts', () => {
      const callback = jest.fn();
      
      manager.register({
        id: 'shortcut1',
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'First shortcut',
      });

      expect(() => {
        manager.register({
          id: 'shortcut2',
          key: 'k',
          modifiers: ['ctrl'],
          callback,
          description: 'Duplicate shortcut',
        });
      }).toThrow('Keyboard shortcut Ctrl+K is already registered');
    });

    it('should allow same shortcut in different contexts', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const shortcut1 = manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: callback1,
        context: 'editor',
        description: 'Editor shortcut',
      });

      const shortcut2 = manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: callback2,
        context: 'modal',
        description: 'Modal shortcut',
      });

      expect(shortcut1).toBeDefined();
      expect(shortcut2).toBeDefined();
    });

    it('should normalize key combinations', () => {
      const callback = jest.fn();
      
      // Register with different order of modifiers
      const shortcut = manager.register({
        key: 'k',
        modifiers: ['shift', 'ctrl', 'alt'],
        callback,
        description: 'Test',
      });

      // Check that it's normalized
      expect(shortcut.combination).toBe('Ctrl+Alt+Shift+K');
    });
  });

  describe('Unregistration', () => {
    it('should unregister shortcut by ID', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        id: 'test-shortcut',
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      manager.unregister('test-shortcut');
      expect(manager.getShortcut('test-shortcut')).toBeUndefined();
    });

    it('should unregister shortcut by reference', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      manager.unregister(shortcut);
      expect(manager.getShortcut(shortcut.id)).toBeUndefined();
    });

    it('should handle unregistering non-existent shortcut', () => {
      expect(() => {
        manager.unregister('non-existent');
      }).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should execute callback on shortcut press', () => {
      const callback = jest.fn();
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should not execute disabled shortcuts', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        enabled: false,
        description: 'Test',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple modifiers', () => {
      const callback = jest.fn();
      manager.register({
        key: 's',
        modifiers: ['ctrl', 'shift'],
        callback,
        description: 'Save as',
      });

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();
    });

    it('should prevent default when configured', () => {
      const callback = jest.fn();
      manager.register({
        key: 's',
        modifiers: ['ctrl'],
        callback,
        preventDefault: true,
        description: 'Save',
      });

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not trigger with wrong modifiers', () => {
      const callback = jest.fn();
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      // Press with shift instead of ctrl
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        shiftKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Context Management', () => {
    it('should only trigger shortcuts in active context', () => {
      const globalCallback = jest.fn();
      const modalCallback = jest.fn();

      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: globalCallback,
        context: 'global',
        description: 'Global shortcut',
      });

      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: modalCallback,
        context: 'modal',
        description: 'Modal shortcut',
      });

      // Set modal context active
      manager.setActiveContext('modal');

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);

      expect(globalCallback).not.toHaveBeenCalled();
      expect(modalCallback).toHaveBeenCalled();
    });

    it('should handle multiple active contexts', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.register({
        key: 'a',
        modifiers: ['ctrl'],
        callback: callback1,
        context: 'editor',
        description: 'Editor action',
      });

      manager.register({
        key: 'b',
        modifiers: ['ctrl'],
        callback: callback2,
        context: 'toolbar',
        description: 'Toolbar action',
      });

      // Set multiple contexts active
      manager.setActiveContext(['editor', 'toolbar']);

      const event1 = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      });

      const event2 = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event1);
      document.dispatchEvent(event2);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should clear active context', () => {
      const callback = jest.fn();
      
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        context: 'modal',
        description: 'Modal action',
      });

      manager.setActiveContext('modal');
      manager.clearActiveContext();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Enable/Disable', () => {
    it('should enable/disable specific shortcut', () => {
      const callback = jest.fn();
      const shortcut = manager.register({
        id: 'test-shortcut',
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      // Disable
      manager.disable('test-shortcut');
      
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();

      // Enable
      manager.enable('test-shortcut');
      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();
    });

    it('should disable all shortcuts', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      manager.register({
        key: 'a',
        modifiers: ['ctrl'],
        callback: callback1,
        description: 'Action A',
      });

      manager.register({
        key: 'b',
        modifiers: ['ctrl'],
        callback: callback2,
        description: 'Action B',
      });

      manager.disableAll();

      const event1 = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
        bubbles: true,
      });

      const event2 = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event1);
      document.dispatchEvent(event2);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should enable all shortcuts', () => {
      const callback = jest.fn();
      
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        enabled: false,
        description: 'Test',
      });

      manager.enableAll();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('OS-Specific Behavior', () => {
    it('should map Meta to Cmd on Mac', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      const callback = jest.fn();
      const shortcut = manager.register({
        key: 'k',
        modifiers: ['cmd'],
        callback,
        description: 'Command K',
      });

      expect(shortcut.combination).toContain('Cmd');

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();
    });

    it('should map Cmd to Ctrl on Windows', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      const manager2 = new KeyboardShortcutManager();
      const callback = jest.fn();
      
      const shortcut = manager2.register({
        key: 'k',
        modifiers: ['cmd'],
        callback,
        description: 'Command K',
      });

      expect(shortcut.combination).toContain('Ctrl');

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();
      
      manager2.destroy();
    });
  });

  describe('Shortcut Queries', () => {
    beforeEach(() => {
      manager.register({
        id: 'save',
        key: 's',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        description: 'Save file',
        category: 'file',
      });

      manager.register({
        id: 'save-as',
        key: 's',
        modifiers: ['ctrl', 'shift'],
        callback: jest.fn(),
        description: 'Save as',
        category: 'file',
      });

      manager.register({
        id: 'find',
        key: 'f',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        description: 'Find',
        category: 'edit',
      });
    });

    it('should get all shortcuts', () => {
      const shortcuts = manager.getAllShortcuts();
      expect(shortcuts).toHaveLength(3);
    });

    it('should get shortcuts by category', () => {
      const fileShortcuts = manager.getShortcutsByCategory('file');
      expect(fileShortcuts).toHaveLength(2);
      expect(fileShortcuts.every(s => s.category === 'file')).toBe(true);
    });

    it('should get shortcuts by context', () => {
      manager.register({
        key: 'escape',
        callback: jest.fn(),
        context: 'modal',
        description: 'Close modal',
      });

      const modalShortcuts = manager.getShortcutsByContext('modal');
      expect(modalShortcuts).toHaveLength(1);
      expect(modalShortcuts[0].context).toBe('modal');
    });

    it('should search shortcuts by description', () => {
      const saveShortcuts = manager.searchShortcuts('save');
      expect(saveShortcuts).toHaveLength(2);
      expect(saveShortcuts.every(s => 
        s.description.toLowerCase().includes('save')
      )).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts', () => {
      manager.register({
        id: 'action1',
        key: 'k',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        description: 'Action 1',
      });

      const hasConflict = manager.hasConflict('k', ['ctrl']);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict in different context', () => {
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        context: 'editor',
        description: 'Editor action',
      });

      const hasConflict = manager.hasConflict('k', ['ctrl'], 'modal');
      expect(hasConflict).toBe(false);
    });

    it('should get conflicting shortcut', () => {
      const shortcut = manager.register({
        id: 'existing',
        key: 'k',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        description: 'Existing shortcut',
      });

      const conflict = manager.getConflict('k', ['ctrl']);
      expect(conflict).toBe(shortcut);
    });
  });

  describe('Event Filtering', () => {
    it('should ignore shortcuts in input fields by default', () => {
      const callback = jest.fn();
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      input.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should allow shortcuts in inputs when configured', () => {
      const callback = jest.fn();
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        allowInInput: true,
        description: 'Test',
      });

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      input.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should handle custom when function', () => {
      const callback = jest.fn();
      const when = jest.fn().mockReturnValue(false);

      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        when,
        description: 'Conditional shortcut',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(when).toHaveBeenCalledWith(event);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      const callback = jest.fn();
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback,
        description: 'Test',
      });

      manager.destroy();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should clear all shortcuts on destroy', () => {
      manager.register({
        key: 'k',
        modifiers: ['ctrl'],
        callback: jest.fn(),
        description: 'Test',
      });

      manager.destroy();
      expect(manager.getAllShortcuts()).toHaveLength(0);
    });
  });

  describe('Help Text Generation', () => {
    it('should generate formatted shortcut text on non-Mac', () => {
      // Temporarily set platform to Windows
      Object.defineProperty(window.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      const tempManager = new KeyboardShortcutManager();
      const shortcut = tempManager.register({
        key: 'k',
        modifiers: ['ctrl', 'shift'],
        callback: jest.fn(),
        description: 'Test',
      });

      expect(shortcut.displayText).toBe('Ctrl+Shift+K');
      tempManager.destroy();

      // Reset to Mac
      Object.defineProperty(window.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
    });

    it('should use OS-specific symbols on Mac', () => {
      Object.defineProperty(window.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      const manager2 = new KeyboardShortcutManager();
      const shortcut = manager2.register({
        key: 'k',
        modifiers: ['cmd', 'shift'],
        callback: jest.fn(),
        description: 'Test',
      });

      expect(shortcut.displayText).toContain('⌘');
      expect(shortcut.displayText).toContain('⇧');
      
      manager2.destroy();
    });
  });
});