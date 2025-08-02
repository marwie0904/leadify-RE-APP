# Accessibility Linting Guide

## Overview

This project uses comprehensive ESLint rules to enforce WCAG 2.1 AA accessibility standards. Our linting configuration includes both standard jsx-a11y rules and custom rules tailored to our accessibility system.

## ESLint Configuration

### Base Configuration (`.eslintrc.json`)
- Extends `next/core-web-vitals` and `plugin:jsx-a11y/recommended`
- Enforces core accessibility rules as errors
- Includes custom component mappings for shadcn/ui components
- Provides test-specific overrides

### Enhanced Configuration
The base `.eslintrc.json` configuration includes comprehensive accessibility rules with:
- Strict WCAG 2.1 AA compliance rules
- Enhanced rule configurations with component mappings
- Specialized overrides for accessibility library files
- Complete shadcn/ui component mappings for proper semantic analysis

## Available Scripts

```bash
# Standard linting (Next.js + basic a11y)
npm run lint

# Enhanced accessibility linting
npm run lint:a11y

# Auto-fix accessibility issues where possible
npm run lint:a11y:fix

# Run both standard and accessibility linting
npm run lint:all

# Run accessibility tests only
npm run test:a11y

# Complete validation (lint + test + build)
npm run validate
```

## Rule Categories

### 🚫 Error Rules (Must Fix)
These rules will cause builds to fail and represent critical accessibility issues:

- **Alt Text**: All images must have appropriate alt text
- **ARIA Usage**: Proper ARIA attributes and roles
- **Focus Management**: Interactive elements must be focusable
- **Form Labels**: All form controls must have associated labels
- **Heading Structure**: Proper heading hierarchy
- **Keyboard Navigation**: Click handlers must have keyboard equivalents

### ⚠️ Warning Rules (Should Fix)
These rules highlight potential accessibility improvements:

- **Media Captions**: Audio/video content should have captions
- **Autofocus**: Avoid autofocus except where appropriate
- **Control Labels**: Enhanced labeling for complex controls
- **Anchor Text**: Avoid ambiguous link text

### 🔧 Custom Overrides

#### Test Files
Relaxed rules for testing scenarios where accessibility violations may be intentional for testing purposes.

#### Accessibility Library Files (`lib/a11y/`)
Allows patterns needed for building accessibility utilities that might normally violate rules.

#### Component Stories/Examples
Allows demo patterns while still encouraging accessibility best practices.

## Component Mappings

Our ESLint configuration maps custom components to their semantic HTML equivalents:

```javascript
// shadcn/ui components
"Button": "button",
"Input": "input", 
"Dialog": "dialog",
"NavigationMenu": "nav",

// Our accessibility components  
"AccessibleModal": "dialog",
"SkipLinks": "nav",
"FocusTrap": "div"
```

## Common Issues and Solutions

### 1. Interactive Elements Without Keyboard Support

**Error**: `jsx-a11y/click-events-have-key-events`

```jsx
// ❌ Bad
<div onClick={handleClick}>Click me</div>

// ✅ Good  
<button onClick={handleClick}>Click me</button>

// ✅ Also good (if div is necessary)
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Click me
</div>
```

### 2. Missing Form Labels

**Error**: `jsx-a11y/label-has-associated-control`

```jsx
// ❌ Bad
<input type="text" placeholder="Enter name" />

// ✅ Good
<Label htmlFor="name">Name</Label>
<Input id="name" type="text" />

// ✅ Also good (implicit association)
<Label>
  Name
  <Input type="text" />
</Label>
```

### 3. Missing Alt Text

**Error**: `jsx-a11y/alt-text`

```jsx
// ❌ Bad
<img src="/avatar.jpg" />

// ✅ Good
<img src="/avatar.jpg" alt="User profile picture" />

// ✅ Decorative image
<img src="/decoration.jpg" alt="" role="presentation" />
```

### 4. Improper ARIA Usage

**Error**: `jsx-a11y/aria-props`, `jsx-a11y/role-has-required-aria-props`

```jsx
// ❌ Bad
<div role="button" aria-labeledby="invalid-id">Click</div>

// ✅ Good
<div 
  role="button" 
  aria-label="Close dialog"
  tabIndex={0}
  onClick={handleClose}
  onKeyDown={(e) => e.key === 'Enter' && handleClose()}
>
  ×
</div>
```

### 5. Positive Tab Index

**Error**: `jsx-a11y/tabindex-no-positive`

```jsx
// ❌ Bad
<input tabIndex={1} />
<button tabIndex={2}>Submit</button>

// ✅ Good - let natural tab order work
<input />
<button>Submit</button>

// ✅ Good - only use 0 or -1
<div tabIndex={0} role="button">Custom button</div>
<div tabIndex={-1} ref={modalRef}>Modal content</div>
```

## Integration with CI/CD

### Pre-commit Hooks
Consider adding accessibility linting to pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint:all"
    }
  }
}
```

### GitHub Actions
Add accessibility linting to your CI pipeline:

```yaml
- name: Run accessibility linting
  run: npm run lint:a11y

- name: Run accessibility tests  
  run: npm run test:a11y
```

## IDE Integration

### VS Code
Install the ESLint extension and add to your settings:

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact", 
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": ["./"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Recommended Extensions
- **ESLint**: Syntax highlighting for linting errors
- **axe Accessibility Linter**: Additional accessibility checking
- **WAVE Evaluation Tool**: Browser-based accessibility testing

## Best Practices

### 1. Fix Errors First
Always prioritize fixing accessibility errors over warnings. Errors represent violations that will impact users with disabilities.

### 2. Test with Real Users
Linting catches many issues but doesn't replace testing with actual assistive technologies and users with disabilities.

### 3. Use Semantic HTML
Prefer semantic HTML elements over generic divs with ARIA roles when possible.

### 4. Progressive Enhancement
Build accessible foundations first, then enhance with JavaScript.

### 5. Regular Audits
Run `npm run lint:a11y` regularly during development, not just before commits.

## Troubleshooting

### False Positives
If you encounter a false positive, you can:

1. **Fix the underlying issue** (preferred)
2. **Use ESLint disable comments** with justification:
   ```jsx
   {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
   <div onClick={handleClick}>
     {/* This div is not interactive, click is handled by event delegation */}
   </div>
   ```
3. **Update component mappings** in ESLint config if it's a reusable pattern

### Performance Impact
If linting is slow:
- Use `--cache` flag: `eslint --cache`
- Exclude large directories: add to `.eslintignore`
- Run accessibility linting separately from main linting

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [jsx-a11y Plugin Documentation](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [WebAIM Accessibility Checklist](https://webaim.org/standards/wcag/checklist)
- [Our Accessibility System Documentation](./ACCESSIBILITY_ARCHITECTURE.md)

## Getting Help

If you're unsure about an accessibility rule or need help fixing an issue:
1. Check this documentation first
2. Review the [accessibility system examples](../lib/a11y/)
3. Consult the WCAG 2.1 guidelines
4. Ask the team for guidance

Remember: Accessibility is not just about passing linting rules—it's about creating inclusive experiences for all users.