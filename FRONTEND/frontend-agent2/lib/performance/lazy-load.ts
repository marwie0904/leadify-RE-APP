import React, { lazy, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';

export interface LazyComponentConfig {
  loader: () => Promise<{ default: ComponentType<any> }>;
  loading?: ComponentType;
  error?: ComponentType<{ retry: () => void }>;
  delay?: number;
  timeout?: number;
  ssr?: boolean;
  prefetch?: 'on-hover' | 'on-visible' | 'on-idle' | 'immediate';
  retries?: number;
}

export function createLazyComponent(
  config: LazyComponentConfig
) {
  const LazyComponent = lazy(() => {
    let loadPromise = config.loader();

    // Add timeout if specified
    if (config.timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Component load timeout')), config.timeout);
      });
      loadPromise = Promise.race([loadPromise, timeoutPromise]);
    }

    // Add retry logic
    if (config.retries && config.retries > 0) {
      const retryLoad = async (attemptsLeft: number): Promise<{ default: ComponentType<any> }> => {
        try {
          return await loadPromise;
        } catch (error) {
          if (attemptsLeft > 0) {
            console.warn(`Component load failed, retrying... (${attemptsLeft} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            return retryLoad(attemptsLeft - 1);
          }
          throw error;
        }
      };
      loadPromise = retryLoad(config.retries);
    }

    return loadPromise;
  });

  // Implement prefetch strategies
  if (config.prefetch) {
    switch (config.prefetch) {
      case 'immediate':
        // Preload immediately
        config.loader().catch(console.error);
        break;
      case 'on-idle':
        // Preload when browser is idle
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            config.loader().catch(console.error);
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            config.loader().catch(console.error);
          }, 1000);
        }
        break;
      // on-hover and on-visible are handled by components using this
    }
  }

  return LazyComponent;
}

// Intersection Observer for lazy loading
export class LazyLoadObserver {
  private observer: IntersectionObserver;
  private callbacks = new Map<Element, () => void>();
  private static instance: LazyLoadObserver;

  constructor(options?: IntersectionObserverInit) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const callback = this.callbacks.get(entry.target);
          if (callback) {
            callback();
            this.unobserve(entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  static getInstance(options?: IntersectionObserverInit): LazyLoadObserver {
    if (!LazyLoadObserver.instance) {
      LazyLoadObserver.instance = new LazyLoadObserver(options);
    }
    return LazyLoadObserver.instance;
  }

  observe(element: Element, callback: () => void): void {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Hook for lazy loading with Intersection Observer
export function useLazyLoad(callback: () => void, options?: IntersectionObserverInit) {
  const observer = LazyLoadObserver.getInstance(options);

  const ref = (element: Element | null) => {
    if (element) {
      observer.observe(element, callback);
    }
  };

  return ref;
}

// Wrapper component for lazy loading with Suspense
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
}

export function LazyWrapper({ children, fallback, errorBoundary: ErrorBoundary }: LazyWrapperProps) {
  if (ErrorBoundary) {
    return React.createElement(ErrorBoundary, 
      { error: new Error('Component failed to load'), retry: () => window.location.reload() },
      React.createElement(Suspense, { fallback }, children)
    );
  }

  return React.createElement(Suspense, { fallback }, children);
}

// Default error boundary for lazy components
export function LazyErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return React.createElement('div', 
    { className: "flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50" },
    React.createElement('div', { className: "text-red-600 mb-4" },
      React.createElement('svg', 
        { className: "w-12 h-12 mx-auto mb-2", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })
      ),
      React.createElement('h3', { className: "text-lg font-semibold" }, "Component Failed to Load")
    ),
    React.createElement('p', { className: "text-red-700 text-sm mb-4 text-center" },
      error.message || 'An unexpected error occurred while loading this component.'
    ),
    React.createElement('button', 
      { onClick: retry, className: "px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" },
      "Try Again"
    )
  );
}

// Preload utilities
export function preloadComponent(loader: () => Promise<{ default: ComponentType<any> }>) {
  return loader().catch(console.error);
}

export function preloadComponents(loaders: (() => Promise<{ default: ComponentType<any> }>)[]) {
  return Promise.allSettled(loaders.map(loader => loader()));
}

// Resource hints utility
export function addResourceHints(urls: string[], type: 'preload' | 'prefetch' = 'prefetch') {
  if (typeof document === 'undefined') return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = type;
    link.as = 'script';
    link.href = url;
    
    if (type === 'preload') {
      link.setAttribute('fetchpriority', 'high');
    }
    
    document.head.appendChild(link);
  });
}