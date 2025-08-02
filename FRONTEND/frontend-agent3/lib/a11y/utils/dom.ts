/**
 * DOM utility functions for accessibility
 */

// Selectors for focusable elements
export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Selectors for tabbable elements (can be reached via Tab key)
export const TABBABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
  );

  return elements.filter(element => {
    // Filter out invisible elements
    if (!isElementVisible(element)) {
      return false;
    }

    // Check if element is actually focusable
    return isElementFocusable(element);
  });
}

/**
 * Check if an element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  // Check for hidden input
  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return false;
  }

  // Check computed styles
  const style = window.getComputedStyle(element);
  
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  // Check dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * Check if an element is focusable
 */
export function isElementFocusable(element: HTMLElement): boolean {
  // Check if element is disabled
  if (
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  ) {
    return false;
  }

  // Check if element is visible
  if (!isElementVisible(element)) {
    return false;
  }

  // Check specific element types
  if (element instanceof HTMLAnchorElement) {
    return element.hasAttribute('href');
  }

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return !element.disabled;
  }

  // Check for tabindex
  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null) {
    return true;
  }

  // Check for contenteditable
  if (element.hasAttribute('contenteditable')) {
    return true;
  }

  return false;
}

/**
 * Check if an element is tabbable (can be reached via Tab key)
 */
export function isTabbable(element: HTMLElement): boolean {
  if (!isElementFocusable(element)) {
    return false;
  }

  const tabindex = element.getAttribute('tabindex');
  if (tabindex === '-1') {
    return false;
  }

  return true;
}

/**
 * Get the first focusable element within a container
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[0] || null;
}

/**
 * Get the last focusable element within a container
 */
export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusable = getFocusableElements(container);
  return focusable[focusable.length - 1] || null;
}

/**
 * Get the next focusable element after the current element
 */
export function getNextFocusableElement(
  current: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(current);

  if (currentIndex === -1 || currentIndex === focusable.length - 1) {
    return null;
  }

  return focusable[currentIndex + 1];
}

/**
 * Get the previous focusable element before the current element
 */
export function getPreviousFocusableElement(
  current: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(current);

  if (currentIndex <= 0) {
    return null;
  }

  return focusable[currentIndex - 1];
}

/**
 * Sort elements by their tab index
 */
export function sortByTabIndex(elements: HTMLElement[]): HTMLElement[] {
  return [...elements].sort((a, b) => {
    const aTabIndex = getTabIndex(a);
    const bTabIndex = getTabIndex(b);

    // Elements with positive tabindex come first, sorted ascending
    if (aTabIndex > 0 && bTabIndex > 0) {
      return aTabIndex - bTabIndex;
    }

    // Element with positive tabindex comes before element with 0 or no tabindex
    if (aTabIndex > 0) {
      return -1;
    }
    if (bTabIndex > 0) {
      return 1;
    }

    // Both have tabindex 0 or no tabindex, maintain document order
    return elements.indexOf(a) - elements.indexOf(b);
  });
}

/**
 * Get the tab index of an element
 */
function getTabIndex(element: HTMLElement): number {
  const tabindex = element.getAttribute('tabindex');
  return tabindex ? parseInt(tabindex, 10) : 0;
}

/**
 * Trap focus within a container
 */
export class FocusTrapManager {
  private container: HTMLElement;
  private previousActiveElement: HTMLElement | null = null;
  private handleKeyDown: (event: KeyboardEvent) => void;
  private handleFocusIn: (event: FocusEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        this.handleTab(event);
      }
    };

    this.handleFocusIn = (event: FocusEvent) => {
      if (!this.container.contains(event.target as Node)) {
        this.focusFirstElement();
      }
    };
  }

  activate(): void {
    this.previousActiveElement = document.activeElement as HTMLElement;
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('focusin', this.handleFocusIn);
    this.focusFirstElement();
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('focusin', this.handleFocusIn);
    
    if (this.previousActiveElement && isElementFocusable(this.previousActiveElement)) {
      this.previousActiveElement.focus();
    }
  }

  private handleTab(event: KeyboardEvent): void {
    const focusableElements = getFocusableElements(this.container);
    
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  private focusFirstElement(): void {
    const firstElement = getFirstFocusableElement(this.container);
    if (firstElement) {
      firstElement.focus();
    }
  }
}

/**
 * Get text alternative for an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labels = labelledBy.split(' ').map(id => {
      const label = document.getElementById(id);
      return label ? label.textContent || '' : '';
    });
    return labels.join(' ').trim();
  }

  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check for associated label
  if (element instanceof HTMLInputElement || 
      element instanceof HTMLSelectElement || 
      element instanceof HTMLTextAreaElement) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent || '';
      }
    }
  }

  // Check if element is inside a label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent || '';
  }

  // Fall back to text content for buttons and links
  if (element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) {
    return element.textContent || '';
  }

  // Check for title attribute
  const title = element.getAttribute('title');
  if (title) {
    return title;
  }

  return '';
}

/**
 * Check if element has accessible name
 */
export function hasAccessibleName(element: HTMLElement): boolean {
  return getAccessibleName(element).length > 0;
}