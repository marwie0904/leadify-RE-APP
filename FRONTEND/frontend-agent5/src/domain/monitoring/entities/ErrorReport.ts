import { LogLevel } from './LogEntry';

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

export interface ErrorMechanism {
  type: string;
  handled?: boolean;
  synthetic?: boolean;
  data?: Record<string, any>;
}

export interface RuntimeContext {
  name?: string;
  version?: string;
}