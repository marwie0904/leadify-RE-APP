import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from '@/lib/a11y/core/context';
import { AccessibilityPreferences, ComplianceLevel } from '@/lib/a11y/core/types';

describe('AccessibilityContext', () => {
  // Default preferences for testing
  const defaultPreferences: AccessibilityPreferences = {
    highContrast: false,
    fontSize: 'default',
    reducedMotion: false,
    colorBlindMode: undefined,
    keyboardNavEnabled: true,
    skipLinks: true,
    focusIndicatorStyle: 'default',
    screenReaderOptimized: false,
    verboseAnnouncements: false,
    announcementDelay: 100,
    autoErrorAnnouncement: true,
    formFieldDescriptions: true,
    requiredFieldIndication: 'asterisk',
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('AccessibilityProvider', () => {
    it('should provide default context values', () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      expect(result.current.context).toMatchObject({
        initialized: true,
        complianceLevel: 'WCAG_2_1_AA',
        preferences: expect.objectContaining({
          keyboardNavEnabled: true,
          skipLinks: true,
        }),
      });
    });

    it('should accept initial preferences', () => {
      const customPreferences: Partial<AccessibilityPreferences> = {
        highContrast: true,
        fontSize: 'large',
      };

      const { result } = renderHook(() => useAccessibility(), {
        wrapper: ({ children }) => (
          <AccessibilityProvider initialPreferences={customPreferences}>
            {children}
          </AccessibilityProvider>
        ),
      });

      expect(result.current.context.preferences.highContrast).toBe(true);
      expect(result.current.context.preferences.fontSize).toBe('large');
    });

    it('should persist preferences to localStorage', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      await act(async () => {
        await result.current.updatePreferences({ highContrast: true });
      });

      const saved = localStorage.getItem('a11y-preferences');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.highContrast).toBe(true);
    });

    it('should load preferences from localStorage on mount', () => {
      const savedPrefs = {
        ...defaultPreferences,
        highContrast: true,
        fontSize: 'extra-large',
      };

      localStorage.setItem('a11y-preferences', JSON.stringify(savedPrefs));

      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      expect(result.current.context.preferences.highContrast).toBe(true);
      expect(result.current.context.preferences.fontSize).toBe('extra-large');
    });
  });

  describe('useAccessibility hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAccessibility());
      }).toThrow('useAccessibility must be used within an AccessibilityProvider');

      consoleSpy.mockRestore();
    });

    it('should update preferences', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      await act(async () => {
        await result.current.updatePreferences({
          highContrast: true,
          fontSize: 'large',
        });
      });

      expect(result.current.context.preferences.highContrast).toBe(true);
      expect(result.current.context.preferences.fontSize).toBe('large');
    });

    it('should check if feature is enabled', () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      // By default, some features should be enabled
      expect(result.current.isFeatureEnabled('keyboard-navigation')).toBe(true);
      expect(result.current.isFeatureEnabled('skip-links')).toBe(true);
    });

    it('should get compliance level', () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      expect(result.current.getComplianceLevel()).toBe('WCAG_2_1_AA');
    });

    it('should toggle features', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      const featureId = 'high-contrast';
      
      await act(async () => {
        await result.current.enableFeature({
          id: featureId,
          name: 'High Contrast',
          enabled: true,
          category: 'visual',
        });
      });

      expect(result.current.isFeatureEnabled(featureId)).toBe(true);

      await act(async () => {
        await result.current.disableFeature(featureId);
      });

      expect(result.current.isFeatureEnabled(featureId)).toBe(false);
    });

    it('should notify subscribers on preference changes', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      const callback = jest.fn();
      const unsubscribe = result.current.subscribe(callback);

      await act(async () => {
        await result.current.updatePreferences({ highContrast: true });
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            highContrast: true,
          }),
        })
      );

      unsubscribe();
    });

    it('should handle preference validation', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      // Invalid font size should be rejected
      await expect(
        act(async () => {
          await result.current.updatePreferences({
            // @ts-ignore - Testing invalid value
            fontSize: 'invalid-size',
          });
        })
      ).rejects.toThrow();
    });
  });

  describe('Compliance validation', () => {
    it('should validate WCAG compliance level', () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: ({ children }) => (
          <AccessibilityProvider
            config={{ complianceLevel: 'WCAG_2_1_AAA' }}
          >
            {children}
          </AccessibilityProvider>
        ),
      });

      expect(result.current.getComplianceLevel()).toBe('WCAG_2_1_AAA');
    });

    it('should run compliance check', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      const report = await result.current.runComplianceCheck();

      expect(report).toMatchObject({
        level: 'WCAG_2_1_AA',
        violations: expect.any(Array),
        passes: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Performance', () => {
    it('should debounce preference updates', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      const saveSpy = jest.spyOn(Storage.prototype, 'setItem');

      // Rapid updates
      await act(async () => {
        result.current.updatePreferences({ highContrast: true });
        result.current.updatePreferences({ fontSize: 'large' });
        result.current.updatePreferences({ reducedMotion: true });
      });

      // Wait for debounce
      await waitFor(() => {
        // Should only save once due to debouncing
        expect(saveSpy).toHaveBeenCalledTimes(1);
      });

      saveSpy.mockRestore();
    });

    it('should handle concurrent updates gracefully', async () => {
      const { result } = renderHook(() => useAccessibility(), {
        wrapper: AccessibilityProvider,
      });

      const updates = [
        result.current.updatePreferences({ highContrast: true }),
        result.current.updatePreferences({ fontSize: 'large' }),
        result.current.updatePreferences({ reducedMotion: true }),
      ];

      await act(async () => {
        await Promise.all(updates);
      });

      // All updates should be applied
      expect(result.current.context.preferences).toMatchObject({
        highContrast: true,
        fontSize: 'large',
        reducedMotion: true,
      });
    });
  });

  describe('Custom persistence adapter', () => {
    it('should use custom persistence adapter', async () => {
      const customAdapter = {
        save: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue({
          highContrast: true,
          fontSize: 'large',
        }),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      const { result } = renderHook(() => useAccessibility(), {
        wrapper: ({ children }) => (
          <AccessibilityProvider
            config={{ persistenceAdapter: customAdapter }}
          >
            {children}
          </AccessibilityProvider>
        ),
      });

      await waitFor(() => {
        expect(customAdapter.load).toHaveBeenCalled();
      });

      await act(async () => {
        await result.current.updatePreferences({ highContrast: false });
      });

      expect(customAdapter.save).toHaveBeenCalledWith(
        'a11y-preferences',
        expect.objectContaining({ highContrast: false })
      );
    });
  });
});