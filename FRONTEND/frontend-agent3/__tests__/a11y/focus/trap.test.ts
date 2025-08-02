import { FocusTrap } from '@/lib/a11y/focus/trap';
import { 
  FocusTrapOptions,
  AccessibilityError,
  AccessibilityErrorCode
} from '@/lib/a11y/core/types';

describe('FocusTrap', () => {
  let container: HTMLElement;
  let focusTrap: FocusTrap;

  const createFocusableElements = () => {
    container.innerHTML = `
      <button id="before-trap">Before Trap</button>
      <div id="trap-container">
        <button id="first-focusable">First</button>
        <input id="input" type="text" />
        <a id="link" href="#">Link</a>
        <select id="select">
          <option>Option</option>
        </select>
        <textarea id="textarea"></textarea>
        <div id="custom-focusable" tabindex="0">Custom Focusable</div>
        <button id="last-focusable">Last</button>
      </div>
      <button id="after-trap">After Trap</button>
    `;
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    createFocusableElements();
  });

  afterEach(() => {
    if (focusTrap) {
      focusTrap.destroy();
    }
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should create focus trap with container element', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      
      expect(focusTrap).toBeDefined();
      expect(focusTrap.isActive()).toBe(false);
    });

    it('should throw error for invalid container', () => {
      expect(() => {
        new FocusTrap(null as any);
      }).toThrow('Container element is required');
    });

    it('should accept options', () => {
      const trapContainer = document.getElementById('trap-container')!;
      const options: FocusTrapOptions = {
        initialFocus: '#input',
        fallbackFocus: '#first-focusable',
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
      };
      
      focusTrap = new FocusTrap(trapContainer, options);
      expect(focusTrap).toBeDefined();
    });
  });

  describe('Activation', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
    });

    it('should activate focus trap', () => {
      focusTrap.activate();
      expect(focusTrap.isActive()).toBe(true);
    });

    it('should focus first focusable element by default', () => {
      focusTrap.activate();
      expect(document.activeElement?.id).toBe('first-focusable');
    });

    it('should focus initial focus element when specified', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, {
        initialFocus: '#input'
      });
      
      focusTrap.activate();
      expect(document.activeElement?.id).toBe('input');
    });

    it('should store previously focused element', () => {
      const beforeButton = document.getElementById('before-trap')!;
      beforeButton.focus();
      
      focusTrap.activate();
      expect(focusTrap.getPreviouslyFocusedElement()).toBe(beforeButton);
    });

    it('should not activate if already active', () => {
      focusTrap.activate();
      const firstCall = focusTrap.isActive();
      
      focusTrap.activate();
      expect(focusTrap.isActive()).toBe(firstCall);
    });

    it('should handle activation when no focusable elements exist', () => {
      container.innerHTML = '<div id="empty-trap"></div>';
      const emptyTrap = document.getElementById('empty-trap')!;
      
      const emptyFocusTrap = new FocusTrap(emptyTrap);
      expect(() => emptyFocusTrap.activate()).not.toThrow();
      
      emptyFocusTrap.destroy();
    });
  });

  describe('Deactivation', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
    });

    it('should deactivate focus trap', () => {
      focusTrap.activate();
      focusTrap.deactivate();
      expect(focusTrap.isActive()).toBe(false);
    });

    it('should restore focus to previously focused element', () => {
      const beforeButton = document.getElementById('before-trap')!;
      beforeButton.focus();
      
      focusTrap.activate();
      focusTrap.deactivate();
      
      expect(document.activeElement).toBe(beforeButton);
    });

    it('should not throw error when deactivating inactive trap', () => {
      expect(() => focusTrap.deactivate()).not.toThrow();
    });

    it('should handle fallback focus on deactivation', () => {
      const fallbackButton = document.getElementById('after-trap')!;
      
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, {
        returnFocus: fallbackButton
      });
      
      focusTrap.activate();
      focusTrap.deactivate();
      
      expect(document.activeElement).toBe(fallbackButton);
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
    });

    it('should trap forward tab navigation', () => {
      // Focus last element
      const lastFocusable = document.getElementById('last-focusable')!;
      lastFocusable.focus();
      
      // Simulate Tab key
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Should wrap to first focusable element
      expect(document.activeElement?.id).toBe('first-focusable');
    });

    it('should trap backward tab navigation', () => {
      // Focus first element
      const firstFocusable = document.getElementById('first-focusable')!;
      firstFocusable.focus();
      
      // Simulate Shift+Tab
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(shiftTabEvent);
      
      // Should wrap to last focusable element
      expect(document.activeElement?.id).toBe('last-focusable');
    });

    it('should handle tab when only one focusable element', () => {
      container.innerHTML = `
        <div id="single-trap">
          <button id="only-button">Only Button</button>
        </div>
      `;
      
      const singleTrap = document.getElementById('single-trap')!;
      const singleFocusTrap = new FocusTrap(singleTrap);
      singleFocusTrap.activate();
      
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(tabEvent);
      
      // Should stay on the same element
      expect(document.activeElement?.id).toBe('only-button');
      
      singleFocusTrap.destroy();
    });
  });

  describe('Escape Key Handling', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
    });

    it('should deactivate on escape key by default', () => {
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(escapeEvent);
      expect(focusTrap.isActive()).toBe(false);
    });

    it('should not deactivate on escape when disabled', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, {
        escapeDeactivates: false
      });
      focusTrap.activate();
      
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(escapeEvent);
      expect(focusTrap.isActive()).toBe(true);
    });

    it('should call onEscape callback', () => {
      const onEscape = jest.fn();
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, { onEscape });
      focusTrap.activate();
      
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(escapeEvent);
      expect(onEscape).toHaveBeenCalledWith(escapeEvent);
    });
  });

  describe('Click Outside Handling', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
    });

    it('should deactivate on click outside by default', () => {
      const outsideButton = document.getElementById('before-trap')!;
      
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: outsideButton,
        enumerable: true
      });
      
      document.dispatchEvent(clickEvent);
      expect(focusTrap.isActive()).toBe(false);
    });

    it('should not deactivate on click outside when disabled', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, {
        clickOutsideDeactivates: false
      });
      focusTrap.activate();
      
      const outsideButton = document.getElementById('before-trap')!;
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: outsideButton,
        enumerable: true
      });
      
      document.dispatchEvent(clickEvent);
      expect(focusTrap.isActive()).toBe(true);
    });

    it('should not deactivate on click inside trap', () => {
      const insideButton = document.getElementById('first-focusable')!;
      
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: insideButton,
        enumerable: true
      });
      
      document.dispatchEvent(clickEvent);
      expect(focusTrap.isActive()).toBe(true);
    });

    it('should call onClickOutside callback', () => {
      const onClickOutside = jest.fn();
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap.destroy();
      focusTrap = new FocusTrap(trapContainer, { onClickOutside });
      focusTrap.activate();
      
      const outsideButton = document.getElementById('before-trap')!;
      const clickEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true
      });
      
      Object.defineProperty(clickEvent, 'target', {
        value: outsideButton,
        enumerable: true
      });
      
      document.dispatchEvent(clickEvent);
      expect(onClickOutside).toHaveBeenCalledWith(clickEvent);
    });
  });

  describe('Focus Management', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
    });

    it('should get all focusable elements', () => {
      const focusableElements = focusTrap.getFocusableElements();
      expect(focusableElements).toHaveLength(7); // All focusable elements in trap
      expect(focusableElements[0].id).toBe('first-focusable');
      expect(focusableElements[focusableElements.length - 1].id).toBe('last-focusable');
    });

    it('should get first focusable element', () => {
      const firstElement = focusTrap.getFirstFocusableElement();
      expect(firstElement?.id).toBe('first-focusable');
    });

    it('should get last focusable element', () => {
      const lastElement = focusTrap.getLastFocusableElement();
      expect(lastElement?.id).toBe('last-focusable');
    });

    it('should focus first element', () => {
      focusTrap.focusFirstElement();
      expect(document.activeElement?.id).toBe('first-focusable');
    });

    it('should focus last element', () => {
      focusTrap.focusLastElement();
      expect(document.activeElement?.id).toBe('last-focusable');
    });

    it('should handle empty container gracefully', () => {
      container.innerHTML = '<div id="empty-trap"></div>';
      const emptyTrap = document.getElementById('empty-trap')!;
      const emptyFocusTrap = new FocusTrap(emptyTrap);
      
      expect(emptyFocusTrap.getFocusableElements()).toHaveLength(0);
      expect(emptyFocusTrap.getFirstFocusableElement()).toBeNull();
      expect(emptyFocusTrap.getLastFocusableElement()).toBeNull();
      
      expect(() => emptyFocusTrap.focusFirstElement()).not.toThrow();
      expect(() => emptyFocusTrap.focusLastElement()).not.toThrow();
      
      emptyFocusTrap.destroy();
    });
  });

  describe('Dynamic Content', () => {
    beforeEach(() => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
    });

    it('should refresh focusable elements when content changes', () => {
      const initialCount = focusTrap.getFocusableElements().length;
      
      // Add new focusable element
      const newButton = document.createElement('button');
      newButton.id = 'dynamic-button';
      newButton.textContent = 'Dynamic Button';
      document.getElementById('trap-container')!.appendChild(newButton);
      
      focusTrap.refresh();
      
      const updatedCount = focusTrap.getFocusableElements().length;
      expect(updatedCount).toBe(initialCount + 1);
    });

    it('should handle removal of currently focused element', async () => {
      const inputElement = document.getElementById('input')!;
      inputElement.focus();
      
      // Verify the element is focused
      expect(document.activeElement).toBe(inputElement);
      
      // Remove the focused element
      inputElement.remove();
      focusTrap.refresh();
      
      // Wait for focus to be applied
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should focus the first available element  
      expect(document.activeElement?.id).toBe('first-focusable');
    });
  });

  describe('Lifecycle Management', () => {
    it('should cleanup event listeners on destroy', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
      
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      focusTrap.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(focusTrap.isActive()).toBe(false);
    });

    it('should handle multiple destroy calls safely', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
      
      expect(() => {
        focusTrap.destroy();
        focusTrap.destroy();
      }).not.toThrow();
    });
  });

  describe('Accessibility Features', () => {
    it('should set aria-hidden on external content when active', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer, {
        hideExternalContent: true
      });
      
      const beforeButton = document.getElementById('before-trap')!;
      const afterButton = document.getElementById('after-trap')!;
      
      focusTrap.activate();
      
      expect(beforeButton.getAttribute('aria-hidden')).toBe('true');
      expect(afterButton.getAttribute('aria-hidden')).toBe('true');
    });

    it('should restore aria-hidden on deactivation', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer, {
        hideExternalContent: true
      });
      
      const beforeButton = document.getElementById('before-trap')!;
      const afterButton = document.getElementById('after-trap')!;
      
      // Set initial aria-hidden values
      beforeButton.setAttribute('aria-hidden', 'false');
      afterButton.removeAttribute('aria-hidden');
      
      focusTrap.activate();
      focusTrap.deactivate();
      
      expect(beforeButton.getAttribute('aria-hidden')).toBe('false');
      expect(afterButton.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle container removal gracefully', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer);
      focusTrap.activate();
      
      // Remove container from DOM
      trapContainer.remove();
      
      expect(() => {
        focusTrap.refresh();
        focusTrap.deactivate();
      }).not.toThrow();
    });

    it('should handle focus on removed element', () => {
      const trapContainer = document.getElementById('trap-container')!;
      focusTrap = new FocusTrap(trapContainer, {
        initialFocus: '#input'
      });
      
      // Remove the initial focus element before activation
      document.getElementById('input')!.remove();
      
      expect(() => focusTrap.activate()).not.toThrow();
      expect(document.activeElement?.id).toBe('first-focusable');
    });
  });
});