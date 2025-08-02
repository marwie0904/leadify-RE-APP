import { NextRequest, NextResponse } from 'next/server';
import { IRateLimiter, RateLimitOptions } from '@/domain/security/services/IRateLimiter';
import { 
  generateRateLimitKey, 
  createRateLimitHeaders, 
  checkMultipleRateLimits,
  getClientIP
} from '@/infrastructure/security/utils/RateLimitUtils';
import { 
  getAPIRateLimiter, 
  getAuthRateLimiter, 
  getUploadRateLimiter, 
  getDefaultRateLimiter 
} from '@/infrastructure/security/factories/RateLimiterFactory';

export interface RateLimitMiddlewareConfig {
  // Global rate limiting
  global?: {
    enabled: boolean;
    rateLimiter: IRateLimiter;
    keyType?: 'ip' | 'user' | 'api';
    options?: RateLimitOptions;
  };

  // Path-specific rate limiting
  paths?: {
    [path: string]: {
      rateLimiter: IRateLimiter;
      keyType?: 'ip' | 'user' | 'api';
      options?: RateLimitOptions;
      methods?: string[];
    };
  };

  // Pattern-based rate limiting
  patterns?: {
    pattern: RegExp;
    rateLimiter: IRateLimiter;
    keyType?: 'ip' | 'user' | 'api';
    options?: RateLimitOptions;
    methods?: string[];
  }[];

  // Custom rate limiting logic
  customRules?: {
    condition: (req: NextRequest) => boolean;
    rateLimiter: IRateLimiter;
    keyType?: 'ip' | 'user' | 'api';
    options?: RateLimitOptions;
  }[];

  // Bypass conditions
  bypass?: {
    ips?: string[];
    userAgents?: RegExp[];
    paths?: string[];
    custom?: (req: NextRequest) => boolean;
  };

  // Response customization
  onRateLimitExceeded?: (req: NextRequest, result: any) => NextResponse;
  
  // Logging
  enableLogging?: boolean;
  logger?: (message: string, data?: any) => void;
}

export class RateLimitMiddleware {
  private config: RateLimitMiddlewareConfig;

  constructor(config: RateLimitMiddlewareConfig = {}) {
    this.config = {
      enableLogging: true,
      logger: (message, data) => console.log(`[RateLimit] ${message}`, data),
      ...config
    };
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    const { pathname } = request.nextUrl;
    const method = request.method;
    const clientIP = getClientIP(request);

    // Check bypass conditions
    if (this.shouldBypass(request)) {
      this.log('Request bypassed rate limiting', { 
        pathname, 
        method, 
        clientIP,
        reason: 'bypass condition met'
      });
      return null; // Continue to next middleware
    }

    // Collect all applicable rate limiters
    const rateLimitChecks: Array<{
      rateLimiter: IRateLimiter;
      key: string;
      options?: any;
      name: string;
    }> = [];

    // Global rate limiting
    if (this.config.global?.enabled) {
      const key = generateRateLimitKey(
        request, 
        this.config.global.keyType || 'ip'
      );
      rateLimitChecks.push({
        rateLimiter: this.config.global.rateLimiter,
        key,
        options: this.config.global.options,
        name: 'global'
      });
    }

    // Path-specific rate limiting
    if (this.config.paths) {
      const pathConfig = this.config.paths[pathname];
      if (pathConfig && this.methodMatches(method, pathConfig.methods)) {
        const key = generateRateLimitKey(
          request, 
          pathConfig.keyType || 'ip'
        );
        rateLimitChecks.push({
          rateLimiter: pathConfig.rateLimiter,
          key,
          options: pathConfig.options,
          name: `path:${pathname}`
        });
      }
    }

    // Pattern-based rate limiting
    if (this.config.patterns) {
      for (const patternConfig of this.config.patterns) {
        if (patternConfig.pattern.test(pathname) && 
            this.methodMatches(method, patternConfig.methods)) {
          const key = generateRateLimitKey(
            request, 
            patternConfig.keyType || 'ip'
          );
          rateLimitChecks.push({
            rateLimiter: patternConfig.rateLimiter,
            key,
            options: patternConfig.options,
            name: `pattern:${patternConfig.pattern.source}`
          });
        }
      }
    }

    // Custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        if (rule.condition(request)) {
          const key = generateRateLimitKey(
            request, 
            rule.keyType || 'ip'
          );
          rateLimitChecks.push({
            rateLimiter: rule.rateLimiter,
            key,
            options: rule.options,
            name: 'custom'
          });
        }
      }
    }

    // Default rate limiting if no specific rules matched
    if (rateLimitChecks.length === 0) {
      rateLimitChecks.push({
        rateLimiter: getDefaultRateLimiter(),
        key: generateRateLimitKey(request, 'ip'),
        name: 'default'
      });
    }

    // Check all rate limits
    const result = await checkMultipleRateLimits(rateLimitChecks);

    if (!result.allowed) {
      const failedResult = result.results.find(r => r.name === result.failedCheck)?.result;
      
      this.log('Rate limit exceeded', {
        pathname,
        method,
        clientIP,
        failedCheck: result.failedCheck,
        result: failedResult
      });

      // Custom response handler
      if (this.config.onRateLimitExceeded) {
        return this.config.onRateLimitExceeded(request, failedResult);
      }

      // Default rate limit response
      return this.createRateLimitResponse(failedResult);
    }

    // Add rate limit headers to continue response
    // Note: We'll need to modify the response in the calling middleware
    // since we can't modify the response headers after it's created
    this.log('Rate limit check passed', {
      pathname,
      method,
      clientIP,
      checks: result.results.map(r => ({
        name: r.name,
        remaining: r.result.remaining,
        limit: r.result.limit
      }))
    });

    return null; // Continue to next middleware
  }

  private shouldBypass(request: NextRequest): boolean {
    const bypass = this.config.bypass;
    if (!bypass) return false;

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const pathname = request.nextUrl.pathname;

    // Check IP whitelist
    if (bypass.ips?.includes(clientIP)) {
      return true;
    }

    // Check user agent patterns
    if (bypass.userAgents?.some(pattern => pattern.test(userAgent))) {
      return true;
    }

    // Check path whitelist
    if (bypass.paths?.includes(pathname)) {
      return true;
    }

    // Check custom condition
    if (bypass.custom?.(request)) {
      return true;
    }

    return false;
  }

  private methodMatches(requestMethod: string, allowedMethods?: string[]): boolean {
    if (!allowedMethods || allowedMethods.length === 0) {
      return true; // No method restriction
    }
    return allowedMethods.includes(requestMethod.toUpperCase());
  }

  private createRateLimitResponse(result: any): NextResponse {
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

  private log(message: string, data?: any): void {
    if (this.config.enableLogging && this.config.logger) {
      this.config.logger(message, data);
    }
  }
}

/**
 * Factory functions for common rate limiting configurations
 */
export class RateLimitConfigurations {
  /**
   * Basic API rate limiting configuration
   */
  static createAPIConfig(): RateLimitMiddlewareConfig {
    return {
      global: {
        enabled: true,
        rateLimiter: getAPIRateLimiter(),
        keyType: 'ip'
      },
      paths: {
        '/api/auth/login': {
          rateLimiter: getAuthRateLimiter(),
          keyType: 'ip',
          methods: ['POST']
        },
        '/api/auth/register': {
          rateLimiter: getAuthRateLimiter(),
          keyType: 'ip',
          methods: ['POST']
        },
        '/api/upload': {
          rateLimiter: getUploadRateLimiter(),
          keyType: 'user',
          methods: ['POST']
        }
      },
      patterns: [
        {
          pattern: /^\/api\/admin\//,
          rateLimiter: getAuthRateLimiter(),
          keyType: 'user',
          methods: ['POST', 'PUT', 'DELETE']
        }
      ],
      bypass: {
        paths: ['/api/health', '/api/status'],
        ips: process.env.NODE_ENV === 'development' ? ['127.0.0.1', '::1'] : []
      }
    };
  }

  /**
   * Strict security configuration
   */
  static createStrictConfig(): RateLimitMiddlewareConfig {
    return {
      global: {
        enabled: true,
        rateLimiter: getAPIRateLimiter(),
        keyType: 'ip'
      },
      customRules: [
        {
          condition: (req) => req.headers.get('user-agent')?.includes('bot') || false,
          rateLimiter: getAuthRateLimiter(), // Very strict for bots
          keyType: 'ip'
        },
        {
          condition: (req) => req.nextUrl.searchParams.has('suspicious_param'),
          rateLimiter: getAuthRateLimiter(),
          keyType: 'ip'
        }
      ],
      bypass: {
        custom: (req) => {
          // Bypass for authenticated admin users
          const authHeader = req.headers.get('authorization');
          // In a real implementation, you would validate the token
          return authHeader?.includes('admin-token') || false;
        }
      },
      onRateLimitExceeded: (req, result) => {
        // Log security events
        console.warn('Security rate limit exceeded:', {
          ip: getClientIP(req),
          path: req.nextUrl.pathname,
          userAgent: req.headers.get('user-agent'),
          result
        });

        return new NextResponse(
          JSON.stringify({
            error: 'Access denied',
            message: 'Request blocked due to security policy'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...createRateLimitHeaders(result)
            }
          }
        );
      }
    };
  }

  /**
   * Development-friendly configuration
   */
  static createDevelopmentConfig(): RateLimitMiddlewareConfig {
    return {
      global: {
        enabled: true,
        rateLimiter: getDefaultRateLimiter(),
        keyType: 'ip'
      },
      bypass: {
        ips: ['127.0.0.1', '::1', 'localhost'],
        paths: ['/api/dev', '/_next', '/favicon.ico']
      },
      enableLogging: true,
      logger: (message, data) => {
        console.log(`[DEV RateLimit] ${message}`, JSON.stringify(data, null, 2));
      }
    };
  }

  /**
   * Production configuration
   */
  static createProductionConfig(): RateLimitMiddlewareConfig {
    return {
      ...RateLimitConfigurations.createAPIConfig(),
      enableLogging: true,
      logger: (message, data) => {
        // In production, you might want to use a proper logging service
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          component: 'RateLimitMiddleware',
          message,
          data
        }));
      }
    };
  }
}

/**
 * Convenience function to create rate limit middleware
 */
export function createRateLimitMiddleware(
  environment: 'development' | 'production' | 'custom' = 'development',
  customConfig?: RateLimitMiddlewareConfig
): RateLimitMiddleware {
  let config: RateLimitMiddlewareConfig;

  switch (environment) {
    case 'development':
      config = RateLimitConfigurations.createDevelopmentConfig();
      break;
    case 'production':
      config = RateLimitConfigurations.createProductionConfig();
      break;
    case 'custom':
      config = customConfig || {};
      break;
    default:
      config = RateLimitConfigurations.createDevelopmentConfig();
  }

  return new RateLimitMiddleware(config);
}