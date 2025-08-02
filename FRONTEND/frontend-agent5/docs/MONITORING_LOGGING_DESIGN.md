# Monitoring and Logging Infrastructure Design

## Overview
Comprehensive monitoring and logging system design for the financial dashboard application.

## Architecture Components

### 1. Logging Infrastructure

#### Domain Model
```typescript
// src/domain/monitoring/entities/LogEntry.ts
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  service: string;
  context: LogContext;
  message: string;
  metadata?: Record<string, any>;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  sanitized: boolean;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface LogContext {
  environment: string;
  hostname: string;
  pid: number;
  version: string;
  module: string;
  function?: string;
  line?: number;
}
```

#### Logger Service Implementation
```typescript
// src/infrastructure/monitoring/services/Logger.ts
import { LogEntry, LogLevel } from '@/domain/monitoring/entities/LogEntry';
import { ISanitizer } from '@/domain/security/services/ISanitizer';

export interface ILogger {
  error(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  info(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
  trace(message: string, metadata?: any): void;
  setContext(context: Partial<LogContext>): void;
  child(context: Partial<LogContext>): ILogger;
}

export class StructuredLogger implements ILogger {
  private context: LogContext;
  private readonly transports: ILogTransport[];
  private readonly sanitizer: ISanitizer;

  constructor(
    context: LogContext,
    transports: ILogTransport[],
    sanitizer: ISanitizer
  ) {
    this.context = context;
    this.transports = transports;
    this.sanitizer = sanitizer;
  }

  error(message: string, metadata?: any): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  debug(message: string, metadata?: any): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  trace(message: string, metadata?: any): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  child(context: Partial<LogContext>): ILogger {
    return new StructuredLogger(
      { ...this.context, ...context },
      this.transports,
      this.sanitizer
    );
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      service: this.context.module,
      context: this.context,
      message,
      metadata: this.sanitizeMetadata(metadata),
      correlationId: this.getCorrelationId(),
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      sanitized: true
    };

    this.transports.forEach(transport => {
      transport.log(entry);
    });
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return undefined;
    return this.sanitizer.sanitizeObject(metadata);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCorrelationId(): string | undefined {
    // Get from async context or request headers
    return undefined; // Placeholder
  }

  private getUserId(): string | undefined {
    // Get from auth context
    return undefined; // Placeholder
  }

  private getSessionId(): string | undefined {
    // Get from session context
    return undefined; // Placeholder
  }
}
```

#### Log Transports
```typescript
// src/infrastructure/monitoring/transports/ILogTransport.ts
export interface ILogTransport {
  log(entry: LogEntry): void;
  flush(): Promise<void>;
}

// Console Transport
export class ConsoleTransport implements ILogTransport {
  private readonly isDevelopment: boolean;

  constructor(isDevelopment: boolean = false) {
    this.isDevelopment = isDevelopment;
  }

  log(entry: LogEntry): void {
    const { level, message, timestamp, context, metadata } = entry;
    const formattedMessage = this.format(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, metadata);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, metadata);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, metadata);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage, metadata);
        }
        break;
      case LogLevel.TRACE:
        if (this.isDevelopment) {
          console.trace(formattedMessage, metadata);
        }
        break;
    }
  }

  private format(entry: LogEntry): string {
    const { timestamp, level, context, message } = entry;
    return `[${timestamp.toISOString()}] [${level.toUpperCase()}] [${context.module}] ${message}`;
  }

  async flush(): Promise<void> {
    // Console transport doesn't need flushing
  }
}

// File Transport
export class FileTransport implements ILogTransport {
  private buffer: LogEntry[] = [];
  private readonly bufferSize: number = 100;
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // Write to file (implementation depends on environment)
    // For Next.js, might send to API endpoint instead
  }
}

// Remote Transport (e.g., for centralized logging)
export class RemoteTransport implements ILogTransport {
  private buffer: LogEntry[] = [];
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly batchSize: number = 50;
  private flushTimer?: NodeJS.Timeout;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.scheduleFlush();
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ entries })
      });
    } catch (error) {
      console.error('Failed to send logs to remote server:', error);
      // Re-queue entries or handle error appropriately
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }
}
```

### 2. Error Tracking System

#### Error Domain Model
```typescript
// src/domain/monitoring/entities/ErrorReport.ts
export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: ErrorDetails;
  context: ErrorContext;
  userContext?: UserContext;
  deviceContext?: DeviceContext;
  breadcrumbs: Breadcrumb[];
  tags: Record<string, string>;
  fingerprint: string;
  severity: ErrorSeverity;
  handled: boolean;
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  type?: string;
  value?: any;
  mechanism?: ErrorMechanism;
}

export interface ErrorContext {
  environment: string;
  release: string;
  component?: string;
  transaction?: string;
  serverName?: string;
  url?: string;
  runtime?: RuntimeContext;
}

export interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  ipAddress?: string;
  subscription?: string;
  segment?: string;
}

export interface DeviceContext {
  arch?: string;
  family?: string;
  model?: string;
  type?: string;
  brand?: string;
  charging?: boolean;
  online?: boolean;
  orientation?: string;
  simulator?: boolean;
  memorySize?: number;
  freeMemory?: number;
  usableMemory?: number;
  lowMemory?: boolean;
  batteryLevel?: number;
  screenResolution?: string;
  screenDensity?: number;
  locale?: string;
  timezone?: string;
}

export interface Breadcrumb {
  timestamp: Date;
  type: BreadcrumbType;
  category: string;
  message?: string;
  data?: Record<string, any>;
  level?: LogLevel;
}

export enum BreadcrumbType {
  DEFAULT = 'default',
  DEBUG = 'debug',
  ERROR = 'error',
  NAVIGATION = 'navigation',
  HTTP = 'http',
  INFO = 'info',
  QUERY = 'query',
  TRANSACTION = 'transaction',
  UI = 'ui',
  USER = 'user'
}

export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}
```

#### Error Tracking Service
```typescript
// src/infrastructure/monitoring/services/ErrorTracker.ts
export interface IErrorTracker {
  captureException(error: Error, context?: Partial<ErrorContext>): string;
  captureMessage(message: string, severity: ErrorSeverity): string;
  setUserContext(user: UserContext): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  setTags(tags: Record<string, string>): void;
  setContext(key: string, context: any): void;
  flush(): Promise<void>;
}

export class ErrorTracker implements IErrorTracker {
  private userContext?: UserContext;
  private deviceContext: DeviceContext;
  private breadcrumbs: Breadcrumb[] = [];
  private tags: Record<string, string> = {};
  private contexts: Record<string, any> = {};
  private readonly maxBreadcrumbs: number = 100;
  private readonly transport: IErrorTransport;

  constructor(transport: IErrorTransport) {
    this.transport = transport;
    this.deviceContext = this.collectDeviceContext();
  }

  captureException(error: Error, context?: Partial<ErrorContext>): string {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date(),
      error: this.extractErrorDetails(error),
      context: this.buildErrorContext(context),
      userContext: this.userContext,
      deviceContext: this.deviceContext,
      breadcrumbs: [...this.breadcrumbs],
      tags: { ...this.tags },
      fingerprint: this.generateFingerprint(error),
      severity: ErrorSeverity.ERROR,
      handled: true
    };

    this.transport.send(report);
    return report.id;
  }

  captureMessage(message: string, severity: ErrorSeverity): string {
    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date(),
      error: {
        name: 'Message',
        message
      },
      context: this.buildErrorContext(),
      userContext: this.userContext,
      deviceContext: this.deviceContext,
      breadcrumbs: [...this.breadcrumbs],
      tags: { ...this.tags },
      fingerprint: this.generateFingerprint(message),
      severity,
      handled: true
    };

    this.transport.send(report);
    return report.id;
  }

  setUserContext(user: UserContext): void {
    this.userContext = user;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  setTags(tags: Record<string, string>): void {
    this.tags = { ...this.tags, ...tags };
  }

  setContext(key: string, context: any): void {
    this.contexts[key] = context;
  }

  async flush(): Promise<void> {
    await this.transport.flush();
  }

  private extractErrorDetails(error: Error): ErrorDetails {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };
  }

  private buildErrorContext(partial?: Partial<ErrorContext>): ErrorContext {
    return {
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      serverName: process.env.HOSTNAME || 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...partial
    };
  }

  private collectDeviceContext(): DeviceContext {
    if (typeof window === 'undefined') {
      return {};
    }

    return {
      online: navigator.onLine,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      // Add more device information as needed
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error | string): string {
    const content = typeof error === 'string' ? error : `${error.name}-${error.message}`;
    // Simple fingerprint generation - could be improved with proper hashing
    return content.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString();
  }
}
```

### 3. Performance Monitoring

```typescript
// src/domain/monitoring/entities/PerformanceMetric.ts
export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: MetricUnit;
  tags: Record<string, string>;
  type: MetricType;
}

export enum MetricUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  BYTES = 'bytes',
  KILOBYTES = 'kb',
  MEGABYTES = 'mb',
  COUNT = 'count',
  PERCENTAGE = 'percent'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

// Performance Monitor
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  measure(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    
    this.record(name, duration, MetricUnit.MILLISECONDS, {
      type: 'function-execution'
    });
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'async-function-execution'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.record(name, duration, MetricUnit.MILLISECONDS, {
        type: 'async-function-execution',
        error: 'true'
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

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    return Array.from(this.metrics.values()).flat();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. User Activity Monitoring

```typescript
// src/domain/monitoring/entities/UserActivity.ts
export interface UserActivity {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  type: ActivityType;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  consent: ConsentStatus;
}

export enum ActivityType {
  PAGE_VIEW = 'page_view',
  CLICK = 'click',
  FORM_SUBMISSION = 'form_submission',
  API_CALL = 'api_call',
  ERROR = 'error',
  CUSTOM = 'custom'
}

export interface ConsentStatus {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  targeting: boolean;
}

// Activity Tracker
export class ActivityTracker {
  private consent: ConsentStatus = {
    analytics: false,
    performance: false,
    functional: true,
    targeting: false
  };

  setConsent(consent: Partial<ConsentStatus>): void {
    this.consent = { ...this.consent, ...consent };
  }

  track(activity: Omit<UserActivity, 'id' | 'timestamp' | 'consent'>): void {
    if (!this.isConsentGiven(activity.type)) {
      return;
    }

    const fullActivity: UserActivity = {
      ...activity,
      id: this.generateId(),
      timestamp: new Date(),
      consent: { ...this.consent }
    };

    // Send to analytics service
    this.send(fullActivity);
  }

  private isConsentGiven(type: ActivityType): boolean {
    switch (type) {
      case ActivityType.PAGE_VIEW:
      case ActivityType.CLICK:
        return this.consent.analytics;
      case ActivityType.API_CALL:
        return this.consent.performance;
      case ActivityType.ERROR:
        return this.consent.functional;
      default:
        return this.consent.analytics;
    }
  }

  private send(activity: UserActivity): void {
    // Implementation depends on analytics service
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

## Integration Examples

### Next.js App Integration

```typescript
// src/app/providers/MonitoringProvider.tsx
'use client';

import { createContext, useContext, useEffect } from 'react';
import { StructuredLogger } from '@/infrastructure/monitoring/services/Logger';
import { ErrorTracker } from '@/infrastructure/monitoring/services/ErrorTracker';
import { PerformanceMonitor } from '@/infrastructure/monitoring/services/PerformanceMonitor';
import { ActivityTracker } from '@/infrastructure/monitoring/services/ActivityTracker';

interface MonitoringContextValue {
  logger: StructuredLogger;
  errorTracker: ErrorTracker;
  performanceMonitor: PerformanceMonitor;
  activityTracker: ActivityTracker;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  const monitoring = useMonitoring();

  useEffect(() => {
    // Set up global error handler
    window.addEventListener('error', (event) => {
      monitoring.errorTracker.captureException(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      monitoring.errorTracker.captureException(
        new Error(`Unhandled promise rejection: ${event.reason}`)
      );
    });

    // Track page views
    monitoring.activityTracker.track({
      sessionId: getSessionId(),
      type: ActivityType.PAGE_VIEW,
      category: 'navigation',
      action: 'page_view',
      label: window.location.pathname
    });
  }, []);

  return (
    <MonitoringContext.Provider value={monitoring}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within MonitoringProvider');
  }
  return context;
}
```

### API Route Integration

```typescript
// src/app/api/monitoring/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infrastructure/monitoring';

export async function POST(request: NextRequest) {
  try {
    const { entries } = await request.json();
    
    // Process client-side logs
    entries.forEach((entry: any) => {
      logger.log(entry.level, entry.message, {
        ...entry.metadata,
        source: 'client'
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to process client logs', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Configuration

```typescript
// src/infrastructure/monitoring/config/MonitoringConfig.ts
export interface MonitoringConfig {
  logging: {
    level: LogLevel;
    transports: LogTransportConfig[];
  };
  errorTracking: {
    enabled: boolean;
    sampleRate: number;
    beforeSend?: (event: ErrorReport) => ErrorReport | null;
  };
  performance: {
    enabled: boolean;
    sampleRate: number;
  };
  analytics: {
    enabled: boolean;
    providers: AnalyticsProvider[];
  };
}

export const defaultMonitoringConfig: MonitoringConfig = {
  logging: {
    level: LogLevel.INFO,
    transports: [
      {
        type: 'console',
        options: {
          isDevelopment: process.env.NODE_ENV === 'development'
        }
      }
    ]
  },
  errorTracking: {
    enabled: true,
    sampleRate: 1.0
  },
  performance: {
    enabled: true,
    sampleRate: 0.1
  },
  analytics: {
    enabled: true,
    providers: []
  }
};
```