/**
 * Core accessibility types and interfaces
 */

export type ComplianceLevel = 'WCAG_2_1_A' | 'WCAG_2_1_AA' | 'WCAG_2_1_AAA';
export type FontSizePreference = 'default' | 'large' | 'extra-large';
export type ColorBlindMode = 
  | 'protanopia'    // Red blind
  | 'deuteranopia'  // Green blind
  | 'tritanopia'    // Blue blind
  | 'achromatopsia' // Complete color blind
  | 'protanomaly'   // Red weak
  | 'deuteranomaly' // Green weak
  | 'tritanomaly';  // Blue weak

export type AnnouncementPriority = 'polite' | 'assertive';
export type ShortcutCategory = 'navigation' | 'action' | 'form' | 'custom';

export interface AccessibilityPreferences {
  // Visual preferences
  highContrast: boolean;
  fontSize: FontSizePreference;
  reducedMotion: boolean;
  colorBlindMode?: ColorBlindMode;
  
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

export interface AccessibilityFeature {
  id: string;
  name: string;
  enabled: boolean;
  category: 'visual' | 'navigation' | 'screen-reader' | 'forms';
  description?: string;
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

export interface AccessibilityConfig {
  defaultPreferences?: Partial<AccessibilityPreferences>;
  features?: AccessibilityFeature[];
  persistenceAdapter?: IPersistenceAdapter;
  complianceLevel?: ComplianceLevel;
  locale?: string;
}

export interface IPersistenceAdapter {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface AccessibilityViolation {
  id: string;
  rule: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  element?: HTMLElement;
  description: string;
  helpUrl?: string;
}

export interface ComplianceReport {
  level: ComplianceLevel;
  violations: AccessibilityViolation[];
  passes: number;
  timestamp: Date;
}

// Error handling
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
  FORM_ENHANCEMENT_FAILED = 'A11Y_FORM_ERROR',
  INVALID_COLOR = 'A11Y_INVALID_COLOR',
  VALIDATION_ERROR = 'A11Y_VALIDATION_ERROR',
  INVALID_ELEMENT = 'A11Y_INVALID_ELEMENT',
  INVALID_OPERATION = 'A11Y_INVALID_OPERATION',
  DUPLICATE_ID = 'A11Y_DUPLICATE_ID',
  TEMPLATE_NOT_FOUND = 'A11Y_TEMPLATE_NOT_FOUND',
  REGION_REMOVED = 'A11Y_REGION_REMOVED',
  INVALID_MESSAGE = 'A11Y_INVALID_MESSAGE',
  NO_REGION_AVAILABLE = 'A11Y_NO_REGION_AVAILABLE',
  REGION_NOT_FOUND = 'A11Y_REGION_NOT_FOUND',
  QUEUE_CLEARED = 'A11Y_QUEUE_CLEARED',
  MANAGER_DESTROYED = 'A11Y_MANAGER_DESTROYED'
}

// Event types
export interface AccessibilityEventMap {
  'preference-change': AccessibilityPreferences;
  'feature-toggle': { feature: string; enabled: boolean };
  'announcement': { message: string; priority: AnnouncementPriority };
  'focus-change': { from: HTMLElement | null; to: HTMLElement | null };
  'shortcut-triggered': { shortcut: KeyboardShortcut; event: KeyboardEvent };
  'contrast-violation': { element: HTMLElement; validation: ContrastValidation };
  'form-error': { form: HTMLFormElement; errors: FormError[] };
}

// Keyboard types
export interface KeyboardShortcut {
  id?: string;
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: (event: KeyboardEvent) => void;
  description: string;
  category: ShortcutCategory;
  enabled?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
  global?: boolean;
}

// Screen reader types
export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
  category?: 'navigation' | 'form' | 'alert' | 'status' | 'dialog' | 'custom';
  metadata?: Record<string, any>;
}

export interface AnnouncementOptions {
  priority?: AnnouncementPriority;
  delay?: number;
  clearQueue?: boolean;
  persist?: boolean;
  id?: string;
  clearAfter?: number;
}

export interface LiveRegionOptions {
  id?: string;
  atomic?: boolean;
  role?: string;
  label?: string;
  relevant?: string;
  busy?: boolean;
  hidden?: boolean;
}

export interface LiveRegionConfig {
  id?: string;
  priority?: AnnouncementPriority;
  atomic?: boolean;
  relevant?: ('additions' | 'removals' | 'text' | 'all')[];
  container?: HTMLElement;
  label?: string;
}

// Visual accessibility types
export interface ContrastValidation {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  meetsLargeTextAA: boolean;
  meetsLargeTextAAA: boolean;
  recommendations: ColorRecommendation[];
}

export interface ColorRecommendation {
  color: string;
  ratio: number;
  improvement: string;
}

// Form types
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
}