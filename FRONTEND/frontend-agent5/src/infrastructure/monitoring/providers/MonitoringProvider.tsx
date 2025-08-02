'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { ILogger } from '@/domain/monitoring/services/ILogger';
import { IErrorTracker } from '@/domain/monitoring/services/IErrorTracker';
import { StructuredLogger } from '@/infrastructure/monitoring/services/StructuredLogger';
import { ErrorTracker } from '@/infrastructure/monitoring/services/ErrorTracker';
import { PerformanceMonitor } from '@/infrastructure/monitoring/services/PerformanceMonitor';
import { ActivityTracker } from '@/infrastructure/monitoring/services/ActivityTracker';
import { ConsoleTransport } from '@/infrastructure/monitoring/transports/ConsoleTransport';
import { RemoteTransport } from '@/infrastructure/monitoring/transports/RemoteTransport';
import { SentryErrorTransport } from '@/infrastructure/monitoring/transports/SentryErrorTransport';
import { LogLevel, LogContext } from '@/domain/monitoring/entities/LogEntry';
import { ISanitizer } from '@/domain/security/services/ISanitizer';
import { DOMPurifySanitizer } from '@/infrastructure/security/services/DOMPurifySanitizer';
import { ActivityType } from '@/domain/monitoring/entities/UserActivity';

interface MonitoringContextValue {
  logger: ILogger;
  errorTracker: IErrorTracker;
  performanceMonitor: PerformanceMonitor;
  activityTracker: ActivityTracker;
  sanitizer: ISanitizer;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

interface MonitoringProviderProps {
  children: React.ReactNode;
  config?: {
    logLevel?: LogLevel;
    enableRemoteLogging?: boolean;
    enableErrorTracking?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableActivityTracking?: boolean;
    remoteLogEndpoint?: string;
    apiKey?: string;
  };
}

export function MonitoringProvider({ 
  children, 
  config = {} 
}: MonitoringProviderProps) {
  const monitoring = useMemo(() => {
    const {
      logLevel = LogLevel.INFO,
      enableRemoteLogging = false,
      enableErrorTracking = true,
      enablePerformanceMonitoring = true,
      enableActivityTracking = true,
      remoteLogEndpoint,
      apiKey
    } = config;

    // Create sanitizer
    const sanitizer = new DOMPurifySanitizer();

    // Create log transports
    const transports = [
      new ConsoleTransport(process.env.NODE_ENV === 'development', true)
    ];

    if (enableRemoteLogging && remoteLogEndpoint) {
      transports.push(new RemoteTransport({
        endpoint: remoteLogEndpoint,
        apiKey,
        batchSize: 50,
        flushInterval: 5000
      }));
    }

    // Create logger
    const baseContext: LogContext = {
      environment: process.env.NODE_ENV || 'development',
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      pid: typeof process !== 'undefined' ? process.pid : 0,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      module: 'MonitoringProvider'
    };

    const logger = new StructuredLogger(
      baseContext,
      transports,
      sanitizer,
      logLevel
    );

    // Create error tracker
    const errorTransport = new SentryErrorTransport();
    const errorTracker = new ErrorTracker(errorTransport);

    // Create performance monitor
    const performanceTransport = enablePerformanceMonitoring ? {
      send: async (metrics: any[]) => {
        // In a real implementation, this would send to your metrics service
        if (process.env.NODE_ENV === 'development') {
          console.log('Performance metrics:', metrics);
        }
      }
    } : undefined;

    const performanceMonitor = new PerformanceMonitor(performanceTransport);

    // Create activity tracker
    const activityTransport = enableActivityTracking ? {
      send: async (activities: any[]) => {
        // In a real implementation, this would send to your analytics service
        if (process.env.NODE_ENV === 'development') {
          console.log('User activities:', activities);
        }
      }
    } : undefined;

    const activityTracker = new ActivityTracker(activityTransport);

    return {
      logger,
      errorTracker,
      performanceMonitor,
      activityTracker,
      sanitizer
    };
  }, [config]);

  useEffect(() => {
    // Set up global error handlers
    const handleError = (event: ErrorEvent) => {
      monitoring.errorTracker.captureException(event.error || new Error(event.message));
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(`Unhandled promise rejection: ${event.reason}`);
      monitoring.errorTracker.captureException(error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Track initial page view
    monitoring.activityTracker.trackPageView(
      window.location.pathname,
      document.referrer
    );

    // Set up performance monitoring for route changes
    const handleRouteChange = () => {
      monitoring.activityTracker.trackPageView(window.location.pathname);
      monitoring.performanceMonitor.recordCounter('page.navigation', 1, {
        path: window.location.pathname
      });
    };

    // Listen for route changes (Next.js specific)
    const handlePopState = () => {
      handleRouteChange();
    };

    window.addEventListener('popstate', handlePopState);

    // Intercept fetch requests for API monitoring
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        monitoring.activityTracker.trackApiCall(
          url,
          args[1]?.method || 'GET',
          response.status,
          duration
        );
        
        monitoring.performanceMonitor.recordHistogram(
          'api.request.duration',
          duration,
          'ms',
          {
            method: args[1]?.method || 'GET',
            status: response.status.toString(),
            endpoint: new URL(url).pathname
          }
        );
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        monitoring.activityTracker.trackApiCall(
          url,
          args[1]?.method || 'GET',
          0,
          duration
        );
        
        monitoring.errorTracker.captureException(
          error instanceof Error ? error : new Error('Fetch failed'),
          { component: 'fetch-interceptor' }
        );
        
        throw error;
      }
    };

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('popstate', handlePopState);
      window.fetch = originalFetch;
      
      // Stop monitoring services
      monitoring.performanceMonitor.stop();
      monitoring.activityTracker.stop();
    };
  }, [monitoring]);

  return (
    <MonitoringContext.Provider value={monitoring}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring(): MonitoringContextValue {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}

// Convenience hooks for specific services
export function useLogger(): ILogger {
  const { logger } = useMonitoring();
  return logger;
}

export function useErrorTracker(): IErrorTracker {
  const { errorTracker } = useMonitoring();
  return errorTracker;
}

export function usePerformanceMonitor(): PerformanceMonitor {
  const { performanceMonitor } = useMonitoring();
  return performanceMonitor;
}

export function useActivityTracker(): ActivityTracker {
  const { activityTracker } = useMonitoring();
  return activityTracker;
}

// Higher-order component for automatic error boundary integration
export function withMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const WrappedComponent = (props: T) => {
    const { errorTracker } = useMonitoring();
    
    useEffect(() => {
      // Set component context for error tracking
      errorTracker.setContext('component', componentName || Component.name);
    }, [errorTracker]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withMonitoring(${componentName || Component.name})`;
  
  return WrappedComponent;
}