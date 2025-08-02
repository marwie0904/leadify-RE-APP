# Security Utilities and Rate Limiting Design

## Overview
Comprehensive security utilities design including input sanitization, cryptographic operations, validation, and rate limiting.

## Architecture

### 1. Input Sanitization

#### Domain Model
```typescript
// src/domain/security/services/ISanitizer.ts
export interface ISanitizer {
  sanitizeHTML(input: string, options?: HTMLSanitizationOptions): string;
  sanitizeSQL(input: string): string;
  sanitizeJSON<T>(input: T): T;
  sanitizeObject<T extends Record<string, any>>(obj: T, rules?: SanitizationRules): T;
  removeScripts(input: string): string;
  escapeSpecialChars(input: string): string;
}

export interface HTMLSanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripEmpty?: boolean;
}

export interface SanitizationRules {
  removeFields?: string[];
  maskFields?: string[];
  customSanitizers?: Record<string, (value: any) => any>;
}
```

#### Implementation
```typescript
// src/infrastructure/security/services/DOMPurifySanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export class DOMPurifySanitizer implements ISanitizer {
  private readonly defaultHTMLOptions: HTMLSanitizationOptions = {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    stripEmpty: true
  };

  sanitizeHTML(input: string, options?: HTMLSanitizationOptions): string {
    const config = { ...this.defaultHTMLOptions, ...options };
    
    const purifyConfig: any = {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: Object.entries(config.allowedAttributes || {})
        .flatMap(([tag, attrs]) => attrs),
      ALLOWED_URI_REGEXP: this.buildURIRegex(config.allowedSchemes || [])
    };

    return DOMPurify.sanitize(input, purifyConfig);
  }

  sanitizeSQL(input: string): string {
    // Basic SQL injection prevention
    return input
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/;/g, '')    // Remove semicolons
      .replace(/--/g, '')   // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comments
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '') // Remove extended stored procedures
      .replace(/script/gi, ''); // Remove script tags
  }

  sanitizeJSON<T>(input: T): T {
    if (typeof input !== 'object' || input === null) {
      return input;
    }

    const seen = new WeakSet();
    
    const sanitize = (obj: any): any => {
      if (seen.has(obj)) {
        return '[Circular]';
      }
      
      if (typeof obj === 'object' && obj !== null) {
        seen.add(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj instanceof Date) {
        return obj.toISOString();
      }

      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const sanitizedKey = this.escapeSpecialChars(key);
          sanitized[sanitizedKey] = sanitize(value);
        }
        return sanitized;
      }

      if (typeof obj === 'string') {
        return this.escapeSpecialChars(obj);
      }

      return obj;
    };

    return sanitize(input);
  }

  sanitizeObject<T extends Record<string, any>>(
    obj: T, 
    rules?: SanitizationRules
  ): T {
    const result = { ...obj };

    if (rules?.removeFields) {
      rules.removeFields.forEach(field => {
        delete result[field];
      });
    }

    if (rules?.maskFields) {
      rules.maskFields.forEach(field => {
        if (result[field] !== undefined) {
          result[field] = this.mask(result[field]);
        }
      });
    }

    if (rules?.customSanitizers) {
      Object.entries(rules.customSanitizers).forEach(([field, sanitizer]) => {
        if (result[field] !== undefined) {
          result[field] = sanitizer(result[field]);
        }
      });
    }

    return result;
  }

  removeScripts(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  }

  escapeSpecialChars(input: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return input.replace(/[&<>"'\/]/g, char => escapeMap[char]);
  }

  private buildURIRegex(schemes: string[]): RegExp {
    const schemePattern = schemes.join('|');
    return new RegExp(`^(${schemePattern}):`, 'i');
  }

  private mask(value: any): string {
    const str = String(value);
    if (str.length <= 4) {
      return '*'.repeat(str.length);
    }
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }
}
```

### 2. Cryptographic Operations

#### Domain Model
```typescript
// src/domain/security/services/ICryptoService.ts
export interface ICryptoService {
  generateRandomBytes(length: number): Buffer;
  generateSecureToken(length?: number): string;
  hash(data: string, algorithm: HashAlgorithm): string;
  hmac(data: string, key: string, algorithm: HashAlgorithm): string;
  encrypt(data: string, key: string): EncryptedData;
  decrypt(encrypted: EncryptedData, key: string): string;
  generateKeyPair(): Promise<KeyPair>;
  sign(data: string, privateKey: string): string;
  verify(data: string, signature: string, publicKey: string): boolean;
  deriveKey(password: string, salt: string, iterations?: number): Promise<string>;
}

export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
  MD5 = 'md5' // Only for legacy compatibility
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  type: 'rsa' | 'ec';
}
```

#### Implementation
```typescript
// src/infrastructure/security/services/NodeCryptoService.ts
import crypto from 'crypto';
import { promisify } from 'util';

export class NodeCryptoService implements ICryptoService {
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_DERIVATION_ITERATIONS = 100000;
  private readonly SALT_LENGTH = 32;
  private readonly IV_LENGTH = 16;
  private readonly TAG_LENGTH = 16;

  generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  hash(data: string, algorithm: HashAlgorithm): string {
    return crypto
      .createHash(algorithm)
      .update(data)
      .digest('hex');
  }

  hmac(data: string, key: string, algorithm: HashAlgorithm): string {
    return crypto
      .createHmac(algorithm, key)
      .update(data)
      .digest('hex');
  }

  encrypt(data: string, key: string): EncryptedData {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(
      this.ENCRYPTION_ALGORITHM,
      Buffer.from(key, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: this.ENCRYPTION_ALGORITHM
    };
  }

  decrypt(encrypted: EncryptedData, key: string): string {
    const decipher = crypto.createDecipheriv(
      encrypted.algorithm,
      Buffer.from(key, 'hex'),
      Buffer.from(encrypted.iv, 'base64')
    );

    if (encrypted.tag) {
      decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
    }

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.data, 'base64')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  async generateKeyPair(): Promise<KeyPair> {
    const generateKeyPairAsync = promisify(crypto.generateKeyPair);
    
    const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      publicKey,
      privateKey,
      type: 'rsa'
    };
  }

  sign(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  verify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }

  async deriveKey(
    password: string, 
    salt: string, 
    iterations: number = this.KEY_DERIVATION_ITERATIONS
  ): Promise<string> {
    const pbkdf2 = promisify(crypto.pbkdf2);
    const key = await pbkdf2(password, salt, iterations, 32, 'sha256');
    return key.toString('hex');
  }
}
```

### 3. Validation Utilities

#### Domain Model
```typescript
// src/domain/security/services/IValidator.ts
export interface IValidator {
  validateEmail(email: string): ValidationResult;
  validateURL(url: string, options?: URLValidationOptions): ValidationResult;
  validatePhone(phone: string, region?: string): ValidationResult;
  validatePassword(password: string, policy?: PasswordPolicy): ValidationResult;
  validateInput<T>(input: T, schema: Schema): ValidationResult<T>;
  validateCSRFToken(token: string, sessionToken: string): boolean;
  isXSS(input: string): boolean;
  isSQLInjection(input: string): boolean;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors?: ValidationError[];
  sanitized?: T;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface URLValidationOptions {
  allowedProtocols?: string[];
  allowLocalhost?: boolean;
  requireTLD?: boolean;
}

export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  prohibitedWords?: string[];
}
```

#### Implementation
```typescript
// src/infrastructure/security/services/ZodValidator.ts
import { z } from 'zod';

export class ZodValidator implements IValidator {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^\+?[\d\s-()]+$/;
  private readonly xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /on\w+\s*=/gi,
    /javascript:/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi
  ];
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b)\s*['"]?\s*\w*\s*['"]?\s*=/gi,
    /[';].*--/g
  ];

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED'
      });
    } else if (!this.emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'INVALID_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateURL(url: string, options?: URLValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const defaultOptions: URLValidationOptions = {
      allowedProtocols: ['http', 'https'],
      allowLocalhost: false,
      requireTLD: true,
      ...options
    };

    try {
      const urlObj = new URL(url);
      
      if (!defaultOptions.allowedProtocols?.includes(urlObj.protocol.replace(':', ''))) {
        errors.push({
          field: 'url',
          message: `Protocol must be one of: ${defaultOptions.allowedProtocols.join(', ')}`,
          code: 'INVALID_PROTOCOL'
        });
      }

      if (!defaultOptions.allowLocalhost && 
          (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
        errors.push({
          field: 'url',
          message: 'Localhost URLs are not allowed',
          code: 'LOCALHOST_NOT_ALLOWED'
        });
      }

      if (defaultOptions.requireTLD && !urlObj.hostname.includes('.')) {
        errors.push({
          field: 'url',
          message: 'URL must include a top-level domain',
          code: 'TLD_REQUIRED'
        });
      }
    } catch (error) {
      errors.push({
        field: 'url',
        message: 'Invalid URL format',
        code: 'INVALID_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePhone(phone: string, region?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!phone) {
      errors.push({
        field: 'phone',
        message: 'Phone number is required',
        code: 'REQUIRED'
      });
    } else if (!this.phoneRegex.test(phone)) {
      errors.push({
        field: 'phone',
        message: 'Invalid phone number format',
        code: 'INVALID_FORMAT'
      });
    }

    // Additional region-specific validation could be added here

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validatePassword(password: string, policy?: PasswordPolicy): ValidationResult {
    const errors: ValidationError[] = [];
    const defaultPolicy: PasswordPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      ...policy
    };

    if (!password) {
      errors.push({
        field: 'password',
        message: 'Password is required',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    if (password.length < (defaultPolicy.minLength || 8)) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${defaultPolicy.minLength} characters`,
        code: 'TOO_SHORT'
      });
    }

    if (password.length > (defaultPolicy.maxLength || 128)) {
      errors.push({
        field: 'password',
        message: `Password must not exceed ${defaultPolicy.maxLength} characters`,
        code: 'TOO_LONG'
      });
    }

    if (defaultPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'MISSING_UPPERCASE'
      });
    }

    if (defaultPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'MISSING_LOWERCASE'
      });
    }

    if (defaultPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'MISSING_NUMBER'
      });
    }

    if (defaultPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'MISSING_SPECIAL_CHAR'
      });
    }

    if (defaultPolicy.prohibitedWords) {
      const lowerPassword = password.toLowerCase();
      for (const word of defaultPolicy.prohibitedWords) {
        if (lowerPassword.includes(word.toLowerCase())) {
          errors.push({
            field: 'password',
            message: `Password must not contain: ${word}`,
            code: 'PROHIBITED_WORD'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateInput<T>(input: T, schema: z.ZodSchema): ValidationResult<T> {
    try {
      const result = schema.parse(input);
      return {
        isValid: true,
        sanitized: result
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      throw error;
    }
  }

  validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) return false;
    
    // Constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(token, sessionToken);
  }

  isXSS(input: string): boolean {
    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  isSQLInjection(input: string): boolean {
    return this.sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }
}
```

### 4. Rate Limiting

#### Domain Model
```typescript
// src/domain/security/services/IRateLimiter.ts
export interface IRateLimiter {
  isAllowed(key: string, options?: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  getStatus(key: string): Promise<RateLimitStatus>;
}

export interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitStatus {
  key: string;
  requests: number;
  windowStart: Date;
  blocked: boolean;
}
```

#### Implementation
```typescript
// src/infrastructure/security/services/MemoryRateLimiter.ts
export class MemoryRateLimiter implements IRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly defaultOptions: Required<RateLimitOptions> = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => req.ip || 'unknown'
  };

  async isAllowed(key: string, options?: RateLimitOptions): Promise<RateLimitResult> {
    const config = { ...this.defaultOptions, ...options };
    const now = Date.now();
    
    let entry = this.store.get(key);
    
    if (!entry || now - entry.windowStart > config.windowMs) {
      // Create new window
      entry = {
        key,
        requests: 0,
        windowStart: now,
        blocked: false
      };
      this.store.set(key, entry);
    }

    entry.requests++;
    
    const allowed = entry.requests <= config.maxRequests;
    const resetTime = new Date(entry.windowStart + config.windowMs);
    const remaining = Math.max(0, config.maxRequests - entry.requests);
    
    if (!allowed) {
      entry.blocked = true;
    }

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime.getTime() - now) / 1000)
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    return {
      key: entry.key,
      requests: entry.requests,
      windowStart: new Date(entry.windowStart),
      blocked: entry.blocked
    };
  }

  // Cleanup old entries periodically
  startCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now - entry.windowStart > this.defaultOptions.windowMs * 2) {
          this.store.delete(key);
        }
      }
    }, intervalMs);
  }
}

interface RateLimitEntry {
  key: string;
  requests: number;
  windowStart: number;
  blocked: boolean;
}
```

#### Distributed Rate Limiter
```typescript
// src/infrastructure/security/services/RedisRateLimiter.ts
export class RedisRateLimiter implements IRateLimiter {
  constructor(
    private redisClient: any, // Redis client instance
    private options: RateLimitOptions = {}
  ) {}

  async isAllowed(key: string, options?: RateLimitOptions): Promise<RateLimitResult> {
    const config = { 
      windowMs: 60 * 1000,
      maxRequests: 100,
      ...this.options,
      ...options 
    };

    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Use Redis sorted set for sliding window
    const redisKey = `rate_limit:${key}`;
    
    // Remove old entries
    await this.redisClient.zremrangebyscore(redisKey, 0, windowStart);
    
    // Count current requests
    const requests = await this.redisClient.zcard(redisKey);
    
    if (requests < config.maxRequests) {
      // Add current request
      await this.redisClient.zadd(redisKey, now, `${now}-${Math.random()}`);
      await this.redisClient.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    const allowed = requests < config.maxRequests;
    const resetTime = new Date(now + config.windowMs);
    const remaining = Math.max(0, config.maxRequests - requests - 1);

    return {
      allowed,
      limit: config.maxRequests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil(config.windowMs / 1000)
    };
  }

  async reset(key: string): Promise<void> {
    await this.redisClient.del(`rate_limit:${key}`);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const redisKey = `rate_limit:${key}`;
    const requests = await this.redisClient.zcard(redisKey);
    
    if (requests === 0) return null;

    const oldestEntry = await this.redisClient.zrange(redisKey, 0, 0);
    const windowStart = oldestEntry.length > 0 
      ? parseInt(oldestEntry[0].split('-')[0]) 
      : Date.now();

    return {
      key,
      requests,
      windowStart: new Date(windowStart),
      blocked: requests >= (this.options.maxRequests || 100)
    };
  }
}
```

### 5. Rate Limiting Middleware

```typescript
// src/infrastructure/security/middleware/RateLimitMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { IRateLimiter } from '@/domain/security/services/IRateLimiter';

export class RateLimitMiddleware {
  constructor(
    private rateLimiter: IRateLimiter,
    private options: RateLimitMiddlewareOptions = {}
  ) {}

  async apply(request: NextRequest): Promise<NextResponse | null> {
    const key = this.generateKey(request);
    const result = await this.rateLimiter.isAllowed(key, this.options);

    // Set rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', result.limit.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', result.resetTime.toISOString());

    if (!result.allowed) {
      headers.set('Retry-After', result.retryAfter?.toString() || '60');
      
      const response = new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers
        }
      );

      return response;
    }

    // Add headers to the request for use in route handlers
    request.headers.set('X-RateLimit-Limit', result.limit.toString());
    request.headers.set('X-RateLimit-Remaining', result.remaining.toString());

    return null; // Continue to next middleware
  }

  private generateKey(request: NextRequest): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(request);
    }

    // Default key generation
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const userId = request.headers.get('x-user-id');
    
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
}

export interface RateLimitMiddlewareOptions extends RateLimitOptions {
  excludePaths?: string[];
  includePaths?: string[];
  message?: string;
}
```

## Integration Example

```typescript
// src/middleware.ts
import { NextRequest } from 'next/server';
import { RateLimitMiddleware } from '@/infrastructure/security/middleware/RateLimitMiddleware';
import { MemoryRateLimiter } from '@/infrastructure/security/services/MemoryRateLimiter';

const rateLimiter = new MemoryRateLimiter();
const rateLimitMiddleware = new RateLimitMiddleware(rateLimiter, {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  excludePaths: ['/api/health', '/api/status'],
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id');
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
});

export async function middleware(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await rateLimitMiddleware.apply(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Continue with other middleware...
  return NextResponse.next();
}
```

## Testing

```typescript
// src/__tests__/security/sanitizer.test.ts
describe('DOMPurifySanitizer', () => {
  let sanitizer: DOMPurifySanitizer;

  beforeEach(() => {
    sanitizer = new DOMPurifySanitizer();
  });

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).toBe('<p>Hello</p>');
    });

    it('should remove event handlers', () => {
      const input = '<p onclick="alert(\'XSS\')">Click me</p>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).toBe('<p>Click me</p>');
    });
  });

  describe('sanitizeSQL', () => {
    it('should escape single quotes', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizer.sanitizeSQL(input);
      expect(result).not.toContain("'");
      expect(result).not.toContain("--");
    });
  });
});
```