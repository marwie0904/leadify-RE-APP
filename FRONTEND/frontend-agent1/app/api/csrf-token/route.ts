import { NextRequest, NextResponse } from 'next/server'
import { csrfManager } from '@/lib/security/csrf'
import { cookies } from 'next/headers'

/**
 * GET /api/csrf-token
 * Generates and returns a CSRF token for the current session
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = cookies()
    
    // Get or generate session ID
    let sessionId = cookieStore.get('session-id')?.value
    
    if (!sessionId) {
      // Generate new session ID
      sessionId = crypto.randomUUID()
      
      // Set session cookie
      const response = NextResponse.json({ success: true })
      response.cookies.set('session-id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      })
    }
    
    // Generate CSRF token
    const csrfToken = await csrfManager.generateToken(sessionId)
    
    // Return token with expiration info
    const response = NextResponse.json({
      success: true,
      token: csrfToken.token,
      expiresAt: csrfToken.expiresAt,
      sessionId: csrfToken.sessionId
    })
    
    // Set session cookie if it wasn't already set
    if (!cookieStore.get('session-id')?.value) {
      response.cookies.set('session-id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      })
    }
    
    return response
    
  } catch (error) {
    console.error('CSRF token generation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CSRF token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/csrf-token/verify
 * Verifies a CSRF token for the current session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing CSRF token',
          message: 'CSRF token is required for verification'
        },
        { status: 400 }
      )
    }
    
    const cookieStore = cookies()
    const sessionId = cookieStore.get('session-id')?.value
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing session',
          message: 'Session ID is required for CSRF verification'
        },
        { status: 400 }
      )
    }
    
    // Verify CSRF token
    const isValid = await csrfManager.verifyToken(token, sessionId)
    
    if (isValid) {
      return NextResponse.json({
        success: true,
        valid: true,
        message: 'CSRF token is valid'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'Invalid CSRF token',
          message: 'The provided CSRF token is invalid or expired'
        },
        { status: 403 }
      )
    }
    
  } catch (error) {
    console.error('CSRF token verification error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify CSRF token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/csrf-token
 * Invalidates the current session's CSRF tokens
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = cookies()
    const sessionId = cookieStore.get('session-id')?.value
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing session',
          message: 'Session ID is required for CSRF token invalidation'
        },
        { status: 400 }
      )
    }
    
    // Invalidate all tokens for this session
    await csrfManager.invalidateSession(sessionId)
    
    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'CSRF tokens invalidated and session cleared'
    })
    
    response.cookies.set('session-id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })
    
    return response
    
  } catch (error) {
    console.error('CSRF token invalidation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invalidate CSRF tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/csrf-token/refresh
 * Refreshes the CSRF token for the current session
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = cookies()
    const sessionId = cookieStore.get('session-id')?.value
    
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing session',
          message: 'Session ID is required for CSRF token refresh'
        },
        { status: 400 }
      )
    }
    
    // Generate new CSRF token (this also invalidates the old one)
    const csrfToken = await csrfManager.generateToken(sessionId)
    
    return NextResponse.json({
      success: true,
      token: csrfToken.token,
      expiresAt: csrfToken.expiresAt,
      sessionId: csrfToken.sessionId,
      message: 'CSRF token refreshed successfully'
    })
    
  } catch (error) {
    console.error('CSRF token refresh error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh CSRF token',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}