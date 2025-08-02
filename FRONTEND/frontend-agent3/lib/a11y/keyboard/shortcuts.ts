import {
  KeyboardShortcut,
  ShortcutContext,
  ShortcutOptions,
  AccessibilityError,
  AccessibilityErrorCode,
} from '../core/types';

type ModifierKey = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta';
type ShortcutMap = Map<string, KeyboardShortcut>;
type ContextMap = Map<ShortcutContext, ShortcutMap>;

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private contextShortcuts: ContextMap = new Map();
  private activeContexts: Set<ShortcutContext> = new Set(['global']);
  private globalEnabled = true;
  private handleKeyDown: (event: KeyboardEvent) => void;
  private platform: string;

  constructor() {
    this.platform = this.detectPlatform();
    this.handleKeyDown = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private detectPlatform(): string {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('linux')) return 'linux';
    return 'other';
  }

  register(options: ShortcutOptions): KeyboardShortcut {
    // Generate ID if not provided
    const id = options.id || `shortcut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Normalize modifiers
    const normalizedModifiers = this.normalizeModifiers(options.modifiers || []);
    
    // Create combination string
    const combination = this.createCombination(options.key, normalizedModifiers);
    
    // Check for conflicts
    const context = options.context || 'global';
    const existingShortcut = this.findShortcutByCombination(combination, context);
    if (existingShortcut && existingShortcut.id !== id) {
      throw new AccessibilityError(
        `Keyboard shortcut ${combination} is already registered`,
        AccessibilityErrorCode.SHORTCUT_CONFLICT
      );
    }

    // Create shortcut object
    const shortcut: KeyboardShortcut = {
      id,
      key: options.key.toLowerCase(),
      modifiers: normalizedModifiers,
      combination,
      displayText: this.createDisplayText(options.key, normalizedModifiers),
      callback: options.callback,
      description: options.description,
      category: options.category,
      context,
      enabled: options.enabled !== false,
      preventDefault: options.preventDefault !== false,
      allowInInput: options.allowInInput || false,
      when: options.when,
    };

    // Store shortcut
    this.shortcuts.set(id, shortcut);
    
    // Store in context map
    if (!this.contextShortcuts.has(context)) {
      this.contextShortcuts.set(context, new Map());
    }
    this.contextShortcuts.get(context)!.set(combination, shortcut);

    return shortcut;
  }

  unregister(idOrShortcut: string | KeyboardShortcut): void {
    const id = typeof idOrShortcut === 'string' ? idOrShortcut : idOrShortcut.id;
    const shortcut = this.shortcuts.get(id);
    
    if (!shortcut) return;

    // Remove from context map
    const contextMap = this.contextShortcuts.get(shortcut.context);
    if (contextMap) {
      contextMap.delete(shortcut.combination);
      if (contextMap.size === 0) {
        this.contextShortcuts.delete(shortcut.context);
      }
    }

    // Remove from main map
    this.shortcuts.delete(id);
  }

  private normalizeModifiers(modifiers: string[]): ModifierKey[] {
    const order: ModifierKey[] = ['ctrl', 'alt', 'shift', 'cmd', 'meta'];
    const normalized = modifiers.map(m => {
      const lower = m.toLowerCase();
      // Map cmd to appropriate key based on platform
      if (lower === 'cmd' || lower === 'command') {
        return this.platform === 'mac' ? 'cmd' : 'ctrl';
      }
      return lower as ModifierKey;
    });
    
    // Sort modifiers according to standard order
    return normalized
      .filter((m, i, arr) => arr.indexOf(m) === i) // Remove duplicates
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  private createCombination(key: string, modifiers: ModifierKey[]): string {
    const parts: string[] = [];
    
    if (modifiers.includes('ctrl')) parts.push('Ctrl');
    if (modifiers.includes('alt')) parts.push('Alt');
    if (modifiers.includes('shift')) parts.push('Shift');
    if (modifiers.includes('cmd')) parts.push('Cmd');
    if (modifiers.includes('meta') && !modifiers.includes('cmd')) parts.push('Meta');
    
    parts.push(key.toUpperCase());
    
    return parts.join('+');
  }

  private createDisplayText(key: string, modifiers: ModifierKey[]): string {
    if (this.platform !== 'mac') {
      return this.createCombination(key, modifiers);
    }

    // Use Mac symbols
    const parts: string[] = [];
    
    if (modifiers.includes('ctrl')) parts.push('⌃');
    if (modifiers.includes('alt')) parts.push('⌥');
    if (modifiers.includes('shift')) parts.push('⇧');
    if (modifiers.includes('cmd')) parts.push('⌘');
    
    parts.push(key.toUpperCase());
    
    return parts.join('');
  }

  private findShortcutByCombination(combination: string, context: ShortcutContext): KeyboardShortcut | null {
    const contextMap = this.contextShortcuts.get(context);
    return contextMap?.get(combination) || null;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.globalEnabled) return;

    // Check if we should ignore this event
    if (this.shouldIgnoreEvent(event)) return;

    // Get key and modifiers
    const key = event.key.toLowerCase();
    const modifiers = this.getEventModifiers(event);
    const combination = this.createCombination(key, modifiers);

    // Find matching shortcut in active contexts
    let matchingShortcut: KeyboardShortcut | null = null;
    
    // Check each active context
    for (const context of this.activeContexts) {
      const contextMap = this.contextShortcuts.get(context);
      if (contextMap) {
        const shortcut = contextMap.get(combination);
        if (shortcut && shortcut.enabled) {
          matchingShortcut = shortcut;
          break;
        }
      }
    }

    if (!matchingShortcut) return;

    // Check custom when condition
    if (matchingShortcut.when && !matchingShortcut.when(event)) return;

    // Prevent default if configured
    if (matchingShortcut.preventDefault) {
      event.preventDefault();
    }

    // Execute callback
    matchingShortcut.callback(event);
  }

  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    
    // Check if target is an input element
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.tagName === 'SELECT' ||
                   target.contentEditable === 'true';
    
    return isInput && !this.hasInputAllowedShortcut(event);
  }

  private hasInputAllowedShortcut(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const modifiers = this.getEventModifiers(event);
    const combination = this.createCombination(key, modifiers);

    for (const context of this.activeContexts) {
      const contextMap = this.contextShortcuts.get(context);
      if (contextMap) {
        const shortcut = contextMap.get(combination);
        if (shortcut && shortcut.enabled && shortcut.allowInInput) {
          return true;
        }
      }
    }

    return false;
  }

  private getEventModifiers(event: KeyboardEvent): ModifierKey[] {
    const modifiers: ModifierKey[] = [];
    
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');
    if (event.shiftKey) modifiers.push('shift');
    if (event.metaKey) {
      modifiers.push(this.platform === 'mac' ? 'cmd' : 'meta');
    }
    
    return this.normalizeModifiers(modifiers);
  }

  getShortcut(id: string): KeyboardShortcut | undefined {
    return this.shortcuts.get(id);
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return this.getAllShortcuts().filter(s => s.category === category);
  }

  getShortcutsByContext(context: ShortcutContext): KeyboardShortcut[] {
    return this.getAllShortcuts().filter(s => s.context === context);
  }

  searchShortcuts(query: string): KeyboardShortcut[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllShortcuts().filter(s => 
      s.description.toLowerCase().includes(lowercaseQuery) ||
      s.combination.toLowerCase().includes(lowercaseQuery) ||
      s.key.toLowerCase().includes(lowercaseQuery)
    );
  }

  hasConflict(key: string, modifiers: string[], context: ShortcutContext = 'global'): boolean {
    const normalizedModifiers = this.normalizeModifiers(modifiers);
    const combination = this.createCombination(key, normalizedModifiers);
    return this.findShortcutByCombination(combination, context) !== null;
  }

  getConflict(key: string, modifiers: string[], context: ShortcutContext = 'global'): KeyboardShortcut | null {
    const normalizedModifiers = this.normalizeModifiers(modifiers);
    const combination = this.createCombination(key, normalizedModifiers);
    return this.findShortcutByCombination(combination, context);
  }

  setActiveContext(context: ShortcutContext | ShortcutContext[]): void {
    this.activeContexts.clear();
    const contexts = Array.isArray(context) ? context : [context];
    contexts.forEach(c => this.activeContexts.add(c));
    
    // Always include global context
    this.activeContexts.add('global');
  }

  clearActiveContext(): void {
    this.activeContexts.clear();
    this.activeContexts.add('global');
  }

  enable(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = true;
    }
  }

  disable(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = false;
    }
  }

  enableAll(): void {
    this.globalEnabled = true;
    this.shortcuts.forEach(shortcut => {
      shortcut.enabled = true;
    });
  }

  disableAll(): void {
    this.globalEnabled = false;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
    this.contextShortcuts.clear();
    this.activeContexts.clear();
  }
}

// Singleton instance management
let managerInstance: KeyboardShortcutManager | null = null;

export function getKeyboardManager(): KeyboardShortcutManager {
  if (!managerInstance) {
    managerInstance = new KeyboardShortcutManager();
  }
  return managerInstance;
}

export function destroyKeyboardManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}