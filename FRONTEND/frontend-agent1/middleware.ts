import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { csrfMiddleware, addCSRFToken, applySecurityHeaders } from "@/lib/security"

export async function middleware(req: NextRequest) {
  let res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Apply security headers to all responses
  res = applySecurityHeaders(res)

  // Generate session ID if not present
  if (!req.cookies.get('session-id')) {
    const sessionId = crypto.randomUUID()
    res.cookies.set('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    // Generate initial CSRF token for new sessions
    if (pathname.startsWith('/api/')) {
      res = await addCSRFToken(res, sessionId)
    }
  }

  // Allow access to auth page without authentication
  if (pathname === "/auth") {
    return res
  }

  // Redirect root to auth page immediately 
  if (pathname === "/") {
    console.log("[Middleware] Redirecting root path to /auth")
    return NextResponse.redirect(new URL("/auth", req.url))
  }

  // Apply CSRF protection to API routes
  if (pathname.startsWith('/api/')) {
    const csrfResponse = await csrfMiddleware(req)
    if (csrfResponse) {
      return csrfResponse
    }
  }

  // For all other protected routes, you can add auth checks here if needed
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}