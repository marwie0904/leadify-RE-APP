import {
  FocusTrapOptions,
  AccessibilityError,
  AccessibilityErrorCode,
} from '../core/types';
import { getFocusableElements, isElementFocusable } from '../utils/dom';

export class FocusTrap {
  private container: HTMLElement;
  private options: FocusTrapOptions;
  private active = false;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleMouseDown: (event: MouseEvent) => void;
  private hiddenElements: Map<HTMLElement, string | null> = new Map();

  constructor(container: HTMLElement, options: FocusTrapOptions = {}) {
    if (!container) {
      throw new AccessibilityError(
        'Container element is required',
        AccessibilityErrorCode.INVALID_ELEMENT
      );
    }

    this.container = container;
    this.options = {
      initialFocus: options.initialFocus,
      fallbackFocus: options.fallbackFocus,
      returnFocus: options.returnFocus,
      escapeDeactivates: options.escapeDeactivates !== false,
      clickOutsideDeactivates: options.clickOutsideDeactivates !== false,
      hideExternalContent: options.hideExternalContent || false,
      onActivate: options.onActivate,
      onDeactivate: options.onDeactivate,
      onEscape: options.onEscape,
      onClickOutside: options.onClickOutside,
    };

    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    
    this.refresh();
  }

  activate(): void {
    if (this.active) return;

    this.active = true;
    this.previouslyFocusedElement = document.activeElement as HTMLElement;

    // Hide external content if requested
    if (this.options.hideExternalContent) {
      this.hideExternalContent();
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('mousedown', this.handleMouseDown);

    // Set initial focus
    this.setInitialFocus();

    // Call activation callback
    if (this.options.onActivate) {
      this.options.onActivate();
    }
  }

  deactivate(): void {
    if (!this.active) return;

    this.active = false;

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleMouseDown);

    // Restore external content visibility
    if (this.options.hideExternalContent) {
      this.restoreExternalContent();
    }

    // Restore focus
    this.restoreFocus();

    // Call deactivation callback
    if (this.options.onDeactivate) {
      this.options.onDeactivate();
    }
  }

  refresh(): void {
    const previousElements = this.focusableElements;
    this.focusableElements = getFocusableElements(this.container);
    
    // If active, check if we need to refocus
    if (this.active) {
      const currentFocused = document.activeElement as HTMLElement;
      const isCurrentFocusedInTrap = this.focusableElements.includes(currentFocused);
      
      // If current focus is not in the trap (including if it's body/null after element removal)
      // or if the previously focused element was removed
      const needsRefocus = !isCurrentFocusedInTrap || 
                          currentFocused === document.body ||
                          !document.contains(currentFocused);
      
      if (needsRefocus) {
        // Focus the first available element
        const firstElement = this.getFirstFocusableElement();
        if (firstElement) {
          firstElement.focus();
        }
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getFocusableElements(): HTMLElement[] {
    return [...this.focusableElements];
  }

  getFirstFocusableElement(): HTMLElement | null {
    return this.focusableElements[0] || null;
  }

  getLastFocusableElement(): HTMLElement | null {
    return this.focusableElements[this.focusableElements.length - 1] || null;
  }

  getPreviouslyFocusedElement(): HTMLElement | null {
    return this.previouslyFocusedElement;
  }

  focusFirstElement(): void {
    const firstElement = this.getFirstFocusableElement();
    if (firstElement) {
      firstElement.focus();
    }
  }

  focusLastElement(): void {
    const lastElement = this.getLastFocusableElement();
    if (lastElement) {
      lastElement.focus();
    }
  }

  private setInitialFocus(): void {
    let elementToFocus: HTMLElement | null = null;

    // Try initial focus selector
    if (this.options.initialFocus) {
      if (typeof this.options.initialFocus === 'string') {
        elementToFocus = this.container.querySelector(this.options.initialFocus);
      } else {
        elementToFocus = this.options.initialFocus;
      }
    }

    // Fallback to first focusable element
    if (!elementToFocus || !isElementFocusable(elementToFocus)) {
      elementToFocus = this.getFirstFocusableElement();
    }

    // Fallback focus if specified
    if (!elementToFocus && this.options.fallbackFocus) {
      if (typeof this.options.fallbackFocus === 'string') {
        elementToFocus = this.container.querySelector(this.options.fallbackFocus);
      } else {
        elementToFocus = this.options.fallbackFocus;
      }
    }

    if (elementToFocus) {
      elementToFocus.focus();
    }
  }

  private restoreFocus(): void {
    let elementToFocus: HTMLElement | null = null;

    // Try return focus option
    if (this.options.returnFocus) {
      if (typeof this.options.returnFocus === 'string') {
        elementToFocus = document.querySelector(this.options.returnFocus);
      } else {
        elementToFocus = this.options.returnFocus;
      }
    }

    // Fallback to previously focused element
    if (!elementToFocus) {
      elementToFocus = this.previouslyFocusedElement;
    }

    if (elementToFocus && isElementFocusable(elementToFocus)) {
      elementToFocus.focus();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.active) return;

    switch (event.key) {
      case 'Tab':
        this.handleTab(event);
        break;
      case 'Escape':
        if (this.options.escapeDeactivates) {
          event.preventDefault();
          if (this.options.onEscape) {
            this.options.onEscape(event);
          }
          this.deactivate();
        }
        break;
    }
  }

  private handleTab(event: KeyboardEvent): void {
    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (this.focusableElements.length === 1) {
      event.preventDefault();
      this.focusableElements[0].focus();
      return;
    }

    const currentElement = document.activeElement as HTMLElement;
    const currentIndex = this.focusableElements.indexOf(currentElement);

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (currentIndex <= 0) {
        event.preventDefault();
        this.focusLastElement();
      }
    } else {
      // Tab (forward)
      if (currentIndex >= this.focusableElements.length - 1) {
        event.preventDefault();
        this.focusFirstElement();
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.active || !this.options.clickOutsideDeactivates) return;

    const target = event.target as HTMLElement;
    
    // Check if click is outside the container
    if (!this.container.contains(target)) {
      if (this.options.onClickOutside) {
        this.options.onClickOutside(event);
      }
      this.deactivate();
    }
  }

  private hideExternalContent(): void {
    // Find all elements that are siblings or parents of container
    const elementsToHide = this.getExternalElements();
    
    for (const element of elementsToHide) {
      const currentAriaHidden = element.getAttribute('aria-hidden');
      this.hiddenElements.set(element, currentAriaHidden);
      element.setAttribute('aria-hidden', 'true');
    }
  }

  private restoreExternalContent(): void {
    for (const [element, originalValue] of this.hiddenElements) {
      if (originalValue === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', originalValue);
      }
    }
    this.hiddenElements.clear();
  }

  private getExternalElements(): HTMLElement[] {
    const external: HTMLElement[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as HTMLElement;
          
          // Skip if it's the container or inside the container
          if (element === this.container || this.container.contains(element)) {
            return NodeFilter.FILTER_SKIP;
          }
          
          // Skip if it's inside another hidden element
          if (element.closest('[aria-hidden="true"]')) {
            return NodeFilter.FILTER_SKIP;
          }
          
          // Only include direct children of body or elements not containing the container
          if (element.parentElement === document.body || 
              !element.contains(this.container)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      external.push(node as HTMLElement);
    }

    return external;
  }

  destroy(): void {
    if (this.active) {
      this.deactivate();
    }
    
    // Clean up any remaining state
    this.focusableElements = [];
    this.previouslyFocusedElement = null;
    this.hiddenElements.clear();
  }
}

// Utility function to create a focus trap
export function createFocusTrap(
  container: HTMLElement, 
  options?: FocusTrapOptions
): FocusTrap {
  return new FocusTrap(container, options);
}