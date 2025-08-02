import winston from 'winston';
import { ILogTransport } from '@/domain/monitoring/services/ILogTransport';
import { LogEntry, LogLevel } from '@/domain/monitoring/entities/LogEntry';

export class WinstonTransport implements ILogTransport {
  private logger: winston.Logger;

  constructor(options?: winston.LoggerOptions) {
    const defaultOptions: winston.LoggerOptions = {
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    };

    this.logger = winston.createLogger({
      ...defaultOptions,
      ...options
    });
  }

  log(entry: LogEntry): void {
    const winstonLevel = this.mapLogLevel(entry.level);
    
    const logObject = {
      message: entry.message,
      level: winstonLevel,
      timestamp: entry.timestamp,
      service: entry.service,
      context: entry.context,
      correlationId: entry.correlationId,
      userId: entry.userId,
      sessionId: entry.sessionId,
      ...entry.metadata
    };

    this.logger.log(winstonLevel, entry.message, logObject);
  }

  private mapLogLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return 'error';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.DEBUG:
        return 'debug';
      case LogLevel.TRACE:
        return 'silly'; // Winston uses 'silly' for trace level
      default:
        return 'info';
    }
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      // Winston doesn't have a built-in flush method, but we can ensure
      // all transports have finished writing
      const transports = this.logger.transports;
      let pending = transports.length;

      if (pending === 0) {
        resolve();
        return;
      }

      transports.forEach((transport: any) => {
        if (transport.logStream && typeof transport.logStream.end === 'function') {
          transport.logStream.end(() => {
            pending--;
            if (pending === 0) {
              resolve();
            }
          });
        } else {
          pending--;
          if (pending === 0) {
            resolve();
          }
        }
      });
    });
  }

  /**
   * Add a new transport to the Winston logger
   */
  addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  /**
   * Remove a transport from the Winston logger
   */
  removeTransport(transport: winston.transport): void {
    this.logger.remove(transport);
  }

  /**
   * Update the log level
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }
}