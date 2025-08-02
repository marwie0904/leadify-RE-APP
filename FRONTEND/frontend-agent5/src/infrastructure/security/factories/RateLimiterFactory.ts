import { IRateLimiter, RateLimitOptions } from '@/domain/security/services/IRateLimiter';
import { MemoryRateLimiter } from '@/infrastructure/security/services/MemoryRateLimiter';
import { RedisRateLimiter } from '@/infrastructure/security/services/RedisRateLimiter';

export type RateLimiterType = 'memory' | 'redis';

export interface RateLimiterConfig {
  type: RateLimiterType;
  options?: RateLimitOptions;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
}

export class RateLimiterFactory {
  private static instances = new Map<string, IRateLimiter>();

  /**
   * Create a rate limiter instance
   */
  static create(config: RateLimiterConfig, instanceKey: string = 'default'): IRateLimiter {
    const existing = this.instances.get(instanceKey);
    if (existing) {
      return existing;
    }

    let rateLimiter: IRateLimiter;

    switch (config.type) {
      case 'memory':
        rateLimiter = new MemoryRateLimiter(config.options);
        break;
      
      case 'redis':
        if (!config.redis) {
          throw new Error('Redis configuration is required for Redis rate limiter');
        }
        
        // In a real implementation, you would create the Redis client here
        // For now, we'll create a mock client
        const redisClient = this.createRedisClient(config.redis);
        rateLimiter = new RedisRateLimiter(redisClient, config.options, config.redis.keyPrefix);
        break;
      
      default:
        throw new Error(`Unsupported rate limiter type: ${config.type}`);
    }

    this.instances.set(instanceKey, rateLimiter);
    return rateLimiter;
  }

  /**
   * Get an existing rate limiter instance
   */
  static getInstance(instanceKey: string = 'default'): IRateLimiter | null {
    return this.instances.get(instanceKey) || null;
  }

  /**
   * Create rate limiter from environment variables
   */
  static createFromEnv(): IRateLimiter {
    const type = (process.env.RATE_LIMITER_TYPE as RateLimiterType) || 'memory';
    
    const config: RateLimiterConfig = {
      type,
      options: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
      }
    };

    if (type === 'redis') {
      config.redis = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.RATE_LIMIT_KEY_PREFIX || 'rate_limit:'
      };
    }

    return this.create(config, 'env');
  }

  /**
   * Create specialized rate limiters for different use cases
   */
  static createAPIRateLimiter(): IRateLimiter {
    return this.create({
      type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
      options: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      redis: process.env.NODE_ENV === 'production' ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'api_rate_limit:'
      } : undefined
    }, 'api');
  }

  static createAuthRateLimiter(): IRateLimiter {
    return this.create({
      type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
      options: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // Very strict for auth attempts
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      },
      redis: process.env.NODE_ENV === 'production' ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'auth_rate_limit:'
      } : undefined
    }, 'auth');
  }

  static createUploadRateLimiter(): IRateLimiter {
    return this.create({
      type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
      options: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10, // Max 10 uploads per hour
        skipSuccessfulRequests: false,
        skipFailedRequests: true
      },
      redis: process.env.NODE_ENV === 'production' ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        keyPrefix: 'upload_rate_limit:'
      } : undefined
    }, 'upload');
  }

  /**
   * Clear all instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Destroy all instances and clean up resources
   */
  static async destroyAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [key, instance] of this.instances.entries()) {
      if (instance instanceof MemoryRateLimiter) {
        instance.destroy();
      }
      // Add cleanup for other types as needed
    }

    await Promise.all(promises);
    this.instances.clear();
  }

  /**
   * Create a mock Redis client for testing/development
   */
  private static createRedisClient(config: NonNullable<RateLimiterConfig['redis']>): any {
    // In a real implementation, you would use a library like 'redis' or 'ioredis'
    // This is a mock implementation for demonstration
    console.warn('Using mock Redis client - implement actual Redis client for production');
    
    return {
      get: async (key: string) => null,
      set: async (key: string, value: string, options?: any) => 'OK',
      incr: async (key: string) => 1,
      expire: async (key: string, seconds: number) => 1,
      del: async (key: string) => 1,
      exists: async (key: string) => 0,
      multi: () => ({
        incr: function(key: string) { return this; },
        expire: function(key: string, seconds: number) { return this; },
        exec: async () => [[null, 1], [null, 1]]
      })
    };
  }
}

/**
 * Convenience functions for common rate limiters
 */
export function getAPIRateLimiter(): IRateLimiter {
  return RateLimiterFactory.getInstance('api') || RateLimiterFactory.createAPIRateLimiter();
}

export function getAuthRateLimiter(): IRateLimiter {
  return RateLimiterFactory.getInstance('auth') || RateLimiterFactory.createAuthRateLimiter();
}

export function getUploadRateLimiter(): IRateLimiter {
  return RateLimiterFactory.getInstance('upload') || RateLimiterFactory.createUploadRateLimiter();
}

/**
 * Default rate limiter instance
 */
export function getDefaultRateLimiter(): IRateLimiter {
  return RateLimiterFactory.getInstance('default') || RateLimiterFactory.createFromEnv();
}