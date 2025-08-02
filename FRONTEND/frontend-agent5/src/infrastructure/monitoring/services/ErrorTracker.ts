import { IErrorTracker } from '@/domain/monitoring/services/IErrorTracker';
import { IErrorTransport } from '@/domain/monitoring/services/IErrorTransport';
import {
  ErrorReport,
  ErrorDetails,
  ErrorContext,
  UserContext,
  DeviceContext,
  Breadcrumb,
  ErrorSeverity,
  BreadcrumbType
} from '@/domain/monitoring/entities/ErrorReport';

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
    this.setupGlobalHandlers();
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

    this.transport.send(report).catch(err => {
      console.error('Failed to send error report:', err);
    });

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

    this.transport.send(report).catch(err => {
      console.error('Failed to send error report:', err);
    });

    return report.id;
  }

  setUserContext(user: UserContext): void {
    this.userContext = user;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: breadcrumb.timestamp || new Date()
    });
    
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
    const details: ErrorDetails = {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.constructor.name
    };

    // Extract additional properties from the error object
    const errorObj = error as any;
    if (errorObj.code) {
      details.value = { code: errorObj.code };
    }

    return details;
  }

  private buildErrorContext(partial?: Partial<ErrorContext>): ErrorContext {
    return {
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      serverName: process.env.HOSTNAME || 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...partial,
      runtime: {
        name: 'browser',
        version: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };
  }

  private collectDeviceContext(): DeviceContext {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {};
    }

    const context: DeviceContext = {
      online: navigator.onLine,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      screenDensity: window.devicePixelRatio
    };

    // Get memory info if available
    const nav = navigator as any;
    if (nav.deviceMemory) {
      context.memorySize = nav.deviceMemory * 1024 * 1024 * 1024; // Convert GB to bytes
    }

    // Get connection info if available
    if (nav.connection) {
      context.type = nav.connection.effectiveType;
    }

    return context;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFingerprint(error: Error | string): string {
    const content = typeof error === 'string' 
      ? error 
      : `${error.name}-${error.message}`;
    
    // Simple hash function for fingerprinting
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      
      this.captureException(error, {
        component: 'window.onerror',
        url: event.filename,
        runtime: {
          name: 'browser',
          version: navigator.userAgent
        }
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(`Unhandled promise rejection: ${event.reason}`);
      
      this.captureException(error, {
        component: 'unhandledrejection'
      });
    });

    // Add breadcrumbs for navigation
    if (typeof window.history !== 'undefined') {
      const originalPushState = window.history.pushState;
      window.history.pushState = (...args) => {
        this.addBreadcrumb({
          timestamp: new Date(),
          type: BreadcrumbType.NAVIGATION,
          category: 'navigation',
          message: `Navigated to ${args[2]}`,
          data: { to: args[2] }
        });
        return originalPushState.apply(window.history, args);
      };
    }

    // Add breadcrumbs for console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.addBreadcrumb({
        timestamp: new Date(),
        type: BreadcrumbType.ERROR,
        category: 'console',
        message: 'Console error',
        data: { arguments: args }
      });
      return originalConsoleError.apply(console, args);
    };
  }
}