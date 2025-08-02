import { ILogTransport } from '@/domain/monitoring/services/ILogTransport';
import { LogEntry } from '@/domain/monitoring/entities/LogEntry';

export interface RemoteTransportConfig {
  endpoint: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
  headers?: Record<string, string>;
  retryLimit?: number;
  retryDelay?: number;
}

export class RemoteTransport implements ILogTransport {
  private buffer: LogEntry[] = [];
  private readonly config: Required<RemoteTransportConfig>;
  private flushTimer?: NodeJS.Timeout;
  private isFlushInProgress: boolean = false;

  constructor(config: RemoteTransportConfig) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      batchSize: config.batchSize || 50,
      flushInterval: config.flushInterval || 5000,
      headers: config.headers || {},
      retryLimit: config.retryLimit || 3,
      retryDelay: config.retryDelay || 1000,
    };
    
    this.scheduleFlush();
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushInProgress) {
      return;
    }

    this.isFlushInProgress = true;
    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendWithRetry(entries);
    } catch (error) {
      console.error('Failed to send logs to remote server after retries:', error);
      // Optionally re-queue some entries or implement a dead letter queue
      this.handleFailedEntries(entries);
    } finally {
      this.isFlushInProgress = false;
    }
  }

  private async sendWithRetry(entries: LogEntry[], attempt: number = 1): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.headers
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ entries })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      if (attempt < this.config.retryLimit) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        return this.sendWithRetry(entries, attempt + 1);
      }
      throw error;
    }
  }

  private handleFailedEntries(entries: LogEntry[]): void {
    // In a production system, you might want to:
    // 1. Write to local storage for later retry
    // 2. Send to a dead letter queue
    // 3. Emit an event for monitoring
    
    // For now, we'll just log a summary to console
    console.error(`Failed to send ${entries.length} log entries to remote server`);
    
    // Keep only the most recent entries if buffer is getting too large
    const maxBufferSize = this.config.batchSize * 3;
    if (this.buffer.length + entries.length > maxBufferSize) {
      const entriesToKeep = maxBufferSize - this.buffer.length;
      if (entriesToKeep > 0) {
        this.buffer.push(...entries.slice(-entriesToKeep));
      }
    } else {
      // Re-queue all failed entries
      this.buffer.push(...entries);
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Also flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Stop the automatic flush timer
   */
  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get the current buffer size (useful for monitoring)
   */
  public getBufferSize(): number {
    return this.buffer.length;
  }
}