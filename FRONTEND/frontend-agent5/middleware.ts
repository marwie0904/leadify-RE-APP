import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SecurityHeadersMiddleware } from "@/infrastructure/security/middleware/SecurityHeadersMiddleware"
import { CORSMiddleware } from "@/infrastructure/security/middleware/CORSMiddleware"
import { createRateLimitMiddleware } from "@/infrastructure/security/middleware/RateLimitMiddleware"
import { CryptoNonceService } from "@/infrastructure/security/services/CryptoNonceService"
import { SecurityConfigFactory } from "@/infrastructure/security/config/SecurityConfigFactory"

// Initialize security services
const nonceService = new CryptoNonceService()
const securityConfig = SecurityConfigFactory.getConfig()
const securityMiddleware = new SecurityHeadersMiddleware(securityConfig, nonceService)
const corsMiddleware = new CORSMiddleware(
  CORSMiddleware.createConfig(SecurityConfigFactory.getCurrentEnvironment())
)
const rateLimitMiddleware = createRateLimitMiddleware(
  process.env.NODE_ENV === 'production' ? 'production' : 'development'
)

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Apply rate limiting first (except for static assets)
  if (!pathname.startsWith('/_next/') && !pathname.includes('.')) {
    const rateLimitResponse = await rateLimitMiddleware.handle(req)
    if (rateLimitResponse) {
      // Rate limit exceeded, return the response
      return rateLimitResponse
    }
  }

  // Allow access to auth page without authentication
  if (pathname === "/auth") {
    const response = NextResponse.next()
    // Apply security headers to auth page
    return applySecurityMiddleware(req, response)
  }

  // Redirect root to auth page immediately 
  if (pathname === "/") {
    console.log("[Middleware] Redirecting root path to /auth")
    const response = NextResponse.redirect(new URL("/auth", req.url))
    // Apply security headers to redirect
    return applySecurityMiddleware(req, response)
  }

  // For all other protected routes
  const response = NextResponse.next()
  
  // Apply security middleware
  return applySecurityMiddleware(req, response)
}

function applySecurityMiddleware(request: NextRequest, response: NextResponse): NextResponse {
  // Apply CORS first
  let securedResponse = corsMiddleware.apply(request, response)
  
  // Apply security headers if not a static asset
  if (securityMiddleware.shouldApplyHeaders(request.nextUrl.pathname)) {
    securedResponse = securityMiddleware.apply(request)
  }
  
  return securedResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
