import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Allow access to auth page without authentication
  if (pathname === "/auth") {
    return res
  }

  // Redirect root to auth page immediately 
  if (pathname === "/") {
    console.log("[Middleware] Redirecting root path to /auth")
    return NextResponse.redirect(new URL("/auth", req.url))
  }

  // For all other protected routes, you can add auth checks here if needed
  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
