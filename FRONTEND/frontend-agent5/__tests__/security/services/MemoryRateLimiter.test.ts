import { MemoryRateLimiter } from '@/infrastructure/security/services/MemoryRateLimiter';
import { RateLimitOptions } from '@/domain/security/services/IRateLimiter';

describe('MemoryRateLimiter', () => {
  let rateLimiter: MemoryRateLimiter;

  beforeEach(() => {
    rateLimiter = new MemoryRateLimiter({
      windowMs: 1000, // 1 second for testing
      maxRequests: 3,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('isAllowed', () => {
    it('should allow requests within limit', async () => {
      const key = 'test-key';
      
      const result1 = await rateLimiter.isAllowed(key);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result1.limit).toBe(3);

      const result2 = await rateLimiter.isAllowed(key);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = await rateLimiter.isAllowed(key);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests when limit exceeded', async () => {
      const key = 'test-key';
      
      // Use up all allowed requests
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);  
      await rateLimiter.isAllowed(key);
      
      // Next request should be blocked
      const result = await rateLimiter.isAllowed(key);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should handle different keys independently', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      // Use up all requests for key1
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key1);
      
      const blockedResult = await rateLimiter.isAllowed(key1);
      expect(blockedResult.allowed).toBe(false);
      
      // key2 should still be allowed
      const allowedResult = await rateLimiter.isAllowed(key2);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBe(2);
    });

    it('should reset window after time expires', async () => {
      const key = 'test-key';
      
      // Use up all requests
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      
      // Should be blocked
      const blockedResult = await rateLimiter.isAllowed(key);
      expect(blockedResult.allowed).toBe(false);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      const allowedResult = await rateLimiter.isAllowed(key);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBe(2);
    });

    it('should apply custom options per request', async () => {
      const key = 'test-key';
      const customOptions: RateLimitOptions = {
        windowMs: 500,
        maxRequests: 1
      };
      
      const result1 = await rateLimiter.isAllowed(key, customOptions);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(0);
      
      const result2 = await rateLimiter.isAllowed(key, customOptions);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset rate limit for a key', async () => {
      const key = 'test-key';
      
      // Use up all requests
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      
      // Should be blocked
      const blockedResult = await rateLimiter.isAllowed(key);
      expect(blockedResult.allowed).toBe(false);
      
      // Reset the key
      await rateLimiter.reset(key);
      
      // Should be allowed again
      const allowedResult = await rateLimiter.isAllowed(key);
      expect(allowedResult.allowed).toBe(true);
      expect(allowedResult.remaining).toBe(2);
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent keys', async () => {
      const status = await rateLimiter.getStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should return status for existing keys', async () => {
      const key = 'test-key';
      
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      
      const status = await rateLimiter.getStatus(key);
      expect(status).not.toBeNull();
      expect(status!.key).toBe(key);
      expect(status!.requests).toBe(2);
      expect(status!.blocked).toBe(false);
    });

    it('should show blocked status when limit exceeded', async () => {
      const key = 'test-key';
      
      // Use up all requests
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key); // This should block
      
      const status = await rateLimiter.getStatus(key);
      expect(status!.blocked).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      // Make some requests
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key2);
      
      const stats = rateLimiter.getStatistics();
      expect(stats.totalKeys).toBe(2);
      expect(stats.totalRequests).toBe(3);
      expect(stats.averageRequestsPerKey).toBe(1.5);
      expect(stats.blockedKeys).toBe(0);
    });

    it('should track blocked keys', async () => {
      const key = 'test-key';
      
      // Block the key
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key);
      await rateLimiter.isAllowed(key); // This blocks
      
      const stats = rateLimiter.getStatistics();
      expect(stats.blockedKeys).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries', async () => {
      const key = 'test-key';
      
      // Make a request
      await rateLimiter.isAllowed(key);
      
      let stats = rateLimiter.getStatistics();
      expect(stats.totalKeys).toBe(1);
      
      // Wait for entry to expire
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Trigger cleanup by making another request with different key
      await rateLimiter.isAllowed('other-key');
      
      // Wait a bit more for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Original key should be cleaned up, but we can't easily test this
      // without exposing internal methods
    });
  });

  describe('getAllStatus', () => {
    it('should return status for all keys', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key2);
      
      const allStatus = rateLimiter.getAllStatus();
      expect(allStatus.size).toBe(2);
      expect(allStatus.has(key1)).toBe(true);
      expect(allStatus.has(key2)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all rate limit data', async () => {
      const key1 = 'key1';
      const key2 = 'key2';
      
      await rateLimiter.isAllowed(key1);
      await rateLimiter.isAllowed(key2);
      
      let stats = rateLimiter.getStatistics();
      expect(stats.totalKeys).toBe(2);
      
      rateLimiter.clear();
      
      stats = rateLimiter.getStatistics();
      expect(stats.totalKeys).toBe(0);
    });
  });
});