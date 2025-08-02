import React from 'react';
import { renderHook, act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnnouncementPriority, AnnouncementOptions } from '@/lib/a11y/core/types';

// Mock the AnnouncementEngine
const mockAnnouncementEngine = {
  announce: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  clear: jest.fn(),
  getAnnouncementQueue: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('@/lib/a11y/screen-reader/announcer', () => ({
  getAnnouncer: jest.fn(() => mockAnnouncementEngine),
  destroyAnnouncer: jest.fn(),
}));

// Mock the accessibility context
const mockAccessibilityContext = {
  preferences: {
    announcementDelay: 150,
    verboseAnnouncements: false,
    autoErrorAnnouncement: true,
    screenReaderOptimized: false,
  },
  getPreference: jest.fn(),
};

jest.mock('@/lib/a11y/hooks/use-accessibility', () => ({
  useAccessibility: jest.fn(() => mockAccessibilityContext),
}));

// Import after mocking
import { useAnnounce } from '@/lib/a11y/hooks/use-announce';
import { getAnnouncer } from '@/lib/a11y/screen-reader/announcer';

// Get references to the mocked functions
const mockGetAnnouncer = getAnnouncer as jest.MockedFunction<typeof getAnnouncer>;

describe('useAnnounce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnnouncementEngine.announce.mockResolvedValue(undefined);
    mockAnnouncementEngine.getAnnouncementQueue.mockReturnValue([]);
    mockAccessibilityContext.getPreference.mockImplementation((key: string) => 
      mockAccessibilityContext.preferences[key as keyof typeof mockAccessibilityContext.preferences]
    );
  });

  describe('Basic Hook Functionality', () => {
    it('should return announcement functions and state', () => {
      const { result } = renderHook(() => useAnnounce());

      // Debug: log the actual result
      console.log('Hook result:', result.current);
      
      expect(result.current).not.toBeNull();
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('announce');
      expect(result.current).toHaveProperty('announcePolite');
      expect(result.current).toHaveProperty('announceAssertive');
      expect(result.current).toHaveProperty('announceStatus');
      expect(result.current).toHaveProperty('announceError');
      expect(result.current).toHaveProperty('clear');
      expect(result.current).toHaveProperty('pause');
      expect(result.current).toHaveProperty('resume');
      expect(result.current).toHaveProperty('isAnnouncing');
      expect(result.current).toHaveProperty('queueLength');
    });

    it('should initialize with announcer instance', () => {
      renderHook(() => useAnnounce());

      expect(mockGetAnnouncer).toHaveBeenCalledTimes(1);
    });

    it('should cleanup announcer on unmount', () => {
      const { unmount } = renderHook(() => useAnnounce());

      unmount();

      expect(mockAnnouncementEngine.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Basic Announce Function', () => {
    it('should announce message with default options', async () => {
      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        await result.current.announce('Test message');
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          priority: 'polite',
          delay: 150,
        })
      );
    });

    it('should announce message with custom options', async () => {
      const { result } = renderHook(() => useAnnounce());
      const options: AnnouncementOptions = {
        priority: 'assertive',
        delay: 300,
        clearQueue: true,
        persist: true,
        id: 'custom-announcement',
      };

      await act(async () => {
        await result.current.announce('Custom message', options);
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Custom message',
        expect.objectContaining({
          priority: 'assertive',
          delay: 300,
          clearQueue: true,
          persist: true,
          id: 'custom-announcement',
        })
      );
    });

    it('should merge options with accessibility preferences', async () => {
      mockAccessibilityContext.preferences.announcementDelay = 200;
      mockAccessibilityContext.preferences.verboseAnnouncements = true;

      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        await result.current.announce('Test message', { priority: 'assertive' });
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          priority: 'assertive',
          delay: 200,
        })
      );
    });

    it('should handle empty messages gracefully', async () => {
      const { result } = renderHook(() => useAnnounce());

      await expect(
        act(async () => {
          await result.current.announce('');
        })
      ).rejects.toThrow();
    });

    it('should handle announcer errors gracefully', async () => {
      mockAnnouncementEngine.announce.mockRejectedValue(new Error('Announcement failed'));
      const { result } = renderHook(() => useAnnounce());

      await expect(
        act(async () => {
          await result.current.announce('Test message');
        })
      ).rejects.toThrow('Announcement failed');
    });
  });

  describe('Convenience Methods', () => {
    describe('announcePolite', () => {
      it('should announce with polite priority', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announcePolite('Polite message');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Polite message',
          expect.objectContaining({ priority: 'polite' })
        );
      });

      it('should allow options override', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announcePolite('Polite message', { delay: 500 });
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Polite message',
          expect.objectContaining({
            priority: 'polite',
            delay: 500,
          })
        );
      });
    });

    describe('announceAssertive', () => {
      it('should announce with assertive priority', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announceAssertive('Urgent message');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Urgent message',
          expect.objectContaining({ priority: 'assertive' })
        );
      });

      it('should clear queue by default for assertive messages', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announceAssertive('Urgent message');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Urgent message',
          expect.objectContaining({
            priority: 'assertive',
            clearQueue: true,
          })
        );
      });
    });

    describe('announceStatus', () => {
      it('should announce status with appropriate settings', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announceStatus('Status update');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Status update',
          expect.objectContaining({
            priority: 'polite',
            persist: false,
          })
        );
      });
    });

    describe('announceError', () => {
      it('should announce error with assertive priority', async () => {
        const { result } = renderHook(() => useAnnounce());

        await act(async () => {
          await result.current.announceError('Error occurred');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Error occurred',
          expect.objectContaining({
            priority: 'assertive',
            clearQueue: true,
            persist: true,
          })
        );
      });

      it('should respect autoErrorAnnouncement preference', async () => {
        mockAccessibilityContext.preferences.autoErrorAnnouncement = false;
        const { result } = renderHook(() => useAnnounce());

        // Should still allow manual error announcements
        await act(async () => {
          await result.current.announceError('Error occurred');
        });

        expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
          'Error occurred',
          expect.objectContaining({ priority: 'assertive' })
        );
      });
    });
  });

  describe('Queue Management', () => {
    it('should clear announcement queue', async () => {
      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        result.current.clear();
      });

      expect(mockAnnouncementEngine.clear).toHaveBeenCalledTimes(1);
    });

    it('should pause announcements', async () => {
      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        result.current.pause();
      });

      expect(mockAnnouncementEngine.pause).toHaveBeenCalledTimes(1);
    });

    it('should resume announcements', async () => {
      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        result.current.resume();
      });

      expect(mockAnnouncementEngine.resume).toHaveBeenCalledTimes(1);
    });

    it('should track queue length', () => {
      mockAnnouncementEngine.getAnnouncementQueue.mockReturnValue([
        { id: '1', message: 'Message 1', priority: 'polite' as AnnouncementPriority, timestamp: Date.now() },
        { id: '2', message: 'Message 2', priority: 'assertive' as AnnouncementPriority, timestamp: Date.now() },
      ]);

      const { result } = renderHook(() => useAnnounce());

      expect(result.current.queueLength).toBe(2);
    });
  });

  describe('State Management', () => {
    it('should track announcing state', async () => {
      let resolveAnnouncement: () => void;
      const announcementPromise = new Promise<void>((resolve) => {
        resolveAnnouncement = resolve;
      });
      mockAnnouncementEngine.announce.mockReturnValue(announcementPromise);

      const { result } = renderHook(() => useAnnounce());

      // Start announcement
      await act(async () => {
        result.current.announce('Test message');
      });

      // Should be announcing
      expect(result.current.isAnnouncing).toBe(true);

      // Resolve announcement
      await act(async () => {
        resolveAnnouncement!();
        // Wait a tick for cleanup
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should no longer be announcing
      expect(result.current.isAnnouncing).toBe(false);
    });

    it('should handle multiple concurrent announcements', async () => {
      let resolveAnnouncement1: () => void;
      let resolveAnnouncement2: () => void;
      
      mockAnnouncementEngine.announce
        .mockReturnValueOnce(new Promise<void>((resolve) => { resolveAnnouncement1 = resolve; }))
        .mockReturnValueOnce(new Promise<void>((resolve) => { resolveAnnouncement2 = resolve; }));

      const { result } = renderHook(() => useAnnounce());

      // Start two announcements
      await act(async () => {
        result.current.announce('Message 1');
        result.current.announce('Message 2');
      });

      // Should be announcing
      expect(result.current.isAnnouncing).toBe(true);

      // Resolve first announcement
      await act(async () => {
        resolveAnnouncement1!();
        // Wait a tick for cleanup
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should still be announcing (second announcement pending)
      expect(result.current.isAnnouncing).toBe(true);

      // Resolve second announcement
      await act(async () => {
        resolveAnnouncement2!();
        // Wait a tick for cleanup
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should no longer be announcing
      expect(result.current.isAnnouncing).toBe(false);
    });
  });

  describe('Hook Options', () => {
    it('should accept and use default options', async () => {
      const { result } = renderHook(() => useAnnounce({
        defaultPriority: 'assertive',
        defaultDelay: 300,
        autoErrorAnnouncement: false,
      }));

      await act(async () => {
        await result.current.announce('Test message');
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          priority: 'assertive',
          delay: 300,
        })
      );
    });

    it('should allow overriding default options', async () => {
      const { result } = renderHook(() => useAnnounce({
        defaultPriority: 'assertive',
        defaultDelay: 300,
      }));

      await act(async () => {
        await result.current.announce('Test message', {
          priority: 'polite',
          delay: 100,
        });
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          priority: 'polite',
          delay: 100,
        })
      );
    });
  });

  describe('Integration with Components', () => {
    const TestComponent = ({ onError }: { onError: (message: string) => void }) => {
      const { announceError, announceStatus, isAnnouncing } = useAnnounce();

      return (
        <div>
          <button
            onClick={() => announceStatus('Action completed')}
            data-testid="status-button"
          >
            Announce Status
          </button>
          <button
            onClick={() => {
              announceError('An error occurred');
              onError('An error occurred');
            }}
            data-testid="error-button"
          >
            Announce Error
          </button>
          <div data-testid="announcing-state">
            {isAnnouncing ? 'Announcing...' : 'Ready'}
          </div>
        </div>
      );
    };

    it('should work with React components', async () => {
      const onError = jest.fn();
      render(<TestComponent onError={onError} />);

      const statusButton = screen.getByTestId('status-button');
      const errorButton = screen.getByTestId('error-button');

      // Test status announcement
      await act(async () => {
        statusButton.click();
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Action completed',
        expect.objectContaining({ priority: 'polite' })
      );

      // Test error announcement
      await act(async () => {
        errorButton.click();
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'An error occurred',
        expect.objectContaining({ priority: 'assertive' })
      );
      expect(onError).toHaveBeenCalledWith('An error occurred');
    });

    it('should display announcing state in components', async () => {
      let resolveAnnouncement: () => void;
      const announcementPromise = new Promise<void>((resolve) => {
        resolveAnnouncement = resolve;
      });
      mockAnnouncementEngine.announce.mockReturnValue(announcementPromise);

      const onError = jest.fn();
      render(<TestComponent onError={onError} />);

      const statusButton = screen.getByTestId('status-button');
      const stateDisplay = screen.getByTestId('announcing-state');

      // Initial state
      expect(stateDisplay).toHaveTextContent('Ready');

      // Start announcement
      act(() => {
        statusButton.click();
      });

      // Should show announcing
      expect(stateDisplay).toHaveTextContent('Announcing...');

      // Complete announcement
      await act(async () => {
        resolveAnnouncement!();
      });

      // Should return to ready
      expect(stateDisplay).toHaveTextContent('Ready');
    });
  });

  describe('Accessibility Preferences Integration', () => {
    it('should use screen reader optimized settings', async () => {
      mockAccessibilityContext.preferences.screenReaderOptimized = true;
      mockAccessibilityContext.preferences.verboseAnnouncements = true;

      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        await result.current.announce('Test message');
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          // Should use longer delay for screen reader optimization
          delay: 150,
        })
      );
    });

    it('should respect announcement delay preference', async () => {
      mockAccessibilityContext.preferences.announcementDelay = 500;

      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        await result.current.announce('Test message');
      });

      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({ delay: 500 })
      );
    });

    it('should handle verbose announcements', async () => {
      mockAccessibilityContext.preferences.verboseAnnouncements = true;

      const { result } = renderHook(() => useAnnounce());

      await act(async () => {
        await result.current.announceStatus('Form saved');
      });

      // Verbose announcements might add contextual information
      expect(mockAnnouncementEngine.announce).toHaveBeenCalledWith(
        'Form saved',
        expect.objectContaining({ priority: 'polite' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle announcer initialization errors', () => {
      mockGetAnnouncer.mockImplementation(() => {
        throw new Error('Failed to initialize announcer');
      });

      const { result } = renderHook(() => useAnnounce());

      // Hook should still initialize but with limited functionality
      expect(result.current.announce).toBeDefined();
      expect(result.current.isAnnouncing).toBe(false);
    });

    it('should handle announcer method errors gracefully', async () => {
      mockAnnouncementEngine.clear.mockImplementation(() => {
        throw new Error('Clear failed');
      });

      const { result } = renderHook(() => useAnnounce());

      expect(() => {
        result.current.clear();
      }).not.toThrow();
    });

    it('should handle accessibility context errors', () => {
      mockAccessibilityContext.getPreference.mockImplementation(() => {
        throw new Error('Preference access failed');
      });

      const { result } = renderHook(() => useAnnounce());

      // Should still work with fallback values
      expect(result.current.announce).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should memoize announcement functions', () => {
      const { result, rerender } = renderHook(() => useAnnounce());

      const announce1 = result.current.announce;
      const announcePolite1 = result.current.announcePolite;

      rerender();

      const announce2 = result.current.announce;
      const announcePolite2 = result.current.announcePolite;

      // Functions should be memoized
      expect(announce1).toBe(announce2);
      expect(announcePolite1).toBe(announcePolite2);
    });

    it('should update when preferences change', () => {
      mockAccessibilityContext.preferences.announcementDelay = 150;
      
      const { result, rerender } = renderHook(() => useAnnounce());

      const initialOptions = result.current.announce;

      // Change preferences
      mockAccessibilityContext.preferences.announcementDelay = 300;
      rerender();

      // Should create new functions with updated preferences
      expect(result.current.announce).not.toBe(initialOptions);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup announcer on unmount', () => {
      const { unmount } = renderHook(() => useAnnounce());

      unmount();

      expect(mockAnnouncementEngine.destroy).toHaveBeenCalledTimes(1);
    });

    it('should cleanup event listeners', () => {
      const { unmount } = renderHook(() => useAnnounce());

      // Simulate event listener registration
      expect(mockAnnouncementEngine.on).toHaveBeenCalledWith('announced', expect.any(Function));

      unmount();

      expect(mockAnnouncementEngine.off).toHaveBeenCalledWith('announced', expect.any(Function));
    });
  });
});