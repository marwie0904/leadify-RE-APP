# Accessibility API Specification

## Overview
This specification defines the comprehensive API contracts for the accessibility system following Domain-Driven Design principles.

## Core APIs

### 1. Accessibility Context API

```typescript
/**
 * Main accessibility context API
 * Manages global accessibility state and user preferences
 */
export interface IAccessibilityContextAPI {
  /**
   * Initialize the accessibility system
   * @param config - Optional configuration overrides
   * @returns Promise that resolves when initialization is complete
   */
  initialize(config?: AccessibilityConfig): Promise<void>;

  /**
   * Get current accessibility context
   * @returns Current accessibility context state
   */
  getContext(): AccessibilityContext;

  /**
   * Update user accessibility preferences
   * @param preferences - Partial preferences to update
   * @returns Promise that resolves when preferences are saved
   */
  updatePreferences(preferences: Partial<AccessibilityPreferences>): Promise<void>;

  /**
   * Subscribe to accessibility context changes
   * @param callback - Function to call when context changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (context: AccessibilityContext) => void): () => void;

  /**
   * Check if a specific accessibility feature is enabled
   * @param feature - Feature identifier
   * @returns Boolean indicating if feature is enabled
   */
  isFeatureEnabled(feature: AccessibilityFeature): boolean;

  /**
   * Get compliance level for current configuration
   * @returns Current WCAG compliance level
   */
  getComplianceLevel(): ComplianceLevel;
}

// Configuration types
export interface AccessibilityConfig {
  defaultPreferences?: Partial<AccessibilityPreferences>;
  features?: AccessibilityFeature[];
  persistenceAdapter?: IPersistenceAdapter;
  complianceLevel?: ComplianceLevel;
  locale?: string;
}

export interface AccessibilityContext {
  id: string;
  userId?: string;
  preferences: AccessibilityPreferences;
  features: Map<string, AccessibilityFeature>;
  complianceLevel: ComplianceLevel;
  initialized: boolean;
  lastModified: Date;
}

export interface AccessibilityPreferences {
  // Visual preferences
  highContrast: boolean;
  fontSize: 'default' | 'large' | 'extra-large';
  reducedMotion: boolean;
  colorBlindMode?: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  
  // Navigation preferences
  keyboardNavEnabled: boolean;
  skipLinks: boolean;
  focusIndicatorStyle: 'default' | 'high-visibility' | 'custom';
  
  // Screen reader preferences
  screenReaderOptimized: boolean;
  verboseAnnouncements: boolean;
  announcementDelay: number; // milliseconds
  
  // Form preferences
  autoErrorAnnouncement: boolean;
  formFieldDescriptions: boolean;
  requiredFieldIndication: 'asterisk' | 'text' | 'both';
}
```

### 2. Keyboard Navigation API

```typescript
/**
 * Keyboard navigation management API
 * Handles shortcuts, focus management, and navigation patterns
 */
export interface IKeyboardNavigationAPI {
  /**
   * Register a keyboard shortcut
   * @param shortcut - Shortcut configuration
   * @returns Shortcut ID for later reference
   */
  registerShortcut(shortcut: KeyboardShortcut): string;

  /**
   * Register multiple shortcuts at once
   * @param shortcuts - Array of shortcut configurations
   * @returns Map of original shortcuts to their IDs
   */
  registerShortcuts(shortcuts: KeyboardShortcut[]): Map<KeyboardShortcut, string>;

  /**
   * Unregister a keyboard shortcut
   * @param id - Shortcut ID to remove
   */
  unregisterShortcut(id: string): void;

  /**
   * Get all registered shortcuts
   * @param filter - Optional filter criteria
   * @returns Array of registered shortcuts
   */
  getShortcuts(filter?: ShortcutFilter): KeyboardShortcut[];

  /**
   * Create a focus trap for modal-like components
   * @param container - Container element to trap focus within
   * @param options - Focus trap configuration
   * @returns Focus trap controller
   */
  createFocusTrap(container: HTMLElement, options?: FocusTrapOptions): IFocusTrap;

  /**
   * Navigate to next/previous focusable element
   * @param direction - Navigation direction
   * @param options - Navigation options
   */
  navigate(direction: 'next' | 'previous', options?: NavigationOptions): void;

  /**
   * Get all focusable elements within a container
   * @param container - Container to search within (defaults to document)
   * @param options - Search options
   * @returns Array of focusable elements
   */
  getFocusableElements(container?: HTMLElement, options?: FocusableOptions): HTMLElement[];

  /**
   * Set focus on an element with announcement
   * @param element - Element to focus
   * @param announceText - Optional text to announce
   */
  focusElement(element: HTMLElement, announceText?: string): void;
}

// Keyboard navigation types
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: (event: KeyboardEvent) => void;
  description: string;
  category: 'navigation' | 'action' | 'form' | 'custom';
  enabled?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
  global?: boolean;
}

export interface IFocusTrap {
  activate(initialFocus?: HTMLElement): void;
  deactivate(returnFocus?: boolean): void;
  pause(): void;
  unpause(): void;
  updateContainerElements(containers: HTMLElement[]): void;
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string | (() => HTMLElement);
  fallbackFocus?: HTMLElement | string;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  returnFocusOnDeactivate?: boolean;
  allowOutsideClick?: (e: MouseEvent) => boolean;
  preventScroll?: boolean;
}
```

### 3. Screen Reader API

```typescript
/**
 * Screen reader support API
 * Manages announcements, live regions, and ARIA attributes
 */
export interface IScreenReaderAPI {
  /**
   * Announce a message to screen readers
   * @param message - Message to announce
   * @param options - Announcement options
   * @returns Promise that resolves when announcement is queued
   */
  announce(message: string, options?: AnnouncementOptions): Promise<void>;

  /**
   * Create a live region for dynamic content
   * @param config - Live region configuration
   * @returns Live region controller
   */
  createLiveRegion(config: LiveRegionConfig): ILiveRegion;

  /**
   * Announce page navigation
   * @param title - Page title
   * @param options - Page announcement options
   */
  announcePageChange(title: string, options?: PageAnnouncementOptions): void;

  /**
   * Update ARIA attributes on an element
   * @param element - Element to update
   * @param attributes - ARIA attributes to set
   */
  setAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void;

  /**
   * Create an accessible description for complex UI
   * @param element - Element to describe
   * @param description - Description configuration
   */
  describeElement(element: HTMLElement, description: ElementDescription): void;

  /**
   * Get current announcement queue
   * @returns Array of pending announcements
   */
  getAnnouncementQueue(): QueuedAnnouncement[];

  /**
   * Clear all pending announcements
   */
  clearAnnouncements(): void;
}

// Screen reader types
export interface AnnouncementOptions {
  priority?: 'polite' | 'assertive';
  delay?: number;
  clearQueue?: boolean;
  persist?: boolean;
  id?: string;
}

export interface ILiveRegion {
  id: string;
  update(content: string): void;
  clear(): void;
  destroy(): void;
  setPriority(priority: 'polite' | 'assertive'): void;
  setAtomic(atomic: boolean): void;
}

export interface LiveRegionConfig {
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: ('additions' | 'removals' | 'text' | 'all')[];
  container?: HTMLElement;
  label?: string;
}

export interface AriaAttributes {
  role?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  disabled?: boolean;
  hidden?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  busy?: boolean;
  current?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
  [key: `aria-${string}`]: any;
}
```

### 4. Visual Accessibility API

```typescript
/**
 * Visual accessibility API
 * Manages color contrast, themes, and visual enhancements
 */
export interface IVisualAccessibilityAPI {
  /**
   * Enable/disable high contrast mode
   * @param enabled - Whether to enable high contrast
   */
  setHighContrast(enabled: boolean): void;

  /**
   * Set color blind simulation mode
   * @param mode - Color blind mode or null to disable
   */
  setColorBlindMode(mode: ColorBlindMode | null): void;

  /**
   * Validate color contrast between two colors
   * @param foreground - Foreground color
   * @param background - Background color
   * @param options - Validation options
   * @returns Contrast validation result
   */
  validateContrast(
    foreground: string,
    background: string,
    options?: ContrastOptions
  ): ContrastValidation;

  /**
   * Get accessible color suggestions
   * @param baseColor - Starting color
   * @param purpose - Intended use of color
   * @param background - Background color for contrast
   * @returns Array of accessible color options
   */
  getAccessibleColors(
    baseColor: string,
    purpose: ColorPurpose,
    background: string
  ): AccessibleColor[];

  /**
   * Apply visual accessibility enhancements
   * @param enhancements - Enhancement configuration
   */
  applyEnhancements(enhancements: VisualEnhancements): void;

  /**
   * Check if current theme meets contrast requirements
   * @param level - WCAG level to check against
   * @returns Theme validation result
   */
  validateTheme(level?: 'AA' | 'AAA'): ThemeValidation;
}

// Visual accessibility types
export type ColorBlindMode = 
  | 'protanopia'    // Red blind
  | 'deuteranopia'  // Green blind
  | 'tritanopia'    // Blue blind
  | 'achromatopsia' // Complete color blind
  | 'protanomaly'   // Red weak
  | 'deuteranomaly' // Green weak
  | 'tritanomaly';  // Blue weak

export interface ContrastValidation {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  meetsLargeTextAA: boolean;
  meetsLargeTextAAA: boolean;
  recommendations: ColorRecommendation[];
}

export interface AccessibleColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  contrastRatio: number;
  meetsStandard: boolean;
  name?: string;
}

export type ColorPurpose = 
  | 'text'
  | 'heading'
  | 'link'
  | 'button'
  | 'border'
  | 'background'
  | 'accent'
  | 'error'
  | 'warning'
  | 'success';

export interface VisualEnhancements {
  increaseFocusIndicator?: boolean;
  underlineLinks?: boolean;
  increaseClickTargets?: boolean;
  addTextSpacing?: boolean;
  disableAnimations?: boolean;
  simplifyLayout?: boolean;
}
```

### 5. Form Accessibility API

```typescript
/**
 * Form accessibility API
 * Enhances form interactions and error handling
 */
export interface IFormAccessibilityAPI {
  /**
   * Enhance a form with accessibility features
   * @param form - Form element to enhance
   * @param options - Enhancement options
   * @returns Form controller for additional operations
   */
  enhanceForm(form: HTMLFormElement, options?: FormEnhancementOptions): IFormController;

  /**
   * Announce form errors
   * @param errors - Array of form errors
   * @param options - Announcement options
   */
  announceErrors(errors: FormError[], options?: ErrorAnnouncementOptions): void;

  /**
   * Create accessible form field
   * @param field - Field configuration
   * @returns Enhanced field element
   */
  createField(field: FieldConfig): IAccessibleField;

  /**
   * Validate form accessibility
   * @param form - Form to validate
   * @returns Validation result with issues
   */
  validateFormAccessibility(form: HTMLFormElement): FormValidation;
}

// Form accessibility types
export interface IFormController {
  setError(fieldName: string, error: string): void;
  clearError(fieldName: string): void;
  clearAllErrors(): void;
  announceSuccess(message: string): void;
  focusFirstError(): void;
  getErrors(): Map<string, string>;
  destroy(): void;
}

export interface FormError {
  field: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export interface FieldConfig {
  type: string;
  name: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  autocomplete?: string;
  validators?: FieldValidator[];
}

export interface IAccessibleField {
  element: HTMLElement;
  setError(error: string): void;
  clearError(): void;
  focus(): void;
  getValue(): any;
  setValue(value: any): void;
  validate(): boolean;
}
```

## React Integration

### Context Provider

```typescript
/**
 * React context provider for accessibility
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  config,
  initialPreferences
}) => {
  // Implementation
};

export interface AccessibilityProviderProps {
  children: React.ReactNode;
  config?: AccessibilityConfig;
  initialPreferences?: Partial<AccessibilityPreferences>;
}
```

### Hooks

```typescript
/**
 * Core accessibility hooks
 */

// Access main context
export function useAccessibility(): AccessibilityContextValue;

// Keyboard navigation
export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options?: UseKeyboardShortcutOptions
): void;

export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  options?: FocusTrapOptions
): FocusTrapControls;

// Screen reader
export function useAnnounce(): (message: string, options?: AnnouncementOptions) => void;

export function useLiveRegion(
  options?: LiveRegionOptions
): [announce: (message: string) => void, clear: () => void];

// Visual accessibility
export function useHighContrast(): [enabled: boolean, toggle: () => void];

export function useColorBlindMode(): [
  mode: ColorBlindMode | null,
  setMode: (mode: ColorBlindMode | null) => void
];

export function useReducedMotion(): boolean;

// Forms
export function useAccessibleForm(
  ref: RefObject<HTMLFormElement>,
  options?: FormOptions
): FormHelpers;

export function useFieldError(
  name: string
): [error: string | undefined, setError: (error: string) => void];
```

## Component Contracts

### Base Accessible Components

```typescript
/**
 * Accessible component prop interfaces
 */

export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingText?: string;
  shortcut?: string;
}

export interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  initialFocus?: RefObject<HTMLElement>;
  finalFocus?: RefObject<HTMLElement>;
  role?: 'dialog' | 'alertdialog';
}

export interface AccessibleFormFieldProps {
  label: string;
  name: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactElement;
}

export interface SkipLinksProps {
  links?: SkipLink[];
  className?: string;
}

export interface SkipLink {
  href: string;
  label: string;
  shortcut?: string;
}
```

## Event System

```typescript
/**
 * Accessibility event system
 */
export interface AccessibilityEventMap {
  'preference-change': AccessibilityPreferences;
  'feature-toggle': { feature: string; enabled: boolean };
  'announcement': { message: string; priority: 'polite' | 'assertive' };
  'focus-change': { from: HTMLElement | null; to: HTMLElement | null };
  'shortcut-triggered': { shortcut: KeyboardShortcut; event: KeyboardEvent };
  'contrast-violation': { element: HTMLElement; validation: ContrastValidation };
  'form-error': { form: HTMLFormElement; errors: FormError[] };
}

export interface IAccessibilityEventEmitter {
  on<K extends keyof AccessibilityEventMap>(
    event: K,
    handler: (data: AccessibilityEventMap[K]) => void
  ): void;
  
  off<K extends keyof AccessibilityEventMap>(
    event: K,
    handler: (data: AccessibilityEventMap[K]) => void
  ): void;
  
  emit<K extends keyof AccessibilityEventMap>(
    event: K,
    data: AccessibilityEventMap[K]
  ): void;
}
```

## Error Handling

```typescript
/**
 * Accessibility-specific error types
 */
export class AccessibilityError extends Error {
  constructor(message: string, public code: AccessibilityErrorCode) {
    super(message);
    this.name = 'AccessibilityError';
  }
}

export enum AccessibilityErrorCode {
  INITIALIZATION_FAILED = 'A11Y_INIT_FAILED',
  INVALID_PREFERENCE = 'A11Y_INVALID_PREF',
  SHORTCUT_CONFLICT = 'A11Y_SHORTCUT_CONFLICT',
  FOCUS_TRAP_ERROR = 'A11Y_FOCUS_TRAP_ERROR',
  ANNOUNCEMENT_FAILED = 'A11Y_ANNOUNCE_FAILED',
  CONTRAST_CALCULATION_ERROR = 'A11Y_CONTRAST_ERROR',
  FORM_ENHANCEMENT_FAILED = 'A11Y_FORM_ERROR'
}
```

## Performance Contracts

```typescript
/**
 * Performance monitoring for accessibility features
 */
export interface IAccessibilityPerformance {
  measureAnnouncementLatency(): number;
  measureFocusCalculation(): number;
  measureContrastValidation(): number;
  getMetrics(): AccessibilityMetrics;
  reset(): void;
}

export interface AccessibilityMetrics {
  announcementLatency: number[];
  focusCalculationTime: number[];
  contrastValidationTime: number[];
  shortcutResponseTime: number[];
  averageMetrics: {
    announcement: number;
    focus: number;
    contrast: number;
    shortcut: number;
  };
}
```

This API specification provides comprehensive contracts for all accessibility features while maintaining clean boundaries between domains and ensuring type safety throughout the system.