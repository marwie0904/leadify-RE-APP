/**
 * Security module exports
 * Centralized security utilities and middleware
 */

export * from './csrf/types';
export * from './csrf/token-manager';
export * from './csrf/middleware';

// Re-export commonly used items for convenience
export { csrfManager } from './csrf/token-manager';
export { csrfMiddleware, withCSRFProtection, addCSRFToken } from './csrf/middleware';

/**
 * Security headers configuration
 * Apply these headers to enhance application security
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust based on needs
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
  ].join('; ')
};

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Rate limiting configuration
 * Can be used with middleware or API routes
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Error message when rate limit exceeded
}

export const defaultRateLimits: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many login attempts, please try again later'
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many registration attempts, please try again later'
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later'
  }
};

/**
 * Simple in-memory rate limiter
 * For production, use Redis or a distributed solution
 */
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(private config: RateLimitConfig) {}

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetAt) {
      // New window
      const resetAt = now + this.config.windowMs;
      this.attempts.set(identifier, { count: 1, resetAt });
      return { allowed: true, remaining: this.config.maxRequests - 1, resetAt };
    }

    if (attempt.count >= this.config.maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetAt: attempt.resetAt };
    }

    // Increment count
    attempt.count++;
    return { allowed: true, remaining: this.config.maxRequests - attempt.count, resetAt: attempt.resetAt };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      if (now > attempt.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
}

// Import NextResponse for type
import { NextResponse } from 'next/server';