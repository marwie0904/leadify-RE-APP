'use client';

import { useEffect } from 'react';
import { webVitalsReporter, WebVitalsReporter as WebVitalsReporterClass, type WebVitalsMetric } from '@/lib/performance/web-vitals';

// Re-export for convenience
export type { WebVitalsMetric };

interface WebVitalsReporterProps {
  onReport?: (metric: WebVitalsMetric) => void;
  endpoint?: string;
}

export function WebVitalsReporter({ onReport, endpoint }: WebVitalsReporterProps) {
  useEffect(() => {
    // Initialize reporter with custom endpoint if provided
    if (endpoint) {
      // Create a new instance with custom endpoint
      const customReporter = new WebVitalsReporterClass(endpoint, onReport);
      return;
    }

    // Use default reporter with custom callback
    if (onReport) {
      // Since we can't modify the existing reporter's callback,
      // we'll create a new instance
      const customReporter = new WebVitalsReporterClass(
        '/api/performance/metrics',
        onReport
      );
    }
  }, [onReport, endpoint]);

  // This component doesn't render anything
  return null;
}

// Hook for easier integration
export function useWebVitals(onReport?: (metric: WebVitalsMetric) => void) {
  useEffect(() => {
    if (!onReport) return;

    // Create a custom reporter instance for this hook
    const reporter = new WebVitalsReporterClass(
      '/api/performance/metrics',
      onReport
    );

    return () => {
      // Cleanup if needed
    };
  }, [onReport]);

  return {
    getMetrics: () => webVitalsReporter.getMetrics(),
    getMetric: (name: string) => webVitalsReporter.getMetric(name)
  };
}