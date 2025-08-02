'use client';

import { onCLS, onFCP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
  id: string;
  delta: number;
  navigationType: string;
}

export class WebVitalsReporter {
  private metrics: Map<string, number> = new Map();
  private reportingEndpoint: string;
  private onReport?: (metric: WebVitalsMetric) => void;

  constructor(endpoint: string = '/api/performance/metrics', onReport?: (metric: WebVitalsMetric) => void) {
    this.reportingEndpoint = endpoint;
    this.onReport = onReport;
    this.initializeVitals();
  }

  private initializeVitals(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));
  }

  private handleMetric(metric: Metric): void {
    this.metrics.set(metric.name, metric.value);
    
    const webVitalsMetric: WebVitalsMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      timestamp: new Date(),
      id: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType || 'unknown'
    };

    // Call custom reporter if provided
    this.onReport?.(webVitalsMetric);
    
    // Report to analytics
    this.reportMetric(webVitalsMetric);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value, `(${webVitalsMetric.rating})`);
    }
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FCP: { good: 1800, poor: 3000 },
      CLS: { good: 0.1, poor: 0.25 },
      TTFB: { good: 800, poor: 1800 },
    };
    
    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  }

  private async reportMetric(metric: WebVitalsMetric): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Send to Google Analytics if available
      if ('gtag' in window) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
        });
      }

      // Send to API endpoint
      await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.getSessionId(),
          userId: this.getUserId(),
          metric,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: this.getConnectionType(),
          deviceMemory: this.getDeviceMemory(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        })
      });
    } catch (error) {
      console.error('Failed to report metric:', error);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance-session-id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('performance-session-id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | null {
    // This should be replaced with actual user ID from auth context
    return localStorage.getItem('user-id') || null;
  }

  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  private getDeviceMemory(): number {
    return (navigator as any).deviceMemory || 0;
  }

  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  public getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }
}

// Singleton instance for global use
export const webVitalsReporter = new WebVitalsReporter();