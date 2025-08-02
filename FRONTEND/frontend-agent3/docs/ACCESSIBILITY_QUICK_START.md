# Accessibility Quick Start Guide

## For Developers

### Initial Setup

1. **Switch to the accessibility branch:**
```bash
git checkout feature/accessibility-improvements
```

2. **Install dependencies:**
```bash
npm install
```

3. **Enable accessibility development tools:**
```bash
# Install browser extensions
- Axe DevTools
- WAVE
- Lighthouse

# Configure VS Code
- Install "axe Accessibility Linter" extension
- Enable ESLint jsx-a11y rules
```

### Basic Implementation Checklist

#### For Every Component:
- [ ] Keyboard accessible (can tab to it)
- [ ] Has visible focus indicator
- [ ] Proper ARIA labels/roles
- [ ] Sufficient color contrast
- [ ] Works with screen reader

#### Quick Wins:
```tsx
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good
<button onClick={handleClick}>Click me</button>

// ❌ Bad
<img src="chart.png" />

// ✅ Good
<img src="chart.png" alt="Revenue chart showing 25% growth" />

// ❌ Bad
<input type="text" />

// ✅ Good
<label>
  Email Address
  <input type="email" required aria-describedby="email-error" />
</label>
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Using the Accessibility System

#### 1. Wrap your app:
```tsx
import { AccessibilityProvider } from '@/lib/a11y/core/provider';

function App() {
  return (
    <AccessibilityProvider>
      <YourApp />
    </AccessibilityProvider>
  );
}
```

#### 2. Use keyboard shortcuts:
```tsx
import { useKeyboardShortcut } from '@/lib/a11y/hooks/useKeyboardShortcut';

function MyComponent() {
  useKeyboardShortcut('ctrl+s', () => {
    saveData();
  }, { description: 'Save data' });
}
```

#### 3. Make announcements:
```tsx
import { useAnnounce } from '@/lib/a11y/hooks/useAnnounce';

function StatusUpdate() {
  const announce = useAnnounce();
  
  const handleUpdate = () => {
    updateData();
    announce('Data updated successfully');
  };
}
```

#### 4. Use accessible components:
```tsx
import { AccessibleModal } from '@/components/a11y/modal';
import { AccessibleFormField } from '@/components/a11y/form-field';

function MyForm() {
  return (
    <form>
      <AccessibleFormField
        label="Username"
        name="username"
        required
        error={errors.username}
      >
        <input type="text" />
      </AccessibleFormField>
    </form>
  );
}
```

### Testing Your Work

#### Automated Testing:
```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component is accessible', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});
```

#### Manual Testing:
1. **Keyboard Only:**
   - Unplug your mouse
   - Navigate using only Tab, Shift+Tab, Enter, Space, Arrow keys
   - Everything should be reachable and usable

2. **Screen Reader:**
   - Enable VoiceOver (Mac) or NVDA (Windows)
   - Close your eyes
   - Navigate your component
   - Everything should make sense

3. **Color Contrast:**
   - Use Chrome DevTools → Lighthouse → Accessibility
   - All text should pass WCAG AA standards

## Common Patterns

### Skip Links
```tsx
// Add to your main layout
<SkipLinks />
```

### Focus Management
```tsx
// For modals and drawers
import { useFocusTrap } from '@/lib/a11y/hooks/useFocusTrap';

function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, { active: isOpen });
  
  return (
    <div ref={modalRef}>
      {/* Modal content */}
    </div>
  );
}
```

### Loading States
```tsx
// Announce loading states
function DataTable() {
  const announce = useAnnounce();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (loading) {
      announce('Loading data...');
    } else {
      announce('Data loaded');
    }
  }, [loading]);
}
```

### Error Handling
```tsx
// Make errors accessible
function FormField({ error, ...props }) {
  const errorId = `${props.name}-error`;
  
  return (
    <>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="error">
          {error}
        </span>
      )}
    </>
  );
}
```

## Keyboard Shortcuts

### Global Shortcuts
- `Alt + S` - Skip to main content
- `Alt + N` - Focus navigation
- `Alt + /` - Open command palette
- `Esc` - Close/cancel any dialog

### Page-Specific
- `?` - Show keyboard shortcuts
- `/` - Focus search
- `G then H` - Go home
- `G then D` - Go to dashboard

## Resources

### Internal
- [Full Architecture Documentation](./ACCESSIBILITY_ARCHITECTURE.md)
- [API Reference](./ACCESSIBILITY_API_SPEC.md)
- [Implementation Plan](./ACCESSIBILITY_IMPLEMENTATION_PLAN.md)

### External
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)
- [WebAIM Checklists](https://webaim.org/standards/wcag/checklist)

### Tools
- [Axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Contrast Checker](https://www.webaxe.org/color-contrast-tools/)

## Getting Help

### Slack Channels
- #accessibility - General questions
- #wcag-compliance - Compliance specific
- #screen-readers - Screen reader testing

### Key Contacts
- Accessibility Lead: [Name]
- QA Accessibility: [Name]
- External Consultant: [Name]

## Quick Fixes for Common Issues

### "Element not keyboard accessible"
```tsx
// Add tabindex
<div tabindex="0" role="button" onClick={handler}>

// Or better, use semantic HTML
<button onClick={handler}>
```

### "Missing form label"
```tsx
// Add label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or use aria-label
<input type="search" aria-label="Search products" />
```

### "Poor color contrast"
```tsx
// Check and fix in CSS
.text {
  color: #767676; // ❌ Too light on white
  color: #595959; // ✅ Meets WCAG AA
}
```

### "Image missing alt text"
```tsx
// Decorative image
<img src="decoration.png" alt="" />

// Informative image
<img src="chart.png" alt="Sales increased 25% in Q4" />
```

Remember: Accessibility is not a feature, it's a fundamental requirement. When in doubt, test with real assistive technology!