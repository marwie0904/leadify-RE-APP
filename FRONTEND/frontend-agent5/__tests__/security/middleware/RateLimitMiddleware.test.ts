import { NextRequest } from 'next/server';
import { RateLimitMiddleware, RateLimitConfigurations } from '@/infrastructure/security/middleware/RateLimitMiddleware';
import { MemoryRateLimiter } from '@/infrastructure/security/services/MemoryRateLimiter';

// Mock next/server
const mockNextRequest = (url: string, options: { method?: string; headers?: Record<string, string> } = {}) => {
  const request = new Request(url, {
    method: options.method || 'GET',
    headers: options.headers || {}
  });
  
  return {
    ...request,
    nextUrl: new URL(url),
    ip: '127.0.0.1',
    cookies: {
      get: jest.fn()
    }
  } as unknown as NextRequest;
};

describe('RateLimitMiddleware', () => {
  let rateLimiter: MemoryRateLimiter;
  let middleware: RateLimitMiddleware;

  beforeEach(() => {
    rateLimiter = new MemoryRateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3
    });

    middleware = new RateLimitMiddleware({
      global: {
        enabled: true,
        rateLimiter: rateLimiter,
        keyType: 'ip'
      },
      enableLogging: false // Disable logging for tests
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('handle', () => {
    it('should allow requests within rate limit', async () => {
      const req = mockNextRequest('https://example.com/api/test');
      
      const result1 = await middleware.handle(req);
      expect(result1).toBeNull(); // Should continue
      
      const result2 = await middleware.handle(req);
      expect(result2).toBeNull(); // Should continue
      
      const result3 = await middleware.handle(req);
      expect(result3).toBeNull(); // Should continue
    });

    it('should block requests when rate limit exceeded', async () => {
      const req = mockNextRequest('https://example.com/api/test');
      
      // Use up all allowed requests
      await middleware.handle(req);
      await middleware.handle(req);
      await middleware.handle(req);
      
      // Next request should be blocked
      const result = await middleware.handle(req);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
      
      const body = await result!.json();
      expect(body.error).toBe('Rate limit exceeded');
    });

    it('should bypass rate limiting based on conditions', async () => {
      const bypassMiddleware = new RateLimitMiddleware({
        global: {
          enabled: true,
          rateLimiter: rateLimiter,
          keyType: 'ip'
        },
        bypass: {
          ips: ['127.0.0.1']
        },
        enableLogging: false
      });

      const req = mockNextRequest('https://example.com/api/test');
      
      // Should bypass rate limiting for whitelisted IP
      for (let i = 0; i < 10; i++) {
        const result = await bypassMiddleware.handle(req);
        expect(result).toBeNull();
      }
    });

    it('should apply path-specific rate limiting', async () => {
      const pathMiddleware = new RateLimitMiddleware({
        paths: {
          '/api/auth/login': {
            rateLimiter: new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 }),  
            keyType: 'ip',
            methods: ['POST']
          }
        },
        enableLogging: false
      });

      const loginReq = mockNextRequest('https://example.com/api/auth/login', { method: 'POST' });
      const normalReq = mockNextRequest('https://example.com/api/other');
      
      // First login request should be allowed
      const result1 = await pathMiddleware.handle(loginReq);
      expect(result1).toBeNull();
      
      // Second login request should be blocked
      const result2 = await pathMiddleware.handle(loginReq);
      expect(result2).not.toBeNull();
      expect(result2!.status).toBe(429);
      
      // Normal request should still be allowed (no global limit)
      const result3 = await pathMiddleware.handle(normalReq);
      expect(result3).toBeNull();
    });

    it('should apply pattern-based rate limiting', async () => {
      const patternMiddleware = new RateLimitMiddleware({
        patterns: [
          {
            pattern: /^\/api\/admin\//,
            rateLimiter: new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 }),
            keyType: 'ip'
          }
        ],
        enableLogging: false
      });

      const adminReq = mockNextRequest('https://example.com/api/admin/users');
      const normalReq = mockNextRequest('https://example.com/api/users');
      
      // First admin request should be allowed
      const result1 = await patternMiddleware.handle(adminReq);
      expect(result1).toBeNull();
      
      // Second admin request should be blocked
      const result2 = await patternMiddleware.handle(adminReq);
      expect(result2).not.toBeNull();
      expect(result2!.status).toBe(429);
      
      // Normal request should be allowed
      const result3 = await patternMiddleware.handle(normalReq);
      expect(result3).toBeNull();
    });

    it('should apply custom rules', async () => {
      const customMiddleware = new RateLimitMiddleware({
        customRules: [
          {
            condition: (req) => req.headers.get('user-agent')?.includes('bot') || false,
            rateLimiter: new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 }),
            keyType: 'ip'
          }
        ],
        enableLogging: false
      });

      const botReq = mockNextRequest('https://example.com/api/test', {
        headers: { 'user-agent': 'some-bot/1.0' }
      });
      const normalReq = mockNextRequest('https://example.com/api/test', {
        headers: { 'user-agent': 'Mozilla/5.0' }
      });
      
      // First bot request should be allowed
      const result1 = await customMiddleware.handle(botReq);
      expect(result1).toBeNull();
      
      // Second bot request should be blocked
      const result2 = await customMiddleware.handle(botReq);
      expect(result2).not.toBeNull();
      expect(result2!.status).toBe(429);
      
      // Normal request should be allowed
      const result3 = await customMiddleware.handle(normalReq);
      expect(result3).toBeNull();
    });

    it('should handle method restrictions', async () => {
      const methodMiddleware = new RateLimitMiddleware({
        paths: {
          '/api/sensitive': {
            rateLimiter: new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 }),
            keyType: 'ip',
            methods: ['POST', 'PUT']
          }
        },
        enableLogging: false
      });

      const postReq = mockNextRequest('https://example.com/api/sensitive', { method: 'POST' });
      const getReq = mockNextRequest('https://example.com/api/sensitive', { method: 'GET' });
      
      // POST request should be rate limited
      const result1 = await methodMiddleware.handle(postReq);
      expect(result1).toBeNull();
      
      const result2 = await methodMiddleware.handle(postReq);
      expect(result2).not.toBeNull();
      expect(result2!.status).toBe(429);
      
      // GET request should not be rate limited (not in methods array)
      const result3 = await methodMiddleware.handle(getReq);
      expect(result3).toBeNull();
    });

    it('should use custom rate limit exceeded handler', async () => {
      const customMiddleware = new RateLimitMiddleware({
        global: {
          enabled: true,
          rateLimiter: new MemoryRateLimiter({ windowMs: 1000, maxRequests: 1 }),
          keyType: 'ip'
        },
        onRateLimitExceeded: (req, result) => {
          return new Response(JSON.stringify({
            customError: 'Custom rate limit message'
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        },
        enableLogging: false
      });

      const req = mockNextRequest('https://example.com/api/test');
      
      // Use up the limit
      await customMiddleware.handle(req);
      
      // Should get custom response
      const result = await customMiddleware.handle(req);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(429);
      
      const body = await result!.json();
      expect(body.customError).toBe('Custom rate limit message');
    });
  });

  describe('RateLimitConfigurations', () => {
    it('should create API configuration', () => {
      const config = RateLimitConfigurations.createAPIConfig();
      
      expect(config.global?.enabled).toBe(true);
      expect(config.paths).toBeDefined();
      expect(config.patterns).toBeDefined();
      expect(config.bypass).toBeDefined();
    });

    it('should create strict configuration', () => {
      const config = RateLimitConfigurations.createStrictConfig();
      
      expect(config.global?.enabled).toBe(true);
      expect(config.customRules).toBeDefined();
      expect(config.onRateLimitExceeded).toBeDefined();
    });

    it('should create development configuration', () => {
      const config = RateLimitConfigurations.createDevelopmentConfig();
      
      expect(config.global?.enabled).toBe(true);
      expect(config.bypass?.ips).toContain('127.0.0.1');
      expect(config.enableLogging).toBe(true);
    });

    it('should create production configuration', () => {
      const config = RateLimitConfigurations.createProductionConfig();
      
      expect(config.global?.enabled).toBe(true);
      expect(config.enableLogging).toBe(true);
      expect(config.logger).toBeDefined();
    });
  });
});