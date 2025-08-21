/**
 * Retry Handler
 * Implements exponential backoff with jitter for failed requests
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Default retryable HTTP status codes
 */
const DEFAULT_RETRYABLE_STATUSES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Default retryable error messages
 */
const DEFAULT_RETRYABLE_ERRORS = [
  'network',
  'timeout',
  'fetch failed',
  'econnreset',
  'enotfound',
  'etimedout',
  'econnrefused',
];

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any, options: RetryOptions = {}): boolean {
  const retryableStatuses = options.retryableStatuses || DEFAULT_RETRYABLE_STATUSES;
  const retryableErrors = options.retryableErrors || DEFAULT_RETRYABLE_ERRORS;

  // Check if it's a Response with retryable status
  if (error instanceof Response) {
    return retryableStatuses.includes(error.status);
  }

  // Check if it's a network error
  if (error instanceof TypeError && error.message) {
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(msg => errorMessage.includes(msg));
  }

  // Check custom error types
  if (error?.isRetryable) {
    return true;
  }

  // Check if it's a known network error
  if (error?.code) {
    const errorCode = error.code.toLowerCase();
    return retryableErrors.some(msg => errorCode.includes(msg));
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  // Exponential backoff: delay = baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter (0-50% of calculated delay)
  const jitter = Math.random() * 0.5 * exponentialDelay;
  
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryableError(error, options)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        console.error(`[Retry Handler] All ${maxRetries + 1} attempts failed`);
        throw error;
      }

      // Calculate delay
      const delay = calculateRetryDelay(attempt, baseDelay, maxDelay);
      
      console.log(
        `[Retry Handler] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms`,
        { error: error instanceof Error ? error.message : error }
      );

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () => Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]),
    retryOptions
  );
}

/**
 * Batch retry handler for multiple requests
 */
export async function batchRetry<T>(
  requests: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<Array<{ success: true; data: T } | { success: false; error: any }>> {
  return Promise.all(
    requests.map(async (request) => {
      try {
        const data = await withRetry(request, options);
        return { success: true as const, data };
      } catch (error) {
        return { success: false as const, error };
      }
    })
  );
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (
      this.state === 'open' &&
      Date.now() - this.lastFailureTime > this.resetTimeout
    ) {
      this.state = 'half-open';
    }

    // If circuit is open, fail fast
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      
      // Reset on success
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn('[Circuit Breaker] Circuit opened due to excessive failures');
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
    console.info('[Circuit Breaker] Circuit reset');
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}