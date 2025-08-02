import { NextRequest, NextResponse } from 'next/server';
import { IRateLimiter } from '@/domain/security/services/IRateLimiter';
import { withRateLimit, generateRateLimitKey, createRateLimitHeaders } from '@/infrastructure/security/utils/RateLimitUtils';
import { getAPIRateLimiter, getAuthRateLimiter, getUploadRateLimiter } from '@/infrastructure/security/factories/RateLimiterFactory';

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withApiRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimiter?: IRateLimiter;
    keyType?: 'ip' | 'user' | 'api';
    customKey?: string;
    skipSuccessful?: boolean;
    skipFailed?: boolean;
  } = {}
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const rateLimiter = options.rateLimiter || getAPIRateLimiter();
    const key = options.customKey || generateRateLimitKey(req, options.keyType || 'ip');

    try {
      const result = await rateLimiter.isAllowed(key);

      if (!result.allowed) {
        const headers = createRateLimitHeaders(result);
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            details: {
              limit: result.limit,
              remaining: result.remaining,
              resetTime: result.resetTime,
              retryAfter: result.retryAfter
            }
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
      }

      // Execute the handler
      const response = await handler(req);

      // Add rate limit headers to successful responses
      const headers = createRateLimitHeaders(result);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Track success/failure for adaptive rate limiting
      if (!options.skipSuccessful && response.status < 400) {
        // Log successful request (could be used for adaptive algorithms)
      }

      if (!options.skipFailed && response.status >= 400) {
        // Log failed request (could be used for adaptive algorithms)
      }

      return response;

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow the request if rate limiting fails
      return await handler(req);
    }
  };
}

/**
 * Specific rate limit decorators for common use cases
 */
export const withAuthRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withApiRateLimit(handler, {
    rateLimiter: getAuthRateLimiter(),
    keyType: 'ip',
    skipSuccessful: true,
    skipFailed: false
  });

export const withUploadRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withApiRateLimit(handler, {
    rateLimiter: getUploadRateLimiter(),  
    keyType: 'user',
    skipSuccessful: false,
    skipFailed: true
  });

export const withStrictRateLimit = (handler: (req: NextRequest) => Promise<NextResponse>) =>
  withApiRateLimit(handler, {
    rateLimiter: getAuthRateLimiter(), // Very strict limits
    keyType: 'ip',
    skipSuccessful: false,
    skipFailed: false
  });

/**
 * Multi-tier rate limiting for different user types
 */
export function withTieredRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    anonymous: { rateLimiter: IRateLimiter; keyType: 'ip' };
    authenticated: { rateLimiter: IRateLimiter; keyType: 'user' };
    premium: { rateLimiter: IRateLimiter; keyType: 'user' };
    admin: { bypass: boolean };
  }
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      // Determine user tier (simplified - in real implementation, decode JWT/session)
      const tier = getUserTier(req);
      
      let rateLimitConfig;
      switch (tier) {
        case 'admin':
          if (options.admin.bypass) {
            return await handler(req);
          }
          rateLimitConfig = options.premium; // Fall back to premium limits
          break;
        case 'premium':
          rateLimitConfig = options.premium;
          break;
        case 'authenticated':
          rateLimitConfig = options.authenticated;
          break;
        default:
          rateLimitConfig = options.anonymous;
      }

      const key = generateRateLimitKey(req, rateLimitConfig.keyType);
      const result = await rateLimitConfig.rateLimiter.isAllowed(key);

      if (!result.allowed) {
        const headers = createRateLimitHeaders(result);
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Rate limit exceeded for ${tier} tier. Please try again later.`,
            tier,
            details: {
              limit: result.limit,
              remaining: result.remaining,
              resetTime: result.resetTime,
              retryAfter: result.retryAfter
            }
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
      }

      const response = await handler(req);
      
      // Add tier information to headers
      response.headers.set('X-User-Tier', tier);
      const headers = createRateLimitHeaders(result);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error('Tiered rate limiting error:', error);
      return await handler(req);
    }
  };
}

/**
 * Adaptive rate limiting that adjusts based on system load
 */
export function withAdaptiveRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  baseRateLimiter: IRateLimiter,
  options: {
    loadThresholds: {
      cpu: number;
      memory: number;
      responseTime: number;
    };
    adaptationFactor: number; // Multiplier to reduce limits under load
  } = {
    loadThresholds: { cpu: 0.8, memory: 0.8, responseTime: 1000 },
    adaptationFactor: 0.5
  }
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    try {
      // Get current system metrics (simplified - in real implementation, use proper monitoring)
      const systemLoad = await getSystemLoad();
      
      let effectiveRateLimiter = baseRateLimiter;
      
      // Reduce rate limits if system is under stress
      if (systemLoad.cpu > options.loadThresholds.cpu ||
          systemLoad.memory > options.loadThresholds.memory ||
          systemLoad.responseTime > options.loadThresholds.responseTime) {
        
        // Create a more restrictive rate limiter
        effectiveRateLimiter = createAdaptiveRateLimiter(baseRateLimiter, options.adaptationFactor);
      }

      return await withApiRateLimit(handler, {
        rateLimiter: effectiveRateLimiter,
        keyType: 'ip'
      })(req);

    } catch (error) {
      console.error('Adaptive rate limiting error:', error);
      return await handler(req);
    }
  };
}

/**
 * Rate limiting with circuit breaker pattern
 */
export function withCircuitBreakerRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimiter: IRateLimiter,
  options: {
    failureThreshold: number;
    recoveryTimeout: number;
    halfOpenMaxRequests: number;
  } = {
    failureThreshold: 10,
    recoveryTimeout: 60000,
    halfOpenMaxRequests: 5
  }
) {
  let failureCount = 0;
  let lastFailureTime = 0;
  let circuitState: 'closed' | 'open' | 'half-open' = 'closed';

  return async function (req: NextRequest): Promise<NextResponse> {
    const now = Date.now();
    
    // Check circuit breaker state
    if (circuitState === 'open') {
      if (now - lastFailureTime > options.recoveryTimeout) {
        circuitState = 'half-open';
        failureCount = 0;
      } else {
        return new NextResponse(
          JSON.stringify({
            error: 'Service temporarily unavailable',
            message: 'Circuit breaker is open. Please try again later.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    try {
      // Apply rate limiting
      const key = generateRateLimitKey(req, 'ip');
      const result = await rateLimiter.isAllowed(key);

      if (!result.allowed) {
        failureCount++;
        lastFailureTime = now;
        
        if (failureCount >= options.failureThreshold) {
          circuitState = 'open';
        }

        const headers = createRateLimitHeaders(result);
        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers
            }
          }
        );
      }

      // Execute handler
      const response = await handler(req);
      
      // Reset circuit breaker on success
      if (response.status < 400) {
        if (circuitState === 'half-open') {
          circuitState = 'closed';
        }
        failureCount = 0;
      }

      return response;

    } catch (error) {
      failureCount++;
      lastFailureTime = now;
      
      if (failureCount >= options.failureThreshold) {
        circuitState = 'open';
      }
      
      throw error;
    }
  };
}

// Helper functions

function getUserTier(req: NextRequest): 'anonymous' | 'authenticated' | 'premium' | 'admin' {
  // Simplified implementation - in reality, you'd decode JWT or check session
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return 'anonymous';
  }

  // Mock tier detection based on token content
  if (authHeader.includes('admin')) return 'admin';
  if (authHeader.includes('premium')) return 'premium';
  if (authHeader.includes('Bearer')) return 'authenticated';
  
  return 'anonymous';
}

async function getSystemLoad(): Promise<{
  cpu: number;
  memory: number;
  responseTime: number;
}> {
  // Simplified system load detection
  // In a real implementation, you'd use proper system monitoring
  return {
    cpu: Math.random() * 0.5, // Mock CPU usage
    memory: Math.random() * 0.5, // Mock memory usage
    responseTime: 200 + Math.random() * 300 // Mock response time
  };
}

function createAdaptiveRateLimiter(baseRateLimiter: IRateLimiter, factor: number): IRateLimiter {
  // This is a simplified implementation
  // In reality, you'd create a wrapper that adjusts the rate limits
  return baseRateLimiter; // For now, return the same limiter
}