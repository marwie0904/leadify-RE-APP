import * as Sentry from '@sentry/nextjs';
import { IErrorTransport } from '@/domain/monitoring/services/IErrorTransport';
import { ErrorReport, ErrorSeverity } from '@/domain/monitoring/entities/ErrorReport';

export class SentryErrorTransport implements IErrorTransport {
  constructor(dsn?: string) {
    if (dsn || process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.init({
        dsn: dsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
            maskAllInputs: true
          })
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, hint) {
          // Filter out sensitive information
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          return event;
        }
      });
    }
  }

  async send(report: ErrorReport): Promise<void> {
    // Set user context
    if (report.userContext) {
      Sentry.setUser({
        id: report.userContext.id,
        email: report.userContext.email,
        username: report.userContext.username,
        ip_address: report.userContext.ipAddress,
        segment: report.userContext.segment
      });
    }

    // Set tags
    Object.entries(report.tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });

    // Add breadcrumbs
    report.breadcrumbs.forEach(breadcrumb => {
      Sentry.addBreadcrumb({
        timestamp: breadcrumb.timestamp.getTime() / 1000,
        type: breadcrumb.type as any,
        category: breadcrumb.category,
        message: breadcrumb.message,
        data: breadcrumb.data,
        level: this.mapLogLevelToSentry(breadcrumb.level)
      });
    });

    // Set extra context
    Sentry.setContext('device', report.deviceContext);
    Sentry.setContext('error_details', {
      fingerprint: report.fingerprint,
      handled: report.handled
    });

    // Send the error
    if (report.error.stack) {
      // If we have a stack trace, create an Error object
      const error = new Error(report.error.message);
      error.name = report.error.name;
      error.stack = report.error.stack;
      
      Sentry.captureException(error, {
        level: this.mapSeverityToSentry(report.severity),
        fingerprint: [report.fingerprint],
        contexts: {
          app: report.context
        }
      });
    } else {
      // Otherwise, capture as a message
      Sentry.captureMessage(report.error.message, {
        level: this.mapSeverityToSentry(report.severity),
        fingerprint: [report.fingerprint],
        contexts: {
          app: report.context
        }
      });
    }
  }

  async flush(): Promise<void> {
    // Flush with a timeout of 2 seconds
    await Sentry.flush(2000);
  }

  private mapSeverityToSentry(severity: ErrorSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case ErrorSeverity.FATAL:
        return 'fatal';
      case ErrorSeverity.ERROR:
        return 'error';
      case ErrorSeverity.WARNING:
        return 'warning';
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.DEBUG:
        return 'debug';
      default:
        return 'error';
    }
  }

  private mapLogLevelToSentry(level?: string): Sentry.SeverityLevel {
    if (!level) return 'info';
    
    switch (level.toLowerCase()) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
      case 'trace':
        return 'debug';
      default:
        return 'info';
    }
  }

  /**
   * Configure Sentry scope
   */
  configureScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.configureScope(callback);
  }

  /**
   * Set a global tag
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Set user context
   */
  setUser(user: Sentry.User | null): void {
    Sentry.setUser(user);
  }
}