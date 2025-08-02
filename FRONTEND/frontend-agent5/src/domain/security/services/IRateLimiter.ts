export interface IRateLimiter {
  isAllowed(key: string, options?: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  getStatus(key: string): Promise<RateLimitStatus | null>;
}

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitStatus {
  key: string;
  requests: number;
  windowStart: Date;
  blocked: boolean;
}