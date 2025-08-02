import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccessibilityPreferences, ComplianceLevel, AccessibilityError, AccessibilityErrorCode } from '@/lib/a11y/core/types';

// Mock the context first
const mockContextValue = {
  context: {
    id: 'test-context',
    userId: 'test-user',
    preferences: {
      highContrast: false,
      fontSize: 'default' as const,
      reducedMotion: false,
      keyboardNavEnabled: true,
      skipLinks: true,
      focusIndicatorStyle: 'default' as const,
      screenReaderOptimized: false,
      verboseAnnouncements: false,
      announcementDelay: 150,
      autoErrorAnnouncement: true,
      formFieldDescriptions: true,
      requiredFieldIndication: 'asterisk' as const,
    },
    features: new Map(),
    complianceLevel: 'WCAG_2_1_AA' as ComplianceLevel,
    initialized: true,
    lastModified: new Date(),
  },
  updatePreferences: jest.fn(),
  toggleFeature: jest.fn(),
  setComplianceLevel: jest.fn(),
  reset: jest.fn(),
  isFeatureEnabled: jest.fn(),
  getPreference: jest.fn(),
};

// Mock the context module
jest.mock('@/lib/a11y/context/accessibility-context', () => ({
  useAccessibilityContext: jest.fn(() => mockContextValue),
}));

// Import after mocking
import { useAccessibility } from '@/lib/a11y/hooks/use-accessibility';

describe('useAccessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue.getPreference.mockImplementation((key: string) => 
      mockContextValue.context.preferences[key as keyof AccessibilityPreferences]
    );
    mockContextValue.isFeatureEnabled.mockReturnValue(false);
  });

  describe('Basic Hook Functionality', () => {
    it('should return accessibility context and utilities', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current).toHaveProperty('preferences');
      expect(result.current).toHaveProperty('complianceLevel');
      expect(result.current).toHaveProperty('updatePreferences');
      expect(result.current).toHaveProperty('toggleFeature');
      expect(result.current).toHaveProperty('setComplianceLevel');
      expect(result.current).toHaveProperty('isFeatureEnabled');
      expect(result.current).toHaveProperty('getPreference');
      expect(result.current).toHaveProperty('isHighContrast');
      expect(result.current).toHaveProperty('isReducedMotion');
      expect(result.current).toHaveProperty('getFontSize');
      expect(result.current).toHaveProperty('shouldSkipAnimations');
      expect(result.current).toHaveProperty('getAnnounceDelay');
    });

    it('should expose preferences from context', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.preferences).toEqual(mockContextValue.context.preferences);
      expect(result.current.complianceLevel).toBe('WCAG_2_1_AA');
    });

    it('should expose context methods', () => {
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.updatePreferences).toBe(mockContextValue.updatePreferences);
      expect(result.current.toggleFeature).toBe(mockContextValue.toggleFeature);
      expect(result.current.setComplianceLevel).toBe(mockContextValue.setComplianceLevel);
      expect(result.current.isFeatureEnabled).toBe(mockContextValue.isFeatureEnabled);
      expect(result.current.getPreference).toBe(mockContextValue.getPreference);
    });
  });

  describe('Convenience Methods', () => {
    describe('isHighContrast', () => {
      it('should return true when high contrast is enabled', () => {
        mockContextValue.context.preferences.highContrast = true;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.isHighContrast()).toBe(true);
      });

      it('should return false when high contrast is disabled', () => {
        mockContextValue.context.preferences.highContrast = false;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.isHighContrast()).toBe(false);
      });
    });

    describe('isReducedMotion', () => {
      it('should return true when reduced motion is enabled', () => {
        mockContextValue.context.preferences.reducedMotion = true;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.isReducedMotion()).toBe(true);
      });

      it('should return false when reduced motion is disabled', () => {
        mockContextValue.context.preferences.reducedMotion = false;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.isReducedMotion()).toBe(false);
      });

      it('should check system preference when not set', () => {
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: jest.fn().mockImplementation(query => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
          })),
        });

        mockContextValue.context.preferences.reducedMotion = false;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.isReducedMotion(true)).toBe(true);
      });
    });

    describe('getFontSize', () => {
      it('should return current font size preference', () => {
        mockContextValue.context.preferences.fontSize = 'large';
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.getFontSize()).toBe('large');
      });

      it('should return default font size when not set', () => {
        mockContextValue.context.preferences.fontSize = 'default';
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.getFontSize()).toBe('default');
      });
    });

    describe('shouldSkipAnimations', () => {
      it('should return true when reduced motion is enabled', () => {
        mockContextValue.context.preferences.reducedMotion = true;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.shouldSkipAnimations()).toBe(true);
      });

      it('should return false when reduced motion is disabled', () => {
        mockContextValue.context.preferences.reducedMotion = false;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.shouldSkipAnimations()).toBe(false);
      });

      it('should respect force parameter', () => {
        mockContextValue.context.preferences.reducedMotion = false;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.shouldSkipAnimations(true)).toBe(true);
        expect(result.current.shouldSkipAnimations(false)).toBe(false);
      });
    });

    describe('getAnnounceDelay', () => {
      it('should return announcement delay preference', () => {
        mockContextValue.context.preferences.announcementDelay = 300;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.getAnnounceDelay()).toBe(300);
      });

      it('should return default delay when not set', () => {
        mockContextValue.context.preferences.announcementDelay = 150;
        const { result } = renderHook(() => useAccessibility());

        expect(result.current.getAnnounceDelay()).toBe(150);
      });
    });
  });

  describe('Preference Updates', () => {
    it('should update preferences through context method', async () => {
      const { result } = renderHook(() => useAccessibility());
      const newPreferences = { highContrast: true, fontSize: 'large' as const };

      await act(async () => {
        await result.current.updatePreferences(newPreferences);
      });

      expect(mockContextValue.updatePreferences).toHaveBeenCalledWith(newPreferences);
    });

    it('should toggle features through context method', async () => {
      const { result } = renderHook(() => useAccessibility());

      await act(async () => {
        await result.current.toggleFeature('custom-feature', true);
      });

      expect(mockContextValue.toggleFeature).toHaveBeenCalledWith('custom-feature', true);
    });

    it('should set compliance level through context method', async () => {
      const { result } = renderHook(() => useAccessibility());

      await act(async () => {
        await result.current.setComplianceLevel('WCAG_2_1_AAA');
      });

      expect(mockContextValue.setComplianceLevel).toHaveBeenCalledWith('WCAG_2_1_AAA');
    });
  });

  describe('Feature Management', () => {
    it('should check if feature is enabled', () => {
      mockContextValue.isFeatureEnabled.mockReturnValue(true);
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isFeatureEnabled('test-feature')).toBe(true);
      expect(mockContextValue.isFeatureEnabled).toHaveBeenCalledWith('test-feature');
    });

    it('should get specific preference value', () => {
      mockContextValue.getPreference.mockReturnValue('large');
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getPreference('fontSize')).toBe('large');
      expect(mockContextValue.getPreference).toHaveBeenCalledWith('fontSize');
    });
  });

  describe('CSS Custom Properties', () => {
    it('should provide CSS custom properties for current preferences', () => {
      mockContextValue.context.preferences.highContrast = true;
      mockContextValue.context.preferences.fontSize = 'large';
      mockContextValue.context.preferences.reducedMotion = true;

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.cssProps).toEqual({
        '--a11y-high-contrast': '1',
        '--a11y-font-size': 'large',
        '--a11y-reduced-motion': '1',
        '--a11y-animation-duration': '0ms',
        '--a11y-focus-style': 'default',
        '--a11y-font-scale': '1.125',
        '--a11y-bg-primary': '#000000',
        '--a11y-text-primary': '#ffffff',
        '--a11y-border-width': '2px',
      });
    });

    it('should update CSS custom properties when preferences change', () => {
      // Set initial state
      mockContextValue.context.preferences.highContrast = false;
      
      const { result, rerender } = renderHook(() => useAccessibility());

      // Initial state
      expect(result.current.cssProps['--a11y-high-contrast']).toBe('0');

      // Update preferences
      mockContextValue.context.preferences.highContrast = true;
      rerender();

      expect(result.current.cssProps['--a11y-high-contrast']).toBe('1');
    });
  });

  describe('Accessibility Class Names', () => {
    it('should provide class names for current accessibility state', () => {
      mockContextValue.context.preferences.highContrast = true;
      mockContextValue.context.preferences.fontSize = 'large';
      mockContextValue.context.preferences.reducedMotion = true;

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.classNames).toContain('a11y-high-contrast');
      expect(result.current.classNames).toContain('a11y-font-large');
      expect(result.current.classNames).toContain('a11y-reduced-motion');
    });

    it('should not include disabled preference class names', () => {
      mockContextValue.context.preferences.highContrast = false;
      mockContextValue.context.preferences.fontSize = 'default';
      mockContextValue.context.preferences.reducedMotion = false;

      const { result } = renderHook(() => useAccessibility());

      expect(result.current.classNames).not.toContain('a11y-high-contrast');
      expect(result.current.classNames).not.toContain('a11y-font-large');
      expect(result.current.classNames).not.toContain('a11y-reduced-motion');
    });
  });

  describe('Utility Functions', () => {
    describe('applyPreferencesToElement', () => {
      it('should apply accessibility preferences to DOM element', () => {
        mockContextValue.context.preferences.highContrast = true;
        mockContextValue.context.preferences.fontSize = 'large';

        const { result } = renderHook(() => useAccessibility());
        const element = document.createElement('div');

        result.current.applyPreferencesToElement(element);

        expect(element.style.getPropertyValue('--a11y-high-contrast')).toBe('1');
        expect(element.style.getPropertyValue('--a11y-font-size')).toBe('large');
        expect(element.classList.contains('a11y-high-contrast')).toBe(true);
        expect(element.classList.contains('a11y-font-large')).toBe(true);
      });

      it('should handle null element gracefully', () => {
        const { result } = renderHook(() => useAccessibility());

        expect(() => {
          result.current.applyPreferencesToElement(null);
        }).not.toThrow();
      });
    });

    describe('removePreferencesFromElement', () => {
      it('should remove accessibility preferences from DOM element', () => {
        const { result } = renderHook(() => useAccessibility());
        const element = document.createElement('div');
        
        // Add some styles first
        element.style.setProperty('--a11y-high-contrast', '1');
        element.classList.add('a11y-high-contrast', 'a11y-font-large');

        result.current.removePreferencesFromElement(element);

        expect(element.style.getPropertyValue('--a11y-high-contrast')).toBe('');
        expect(element.classList.contains('a11y-high-contrast')).toBe(false);
        expect(element.classList.contains('a11y-font-large')).toBe(false);
      });
    });
  });

  describe('Animation Duration Calculation', () => {
    it('should return 0 duration when reduced motion is enabled', () => {
      mockContextValue.context.preferences.reducedMotion = true;
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getAnimationDuration(300)).toBe(0);
    });

    it('should return original duration when reduced motion is disabled', () => {
      mockContextValue.context.preferences.reducedMotion = false;
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getAnimationDuration(300)).toBe(300);
    });

    it('should handle default duration', () => {
      mockContextValue.context.preferences.reducedMotion = false;
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getAnimationDuration()).toBe(200);
    });
  });

  describe('Focus Management Utilities', () => {
    it('should provide focus ring style', () => {
      mockContextValue.context.preferences.focusIndicatorStyle = 'high-visibility';
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getFocusRingStyle()).toBe('high-visibility');
    });

    it('should return default focus style when not set', () => {
      mockContextValue.context.preferences.focusIndicatorStyle = 'default';
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.getFocusRingStyle()).toBe('default');
    });
  });

  describe('Screen Reader Utilities', () => {
    it('should check if screen reader optimized', () => {
      mockContextValue.context.preferences.screenReaderOptimized = true;
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isScreenReaderOptimized()).toBe(true);
    });

    it('should check if verbose announcements enabled', () => {
      mockContextValue.context.preferences.verboseAnnouncements = true;
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.isVerboseAnnouncements()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle context values gracefully', () => {
      // This test ensures the hook can handle the current mock structure
      const { result } = renderHook(() => useAccessibility());

      expect(result.current.preferences).toBeDefined();
      expect(result.current.complianceLevel).toBe('WCAG_2_1_AA');
    });
  });

  describe('Integration with Components', () => {
    const TestComponent = () => {
      const { 
        isHighContrast, 
        getFontSize, 
        shouldSkipAnimations,
        classNames 
      } = useAccessibility();

      return (
        <div 
          className={classNames}
          data-testid="test-component"
          data-high-contrast={isHighContrast()}
          data-font-size={getFontSize()}
          data-skip-animations={shouldSkipAnimations()}
        >
          Test Content
        </div>
      );
    };

    it('should work with React components', () => {
      mockContextValue.context.preferences.highContrast = true;
      mockContextValue.context.preferences.fontSize = 'large';
      mockContextValue.context.preferences.reducedMotion = true;

      render(<TestComponent />);

      const component = screen.getByTestId('test-component');
      
      expect(component).toHaveAttribute('data-high-contrast', 'true');
      expect(component).toHaveAttribute('data-font-size', 'large');
      expect(component).toHaveAttribute('data-skip-animations', 'true');
      expect(component).toHaveClass('a11y-high-contrast');
      expect(component).toHaveClass('a11y-font-large');
      expect(component).toHaveClass('a11y-reduced-motion');
    });
  });

  describe('Performance', () => {
    it('should memoize computed values', () => {
      const { result, rerender } = renderHook(() => useAccessibility());

      const classNames1 = result.current.classNames;
      const cssProps1 = result.current.cssProps;

      // Rerender without changing preferences
      rerender();

      const classNames2 = result.current.classNames;
      const cssProps2 = result.current.cssProps;

      // Should be the same reference (memoized)
      expect(classNames1).toBe(classNames2);
      expect(cssProps1).toBe(cssProps2);
    });

    it('should update memoized values when preferences change', () => {
      // Set initial state
      mockContextValue.context.preferences.highContrast = false;
      mockContextValue.context.preferences.fontSize = 'default';
      
      const { result, rerender } = renderHook(() => useAccessibility());

      const classNames1 = result.current.classNames;

      // Change preferences
      mockContextValue.context.preferences.highContrast = true;
      mockContextValue.context.preferences.fontSize = 'large';
      rerender();

      const classNames2 = result.current.classNames;

      // Should be different content (updated)
      expect(classNames1).not.toEqual(classNames2);
      expect(classNames2).toContain('a11y-high-contrast');
      expect(classNames2).toContain('a11y-font-large');
    });
  });
});