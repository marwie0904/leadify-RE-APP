import { 
  IRateLimiter, 
  RateLimitOptions, 
  RateLimitResult, 
  RateLimitStatus 
} from '@/domain/security/services/IRateLimiter';

interface RateLimitEntry {
  requests: number;
  windowStart: Date;
  blocked: boolean;
  blockUntil?: Date;
}

export class MemoryRateLimiter implements IRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;
  
  private readonly defaultOptions: Required<Omit<RateLimitOptions, 'keyGenerator'>> = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  constructor(private globalOptions: RateLimitOptions = {}) {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async isAllowed(key: string, options: RateLimitOptions = {}): Promise<RateLimitResult> {
    const config = { ...this.defaultOptions, ...this.globalOptions, ...options };
    const now = new Date();
    
    let entry = this.store.get(key);
    
    // Check if currently blocked
    if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.blockUntil,
        retryAfter: Math.ceil((entry.blockUntil.getTime() - now.getTime()) / 1000)
      };
    }

    // Initialize or reset window if needed
    if (!entry || this.isWindowExpired(entry, config.windowMs, now)) {
      entry = {
        requests: 0,
        windowStart: now,
        blocked: false
      };
      this.store.set(key, entry);
    }

    // Increment request count
    entry.requests++;

    // Check if limit exceeded
    if (entry.requests > config.maxRequests) {
      entry.blocked = true;
      entry.blockUntil = new Date(now.getTime() + config.windowMs);
      
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.blockUntil,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    }

    const remaining = Math.max(0, config.maxRequests - entry.requests);
    const resetTime = new Date(entry.windowStart.getTime() + config.windowMs);

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      resetTime
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    return {
      key,
      requests: entry.requests,
      windowStart: entry.windowStart,
      blocked: entry.blocked
    };
  }

  /**
   * Get all active rate limit entries (for monitoring)
   */
  getAllStatus(): Map<string, RateLimitStatus> {
    const status = new Map<string, RateLimitStatus>();
    
    for (const [key, entry] of this.store.entries()) {
      status.set(key, {
        key,
        requests: entry.requests,
        windowStart: entry.windowStart,
        blocked: entry.blocked
      });
    }
    
    return status;
  }

  /**
   * Get statistics about rate limiting
   */
  getStatistics(): {
    totalKeys: number;
    blockedKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
  } {
    let blockedKeys = 0;
    let totalRequests = 0;

    for (const entry of this.store.values()) {
      if (entry.blocked) {
        blockedKeys++;
      }
      totalRequests += entry.requests;
    }

    return {
      totalKeys: this.store.size,
      blockedKeys,
      totalRequests,
      averageRequestsPerKey: this.store.size > 0 ? totalRequests / this.store.size : 0
    };
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop the cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  private isWindowExpired(entry: RateLimitEntry, windowMs: number, now: Date): boolean {
    return now.getTime() - entry.windowStart.getTime() >= windowMs;
  }

  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      // Remove entries that are expired and not blocked
      if (!entry.blocked && this.isWindowExpired(entry, this.defaultOptions.windowMs, now)) {
        keysToDelete.push(key);
      }
      // Remove entries that were blocked but the block has expired
      else if (entry.blocked && entry.blockUntil && entry.blockUntil <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));

    // Log cleanup if there were expired entries
    if (keysToDelete.length > 0) {
      console.log(`Rate limiter cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }
}