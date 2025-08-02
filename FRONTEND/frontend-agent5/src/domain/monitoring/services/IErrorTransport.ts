import { ErrorReport } from '../entities/ErrorReport';

export interface IErrorTransport {
  send(report: ErrorReport): Promise<void>;
  flush(): Promise<void>;
}