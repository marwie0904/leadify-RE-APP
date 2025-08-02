import { LogEntry } from '../entities/LogEntry';

export interface ILogTransport {
  log(entry: LogEntry): void;
  flush(): Promise<void>;
}