import {
  Announcement,
  AnnouncementOptions,
  AnnouncementPriority,
  AccessibilityError,
  AccessibilityErrorCode,
} from '../core/types';

interface QueuedAnnouncement extends Announcement {
  options: AnnouncementOptions;
  deferred: {
    resolve: () => void;
    reject: (error: Error) => void;
  };
}

type AnnouncerEvent = 'announced' | 'cleared';

export class AnnouncementEngine {
  private container: HTMLElement;
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private queue: QueuedAnnouncement[] = [];
  private processing = false;
  private paused = false;
  private destroyed = false;
  private clearTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private processedIds: Map<string, number> = new Map();
  private eventListeners: Map<AnnouncerEvent, Set<Function>> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initialize();
  }

  private initialize(): void {
    // Create polite live region
    this.politeRegion = this.createLiveRegion('polite');
    this.container.appendChild(this.politeRegion);

    // Create assertive live region
    this.assertiveRegion = this.createLiveRegion('assertive');
    this.container.appendChild(this.assertiveRegion);

    // Initialize event listener maps
    this.eventListeners.set('announced', new Set());
    this.eventListeners.set('cleared', new Set());
  }

  private createLiveRegion(priority: AnnouncementPriority): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    region.className = 'sr-only';
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    return region;
  }

  async announce(message: string, options: AnnouncementOptions = {}): Promise<void> {
    if (this.destroyed) {
      throw new AccessibilityError(
        'AnnouncementEngine has been destroyed',
        AccessibilityErrorCode.ANNOUNCEMENT_FAILED
      );
    }

    if (!message || message.trim() === '') {
      throw new AccessibilityError(
        'Message cannot be empty',
        AccessibilityErrorCode.ANNOUNCEMENT_FAILED
      );
    }

    const priority = options.priority || 'polite';
    if (priority !== 'polite' && priority !== 'assertive') {
      throw new AccessibilityError(
        'Invalid announcement priority',
        AccessibilityErrorCode.ANNOUNCEMENT_FAILED
      );
    }

    // Handle debouncing for identical messages
    if (options.id) {
      const lastProcessed = this.processedIds.get(options.id);
      if (lastProcessed && Date.now() - lastProcessed < 100) {
        return; // Debounce identical messages within 100ms
      }
    }

    return new Promise((resolve, reject) => {
      const announcement: QueuedAnnouncement = {
        id: options.id || `announcement-${Date.now()}-${Math.random()}`,
        message,
        priority,
        timestamp: Date.now(),
        options,
        deferred: { resolve, reject },
      };

      if (options.clearQueue) {
        this.clearQueue();
      }

      if (priority === 'assertive') {
        // Insert assertive messages at the beginning
        this.queue.unshift(announcement);
      } else {
        // Add polite messages to the end
        this.queue.push(announcement);
      }

      if (!this.processing && !this.paused) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.paused || this.destroyed) {
      return;
    }

    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const announcement = this.queue.shift()!;

    try {
      if (announcement.options.delay && announcement.options.delay > 0) {
        await this.delay(announcement.options.delay);
      }

      await this.processAnnouncement(announcement);
      
      if (announcement.options.id) {
        this.processedIds.set(announcement.options.id, Date.now());
      }

      announcement.deferred.resolve();
    } catch (error) {
      announcement.deferred.reject(error as Error);
    }

    this.processing = false;

    // Process next announcement
    if (this.queue.length > 0 && !this.paused) {
      this.processQueue();
    }
  }

  private async processAnnouncement(announcement: QueuedAnnouncement): Promise<void> {
    const region = announcement.priority === 'assertive' 
      ? this.assertiveRegion 
      : this.politeRegion;

    if (!region) {
      throw new AccessibilityError(
        'Live region not available',
        AccessibilityErrorCode.ANNOUNCEMENT_FAILED
      );
    }

    // Clear region before announcement to ensure it's announced
    region.textContent = '';
    
    // Use requestAnimationFrame to ensure DOM update
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Set the announcement
    region.textContent = announcement.message;

    // Emit event
    this.emit('announced', announcement);

    // Clear after delay unless persist is true
    if (!announcement.options.persist) {
      const clearDelay = announcement.options.delay || 900; // Default 900ms clear delay
      const timeoutId = setTimeout(() => {
        region.textContent = '';
        this.clearTimeouts.delete(announcement.id);
      }, clearDelay);

      this.clearTimeouts.set(announcement.id, timeoutId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private clearQueue(): void {
    this.queue.forEach(announcement => {
      announcement.deferred.reject(
        new AccessibilityError(
          'Queue cleared',
          AccessibilityErrorCode.ANNOUNCEMENT_FAILED
        )
      );
    });
    this.queue = [];
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    if (!this.processing && this.queue.length > 0) {
      this.processQueue();
    }
  }

  clear(): void {
    this.clearQueue();
    
    if (this.politeRegion) {
      this.politeRegion.textContent = '';
    }
    
    if (this.assertiveRegion) {
      this.assertiveRegion.textContent = '';
    }

    // Clear all timeouts
    this.clearTimeouts.forEach(timeout => clearTimeout(timeout));
    this.clearTimeouts.clear();

    this.emit('cleared', undefined);
  }

  getAnnouncementQueue(): Announcement[] {
    return this.queue.map(({ id, message, priority, timestamp }) => ({
      id,
      message,
      priority,
      timestamp,
    }));
  }

  on(event: AnnouncerEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: AnnouncerEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: AnnouncerEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} event listener:`, error);
        }
      });
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.clear();

    // Remove live regions
    if (this.politeRegion && this.politeRegion.parentNode) {
      this.politeRegion.parentNode.removeChild(this.politeRegion);
    }
    
    if (this.assertiveRegion && this.assertiveRegion.parentNode) {
      this.assertiveRegion.parentNode.removeChild(this.assertiveRegion);
    }

    // Clear all event listeners
    this.eventListeners.clear();
    
    // Clear processed IDs
    this.processedIds.clear();
  }
}

// Singleton instance management
let announcerInstance: AnnouncementEngine | null = null;

export function getAnnouncer(): AnnouncementEngine {
  if (!announcerInstance) {
    // Create container for announcer if it doesn't exist
    let container = document.getElementById('a11y-announcer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'a11y-announcer';
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);
    }
    
    announcerInstance = new AnnouncementEngine(container);
  }
  
  return announcerInstance;
}

export function destroyAnnouncer(): void {
  if (announcerInstance) {
    announcerInstance.destroy();
    announcerInstance = null;
  }
  
  const container = document.getElementById('a11y-announcer');
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}