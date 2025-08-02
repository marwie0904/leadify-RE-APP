import { NextRequest, NextResponse } from 'next/server';
import { withApiRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { generateRateLimitKey } from '@/infrastructure/security/utils/RateLimitUtils';
import { 
  getDefaultRateLimiter, 
  getAPIRateLimiter, 
  getAuthRateLimiter,
  RateLimiterFactory 
} from '@/infrastructure/security/factories/RateLimiterFactory';

/**
 * Rate limit status endpoint
 * GET /api/security/rate-limit/status
 */
async function rateLimitStatusHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const keyType = searchParams.get('keyType') as 'ip' | 'user' | 'api' || 'ip';
    const limiterType = searchParams.get('limiter') as 'default' | 'api' | 'auth' || 'default';
    
    // Get the appropriate rate limiter
    let rateLimiter;
    switch (limiterType) {
      case 'api':
        rateLimiter = getAPIRateLimiter();
        break;
      case 'auth':
        rateLimiter = getAuthRateLimiter();
        break;
      default:
        rateLimiter = getDefaultRateLimiter();
    }

    // Generate key for this request
    const key = generateRateLimitKey(req, keyType);
    
    // Get current status
    const status = await rateLimiter.getStatus(key);
    
    // Get a fresh rate limit check (without consuming the limit)
    const checkResult = await rateLimiter.isAllowed(`${key}_check`);
    await rateLimiter.reset(`${key}_check`); // Clean up the check

    const response = {
      key: key.substring(0, 20) + '...', // Truncate for privacy
      keyType,
      limiterType,
      status: status ? {
        requests: status.requests,
        windowStart: status.windowStart,
        blocked: status.blocked
      } : null,
      limits: {
        limit: checkResult.limit,
        remaining: checkResult.remaining,
        resetTime: checkResult.resetTime,
        retryAfter: checkResult.retryAfter
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Rate limit status API error:', error);
    return NextResponse.json({
      error: 'Failed to get rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Reset rate limit endpoint  
 * POST /api/security/rate-limit/reset
 */
async function rateLimitResetHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { keyType = 'ip', limiterType = 'default', customKey } = body;
    
    // Get the appropriate rate limiter
    let rateLimiter;
    switch (limiterType) {
      case 'api':
        rateLimiter = getAPIRateLimiter();
        break;
      case 'auth':
        rateLimiter = getAuthRateLimiter();
        break;
      default:
        rateLimiter = getDefaultRateLimiter();
    }

    // Generate or use custom key
    const key = customKey || generateRateLimitKey(req, keyType);
    
    // Reset the rate limit
    await rateLimiter.reset(key);

    return NextResponse.json({
      success: true,
      message: 'Rate limit reset successfully',
      key: key.substring(0, 20) + '...', // Truncate for privacy
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rate limit reset API error:', error);
    return NextResponse.json({
      error: 'Failed to reset rate limit',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Rate limit statistics endpoint
 * GET /api/security/rate-limit/stats
 */
async function rateLimitStatsHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const stats = {
      default: await getDefaultRateLimiter().getStatus('stats') || { requests: 0, blocked: false },
      api: await getAPIRateLimiter().getStatus('stats') || { requests: 0, blocked: false },
      auth: await getAuthRateLimiter().getStatus('stats') || { requests: 0, blocked: false },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // If using memory rate limiter, get additional stats
    const memoryLimiter = RateLimiterFactory.getInstance('default');
    if (memoryLimiter && typeof (memoryLimiter as any).getStatistics === 'function') {
      const memoryStats = (memoryLimiter as any).getStatistics();
      (stats as any).memory = memoryStats;
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Rate limit stats API error:', error);
    return NextResponse.json({
      error: 'Failed to get rate limit statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting to the handlers
export const GET = withApiRateLimit(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  
  if (pathname.endsWith('/status')) {
    return rateLimitStatusHandler(req);
  } else if (pathname.endsWith('/stats')) {
    return rateLimitStatsHandler(req);
  } else {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });
  }
}, {
  keyType: 'ip'
});

export const POST = withApiRateLimit(rateLimitResetHandler, {
  keyType: 'ip'
});