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