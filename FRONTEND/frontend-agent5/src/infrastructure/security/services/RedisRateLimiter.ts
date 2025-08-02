import { 
  IRateLimiter, 
  RateLimitOptions, 
  RateLimitResult, 
  RateLimitStatus 
} from '@/domain/security/services/IRateLimiter';

// Redis client interface (can be adapted to different Redis libraries)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  multi(): RedisMulti;
}

interface RedisMulti {
  incr(key: string): RedisMulti;
  expire(key: string, seconds: number): RedisMulti;
  exec(): Promise<Array<[Error | null, any]>>;
}

export class RedisRateLimiter implements IRateLimiter {
  private readonly defaultOptions: Required<Omit<RateLimitOptions, 'keyGenerator'>> = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  constructor(
    private redisClient: RedisClient,
    private globalOptions: RateLimitOptions = {},
    private keyPrefix: string = 'rate_limit:'
  ) {}

  async isAllowed(key: string, options: RateLimitOptions = {}): Promise<RateLimitResult> {
    const config = { ...this.defaultOptions, ...this.globalOptions, ...options };
    const redisKey = this.getRedisKey(key);
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSeconds);

    try {
      // Use a sliding window approach with Redis
      const windowKey = `${redisKey}:${windowStart}`;
      const blockKey = `${redisKey}:blocked`;
      
      // Check if currently blocked
      const blocked = await this.redisClient.get(blockKey);
      if (blocked) {
        const blockUntil = new Date(parseInt(blocked) * 1000);
        const retryAfter = Math.max(0, Math.ceil((blockUntil.getTime() - Date.now()) / 1000));
        
        if (retryAfter > 0) {
          return {
            allowed: false,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: blockUntil,
            retryAfter
          };
        } else {
          // Block has expired, remove it
          await this.redisClient.del(blockKey);
        }
      }

      // Increment request count and set expiration atomically
      const multi = this.redisClient.multi();
      multi.incr(windowKey);
      multi.expire(windowKey, windowSeconds);
      
      const results = await multi.exec();
      const requestCount = results[0][1] as number;

      // Check if limit exceeded
      if (requestCount > config.maxRequests) {
        // Block for the remainder of the window
        const blockUntil = (windowStart + windowSeconds) * 1000;
        await this.redisClient.set(blockKey, Math.floor(blockUntil / 1000).toString(), {
          EX: windowSeconds
        });

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: new Date(blockUntil),
          retryAfter: windowSeconds
        };
      }

      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetTime = new Date((windowStart + windowSeconds) * 1000);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining,
        resetTime
      };

    } catch (error) {
      console.error('Redis rate limiter error:', error);
      // Fail open - allow the request if Redis is unavailable
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMs)
      };
    }
  }

  async reset(key: string): Promise<void> {
    const redisKey = this.getRedisKey(key);
    try {
      // Delete all keys associated with this rate limit key
      const pattern = `${redisKey}:*`;
      
      // Note: In a real implementation, you might want to use SCAN for better performance
      // This is a simplified version
      await this.redisClient.del(`${redisKey}:blocked`);
      
      // Clean up window keys (this is simplified - in production you'd want to track active windows)
      const now = Math.floor(Date.now() / 1000);
      const windowSeconds = Math.ceil(this.defaultOptions.windowMs / 1000);
      
      for (let i = 0; i < 5; i++) { // Clean up last 5 windows
        const windowStart = now - (i * windowSeconds);
        await this.redisClient.del(`${redisKey}:${windowStart}`);
      }
    } catch (error) {
      console.error('Redis rate limiter reset error:', error);
      throw error;
    }
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const redisKey = this.getRedisKey(key);
    const windowSeconds = Math.ceil(this.defaultOptions.windowMs / 1000);
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSeconds);

    try {
      const windowKey = `${redisKey}:${windowStart}`;
      const blockKey = `${redisKey}:blocked`;

      const [requestCount, blocked] = await Promise.all([
        this.redisClient.get(windowKey),
        this.redisClient.get(blockKey)
      ]);

      return {
        key,
        requests: requestCount ? parseInt(requestCount) : 0,
        windowStart: new Date(windowStart * 1000),
        blocked: blocked !== null
      };
    } catch (error) {
      console.error('Redis rate limiter status error:', error);
      return null;
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStatistics(): Promise<{
    activeKeys: number;
    blockedKeys: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you'd want to maintain separate sets for tracking
      return {
        activeKeys: 0, // Would require scanning Redis keys
        blockedKeys: 0  // Would require scanning blocked keys
      };
    } catch (error) {
      console.error('Redis rate limiter statistics error:', error);
      return {
        activeKeys: 0,
        blockedKeys: 0
      };
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.keyPrefix}healthcheck`;
      await this.redisClient.set(testKey, 'ok', { EX: 1 });
      const result = await this.redisClient.get(testKey);
      await this.redisClient.del(testKey);
      return result === 'ok';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Bulk reset multiple keys
   */
  async bulkReset(keys: string[]): Promise<void> {
    try {
      const promises = keys.map(key => this.reset(key));
      await Promise.all(promises);
    } catch (error) {
      console.error('Redis bulk reset error:', error);
      throw error;
    }
  }

  /**
   * Set a global rate limit across all keys
   */
  async setGlobalLimit(limit: number, windowMs: number): Promise<void> {
    const globalKey = `${this.keyPrefix}global`;
    const windowSeconds = Math.ceil(windowMs / 1000);
    
    try {
      await this.redisClient.set(`${globalKey}:config`, JSON.stringify({
        maxRequests: limit,
        windowMs,
        updatedAt: Date.now()
      }), { EX: windowSeconds * 2 });
    } catch (error) {
      console.error('Redis global limit error:', error);
      throw error;
    }
  }

  /**
   * Check global rate limit
   */
  async checkGlobalLimit(): Promise<RateLimitResult | null> {
    const globalKey = `${this.keyPrefix}global`;
    
    try {
      const configStr = await this.redisClient.get(`${globalKey}:config`);
      if (!configStr) {
        return null;
      }

      const config = JSON.parse(configStr);
      return await this.isAllowed('global', config);
    } catch (error) {
      console.error('Redis global limit check error:', error);
      return null;
    }
  }

  private getRedisKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}