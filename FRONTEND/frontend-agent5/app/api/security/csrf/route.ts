import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { getValidator } from '@/infrastructure/security/factories/ValidationFactory';
import { NodeCryptoService } from '@/infrastructure/security/services/NodeCryptoService';

// Initialize services
const cryptoService = new NodeCryptoService();

/**
 * CSRF token management endpoint
 * GET /api/security/csrf - Generate CSRF token
 * POST /api/security/csrf - Validate CSRF token
 */

async function generateCSRFHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Get or create session token (in a real implementation, this would come from the session)
    const sessionToken = req.headers.get('x-session-token') || 
                        req.cookies.get('session')?.value ||
                        cryptoService.generateSecureToken(32);

    const validator = getValidator();
    const csrfToken = validator.generateCSRFToken(sessionToken);

    return NextResponse.json({
      success: true,
      csrfToken,
      expiresIn: 3600, // 1 hour
      timestamp: new Date().toISOString()
    }, {
      headers: {
        // Set CSRF token in header for client-side usage
        'X-CSRF-Token': csrfToken,
        // Also set as httpOnly cookie for additional security
        'Set-Cookie': `csrf-token=${csrfToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`
      }
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate CSRF token',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function validateCSRFHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validator = getValidator();
    
    // Validate request body
    const requestSchema = z.object({
      csrfToken: z.string().min(1),
      sessionToken: z.string().min(1).optional()
    });

    const validationResult = validator.validateInput(body, requestSchema);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.errors
      }, { status: 400 });
    }

    const { csrfToken } = validationResult.sanitized!;
    
    // Get session token from various sources
    const sessionToken = body.sessionToken ||
                        req.headers.get('x-session-token') ||
                        req.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json({
        error: 'Session token is required',
        message: 'No valid session found'
      }, { status: 401 });
    }

    // Validate CSRF token
    const isValid = validator.validateCSRFToken(csrfToken, sessionToken);

    if (!isValid) {
      // Log potential CSRF attack
      console.warn('CSRF validation failed:', {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        error: 'CSRF token validation failed',
        message: 'Invalid or expired CSRF token'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'CSRF token is valid',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('CSRF validation error:', error);
    return NextResponse.json({
      error: 'CSRF validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * CSRF protection middleware checker
 * POST /api/security/csrf/check
 */
async function csrfCheckHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Check various CSRF token sources
    const tokenSources = {
      header: req.headers.get('x-csrf-token'),
      body: null as string | null,
      cookie: req.cookies.get('csrf-token')?.value
    };

    // Try to get token from body if present
    try {
      const body = await req.json();
      tokenSources.body = body.csrfToken || body._token;
    } catch {
      // Not JSON or no body - that's fine
    }

    const csrfToken = tokenSources.header || tokenSources.body || tokenSources.cookie;
    const sessionToken = req.headers.get('x-session-token') || 
                        req.cookies.get('session')?.value;

    const analysis = {
      tokenFound: !!csrfToken,
      sessionFound: !!sessionToken,
      tokenSources: {
        header: !!tokenSources.header,
        body: !!tokenSources.body,
        cookie: !!tokenSources.cookie
      },
      valid: false,
      timestamp: new Date().toISOString()
    };

    if (csrfToken && sessionToken) {
      const validator = getValidator();
      analysis.valid = validator.validateCSRFToken(csrfToken, sessionToken);
    }

    const status = analysis.valid ? 200 : (analysis.tokenFound ? 403 : 400);
    const message = analysis.valid ? 'CSRF protection is working' :
                    analysis.tokenFound ? 'CSRF token is invalid' :
                    'CSRF token is missing';

    return NextResponse.json({
      success: analysis.valid,
      message,
      analysis
    }, { status });

  } catch (error) {
    console.error('CSRF check error:', error);
    return NextResponse.json({
      error: 'CSRF check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting
export const GET = withApiRateLimit(generateCSRFHandler, {
  keyType: 'ip'
});

export const POST = withApiRateLimit(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  
  if (pathname.endsWith('/check')) {
    return csrfCheckHandler(req);
  } else {
    return validateCSRFHandler(req);
  }
}, {
  keyType: 'ip'
});