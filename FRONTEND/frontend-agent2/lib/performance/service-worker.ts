'use client';

import { useState, useEffect } from 'react';

/**
 * Service Worker registration and management utilities
 */

export interface ServiceWorkerConfig {
  swUrl?: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      swUrl: '/sw.js',
      ...config
    };
  }

  static getInstance(config?: ServiceWorkerConfig): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager(config);
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && 
        !localStorage.getItem('enable-sw')) {
      console.log('Service Worker disabled in development');
      return null;
    }

    try {
      console.log('Registering service worker...');
      
      const registration = await navigator.serviceWorker.register(
        this.config.swUrl!,
        { scope: '/' }
      );

      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New update available
              console.log('New service worker update available');
              this.config.onUpdate?.(registration);
            } else {
              // First time installation
              console.log('Service worker installed successfully');
              this.config.onSuccess?.(registration);
            }
          }
        });
      });

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      console.log('Service worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return;
    }

    try {
      await this.registration.update();
      console.log('Service worker update check completed');
    } catch (error) {
      console.error('Service worker update failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  skipWaiting(): void {
    if (!this.registration?.waiting) {
      console.warn('No waiting service worker found');
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Get the current registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if service worker is supported and active
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  isActive(): boolean {
    return this.registration?.active !== null;
  }

  /**
   * Send message to service worker
   */
  sendMessage(message: any): void {
    if (!this.registration?.active) {
      console.warn('No active service worker to send message to');
      return;
    }

    this.registration.active.postMessage(message);
  }

  /**
   * Listen for messages from service worker
   */
  onMessage(callback: (event: MessageEvent) => void): void {
    if (!this.isSupported()) return;

    navigator.serviceWorker.addEventListener('message', callback);
  }

  /**
   * Cache management utilities
   */
  async clearCaches(pattern?: string): Promise<void> {
    if (!this.isSupported()) return;

    const cacheNames = await caches.keys();
    const cachesToDelete = pattern 
      ? cacheNames.filter(name => name.includes(pattern))
      : cacheNames;

    await Promise.all(
      cachesToDelete.map(cacheName => caches.delete(cacheName))
    );

    console.log('Caches cleared:', cachesToDelete);
  }

  async getCacheSize(): Promise<number> {
    if (!this.isSupported()) return 0;

    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  }
}

/**
 * React hook for service worker management
 */
export function useServiceWorker(config?: ServiceWorkerConfig) {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [manager] = useState(() => ServiceWorkerManager.getInstance(config));

  useEffect(() => {
    setIsSupported(manager.isSupported());

    if (manager.isSupported()) {
      // Register service worker
      manager.register().then((registration) => {
        setIsActive(!!registration?.active);
      });

      // Listen for updates
      const handleUpdate = () => setUpdateAvailable(true);
      const enhancedConfig = {
        ...config,
        onUpdate: (registration: ServiceWorkerRegistration) => {
          handleUpdate();
          config?.onUpdate?.(registration);
        }
      };

      // Update manager config
      (manager as any).config = { ...manager.getRegistration(), ...enhancedConfig };
    }
  }, []);

  const updateServiceWorker = () => {
    if (updateAvailable) {
      manager.skipWaiting();
      setUpdateAvailable(false);
    }
  };

  const clearCaches = (pattern?: string) => {
    return manager.clearCaches(pattern);
  };

  const getCacheSize = () => {
    return manager.getCacheSize();
  };

  return {
    isSupported,
    isActive,
    updateAvailable,
    updateServiceWorker,
    clearCaches,
    getCacheSize,
    manager
  };
}

/**
 * Performance metrics sync with background sync
 */
export function syncPerformanceMetrics(metrics: any[]): void {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    // Fallback to direct fetch
    fetch('/api/performance/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics })
    }).catch(console.error);
    return;
  }

  // Store metrics for background sync
  const request = indexedDB.open('performance-db', 1);
  
  request.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(['metrics'], 'readwrite');
    const store = transaction.objectStore('metrics');
    
    metrics.forEach(metric => {
      store.add({ ...metric, timestamp: Date.now() });
    });
  };

  // Register background sync (if supported)
  navigator.serviceWorker.ready.then((registration) => {
    if ('sync' in registration) {
      return (registration as any).sync.register('performance-metrics');
    }
  }).catch(console.error);
}

// Default export for easy importing
export default ServiceWorkerManager;