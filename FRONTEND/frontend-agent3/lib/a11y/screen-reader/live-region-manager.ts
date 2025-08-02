import {
  LiveRegionOptions,
  AnnouncementPriority,
  AnnouncementOptions,
  AccessibilityError,
  AccessibilityErrorCode,
} from '../core/types';

interface LiveRegion {
  id: string;
  element: HTMLElement;
  priority: AnnouncementPriority;
  options: LiveRegionOptions;
}

interface RegionTemplate {
  priority: AnnouncementPriority;
  label?: string;
  atomic?: boolean;
  relevant?: string;
  busy?: boolean;
  role?: string;
  hidden?: boolean;
}

interface AnnouncementEvent {
  message: string;
  regionId: string;
  timestamp: number;
}

interface RegionEvent {
  regionId: string;
  priority?: AnnouncementPriority;
}

type ManagerEvent = 'announced' | 'region-created' | 'region-removed';

export class LiveRegionManager {
  private container: HTMLElement;
  private regions: Map<string, LiveRegion> = new Map();
  private templates: Map<string, RegionTemplate> = new Map();
  private eventListeners: Map<ManagerEvent, Set<Function>> = new Map();
  private destroyed = false;
  private paused = false;
  private announcementQueues: Map<string, Array<{
    message: string;
    options: AnnouncementOptions;
    resolve: () => void;
    reject: (error: Error) => void;
  }>> = new Map();
  private processing = false;

  constructor(container: HTMLElement, options: { createDefaultRegions?: boolean } = {}) {
    if (!container) {
      throw new AccessibilityError(
        'Container element is required',
        AccessibilityErrorCode.INVALID_ELEMENT
      );
    }

    this.container = container;
    
    // Initialize event listener maps
    this.eventListeners.set('announced', new Set());
    this.eventListeners.set('region-created', new Set());
    this.eventListeners.set('region-removed', new Set());

    // Create default regions if requested
    if (options.createDefaultRegions) {
      this.createRegion('polite', { label: 'Status messages' });
      this.createRegion('assertive', { label: 'Error messages' });
    }
  }

  createRegion(priority: AnnouncementPriority, options: LiveRegionOptions = {}): string {
    if (this.destroyed) {
      throw new AccessibilityError(
        'LiveRegionManager has been destroyed',
        AccessibilityErrorCode.INVALID_OPERATION
      );
    }

    // Generate or use provided ID
    const id = options.id || `live-region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check for duplicate IDs
    if (this.regions.has(id)) {
      throw new AccessibilityError(
        `Live region with ID ${id} already exists`,
        AccessibilityErrorCode.DUPLICATE_ID
      );
    }

    // Create region element
    const element = this.createRegionElement(priority, options);
    
    // Store region
    const region: LiveRegion = {
      id,
      element,
      priority,
      options
    };
    
    this.regions.set(id, region);
    this.announcementQueues.set(id, []);
    
    // Add to container
    this.container.appendChild(element);
    
    // Emit event
    this.emit('region-created', { regionId: id, priority });
    
    return id;
  }

  createRegionFromTemplate(templateOrName: string | RegionTemplate): string {
    let template: RegionTemplate;
    
    if (typeof templateOrName === 'string') {
      const registeredTemplate = this.templates.get(templateOrName);
      if (!registeredTemplate) {
        throw new AccessibilityError(
          `Template ${templateOrName} not found`,
          AccessibilityErrorCode.TEMPLATE_NOT_FOUND
        );
      }
      template = registeredTemplate;
    } else {
      template = templateOrName;
    }

    const options: LiveRegionOptions = {
      label: template.label,
      atomic: template.atomic,
      relevant: template.relevant,
      busy: template.busy,
      role: template.role,
      hidden: template.hidden,
    };

    return this.createRegion(template.priority, options);
  }

  registerTemplate(name: string, template: RegionTemplate): void {
    this.templates.set(name, template);
  }

  private createRegionElement(priority: AnnouncementPriority, options: LiveRegionOptions): HTMLElement {
    const element = document.createElement('div');
    
    // Set basic ARIA attributes
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', options.atomic !== false ? 'true' : 'false');
    
    // Set role
    const role = options.role || (priority === 'assertive' ? 'alert' : 'status');
    element.setAttribute('role', role);
    
    // Set optional attributes
    if (options.label) {
      element.setAttribute('aria-label', options.label);
    }
    
    if (options.relevant) {
      element.setAttribute('aria-relevant', options.relevant);
    }
    
    if (options.busy !== undefined) {
      element.setAttribute('aria-busy', options.busy.toString());
    }
    
    // Set visibility
    if (options.hidden !== false) {
      element.className = 'sr-only';
      element.style.position = 'absolute';
      element.style.left = '-10000px';
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.overflow = 'hidden';
    }
    
    return element;
  }

  getRegion(id: string): HTMLElement | undefined {
    return this.regions.get(id)?.element;
  }

  getRegions(): string[] {
    return Array.from(this.regions.keys());
  }

  removeRegion(id: string): void {
    const region = this.regions.get(id);
    if (!region) return;

    // Clear any pending announcements
    const queue = this.announcementQueues.get(id);
    if (queue) {
      queue.forEach(item => {
        item.reject(new AccessibilityError(
          'Region was removed',
          AccessibilityErrorCode.REGION_REMOVED
        ));
      });
      this.announcementQueues.delete(id);
    }

    // Remove from DOM
    if (region.element.parentNode) {
      region.element.parentNode.removeChild(region.element);
    }

    // Remove from maps
    this.regions.delete(id);
    
    // Emit event
    this.emit('region-removed', { regionId: id });
  }

  updateRegion(id: string, options: Partial<LiveRegionOptions>): void {
    const region = this.regions.get(id);
    if (!region) return;

    const element = region.element;

    // Update attributes
    if (options.atomic !== undefined) {
      element.setAttribute('aria-atomic', options.atomic.toString());
    }
    
    if (options.busy !== undefined) {
      element.setAttribute('aria-busy', options.busy.toString());
    }
    
    if (options.label !== undefined) {
      element.setAttribute('aria-label', options.label);
    }
    
    if (options.relevant !== undefined) {
      element.setAttribute('aria-relevant', options.relevant);
    }
    
    if (options.role !== undefined) {
      element.setAttribute('role', options.role);
    }

    // Update stored options
    Object.assign(region.options, options);
  }

  async announce(
    message: string, 
    regionId?: string, 
    options: AnnouncementOptions = {}
  ): Promise<void> {
    if (this.destroyed) {
      throw new AccessibilityError(
        'LiveRegionManager has been destroyed',
        AccessibilityErrorCode.INVALID_OPERATION
      );
    }

    if (!message || message.trim() === '') {
      throw new AccessibilityError(
        'Message cannot be empty',
        AccessibilityErrorCode.INVALID_MESSAGE
      );
    }

    // Determine target region
    let targetRegionId = regionId;
    
    if (!targetRegionId) {
      // Find appropriate region by priority
      const priority = options.priority || 'polite';
      targetRegionId = this.findRegionByPriority(priority);
      
      if (!targetRegionId) {
        throw new AccessibilityError(
          `No ${priority} region available`,
          AccessibilityErrorCode.NO_REGION_AVAILABLE
        );
      }
    }

    // Verify region exists
    const region = this.regions.get(targetRegionId);
    if (!region) {
      throw new AccessibilityError(
        `Live region ${targetRegionId} not found`,
        AccessibilityErrorCode.REGION_NOT_FOUND
      );
    }

    return new Promise((resolve, reject) => {
      const announcementItem = {
        message,
        options,
        resolve,
        reject
      };

      // Add to queue
      const queue = this.announcementQueues.get(targetRegionId)!;
      queue.push(announcementItem);

      // Process queue if not paused
      if (!this.paused && !this.processing) {
        this.processQueue(targetRegionId);
      }
    });
  }

  private findRegionByPriority(priority: AnnouncementPriority): string | undefined {
    for (const [id, region] of this.regions) {
      if (region.priority === priority) {
        return id;
      }
    }
    return undefined;
  }

  private async processQueue(regionId: string): Promise<void> {
    const queue = this.announcementQueues.get(regionId);
    if (!queue || queue.length === 0) return;

    this.processing = true;
    const region = this.regions.get(regionId);
    
    if (!region) {
      // Clear queue if region doesn't exist
      queue.forEach(item => {
        item.reject(new AccessibilityError(
          'Region not found',
          AccessibilityErrorCode.REGION_NOT_FOUND
        ));
      });
      queue.length = 0;
      this.processing = false;
      return;
    }

    while (queue.length > 0 && !this.paused && !this.destroyed) {
      const item = queue.shift()!;
      
      try {
        // Apply delay if specified
        if (item.options.delay && item.options.delay > 0) {
          await this.delay(item.options.delay);
        }

        // Clear region first to ensure announcement is noticed
        region.element.textContent = '';
        
        // Use requestAnimationFrame to ensure DOM update
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Set the message
        region.element.textContent = item.message;
        
        // Emit event
        this.emit('announced', {
          message: item.message,
          regionId,
          timestamp: Date.now()
        });

        // Set up clearing if needed
        if (!item.options.persist) {
          const clearAfter = item.options.clearAfter || 900;
          setTimeout(() => {
            if (region.element.textContent === item.message) {
              region.element.textContent = '';
            }
          }, clearAfter);
        }

        item.resolve();
      } catch (error) {
        item.reject(error as Error);
      }
    }

    this.processing = false;

    // Process remaining items if any
    if (queue.length > 0 && !this.paused) {
      this.processQueue(regionId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    
    // Resume processing all queues
    for (const regionId of this.regions.keys()) {
      const queue = this.announcementQueues.get(regionId);
      if (queue && queue.length > 0 && !this.processing) {
        this.processQueue(regionId);
      }
    }
  }

  clearRegion(regionId: string): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    // Clear queue
    const queue = this.announcementQueues.get(regionId);
    if (queue) {
      queue.forEach(item => {
        item.reject(new AccessibilityError(
          'Queue cleared',
          AccessibilityErrorCode.QUEUE_CLEARED
        ));
      });
      queue.length = 0;
    }

    // Clear region content
    region.element.textContent = '';
  }

  on(event: ManagerEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: ManagerEvent, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: ManagerEvent, data: any): void {
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
    if (this.destroyed) return;
    
    this.destroyed = true;
    this.paused = true;

    // Clear all queues
    for (const [regionId, queue] of this.announcementQueues) {
      queue.forEach(item => {
        item.reject(new AccessibilityError(
          'Manager destroyed',
          AccessibilityErrorCode.MANAGER_DESTROYED
        ));
      });
      queue.length = 0;
    }

    // Remove all regions
    for (const regionId of Array.from(this.regions.keys())) {
      this.removeRegion(regionId);
    }

    // Clear maps
    this.regions.clear();
    this.templates.clear();
    this.announcementQueues.clear();
    this.eventListeners.clear();
  }
}

// Utility function to create a live region manager
export function createLiveRegionManager(
  container: HTMLElement,
  options?: { createDefaultRegions?: boolean }
): LiveRegionManager {
  return new LiveRegionManager(container, options);
}