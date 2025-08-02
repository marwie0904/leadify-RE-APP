import { LiveRegionManager } from '@/lib/a11y/screen-reader/live-region-manager';
import { 
  LiveRegionOptions,
  AnnouncementPriority,
  AccessibilityError,
  AccessibilityErrorCode
} from '@/lib/a11y/core/types';

describe('LiveRegionManager', () => {
  let manager: LiveRegionManager;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'live-region-container';
    document.body.appendChild(container);
    
    manager = new LiveRegionManager(container);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create manager with container', () => {
      expect(manager).toBeDefined();
      expect(manager.getRegions()).toHaveLength(0);
    });

    it('should throw error for invalid container', () => {
      expect(() => {
        new LiveRegionManager(null as any);
      }).toThrow('Container element is required');
    });

    it('should create default regions when configured', () => {
      const managerWithDefaults = new LiveRegionManager(container, {
        createDefaultRegions: true
      });

      const regions = managerWithDefaults.getRegions();
      expect(regions.length).toBeGreaterThan(0);
      
      managerWithDefaults.destroy();
    });
  });

  describe('Region Creation', () => {
    it('should create polite live region', () => {
      const regionId = manager.createRegion('polite', {
        label: 'Status messages'
      });

      expect(regionId).toBeDefined();
      
      const region = manager.getRegion(regionId);
      expect(region).toBeDefined();
      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.getAttribute('aria-label')).toBe('Status messages');
    });

    it('should create assertive live region', () => {
      const regionId = manager.createRegion('assertive', {
        label: 'Error messages'
      });

      const region = manager.getRegion(regionId);
      expect(region?.getAttribute('aria-live')).toBe('assertive');
      expect(region?.getAttribute('role')).toBe('alert');
    });

    it('should create region with custom attributes', () => {
      const regionId = manager.createRegion('polite', {
        label: 'Custom region',
        atomic: false,
        relevant: 'additions text',
        busy: true
      });

      const region = manager.getRegion(regionId);
      expect(region?.getAttribute('aria-atomic')).toBe('false');
      expect(region?.getAttribute('aria-relevant')).toBe('additions text');
      expect(region?.getAttribute('aria-busy')).toBe('true');
    });

    it('should generate unique IDs for regions', () => {
      const id1 = manager.createRegion('polite');
      const id2 = manager.createRegion('polite');
      
      expect(id1).not.toBe(id2);
      expect(manager.getRegion(id1)).toBeTruthy();
      expect(manager.getRegion(id2)).toBeTruthy();
    });

    it('should allow custom region IDs', () => {
      const customId = 'my-custom-region';
      const regionId = manager.createRegion('polite', {
        id: customId
      });

      expect(regionId).toBe(customId);
      expect(manager.getRegion(customId)).toBeTruthy();
    });

    it('should throw error for duplicate custom IDs', () => {
      const customId = 'duplicate-id';
      manager.createRegion('polite', { id: customId });

      expect(() => {
        manager.createRegion('assertive', { id: customId });
      }).toThrow('Live region with ID duplicate-id already exists');
    });
  });

  describe('Region Management', () => {
    let regionId: string;

    beforeEach(() => {
      regionId = manager.createRegion('polite', {
        label: 'Test region'
      });
    });

    it('should get region by ID', () => {
      const region = manager.getRegion(regionId);
      expect(region).toBeTruthy();
      expect(region?.getAttribute('aria-label')).toBe('Test region');
    });

    it('should return undefined for non-existent region', () => {
      const region = manager.getRegion('non-existent');
      expect(region).toBeUndefined();
    });

    it('should list all regions', () => {
      const regions = manager.getRegions();
      expect(regions).toHaveLength(1);
      expect(regions[0]).toBe(regionId);
    });

    it('should remove region', () => {
      manager.removeRegion(regionId);
      
      expect(manager.getRegion(regionId)).toBeUndefined();
      expect(manager.getRegions()).toHaveLength(0);
    });

    it('should handle removal of non-existent region', () => {
      expect(() => {
        manager.removeRegion('non-existent');
      }).not.toThrow();
    });

    it('should update region properties', () => {
      manager.updateRegion(regionId, {
        atomic: false,
        busy: true,
        label: 'Updated label'
      });

      const region = manager.getRegion(regionId);
      expect(region?.getAttribute('aria-atomic')).toBe('false');
      expect(region?.getAttribute('aria-busy')).toBe('true');
      expect(region?.getAttribute('aria-label')).toBe('Updated label');
    });
  });

  describe('Announcements', () => {
    let politeRegionId: string;
    let assertiveRegionId: string;

    beforeEach(() => {
      politeRegionId = manager.createRegion('polite', {
        label: 'Status messages'
      });
      assertiveRegionId = manager.createRegion('assertive', {
        label: 'Error messages'
      });
    });

    it('should announce to specific region', async () => {
      const message = 'Form saved successfully';
      await manager.announce(message, politeRegionId);

      const region = manager.getRegion(politeRegionId);
      expect(region?.textContent).toBe(message);
    });

    it('should announce to default polite region', async () => {
      const message = 'Default announcement';
      await manager.announce(message);

      // Should use the first polite region
      const region = manager.getRegion(politeRegionId);
      expect(region?.textContent).toBe(message);
    });

    it('should announce to assertive region by priority', async () => {
      const message = 'Critical error occurred';
      await manager.announce(message, undefined, { priority: 'assertive' });

      const region = manager.getRegion(assertiveRegionId);
      expect(region?.textContent).toBe(message);
    });

    it('should handle delayed announcements', async () => {
      const message = 'Delayed message';
      const delay = 100;

      const startTime = Date.now();
      await manager.announce(message, politeRegionId, { delay });

      const region = manager.getRegion(politeRegionId);
      expect(region?.textContent).toBe(message);
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(delay);
    });

    it('should clear announcements after specified time', async () => {
      const message = 'Temporary message';
      await manager.announce(message, politeRegionId, { 
        clearAfter: 100 
      });

      const region = manager.getRegion(politeRegionId);
      expect(region?.textContent).toBe(message);

      // Wait for clear
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(region?.textContent).toBe('');
    });

    it('should persist announcements when configured', async () => {
      const message = 'Persistent message';
      await manager.announce(message, politeRegionId, { 
        persist: true 
      });

      const region = manager.getRegion(politeRegionId);
      expect(region?.textContent).toBe(message);

      // Wait to ensure it doesn't clear
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(region?.textContent).toBe(message);
    });

    it('should throw error for non-existent region', async () => {
      await expect(
        manager.announce('Test', 'non-existent-region')
      ).rejects.toThrow('Live region non-existent-region not found');
    });

    it('should handle empty messages', async () => {
      await expect(
        manager.announce('', politeRegionId)
      ).rejects.toThrow('Message cannot be empty');
    });
  });

  describe('Queue Management', () => {
    let regionId: string;

    beforeEach(() => {
      regionId = manager.createRegion('polite');
    });

    it('should queue multiple announcements', async () => {
      const messages = ['First', 'Second', 'Third'];
      
      // Queue all messages
      const promises = messages.map(msg => 
        manager.announce(msg, regionId, { delay: 50 })
      );

      // Wait for all to complete
      await Promise.all(promises);

      // Should show the last message
      const region = manager.getRegion(regionId);
      expect(region?.textContent).toBe('Third');
    });

    it('should handle rapid fire announcements', async () => {
      const messageCount = 10;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < messageCount; i++) {
        promises.push(manager.announce(`Message ${i}`, regionId));
      }

      await Promise.all(promises);
      
      // Should handle all without errors
      const region = manager.getRegion(regionId);
      expect(region?.textContent).toMatch(/Message \d/);
    });

    it('should clear region queue', async () => {
      // Pause processing to ensure messages stay queued
      manager.pause();
      
      // Queue multiple messages (don't await, just queue them)
      const promise1 = manager.announce('Message 1', regionId);
      const promise2 = manager.announce('Message 2', regionId);
      const promise3 = manager.announce('Message 3', regionId);

      // Wait a bit to ensure they're queued
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear the queue - should reject the promises
      manager.clearRegion(regionId);

      const region = manager.getRegion(regionId);
      expect(region?.textContent).toBe('');

      // The promises should be rejected
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');
      await expect(promise3).rejects.toThrow('Queue cleared');
    });

    it('should pause and resume announcements', async () => {
      manager.pause();

      // Try to announce while paused
      const promise = manager.announce('Paused message', regionId);

      // Should not announce immediately
      await new Promise(resolve => setTimeout(resolve, 50));
      const region = manager.getRegion(regionId);
      expect(region?.textContent).toBe('');

      // Resume and message should appear
      manager.resume();
      await promise;
      expect(region?.textContent).toBe('Paused message');
    });
  });

  describe('Region Templates', () => {
    it('should create region from template', () => {
      const template = {
        priority: 'polite' as AnnouncementPriority,
        label: 'Status updates',
        atomic: true,
        relevant: 'additions'
      };

      const regionId = manager.createRegionFromTemplate(template);
      const region = manager.getRegion(regionId);

      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.getAttribute('aria-label')).toBe('Status updates');
      expect(region?.getAttribute('aria-atomic')).toBe('true');
      expect(region?.getAttribute('aria-relevant')).toBe('additions');
    });

    it('should register and use custom templates', () => {
      const templateName = 'notification';
      const template = {
        priority: 'assertive' as AnnouncementPriority,
        label: 'Notifications',
        role: 'alert'
      };

      manager.registerTemplate(templateName, template);
      const regionId = manager.createRegionFromTemplate(templateName);
      const region = manager.getRegion(regionId);

      expect(region?.getAttribute('aria-live')).toBe('assertive');
      expect(region?.getAttribute('aria-label')).toBe('Notifications');
      expect(region?.getAttribute('role')).toBe('alert');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        manager.createRegionFromTemplate('non-existent');
      }).toThrow('Template non-existent not found');
    });
  });

  describe('Accessibility Features', () => {
    it('should set proper ARIA attributes for polite regions', () => {
      const regionId = manager.createRegion('polite');
      const region = manager.getRegion(regionId);

      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.getAttribute('aria-atomic')).toBe('true');
      expect(region?.getAttribute('role')).toBe('status');
    });

    it('should set proper ARIA attributes for assertive regions', () => {
      const regionId = manager.createRegion('assertive');
      const region = manager.getRegion(regionId);

      expect(region?.getAttribute('aria-live')).toBe('assertive');
      expect(region?.getAttribute('aria-atomic')).toBe('true');
      expect(region?.getAttribute('role')).toBe('alert');
    });

    it('should create visually hidden regions by default', () => {
      const regionId = manager.createRegion('polite');
      const region = manager.getRegion(regionId);

      expect(region?.className).toContain('sr-only');
      expect(region?.style.position).toBe('absolute');
      expect(region?.style.left).toBe('-10000px');
    });

    it('should create visible regions when configured', () => {
      const regionId = manager.createRegion('polite', {
        hidden: false
      });
      const region = manager.getRegion(regionId);

      expect(region?.className).not.toContain('sr-only');
      expect(region?.style.position).not.toBe('absolute');
    });
  });

  describe('Event System', () => {
    let regionId: string;

    beforeEach(() => {
      regionId = manager.createRegion('polite');
    });

    it('should emit announced event', async () => {
      const callback = jest.fn();
      manager.on('announced', callback);

      const message = 'Test announcement';
      await manager.announce(message, regionId);

      expect(callback).toHaveBeenCalledWith({
        message,
        regionId,
        timestamp: expect.any(Number)
      });
    });

    it('should emit region-created event', () => {
      const callback = jest.fn();
      manager.on('region-created', callback);

      const newRegionId = manager.createRegion('assertive');

      expect(callback).toHaveBeenCalledWith({
        regionId: newRegionId,
        priority: 'assertive'
      });
    });

    it('should emit region-removed event', () => {
      const callback = jest.fn();
      manager.on('region-removed', callback);

      manager.removeRegion(regionId);

      expect(callback).toHaveBeenCalledWith({
        regionId
      });
    });

    it('should remove event listeners', async () => {
      const callback = jest.fn();
      manager.on('announced', callback);
      manager.off('announced', callback);

      await manager.announce('Test', regionId);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup and Error Handling', () => {
    it('should clean up all regions on destroy', () => {
      const region1 = manager.createRegion('polite');
      const region2 = manager.createRegion('assertive');

      manager.destroy();

      expect(manager.getRegion(region1)).toBeUndefined();
      expect(manager.getRegion(region2)).toBeUndefined();
      expect(manager.getRegions()).toHaveLength(0);
    });

    it('should handle multiple destroy calls', () => {
      expect(() => {
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
    });

    it('should handle container removal gracefully', () => {
      const regionId = manager.createRegion('polite');
      
      // Remove container
      container.remove();

      expect(() => {
        manager.announce('Test', regionId);
        manager.destroy();
      }).not.toThrow();
    });

    it('should handle region removal during announcement', async () => {
      const regionId = manager.createRegion('polite');
      
      // Pause to ensure announcement stays queued
      manager.pause();
      
      // Start announcement
      const promise = manager.announce('Test', regionId);
      
      // Wait a bit to ensure it's queued 
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Remove region before announcement completes (should reject the promise)
      manager.removeRegion(regionId);
      
      // Should reject the promise
      await expect(promise).rejects.toThrow('Region was removed');
    });
  });

  describe('Performance', () => {
    it('should handle many regions efficiently', () => {
      const regionCount = 100;
      const regionIds: string[] = [];

      // Create many regions
      for (let i = 0; i < regionCount; i++) {
        regionIds.push(manager.createRegion('polite', {
          label: `Region ${i}`
        }));
      }

      expect(manager.getRegions()).toHaveLength(regionCount);

      // Clean up efficiently
      manager.destroy();
      expect(manager.getRegions()).toHaveLength(0);
    });

    it('should batch DOM updates', async () => {
      const regionId = manager.createRegion('polite');
      const messageCount = 50;
      const promises: Promise<void>[] = [];

      // Fire many rapid announcements
      for (let i = 0; i < messageCount; i++) {
        promises.push(manager.announce(`Message ${i}`, regionId));
      }

      // All should complete without overwhelming the DOM
      await Promise.all(promises);
      
      const region = manager.getRegion(regionId);
      expect(region?.textContent).toMatch(/Message \d+/);
    });
  });
});