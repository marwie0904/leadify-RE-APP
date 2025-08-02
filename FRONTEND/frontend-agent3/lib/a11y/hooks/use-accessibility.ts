import { useMemo } from 'react';
import { useAccessibilityContext } from '../context/accessibility-context';
import { 
  AccessibilityPreferences, 
  ComplianceLevel, 
  FontSizePreference,
  AccessibilityError,
  AccessibilityErrorCode
} from '../core/types';

export interface UseAccessibilityReturn {
  // Core context access
  preferences: AccessibilityPreferences;
  complianceLevel: ComplianceLevel;
  
  // Context methods
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => Promise<void>;
  toggleFeature: (featureId: string, enabled: boolean) => Promise<void>;
  setComplianceLevel: (level: ComplianceLevel) => Promise<void>;
  isFeatureEnabled: (featureId: string) => boolean;
  getPreference: <K extends keyof AccessibilityPreferences>(key: K) => AccessibilityPreferences[K];
  
  // Convenience methods
  isHighContrast: () => boolean;
  isReducedMotion: (checkSystem?: boolean) => boolean;
  getFontSize: () => FontSizePreference;
  shouldSkipAnimations: (force?: boolean) => boolean;
  getAnnounceDelay: () => number;
  getFocusRingStyle: () => string;
  isScreenReaderOptimized: () => boolean;
  isVerboseAnnouncements: () => boolean;
  
  // Animation utilities
  getAnimationDuration: (defaultDuration?: number) => number;
  
  // Styling utilities
  cssProps: Record<string, string>;
  classNames: string;
  
  // DOM utilities
  applyPreferencesToElement: (element: HTMLElement | null) => void;
  removePreferencesFromElement: (element: HTMLElement | null) => void;
}

/**
 * Custom hook for accessing and managing accessibility preferences
 * Provides convenient methods and utilities for building accessible components
 */
export function useAccessibility(): UseAccessibilityReturn {
  const context = useAccessibilityContext();
  
  if (!context) {
    throw new AccessibilityError(
      'useAccessibility must be used within an AccessibilityProvider',
      AccessibilityErrorCode.INITIALIZATION_FAILED
    );
  }

  const {
    context: accessibilityContext,
    updatePreferences,
    toggleFeature,
    setComplianceLevel,
    isFeatureEnabled,
    getPreference,
  } = context;

  const { preferences, complianceLevel } = accessibilityContext;

  // Convenience methods
  const isHighContrast = (): boolean => preferences.highContrast;

  const isReducedMotion = (checkSystem: boolean = false): boolean => {
    if (preferences.reducedMotion) {
      return true;
    }
    
    if (checkSystem && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    
    return false;
  };

  const getFontSize = (): FontSizePreference => preferences.fontSize;

  const shouldSkipAnimations = (force?: boolean): boolean => {
    if (force !== undefined) {
      return force;
    }
    return isReducedMotion();
  };

  const getAnnounceDelay = (): number => preferences.announcementDelay;

  const getFocusRingStyle = (): string => preferences.focusIndicatorStyle;

  const isScreenReaderOptimized = (): boolean => preferences.screenReaderOptimized;

  const isVerboseAnnouncements = (): boolean => preferences.verboseAnnouncements;

  const getAnimationDuration = (defaultDuration: number = 200): number => {
    return shouldSkipAnimations() ? 0 : defaultDuration;
  };

  // Generate CSS custom properties
  const cssProps = useMemo((): Record<string, string> => {
    const props: Record<string, string> = {
      '--a11y-high-contrast': preferences.highContrast ? '1' : '0',
      '--a11y-font-size': preferences.fontSize,
      '--a11y-reduced-motion': preferences.reducedMotion ? '1' : '0',
      '--a11y-animation-duration': shouldSkipAnimations() ? '0ms' : '200ms',
      '--a11y-focus-style': preferences.focusIndicatorStyle,
    };

    // Add font scale values
    switch (preferences.fontSize) {
      case 'large':
        props['--a11y-font-scale'] = '1.125';
        break;
      case 'extra-large':
        props['--a11y-font-scale'] = '1.25';
        break;
      default:
        props['--a11y-font-scale'] = '1';
    }

    // Add contrast values
    if (preferences.highContrast) {
      props['--a11y-bg-primary'] = '#000000';
      props['--a11y-text-primary'] = '#ffffff';
      props['--a11y-border-width'] = '2px';
    } else {
      props['--a11y-bg-primary'] = '#ffffff';
      props['--a11y-text-primary'] = '#000000';
      props['--a11y-border-width'] = '1px';
    }

    return props;
  }, [preferences.highContrast, preferences.fontSize, preferences.reducedMotion, preferences.focusIndicatorStyle]);

  // Generate utility class names
  const classNames = useMemo((): string => {
    const classes: string[] = [];

    if (preferences.highContrast) {
      classes.push('a11y-high-contrast');
    }

    if (preferences.fontSize !== 'default') {
      classes.push(`a11y-font-${preferences.fontSize}`);
    }

    if (preferences.reducedMotion) {
      classes.push('a11y-reduced-motion');
    }

    if (preferences.keyboardNavEnabled) {
      classes.push('a11y-keyboard-nav');
    }

    if (preferences.screenReaderOptimized) {
      classes.push('a11y-screen-reader');
    }

    if (preferences.focusIndicatorStyle !== 'default') {
      classes.push(`a11y-focus-${preferences.focusIndicatorStyle}`);
    }

    // Add compliance level class
    classes.push(`a11y-${complianceLevel.toLowerCase().replace(/_/g, '-')}`);

    return classes.join(' ');
  }, [
    preferences.highContrast,
    preferences.fontSize,
    preferences.reducedMotion,
    preferences.keyboardNavEnabled,
    preferences.screenReaderOptimized,
    preferences.focusIndicatorStyle,
    complianceLevel,
  ]);

  // DOM utility functions
  const applyPreferencesToElement = (element: HTMLElement | null): void => {
    if (!element) {
      return;
    }

    // Apply CSS custom properties
    Object.entries(cssProps).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });

    // Apply class names
    const currentClasses = element.className.split(' ').filter(Boolean);
    const newClasses = classNames.split(' ').filter(Boolean);
    
    // Remove old accessibility classes
    const filteredClasses = currentClasses.filter(cls => !cls.startsWith('a11y-'));
    
    // Add new accessibility classes
    element.className = [...filteredClasses, ...newClasses].join(' ');
  };

  const removePreferencesFromElement = (element: HTMLElement | null): void => {
    if (!element) {
      return;
    }

    // Remove CSS custom properties
    Object.keys(cssProps).forEach(property => {
      element.style.removeProperty(property);
    });

    // Remove accessibility class names
    const currentClasses = element.className.split(' ').filter(Boolean);
    const filteredClasses = currentClasses.filter(cls => !cls.startsWith('a11y-'));
    element.className = filteredClasses.join(' ');
  };

  return {
    // Core context access
    preferences,
    complianceLevel,
    
    // Context methods
    updatePreferences,
    toggleFeature,
    setComplianceLevel,
    isFeatureEnabled,
    getPreference,
    
    // Convenience methods
    isHighContrast,
    isReducedMotion,
    getFontSize,
    shouldSkipAnimations,
    getAnnounceDelay,
    getFocusRingStyle,
    isScreenReaderOptimized,
    isVerboseAnnouncements,
    
    // Animation utilities
    getAnimationDuration,
    
    // Styling utilities
    cssProps,
    classNames,
    
    // DOM utilities
    applyPreferencesToElement,
    removePreferencesFromElement,
  };
}