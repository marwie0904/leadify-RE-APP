import Tokens from 'csrf';
import { 
  CSRFToken, 
  CSRFTokenPayload, 
  CSRFValidationResult, 
  CSRFOptions, 
  TokenStorage,
  DEFAULT_CSRF_OPTIONS,
  CSRFError
} from './types';

/**
 * In-memory token storage (for development/single instance)
 * In production, use Redis or a distributed cache
 */
class InMemoryTokenStorage implements TokenStorage {
  private store = new Map<string, { secret: string; expiresAt: number }>();

  async get(sessionId: string): Promise<string | null> {
    const item = this.store.get(sessionId);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }
    
    return item.secret;
  }

  async set(sessionId: string, secret: string, expiryMs: number): Promise<void> {
    this.store.set(sessionId, {
      secret,
      expiresAt: Date.now() + expiryMs
    });
  }

  async delete(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    const item = this.store.get(sessionId);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.store.delete(sessionId);
      return false;
    }
    
    return true;
  }

  // Cleanup expired tokens
  cleanup(): void {
    const now = Date.now();
    for (const [sessionId, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(sessionId);
      }
    }
  }
}

/**
 * CSRF Token Manager
 * Handles generation, validation, and management of CSRF tokens
 */
export class CSRFTokenManager {
  private tokens: Tokens;
  private storage: TokenStorage;
  private options: Required<CSRFOptions>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    storage?: TokenStorage,
    options: CSRFOptions = {}
  ) {
    this.tokens = new Tokens();
    this.storage = storage || new InMemoryTokenStorage();
    this.options = { ...DEFAULT_CSRF_OPTIONS, ...options } as Required<CSRFOptions>;
    
    // Start cleanup interval for in-memory storage
    if (this.storage instanceof InMemoryTokenStorage) {
      this.cleanupInterval = setInterval(() => {
        (this.storage as InMemoryTokenStorage).cleanup();
      }, 300000); // Clean up every 5 minutes
    }
  }

  /**
   * Generate a new CSRF token for the given session
   */
  async generateToken(sessionId: string): Promise<CSRFToken> {
    if (!sessionId) {
      throw new CSRFError('Session ID is required', 'MISSING_TOKEN');
    }

    // Generate a new secret
    const secret = await this.tokens.secret();
    
    // Store the secret
    await this.storage.set(sessionId, secret, this.options.tokenExpiry);
    
    // Create the token
    const token = this.tokens.create(secret);
    
    return {
      token,
      expiresAt: Date.now() + this.options.tokenExpiry,
      sessionId
    };
  }

  /**
   * Validate a CSRF token
   */
  async validateToken(
    token: string | undefined | null,
    sessionId: string | undefined | null
  ): Promise<CSRFValidationResult> {
    // Check if token and session ID are provided
    if (!token) {
      return {
        isValid: false,
        reason: 'CSRF token is missing'
      };
    }

    if (!sessionId) {
      return {
        isValid: false,
        reason: 'Session ID is missing'
      };
    }

    try {
      // Retrieve the secret from storage
      const secret = await this.storage.get(sessionId);
      
      if (!secret) {
        return {
          isValid: false,
          reason: 'No CSRF secret found for session',
          shouldRefresh: true
        };
      }

      // Verify the token
      const isValid = this.tokens.verify(secret, token);
      
      if (!isValid) {
        return {
          isValid: false,
          reason: 'CSRF token verification failed'
        };
      }

      // Check if token is close to expiry (within 10 minutes)
      const tenMinutes = 10 * 60 * 1000;
      const shouldRefresh = Date.now() + tenMinutes > Date.now() + this.options.tokenExpiry;

      return {
        isValid: true,
        shouldRefresh
      };
    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Token validation error'
      };
    }
  }

  /**
   * Refresh a CSRF token
   */
  async refreshToken(sessionId: string): Promise<CSRFToken> {
    // Delete the old secret
    await this.storage.delete(sessionId);
    
    // Generate a new token
    return this.generateToken(sessionId);
  }

  /**
   * Revoke all tokens for a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  /**
   * Create cookie options for CSRF token
   */
  getCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  } {
    return {
      httpOnly: this.options.httpOnly,
      secure: this.options.secure,
      sameSite: this.options.sameSite,
      maxAge: this.options.tokenExpiry,
      path: '/'
    };
  }

  /**
   * Extract CSRF token from various sources
   */
  extractToken(request: Request): string | null {
    // Check header first (preferred method)
    const headerToken = request.headers.get('X-CSRF-Token') || 
                       request.headers.get('X-XSRF-Token');
    if (headerToken) return headerToken;

    // Check form data (for traditional form submissions)
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      // This would need to be parsed from the body
      // For now, we'll focus on header-based tokens
    }

    return null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export a singleton instance for convenience
export const csrfManager = new CSRFTokenManager();