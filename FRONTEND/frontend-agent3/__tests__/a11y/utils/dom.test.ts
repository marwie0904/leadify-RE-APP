import {
  getFocusableElements,
  isElementVisible,
  isElementFocusable,
  getFirstFocusableElement,
  getLastFocusableElement,
  getNextFocusableElement,
  getPreviousFocusableElement,
  isTabbable,
  sortByTabIndex,
} from '@/lib/a11y/utils/dom';

describe('DOM Utilities', () => {
  // Helper to create DOM structure
  function createTestDOM() {
    document.body.innerHTML = `
      <div id="container">
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <a id="link1" href="#">Link 1</a>
        <div id="div1" tabindex="0">Focusable Div</div>
        <select id="select1">
          <option>Option 1</option>
        </select>
        <textarea id="textarea1"></textarea>
        <button id="btn2" disabled>Disabled Button</button>
        <input id="input2" type="hidden" />
        <a id="link2">Link without href</a>
        <div id="div2" tabindex="-1">Non-tabbable Div</div>
        <button id="btn3" style="display: none;">Hidden Button</button>
        <div id="nested">
          <button id="btn4">Nested Button</button>
          <input id="input3" type="text" />
        </div>
        <button id="btn5" tabindex="2">Tab Order 2</button>
        <button id="btn6" tabindex="1">Tab Order 1</button>
        <button id="btn7" tabindex="0">Tab Order 0</button>
      </div>
    `;
  }

  beforeEach(() => {
    createTestDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('getFocusableElements', () => {
    it('should return all focusable elements', () => {
      const container = document.getElementById('container')!;
      const focusable = getFocusableElements(container);

      expect(focusable).toHaveLength(9); // All focusable elements except hidden/disabled
      expect(focusable.map(el => el.id)).toEqual([
        'btn1',
        'input1',
        'link1',
        'div1',
        'select1',
        'textarea1',
        'btn4',
        'input3',
        'btn5',
        'btn6',
        'btn7',
      ]);
    });

    it('should return focusable elements from document.body when no container specified', () => {
      const focusable = getFocusableElements();
      expect(focusable.length).toBeGreaterThan(0);
    });

    it('should exclude disabled elements', () => {
      const focusable = getFocusableElements();
      const ids = focusable.map(el => el.id);
      expect(ids).not.toContain('btn2'); // disabled button
    });

    it('should exclude hidden elements', () => {
      const focusable = getFocusableElements();
      const ids = focusable.map(el => el.id);
      expect(ids).not.toContain('input2'); // hidden input
      expect(ids).not.toContain('btn3'); // display: none button
    });

    it('should exclude links without href', () => {
      const focusable = getFocusableElements();
      const ids = focusable.map(el => el.id);
      expect(ids).not.toContain('link2');
    });
  });

  describe('isElementVisible', () => {
    it('should return true for visible elements', () => {
      const button = document.getElementById('btn1')!;
      expect(isElementVisible(button)).toBe(true);
    });

    it('should return false for display: none elements', () => {
      const button = document.getElementById('btn3')!;
      expect(isElementVisible(button)).toBe(false);
    });

    it('should return false for visibility: hidden elements', () => {
      const button = document.getElementById('btn1')!;
      button.style.visibility = 'hidden';
      expect(isElementVisible(button)).toBe(false);
    });

    it('should return false for zero-sized elements', () => {
      const button = document.getElementById('btn1')!;
      button.style.width = '0';
      button.style.height = '0';
      expect(isElementVisible(button)).toBe(false);
    });

    it('should return false for input[type="hidden"]', () => {
      const input = document.getElementById('input2')!;
      expect(isElementVisible(input)).toBe(false);
    });
  });

  describe('isElementFocusable', () => {
    it('should return true for enabled form elements', () => {
      expect(isElementFocusable(document.getElementById('btn1')!)).toBe(true);
      expect(isElementFocusable(document.getElementById('input1')!)).toBe(true);
      expect(isElementFocusable(document.getElementById('select1')!)).toBe(true);
      expect(isElementFocusable(document.getElementById('textarea1')!)).toBe(true);
    });

    it('should return true for links with href', () => {
      expect(isElementFocusable(document.getElementById('link1')!)).toBe(true);
    });

    it('should return false for links without href', () => {
      expect(isElementFocusable(document.getElementById('link2')!)).toBe(false);
    });

    it('should return true for elements with tabindex >= 0', () => {
      expect(isElementFocusable(document.getElementById('div1')!)).toBe(true);
    });

    it('should return true for elements with tabindex = -1', () => {
      expect(isElementFocusable(document.getElementById('div2')!)).toBe(true);
    });

    it('should return false for disabled elements', () => {
      expect(isElementFocusable(document.getElementById('btn2')!)).toBe(false);
    });

    it('should return false for hidden elements', () => {
      expect(isElementFocusable(document.getElementById('btn3')!)).toBe(false);
    });
  });

  describe('isTabbable', () => {
    it('should return true for elements with tabindex >= 0', () => {
      expect(isTabbable(document.getElementById('btn1')!)).toBe(true);
      expect(isTabbable(document.getElementById('div1')!)).toBe(true);
    });

    it('should return false for elements with tabindex = -1', () => {
      expect(isTabbable(document.getElementById('div2')!)).toBe(false);
    });

    it('should return false for disabled elements', () => {
      expect(isTabbable(document.getElementById('btn2')!)).toBe(false);
    });
  });

  describe('getFirstFocusableElement', () => {
    it('should return the first focusable element', () => {
      const container = document.getElementById('container')!;
      const first = getFirstFocusableElement(container);
      expect(first?.id).toBe('btn1');
    });

    it('should return null if no focusable elements', () => {
      const container = document.createElement('div');
      const first = getFirstFocusableElement(container);
      expect(first).toBeNull();
    });
  });

  describe('getLastFocusableElement', () => {
    it('should return the last focusable element', () => {
      const container = document.getElementById('container')!;
      const last = getLastFocusableElement(container);
      expect(last?.id).toBe('btn7');
    });

    it('should return null if no focusable elements', () => {
      const container = document.createElement('div');
      const last = getLastFocusableElement(container);
      expect(last).toBeNull();
    });
  });

  describe('getNextFocusableElement', () => {
    it('should return the next focusable element', () => {
      const current = document.getElementById('btn1')!;
      const next = getNextFocusableElement(current);
      expect(next?.id).toBe('input1');
    });

    it('should return null if no next focusable element', () => {
      const current = document.getElementById('btn7')!;
      const next = getNextFocusableElement(current);
      expect(next).toBeNull();
    });

    it('should skip non-focusable elements', () => {
      const current = document.getElementById('textarea1')!;
      const next = getNextFocusableElement(current);
      expect(next?.id).toBe('btn4'); // Skips disabled button and other non-focusable
    });
  });

  describe('getPreviousFocusableElement', () => {
    it('should return the previous focusable element', () => {
      const current = document.getElementById('input1')!;
      const previous = getPreviousFocusableElement(current);
      expect(previous?.id).toBe('btn1');
    });

    it('should return null if no previous focusable element', () => {
      const current = document.getElementById('btn1')!;
      const previous = getPreviousFocusableElement(current);
      expect(previous).toBeNull();
    });
  });

  describe('sortByTabIndex', () => {
    it('should sort elements by tabindex', () => {
      const elements = [
        document.getElementById('btn5')!, // tabindex="2"
        document.getElementById('btn6')!, // tabindex="1"
        document.getElementById('btn7')!, // tabindex="0"
        document.getElementById('btn1')!, // no tabindex (implicit 0)
      ];

      const sorted = sortByTabIndex(elements);
      
      expect(sorted[0].id).toBe('btn6'); // tabindex="1"
      expect(sorted[1].id).toBe('btn5'); // tabindex="2"
      expect(sorted[2].id).toBe('btn7'); // tabindex="0"
      expect(sorted[3].id).toBe('btn1'); // implicit 0
    });

    it('should maintain document order for same tabindex', () => {
      const elements = [
        document.getElementById('input1')!,
        document.getElementById('btn1')!,
        document.getElementById('link1')!,
      ];

      const sorted = sortByTabIndex(elements);
      
      // All have implicit tabindex="0", should maintain order
      expect(sorted[0].id).toBe('btn1');
      expect(sorted[1].id).toBe('input1');
      expect(sorted[2].id).toBe('link1');
    });
  });
});