import { ILogTransport } from '@/domain/monitoring/services/ILogTransport';
import { LogEntry, LogLevel } from '@/domain/monitoring/entities/LogEntry';

export class ConsoleTransport implements ILogTransport {
  private readonly isDevelopment: boolean;
  private readonly useColors: boolean;

  constructor(isDevelopment: boolean = false, useColors: boolean = true) {
    this.isDevelopment = isDevelopment;
    this.useColors = useColors && typeof window !== 'undefined';
  }

  log(entry: LogEntry): void {
    const { level, message, timestamp, context, metadata } = entry;
    const formattedMessage = this.format(entry);

    // Create console args array
    const args: any[] = [formattedMessage];
    
    // Add metadata if present
    if (metadata && Object.keys(metadata).length > 0) {
      args.push(metadata);
    }

    switch (level) {
      case LogLevel.ERROR:
        console.error(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(...args);
        }
        break;
      case LogLevel.TRACE:
        if (this.isDevelopment) {
          console.trace(...args);
        }
        break;
    }
  }

  private format(entry: LogEntry): string {
    const { timestamp, level, context, message, correlationId } = entry;
    const time = timestamp.toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    if (this.useColors) {
      const color = this.getLevelColor(level);
      const resetColor = '\x1b[0m';
      const dimColor = '\x1b[2m';
      
      let formatted = `${dimColor}[${time}]${resetColor} ${color}[${levelStr}]${resetColor} ${dimColor}[${context.module}]${resetColor} ${message}`;
      
      if (correlationId) {
        formatted += ` ${dimColor}(${correlationId})${resetColor}`;
      }
      
      return formatted;
    } else {
      let formatted = `[${time}] [${levelStr}] [${context.module}] ${message}`;
      
      if (correlationId) {
        formatted += ` (${correlationId})`;
      }
      
      return formatted;
    }
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.INFO:
        return '\x1b[36m'; // Cyan
      case LogLevel.DEBUG:
        return '\x1b[35m'; // Magenta
      case LogLevel.TRACE:
        return '\x1b[37m'; // White
      default:
        return '\x1b[0m'; // Reset
    }
  }

  async flush(): Promise<void> {
    // Console transport doesn't need flushing
    return Promise.resolve();
  }
}