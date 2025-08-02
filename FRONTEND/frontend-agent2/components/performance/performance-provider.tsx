'use client';

import { useEffect } from 'react';
import { WebVitalsReporter } from '@/components/performance/web-vitals-reporter';
import { PerformanceDashboard } from '@/components/performance/performance-dashboard';
import { useServiceWorker } from '@/lib/performance/service-worker';

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  // Register service worker
  const { isSupported, updateAvailable, updateServiceWorker } = useServiceWorker({
    onUpdate: () => {
      console.log('Service Worker update available');
    },
    onSuccess: () => {
      console.log('Service Worker registered successfully');
    },
    onError: (error) => {
      console.error('Service Worker registration failed:', error);
    }
  });

  // Handle service worker updates
  useEffect(() => {
    if (updateAvailable) {
      // You could show a notification to the user here
      console.log('New version available! Refresh to update.');
    }
  }, [updateAvailable]);

  return (
    <>
      {children}
      <WebVitalsReporter />
      <PerformanceDashboard />
    </>
  );
}