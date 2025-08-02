import { ILogger } from '@/domain/monitoring/services/ILogger';
import { ILogTransport } from '@/domain/monitoring/services/ILogTransport';
import { LogEntry, LogLevel, LogContext } from '@/domain/monitoring/entities/LogEntry';
import { ISanitizer } from '@/domain/security/services/ISanitizer';

export class StructuredLogger implements ILogger {
  private context: LogContext;
  private readonly transports: ILogTransport[];
  private readonly sanitizer: ISanitizer;
  private readonly minLevel: LogLevel;

  constructor(
    context: LogContext,
    transports: ILogTransport[],
    sanitizer: ISanitizer,
    minLevel: LogLevel = LogLevel.INFO
  ) {
    this.context = context;
    this.transports = transports;
    this.sanitizer = sanitizer;
    this.minLevel = minLevel;
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
      this.sanitizer,
      this.minLevel
    );
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    // Check if we should log this level
    if (!this.shouldLog(level)) {
      return;
    }

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

    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (error) {
        // Don't throw errors from logging - log to console as fallback
        console.error('Failed to send log to transport:', error);
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(this.minLevel);
    return currentLevelIndex <= minLevelIndex;
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return undefined;
    
    // Define sensitive fields to remove
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'authorization',
      'creditCard', 'ssn', 'bankAccount', 'privateKey'
    ];

    // Define fields to mask
    const fieldsToMask = [
      'email', 'phone', 'ipAddress', 'username', 'userId'
    ];

    return this.sanitizer.sanitizeObject(metadata, {
      removeFields: sensitiveFields,
      maskFields: fieldsToMask
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCorrelationId(): string | undefined {
    // In a real implementation, this would get the correlation ID from
    // async context or request headers
    if (typeof window !== 'undefined') {
      // Client-side: try to get from session storage
      return sessionStorage.getItem('correlationId') || undefined;
    }
    return undefined;
  }

  private getUserId(): string | undefined {
    // In a real implementation, this would get from auth context
    if (typeof window !== 'undefined') {
      // Client-side: try to get from local storage or auth context
      const authData = localStorage.getItem('auth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          return parsed.userId || parsed.id;
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    // In a real implementation, this would get from session context
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sessionId') || undefined;
    }
    return undefined;
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(transport => transport.flush())
    );
  }
}