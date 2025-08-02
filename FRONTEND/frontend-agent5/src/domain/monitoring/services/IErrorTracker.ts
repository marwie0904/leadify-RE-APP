import { ErrorReport, ErrorContext, UserContext, Breadcrumb, ErrorSeverity } from '../entities/ErrorReport';

export interface IErrorTracker {
  captureException(error: Error, context?: Partial<ErrorContext>): string;
  captureMessage(message: string, severity: ErrorSeverity): string;
  setUserContext(user: UserContext): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  setTags(tags: Record<string, string>): void;
  setContext(key: string, context: any): void;
  flush(): Promise<void>;
}