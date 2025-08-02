# Keyboard Navigation System Design

## Overview

This document details the keyboard navigation system architecture for the financial dashboard application, ensuring all functionality is accessible via keyboard.

## System Architecture

### Core Components

```
keyboard-navigation/
├── core/
│   ├── ShortcutManager.ts      # Central shortcut registry
│   ├── FocusManager.ts         # Focus control and trapping
│   ├── NavigationRouter.ts     # Navigation flow control
│   └── KeyboardEventBus.ts     # Event distribution
├── patterns/
│   ├── GridNavigation.ts       # 2D navigation for grids
│   ├── ListNavigation.ts       # Linear navigation
│   ├── TreeNavigation.ts       # Hierarchical navigation
│   └── TabNavigation.ts        # Tab/panel navigation
├── shortcuts/
│   ├── GlobalShortcuts.ts      # App-wide shortcuts
│   ├── PageShortcuts.ts        # Page-specific shortcuts
│   └── ComponentShortcuts.ts   # Component shortcuts
└── utils/
    ├── FocusUtils.ts           # Focus utilities
    ├── KeyUtils.ts             # Key combination parsing
    └── PlatformUtils.ts        # OS-specific handling
```

## Keyboard Shortcut Hierarchy

### Global Shortcuts (Always Active)

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Alt + S` | Skip to main content | Bypasses navigation |
| `Alt + N` | Focus navigation menu | Quick nav access |
| `Alt + /` | Open command palette | Quick action access |
| `Alt + H` | Open help dialog | Shortcut reference |
| `Ctrl + K` | Global search | Search anywhere |
| `Esc` | Close/Cancel | Universal escape |

### Navigation Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Tab` | Next focusable element | Global |
| `Shift + Tab` | Previous focusable element | Global |
| `Arrow Keys` | Directional navigation | Context-aware |
| `Home` | First item | Lists/Grids |
| `End` | Last item | Lists/Grids |
| `Page Up` | Previous page | Paginated content |
| `Page Down` | Next page | Paginated content |

### Page-Specific Shortcuts

#### Dashboard
| Shortcut | Action |
|----------|--------|
| `D` | Focus date picker |
| `R` | Refresh data |
| `E` | Export data |
| `1-9` | Jump to widget N |

#### Agents
| Shortcut | Action |
|----------|--------|
| `N` | New agent |
| `E` | Edit selected |
| `Delete` | Delete selected |
| `Space` | Preview agent |

#### Conversations
| Shortcut | Action |
|----------|--------|
| `C` | New conversation |
| `Enter` | Open selected |
| `Ctrl + Enter` | Send message |
| `Up/Down` | Navigate messages |

## Navigation Patterns

### 1. Focus Management

```typescript
interface FocusContext {
  // Current focus state
  currentElement: HTMLElement | null;
  previousElement: HTMLElement | null;
  focusHistory: HTMLElement[];
  
  // Focus regions
  regions: Map<string, FocusRegion>;
  activeRegion: string | null;
  
  // Focus traps
  activeTrap: FocusTrap | null;
  trapStack: FocusTrap[];
}

interface FocusRegion {
  id: string;
  name: string;
  container: HTMLElement;
  focusableElements: HTMLElement[];
  navigationPattern: NavigationPattern;
  entryPoint?: HTMLElement;
  exitPoint?: HTMLElement;
}

type NavigationPattern = 
  | 'linear'      // Tab through elements
  | 'grid'        // 2D arrow navigation
  | 'tree'        // Hierarchical navigation
  | 'roving'      // Single tab stop
  | 'custom';     // Custom pattern
```

### 2. Grid Navigation Pattern

For data tables and grid layouts:

```typescript
class GridNavigationPattern {
  private grid: HTMLElement;
  private cells: HTMLElement[][];
  private currentPosition: { row: number; col: number };
  
  navigate(direction: ArrowDirection): void {
    const { row, col } = this.currentPosition;
    
    switch (direction) {
      case 'up':
        this.moveTo(row - 1, col);
        break;
      case 'down':
        this.moveTo(row + 1, col);
        break;
      case 'left':
        this.moveTo(row, col - 1);
        break;
      case 'right':
        this.moveTo(row, col + 1);
        break;
    }
  }
  
  private moveTo(row: number, col: number): void {
    // Boundary checking
    const maxRow = this.cells.length - 1;
    const maxCol = this.cells[0].length - 1;
    
    row = Math.max(0, Math.min(row, maxRow));
    col = Math.max(0, Math.min(col, maxCol));
    
    // Update position and focus
    this.currentPosition = { row, col };
    this.cells[row][col].focus();
    
    // Update ARIA attributes
    this.updateAriaAttributes();
  }
}
```

### 3. Roving Tab Index Pattern

For toolbars and menu bars:

```typescript
class RovingTabIndex {
  private container: HTMLElement;
  private items: HTMLElement[];
  private currentIndex: number = 0;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.items = this.getItems();
    this.initialize();
  }
  
  private initialize(): void {
    // Set tabindex on all items
    this.items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    
    // Add event listeners
    this.container.addEventListener('keydown', this.handleKeyDown);
  }
  
  private handleKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusNext();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        event.preventDefault();
        this.focusLast();
        break;
    }
  };
  
  private updateTabIndex(newIndex: number): void {
    // Remove tabindex from current
    this.items[this.currentIndex].setAttribute('tabindex', '-1');
    
    // Set tabindex on new
    this.currentIndex = newIndex;
    this.items[this.currentIndex].setAttribute('tabindex', '0');
    this.items[this.currentIndex].focus();
  }
}
```

## Focus Trap Implementation

### Modal Focus Trap

```typescript
class ModalFocusTrap {
  private modal: HTMLElement;
  private focusableElements: HTMLElement[];
  private firstElement: HTMLElement;
  private lastElement: HTMLElement;
  private previouslyFocused: HTMLElement;
  
  activate(): void {
    // Store current focus
    this.previouslyFocused = document.activeElement as HTMLElement;
    
    // Get focusable elements
    this.updateFocusableElements();
    
    // Focus first element
    this.firstElement?.focus();
    
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    this.modal.addEventListener('keydown', this.handleTabKey);
  }
  
  private handleTabKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === this.firstElement) {
        event.preventDefault();
        this.lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === this.lastElement) {
        event.preventDefault();
        this.firstElement?.focus();
      }
    }
  };
  
  deactivate(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    this.modal.removeEventListener('keydown', this.handleTabKey);
    
    // Restore focus
    this.previouslyFocused?.focus();
  }
}
```

## Skip Links Implementation

```typescript
interface SkipLink {
  id: string;
  target: string;
  label: string;
  shortcut?: string;
}

class SkipLinkManager {
  private links: SkipLink[] = [
    { id: 'skip-nav', target: '#main-navigation', label: 'Skip to navigation' },
    { id: 'skip-main', target: '#main-content', label: 'Skip to main content' },
    { id: 'skip-footer', target: '#footer', label: 'Skip to footer' },
  ];
  
  render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'skip-links';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Skip links');
    
    this.links.forEach(link => {
      const anchor = document.createElement('a');
      anchor.href = link.target;
      anchor.className = 'skip-link';
      anchor.textContent = link.label;
      
      if (link.shortcut) {
        anchor.setAttribute('data-shortcut', link.shortcut);
      }
      
      // Focus handling
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.target);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.scrollIntoView();
        }
      });
      
      container.appendChild(anchor);
    });
    
    return container;
  }
}
```

## Component-Specific Patterns

### Data Table Navigation

```typescript
class DataTableKeyboardHandler {
  private table: HTMLTableElement;
  private currentCell: HTMLTableCellElement | null = null;
  
  initialize(): void {
    this.table.setAttribute('role', 'grid');
    this.setupCellNavigation();
    this.setupActionHandlers();
  }
  
  private setupCellNavigation(): void {
    const cells = this.table.querySelectorAll('td, th');
    
    cells.forEach(cell => {
      cell.setAttribute('tabindex', '-1');
      cell.addEventListener('keydown', this.handleCellKeydown);
    });
    
    // Make first cell focusable
    if (cells.length > 0) {
      cells[0].setAttribute('tabindex', '0');
    }
  }
  
  private handleCellKeydown = (event: KeyboardEvent): void => {
    const cell = event.target as HTMLTableCellElement;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        this.activateCell(cell);
        break;
      case 'ArrowUp':
        this.navigateVertical(cell, -1);
        break;
      case 'ArrowDown':
        this.navigateVertical(cell, 1);
        break;
      case 'ArrowLeft':
        this.navigateHorizontal(cell, -1);
        break;
      case 'ArrowRight':
        this.navigateHorizontal(cell, 1);
        break;
      case 'Home':
        if (event.ctrlKey) {
          this.focusFirstCell();
        } else {
          this.focusFirstCellInRow(cell);
        }
        break;
      case 'End':
        if (event.ctrlKey) {
          this.focusLastCell();
        } else {
          this.focusLastCellInRow(cell);
        }
        break;
    }
  };
}
```

### Dropdown Navigation

```typescript
class DropdownKeyboardHandler {
  private trigger: HTMLElement;
  private menu: HTMLElement;
  private items: HTMLElement[];
  private isOpen: boolean = false;
  private currentIndex: number = -1;
  
  handleTriggerKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        this.open();
        this.focusFirst();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open();
        this.focusLast();
        break;
    }
  };
  
  handleMenuKeydown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'Escape':
        this.close();
        this.trigger.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        event.preventDefault();
        this.focusLast();
        break;
      case 'Tab':
        // Allow tab to close dropdown
        this.close();
        break;
    }
  };
}
```

## Keyboard Event Flow

```
User Presses Key
       ↓
KeyboardEventBus
       ↓
┌──────┴──────┐
│ Global      │ → Global shortcuts (if matched)
│ Handler     │
└──────┬──────┘
       ↓ (if not handled)
┌──────┴──────┐
│ Page        │ → Page-specific shortcuts
│ Handler     │
└──────┬──────┘
       ↓ (if not handled)
┌──────┴──────┐
│ Component   │ → Component shortcuts
│ Handler     │
└──────┬──────┘
       ↓ (if not handled)
┌──────┴──────┐
│ Navigation  │ → Standard navigation
│ Handler     │
└─────────────┘
```

## Platform Considerations

### Windows/Linux
- Standard keyboard shortcuts
- Alt key for menu access
- F6 to cycle between panes

### macOS
- Cmd instead of Ctrl
- Option instead of Alt
- VoiceOver considerations

### Mobile/Touch Keyboards
- Virtual keyboard support
- Touch-friendly targets
- Gesture alternatives

## Testing Strategy

### Unit Tests
```typescript
describe('KeyboardNavigation', () => {
  test('Tab cycles through focusable elements', () => {
    const { container } = render(<NavigableForm />);
    const inputs = container.querySelectorAll('input');
    
    inputs[0].focus();
    fireEvent.keyDown(document.activeElement, { key: 'Tab' });
    expect(document.activeElement).toBe(inputs[1]);
  });
  
  test('Escape closes modal and returns focus', () => {
    const { getByRole, getByText } = render(<ModalExample />);
    const trigger = getByText('Open Modal');
    
    trigger.click();
    const modal = getByRole('dialog');
    expect(modal).toBeInTheDocument();
    
    fireEvent.keyDown(modal, { key: 'Escape' });
    expect(modal).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
```

### Manual Testing
1. Unplug mouse
2. Navigate entire application
3. Test all interactive elements
4. Verify focus indicators
5. Test with screen reader

## Performance Optimizations

### Lazy Registration
```typescript
class LazyShortcutRegistry {
  private shortcuts: Map<string, () => KeyboardShortcut> = new Map();
  private loaded: Map<string, KeyboardShortcut> = new Map();
  
  register(id: string, loader: () => KeyboardShortcut): void {
    this.shortcuts.set(id, loader);
  }
  
  private load(id: string): KeyboardShortcut | null {
    if (this.loaded.has(id)) {
      return this.loaded.get(id)!;
    }
    
    const loader = this.shortcuts.get(id);
    if (!loader) return null;
    
    const shortcut = loader();
    this.loaded.set(id, shortcut);
    return shortcut;
  }
}
```

### Debounced Focus Calculation
```typescript
class FocusCalculator {
  private cache: WeakMap<HTMLElement, HTMLElement[]> = new WeakMap();
  private calculateDebounced = debounce(this.calculate.bind(this), 100);
  
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    if (this.cache.has(container)) {
      return this.cache.get(container)!;
    }
    
    return this.calculateDebounced(container);
  }
}
```

## Implementation Checklist

- [ ] Global shortcut manager
- [ ] Focus trap utility
- [ ] Skip links component
- [ ] Roving tab index
- [ ] Grid navigation
- [ ] Tree navigation
- [ ] Modal focus management
- [ ] Dropdown keyboard handler
- [ ] Platform detection
- [ ] Shortcut conflict detection
- [ ] Help dialog
- [ ] Testing utilities
- [ ] Documentation
- [ ] Performance monitoring