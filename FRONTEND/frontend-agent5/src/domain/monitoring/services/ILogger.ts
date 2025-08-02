import { LogContext, LogEntry } from '../entities/LogEntry';

export interface ILogger {
  error(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  info(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
  trace(message: string, metadata?: any): void;
  setContext(context: Partial<LogContext>): void;
  child(context: Partial<LogContext>): ILogger;
}