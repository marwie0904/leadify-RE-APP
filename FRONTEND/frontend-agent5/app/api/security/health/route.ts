import { NextRequest, NextResponse } from 'next/server';
import { withApiRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { getValidator } from '@/infrastructure/security/factories/ValidationFactory';
import { getDefaultRateLimiter } from '@/infrastructure/security/factories/RateLimiterFactory';

/**
 * Security health check endpoint
 * GET /api/security/health
 */
async function healthHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const validator = getValidator();
    const rateLimiter = getDefaultRateLimiter();

    // Check components
    const checks = {
      validation: await checkValidation(validator),
      rateLimiting: await checkRateLimiting(rateLimiter),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    const allHealthy = Object.values(checks).every(check => 
      typeof check === 'object' && 'healthy' in check ? check.healthy : true
    );

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks
    }, {
      status: allHealthy ? 200 : 503
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}

async function checkValidation(validator: any): Promise<{ healthy: boolean; details?: any }> {
  try {
    // Test basic validation
    const emailResult = validator.validateEmail('test@example.com');
    const urlResult = validator.validateURL('https://example.com');
    
    return {
      healthy: emailResult.isValid && urlResult.isValid,
      details: {
        emailValidation: emailResult.isValid,
        urlValidation: urlResult.isValid
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

async function checkRateLimiting(rateLimiter: any): Promise<{ healthy: boolean; details?: any }> {
  try {
    // Test rate limiter
    const testKey = `health_check_${Date.now()}`;
    const result = await rateLimiter.isAllowed(testKey);
    
    // Clean up test key
    await rateLimiter.reset(testKey);
    
    return {
      healthy: result.allowed !== undefined,
      details: {
        testPassed: result.allowed !== undefined,
        limit: result.limit,
        remaining: result.remaining
      }
    };
  } catch (error) {
    return {
      healthy: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Apply rate limiting to the handler
export const GET = withApiRateLimit(healthHandler, {
  keyType: 'ip'
});