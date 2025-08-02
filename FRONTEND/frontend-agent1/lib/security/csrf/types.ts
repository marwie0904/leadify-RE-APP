/**
 * CSRF (Cross-Site Request Forgery) protection types
 */

export interface CSRFToken {
  token: string;
  expiresAt: number;
  sessionId: string;
}

export interface CSRFTokenPayload {
  sessionId: string;
  timestamp: number;
  nonce: string;
}

export interface CSRFValidationResult {
  isValid: boolean;
  reason?: string;
  shouldRefresh?: boolean;
}

export interface CSRFOptions {
  tokenExpiry?: number; // in milliseconds
  secretLength?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
}

export interface TokenStorage {
  get(sessionId: string): Promise<string | null>;
  set(sessionId: string, secret: string, expiryMs: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
}

export const DEFAULT_CSRF_OPTIONS: CSRFOptions = {
  tokenExpiry: 3600000, // 1 hour
  secretLength: 32,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true
};

export class CSRFError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'MISSING_TOKEN' | 'SESSION_MISMATCH'
  ) {
    super(message);
    this.name = 'CSRFError';
  }
}