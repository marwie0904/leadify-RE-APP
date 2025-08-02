import { PerformanceMetric, MetricUnit, MetricType } from '@/domain/monitoring/entities/PerformanceMetric';

export interface IPerformanceTransport {
  send(metrics: PerformanceMetric[]): Promise<void>;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private transport?: IPerformanceTransport;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor(transport?: IPerformanceTransport) {
    this.transport = transport;
    this.setupPerformanceObservers();
    this.startAutoFlush();
  }

  measure(name: string, fn: () => void): void {
    const start = performance.now();
    try {
      fn();
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'function-execution',
        status: 'success'
      });
    } catch (error) {
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'function-execution',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'async-function-execution',
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'async-function-execution',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  record(
    name: string, 
    value: number, 
    unit: MetricUnit = MetricUnit.COUNT,
    tags: Record<string, string> = {}
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      name,
      value,
      unit,
      tags,
      type: MetricType.GAUGE
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
  }

  recordCounter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
    this.record(name, increment, MetricUnit.COUNT, { ...tags, metric_type: 'counter' });
  }

  recordGauge(name: string, value: number, unit: MetricUnit = MetricUnit.COUNT, tags: Record<string, string> = {}): void {
    this.record(name, value, unit, { ...tags, metric_type: 'gauge' });
  }

  recordHistogram(name: string, value: number, unit: MetricUnit = MetricUnit.MILLISECONDS, tags: Record<string, string> = {}): void {
    this.record(name, value, unit, { ...tags, metric_type: 'histogram' });
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    return Array.from(this.metrics.values()).flat();
  }

  async flush(): Promise<void> {
    if (!this.transport || this.metrics.size === 0) {
      return;
    }

    const allMetrics = this.getMetrics();
    this.metrics.clear();

    try {
      await this.transport.send(allMetrics);
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      // Re-add metrics on failure
      allMetrics.forEach(metric => {
        if (!this.metrics.has(metric.name)) {
          this.metrics.set(metric.name, []);
        }
        this.metrics.get(metric.name)!.push(metric);
      });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    // Observe navigation timing
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    } catch (e) {
      console.warn('Failed to setup navigation observer:', e);
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      console.warn('Failed to setup resource observer:', e);
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.record(`browser.paint.${entry.name}`, entry.startTime, MetricUnit.MILLISECONDS);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    } catch (e) {
      console.warn('Failed to setup paint observer:', e);
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.record('browser.lcp', lastEntry.startTime, MetricUnit.MILLISECONDS);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (e) {
      console.warn('Failed to setup LCP observer:', e);
    }
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    // Page load metrics
    this.record('page.load.total', entry.loadEventEnd - entry.fetchStart, MetricUnit.MILLISECONDS);
    this.record('page.load.dom_content_loaded', entry.domContentLoadedEventEnd - entry.fetchStart, MetricUnit.MILLISECONDS);
    this.record('page.load.dom_interactive', entry.domInteractive - entry.fetchStart, MetricUnit.MILLISECONDS);
    
    // Network metrics
    this.record('page.network.dns', entry.domainLookupEnd - entry.domainLookupStart, MetricUnit.MILLISECONDS);
    this.record('page.network.tcp', entry.connectEnd - entry.connectStart, MetricUnit.MILLISECONDS);
    this.record('page.network.request', entry.responseStart - entry.requestStart, MetricUnit.MILLISECONDS);
    this.record('page.network.response', entry.responseEnd - entry.responseStart, MetricUnit.MILLISECONDS);
    
    // Processing metrics
    this.record('page.processing.dom', entry.domComplete - entry.domInteractive, MetricUnit.MILLISECONDS);
    this.record('page.processing.load_event', entry.loadEventEnd - entry.loadEventStart, MetricUnit.MILLISECONDS);
  }

  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    const tags = {
      resource_type: resourceType,
      initiator_type: entry.initiatorType
    };

    this.record(`resource.duration.${resourceType}`, entry.duration, MetricUnit.MILLISECONDS, tags);
    this.record(`resource.size.${resourceType}`, entry.transferSize, MetricUnit.BYTES, tags);
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'style';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.match(/\.json$/)) return 'json';
    return 'other';
  }

  private startAutoFlush(): void {
    if (this.transport) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.flushInterval);

      // Also flush on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          this.flush();
        });
      }
    }
  }

  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}