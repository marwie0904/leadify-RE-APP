import { AnnouncementEngine } from '@/lib/a11y/screen-reader/announcer';
import { AnnouncementOptions, AnnouncementPriority } from '@/lib/a11y/core/types';

describe('AnnouncementEngine', () => {
  let announcer: AnnouncementEngine;
  let container: HTMLElement;

  beforeEach(() => {
    // Create container for live regions
    container = document.createElement('div');
    container.id = 'announcer-container';
    document.body.appendChild(container);

    announcer = new AnnouncementEngine(container);
  });

  afterEach(() => {
    announcer.destroy();
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create live regions on initialization', () => {
      const politeRegion = container.querySelector('[aria-live="polite"]');
      const assertiveRegion = container.querySelector('[aria-live="assertive"]');

      expect(politeRegion).toBeTruthy();
      expect(assertiveRegion).toBeTruthy();
      expect(politeRegion?.classList.contains('sr-only')).toBe(true);
      expect(assertiveRegion?.classList.contains('sr-only')).toBe(true);
    });

    it('should set proper ARIA attributes on live regions', () => {
      const politeRegion = container.querySelector('[aria-live="polite"]');
      const assertiveRegion = container.querySelector('[aria-live="assertive"]');

      expect(politeRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(assertiveRegion?.getAttribute('aria-atomic')).toBe('true');
      expect(politeRegion?.getAttribute('role')).toBe('status');
      expect(assertiveRegion?.getAttribute('role')).toBe('alert');
    });
  });

  describe('Announcements', () => {
    it('should announce message with default priority', async () => {
      const message = 'Form submitted successfully';
      await announcer.announce(message);

      // Wait for announcement to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe(message);
    });

    it('should announce message with assertive priority', async () => {
      const message = 'Error: Invalid input';
      await announcer.announce(message, { priority: 'assertive' });

      await new Promise(resolve => setTimeout(resolve, 100));

      const assertiveRegion = container.querySelector('[aria-live="assertive"]');
      expect(assertiveRegion?.textContent).toBe(message);
    });

    it('should clear announcement after delay', async () => {
      const message = 'Temporary message';
      await announcer.announce(message);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe(message);

      // Wait for clear delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(politeRegion?.textContent).toBe('');
    });

    it('should handle custom delay', async () => {
      const message = 'Delayed message';
      const delay = 500;
      
      const startTime = Date.now();
      await announcer.announce(message, { delay });

      // Should not announce immediately
      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe('');

      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, delay + 100));
      
      expect(politeRegion?.textContent).toBe(message);
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('Queue Management', () => {
    it('should queue multiple announcements', async () => {
      const messages = ['First', 'Second', 'Third'];
      
      // Add all messages to queue
      messages.forEach(msg => announcer.announce(msg));

      // Wait for all to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have announced all messages
      const queue = announcer.getAnnouncementQueue();
      expect(queue).toHaveLength(0); // All processed
    });

    it('should clear queue when requested', async () => {
      // Add multiple messages
      announcer.announce('Message 1');
      announcer.announce('Message 2');
      announcer.announce('Message 3');

      // Clear with new announcement
      await announcer.announce('Important message', { clearQueue: true });

      const queue = announcer.getAnnouncementQueue();
      expect(queue).toHaveLength(0);
    });

    it('should handle priority correctly in queue', async () => {
      const politeRegion = container.querySelector('[aria-live="polite"]');
      const assertiveRegion = container.querySelector('[aria-live="assertive"]');

      // Add polite message
      announcer.announce('Polite message', { priority: 'polite' });
      
      // Add assertive message
      announcer.announce('Assertive message', { priority: 'assertive' });

      // Assertive should be processed first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(assertiveRegion?.textContent).toBe('Assertive message');
    });
  });

  describe('Pause and Resume', () => {
    it('should pause announcement processing', async () => {
      announcer.pause();

      await announcer.announce('Message while paused');
      
      // Wait to ensure it's not processed
      await new Promise(resolve => setTimeout(resolve, 200));

      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe('');
    });

    it('should resume announcement processing', async () => {
      announcer.pause();
      await announcer.announce('Queued message');

      // Verify it's not announced while paused
      await new Promise(resolve => setTimeout(resolve, 100));
      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe('');

      // Resume and verify announcement
      announcer.resume();
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(politeRegion?.textContent).toBe('Queued message');
    });
  });

  describe('Event Handling', () => {
    it('should emit announced event', async () => {
      const callback = jest.fn();
      announcer.on('announced', callback);

      const message = 'Test announcement';
      await announcer.announce(message);

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message,
          priority: 'polite',
        })
      );
    });

    it('should emit cleared event', () => {
      const callback = jest.fn();
      announcer.on('cleared', callback);

      announcer.clear();

      expect(callback).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const callback = jest.fn();
      announcer.on('announced', callback);
      
      // Remove listener
      announcer.off('announced', callback);

      await announcer.announce('Test');
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle announcement with empty message', async () => {
      await expect(announcer.announce('')).rejects.toThrow('Message cannot be empty');
    });

    it('should handle invalid priority', async () => {
      await expect(
        // @ts-ignore - Testing invalid value
        announcer.announce('Test', { priority: 'invalid' })
      ).rejects.toThrow('Invalid announcement priority');
    });

    it('should continue processing after error', async () => {
      // Cause an error
      await expect(announcer.announce('')).rejects.toThrow();

      // Should still work
      await announcer.announce('Valid message');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const politeRegion = container.querySelector('[aria-live="polite"]');
      expect(politeRegion?.textContent).toBe('Valid message');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      announcer.destroy();

      // Live regions should be removed
      const politeRegion = container.querySelector('[aria-live="polite"]');
      const assertiveRegion = container.querySelector('[aria-live="assertive"]');

      expect(politeRegion).toBeFalsy();
      expect(assertiveRegion).toBeFalsy();
    });

    it('should clear queue on destroy', () => {
      announcer.announce('Message 1');
      announcer.announce('Message 2');

      announcer.destroy();

      const queue = announcer.getAnnouncementQueue();
      expect(queue).toHaveLength(0);
    });

    it('should prevent announcements after destroy', async () => {
      announcer.destroy();

      await expect(announcer.announce('Test')).rejects.toThrow('AnnouncementEngine has been destroyed');
    });
  });

  describe('Performance', () => {
    it('should handle rapid announcements', async () => {
      const messageCount = 50;
      const messages: Promise<void>[] = [];

      for (let i = 0; i < messageCount; i++) {
        messages.push(announcer.announce(`Message ${i}`));
      }

      await Promise.all(messages);
      
      // Should process all without errors
      expect(announcer.getAnnouncementQueue().length).toBeLessThanOrEqual(messageCount);
    });

    it('should debounce identical messages', async () => {
      const message = 'Repeated message';
      const announceSpy = jest.spyOn(announcer as any, 'processAnnouncement');

      // Send same message multiple times rapidly
      for (let i = 0; i < 5; i++) {
        announcer.announce(message, { id: 'same-id' });
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      // Should only process once due to debouncing
      expect(announceSpy).toHaveBeenCalledTimes(1);
    });
  });
});