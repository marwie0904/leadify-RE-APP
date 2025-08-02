import { NextRequest, NextResponse } from 'next/server';
import { csrfManager } from './token-manager';

/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing requests
 */
export async function csrfMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    return null; // Continue to next middleware
  }

  // Skip CSRF check for certain paths
  const excludedPaths = [
    '/api/auth/callback', // OAuth callbacks
    '/api/webhooks', // External webhooks
    '/api/health', // Health checks
  ];
  
  const pathname = request.nextUrl.pathname;
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  // Extract session ID from cookies
  const sessionId = request.cookies.get('session-id')?.value;
  
  if (!sessionId) {
    return new NextResponse(
      JSON.stringify({ error: 'Session required for this operation' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Extract CSRF token
  const token = csrfManager.extractToken(request);
  
  // Validate the token
  const validation = await csrfManager.validateToken(token, sessionId);
  
  if (!validation.isValid) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'CSRF validation failed',
        reason: validation.reason,
        code: 'CSRF_VALIDATION_FAILED'
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // If token should be refreshed, add a header to indicate this
  if (validation.shouldRefresh) {
    const response = NextResponse.next();
    response.headers.set('X-CSRF-Refresh', 'true');
    return response;
  }

  return null; // Continue to next middleware
}

/**
 * Helper function to add CSRF token to response headers
 */
export async function addCSRFToken(
  response: NextResponse,
  sessionId: string
): Promise<NextResponse> {
  try {
    const tokenData = await csrfManager.generateToken(sessionId);
    
    // Add token to response header for client to read
    response.headers.set('X-CSRF-Token', tokenData.token);
    
    // Optionally set as cookie (double-submit pattern)
    const cookieOptions = csrfManager.getCookieOptions();
    response.cookies.set('csrf-token', tokenData.token, cookieOptions);
    
    return response;
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    return response;
  }
}

/**
 * Utility function to check if a request needs CSRF protection
 */
export function requiresCSRFProtection(request: NextRequest): boolean {
  // Safe methods don't need CSRF protection
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    return false;
  }

  // Check Content-Type for API requests
  const contentType = request.headers.get('content-type');
  const isJsonRequest = contentType?.includes('application/json');
  
  // API requests with JSON content type typically need CSRF protection
  // unless they use alternative authentication (like API keys)
  const hasApiKey = request.headers.has('X-API-Key') || 
                   request.headers.has('Authorization');
  
  return isJsonRequest && !hasApiKey;
}

/**
 * Express-style middleware wrapper for use in API routes
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const csrfResponse = await csrfMiddleware(req);
    
    if (csrfResponse) {
      return csrfResponse;
    }
    
    return handler(req);
  };
}