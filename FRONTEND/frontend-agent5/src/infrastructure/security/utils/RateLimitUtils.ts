import { NextRequest } from 'next/server';
import { IRateLimiter } from '@/domain/security/services/IRateLimiter';

/**
 * Utility functions for rate limiting
 */

/**
 * Generate rate limit key from request
 */
export function generateRateLimitKey(
  req: NextRequest, 
  type: 'ip' | 'user' | 'api' | 'custom',
  customKey?: string
): string {
  switch (type) {
    case 'ip':
      return getClientIP(req);
    
    case 'user':
      // Extract user ID from auth token or session
      const userId = extractUserIdFromRequest(req);
      return userId ? `user:${userId}` : getClientIP(req);
    
    case 'api':
      // Use API key if available, otherwise fall back to IP
      const apiKey = extractAPIKeyFromRequest(req);
      return apiKey ? `api:${apiKey}` : getClientIP(req);
    
    case 'custom':
      return customKey || getClientIP(req);
    
    default:
      return getClientIP(req);
  }
}

/**
 * Extract client IP address from request
 */
export function getClientIP(req: NextRequest): string {
  // Check for forwarded IP addresses (common in production behind proxies)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP if there are multiple
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP (some proxy configurations)
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Check for Cloudflare connecting IP
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  // Note: In Vercel/Netlify, this might not be available
  return req.ip || '127.0.0.1';
}

/**
 * Extract user ID from request (JWT token, session, etc.)
 */
export function extractUserIdFromRequest(req: NextRequest): string | null {
  try {
    // Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In a real implementation, you would decode and verify the JWT
      // This is a simplified version
      const decoded = decodeJWT(token);
      return decoded?.sub || decoded?.userId || null;
    }

    // Check for session cookie
    const sessionCookie = req.cookies.get('session')?.value;
    if (sessionCookie) {
      // In a real implementation, you would decode the session
      const session = decodeSession(sessionCookie);
      return session?.userId || null;
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract user ID from request:', error);
    return null;
  }
}

/**
 * Extract API key from request
 */
export function extractAPIKeyFromRequest(req: NextRequest): string | null {
  // Check X-API-Key header
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header with API key
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('ApiKey ')) {
    return authHeader.substring(7);
  }

  // Check query parameter (less secure, but sometimes used)
  const apiKeyParam = req.nextUrl.searchParams.get('api_key');
  if (apiKeyParam) {
    return apiKeyParam;
  }

  return null;
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime.getTime() / 1000).toString(),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Check multiple rate limits at once
 */
export async function checkMultipleRateLimits(
  checks: Array<{
    rateLimiter: IRateLimiter;
    key: string;
    options?: any;
    name: string;
  }>
): Promise<{
  allowed: boolean;
  results: Array<{ name: string; result: any }>;
  failedCheck?: string;
}> {
  const results: Array<{ name: string; result: any }> = [];

  for (const check of checks) {
    const result = await check.rateLimiter.isAllowed(check.key, check.options);
    results.push({ name: check.name, result });

    if (!result.allowed) {
      return {
        allowed: false,
        results,
        failedCheck: check.name
      };
    }
  }

  return {
    allowed: true,
    results
  };
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  rateLimiter: IRateLimiter,
  options: {
    keyType?: 'ip' | 'user' | 'api' | 'custom';
    customKey?: string;
    onExceeded?: (req: NextRequest) => Response;
  } = {}
) {
  return function (handler: (req: NextRequest) => Promise<Response>) {
    return async function (req: NextRequest): Promise<Response> {
      const key = generateRateLimitKey(
        req, 
        options.keyType || 'ip', 
        options.customKey
      );

      const result = await rateLimiter.isAllowed(key);
      
      if (!result.allowed) {
        if (options.onExceeded) {
          return options.onExceeded(req);
        }

        const headers = createRateLimitHeaders(result);
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later.',
            retryAfter: result.retryAfter
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

      // Add rate limit headers to successful responses
      const response = await handler(req);
      const headers = createRateLimitHeaders(result);
      
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    };
  };
}

/**
 * Sliding window rate limiter for burst protection
 */
export class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private windowMs: number,
    private maxRequests: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Adaptive rate limiter that adjusts limits based on server load
 */
export class AdaptiveRateLimiter {
  private baseLimit: number;
  private currentLimit: number;

  constructor(baseLimit: number) {
    this.baseLimit = baseLimit;
    this.currentLimit = baseLimit;
  }

  adjustLimit(cpuUsage: number, memoryUsage: number): void {
    // Reduce limit if server is under stress
    const stressLevel = Math.max(cpuUsage, memoryUsage);
    
    if (stressLevel > 0.8) {
      this.currentLimit = Math.floor(this.baseLimit * 0.5);
    } else if (stressLevel > 0.6) {
      this.currentLimit = Math.floor(this.baseLimit * 0.7);
    } else {
      this.currentLimit = this.baseLimit;
    }
  }

  getCurrentLimit(): number {
    return this.currentLimit;
  }
}

// Simplified JWT decode (for demonstration - use a proper library in production)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return decoded;
  } catch {
    return null;
  }
}

// Simplified session decode (for demonstration)
function decodeSession(sessionCookie: string): any {
  try {
    // In a real implementation, you would properly decode/decrypt the session
    return JSON.parse(Buffer.from(sessionCookie, 'base64').toString());
  } catch {
    return null;
  }
}