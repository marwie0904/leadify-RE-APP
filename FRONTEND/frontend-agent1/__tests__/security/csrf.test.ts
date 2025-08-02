/**
 * Tests for CSRF protection system
 */

// Mock crypto for testing environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
    getRandomValues: (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }
  }
});

import { describe, it, expect, beforeEach } from '@jest/globals'
import { CSRFTokenManager } from '@/lib/security/csrf/token-manager'
import { InMemoryTokenStorage } from '@/lib/security/csrf/token-manager'

describe('CSRFTokenManager', () => {
  let tokenManager: CSRFTokenManager
  const sessionId = 'test-session-123'

  beforeEach(() => {
    tokenManager = new CSRFTokenManager()
  })

  describe('Token Generation', () => {
    it('should generate a valid CSRF token', async () => {
      const token = await tokenManager.generateToken(sessionId)

      expect(token).toHaveProperty('token')
      expect(token).toHaveProperty('expiresAt')
      expect(token).toHaveProperty('sessionId')
      expect(token.sessionId).toBe(sessionId)
      expect(typeof token.token).toBe('string')
      expect(token.token.length).toBeGreaterThan(0)
      expect(token.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should generate unique tokens for same session', async () => {
      const token1 = await tokenManager.generateToken(sessionId)
      const token2 = await tokenManager.generateToken(sessionId)

      expect(token1.token).not.toBe(token2.token)
    })

    it('should generate different tokens for different sessions', async () => {
      const token1 = await tokenManager.generateToken('session-1')
      const token2 = await tokenManager.generateToken('session-2')

      expect(token1.token).not.toBe(token2.token)
      expect(token1.sessionId).toBe('session-1')
      expect(token2.sessionId).toBe('session-2')
    })
  })

  describe('Token Verification', () => {
    it('should verify a valid token', async () => {
      const token = await tokenManager.generateToken(sessionId)
      const isValid = await tokenManager.verifyToken(token.token, sessionId)

      expect(isValid).toBe(true)
    })

    it('should reject invalid tokens', async () => {
      const isValid = await tokenManager.verifyToken('invalid-token', sessionId)

      expect(isValid).toBe(false)
    })

    it('should reject tokens for wrong session', async () => {
      const token = await tokenManager.generateToken('session-1')
      const isValid = await tokenManager.verifyToken(token.token, 'session-2')

      expect(isValid).toBe(false)
    })

    it('should reject expired tokens', async () => {
      // Create token manager with very short expiry
      const shortExpiryManager = new CSRFTokenManager({
        tokenExpiry: 1, // 1ms
        cleanupInterval: 1000
      })

      const token = await shortExpiryManager.generateToken(sessionId)
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const isValid = await shortExpiryManager.verifyToken(token.token, sessionId)

      expect(isValid).toBe(false)
    })

    it('should handle empty or null tokens', async () => {
      const isValidEmpty = await tokenManager.verifyToken('', sessionId)
      const isValidNull = await tokenManager.verifyToken(null as any, sessionId)

      expect(isValidEmpty).toBe(false)
      expect(isValidNull).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should invalidate all tokens for a session', async () => {
      const token1 = await tokenManager.generateToken(sessionId)
      const token2 = await tokenManager.generateToken(sessionId)

      // Verify tokens are valid initially
      expect(await tokenManager.verifyToken(token1.token, sessionId)).toBe(true)
      expect(await tokenManager.verifyToken(token2.token, sessionId)).toBe(true)

      // Invalidate session
      await tokenManager.invalidateSession(sessionId)

      // Verify tokens are now invalid
      expect(await tokenManager.verifyToken(token1.token, sessionId)).toBe(false)
      expect(await tokenManager.verifyToken(token2.token, sessionId)).toBe(false)
    })

    it('should not affect other sessions when invalidating', async () => {
      const token1 = await tokenManager.generateToken('session-1')
      const token2 = await tokenManager.generateToken('session-2')

      await tokenManager.invalidateSession('session-1')

      expect(await tokenManager.verifyToken(token1.token, 'session-1')).toBe(false)
      expect(await tokenManager.verifyToken(token2.token, 'session-2')).toBe(true)
    })
  })

  describe('Cleanup Process', () => {
    it('should clean up expired tokens', async () => {
      // Create token manager with very short expiry and cleanup interval
      const quickCleanupManager = new CSRFTokenManager({
        tokenExpiry: 10, // 10ms
        cleanupInterval: 20 // 20ms
      })

      const token = await quickCleanupManager.generateToken(sessionId)
      
      // Token should be valid initially
      expect(await quickCleanupManager.verifyToken(token.token, sessionId)).toBe(true)
      
      // Wait for token to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Token should be invalid and cleaned up
      expect(await quickCleanupManager.verifyToken(token.token, sessionId)).toBe(false)
    })
  })
})

describe('InMemoryTokenStorage', () => {
  let storage: InMemoryTokenStorage

  beforeEach(() => {
    storage = new InMemoryTokenStorage()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await storage.set('key1', 'value1', 1000)
      const value = await storage.get('key1')

      expect(value).toBe('value1')
    })

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('non-existent')

      expect(value).toBeNull()
    })

    it('should delete values', async () => {
      await storage.set('key1', 'value1', 1000)
      await storage.delete('key1')
      const value = await storage.get('key1')

      expect(value).toBeNull()
    })

    it('should check if key exists', async () => {
      expect(await storage.has('key1')).toBe(false)
      
      await storage.set('key1', 'value1', 1000)
      expect(await storage.has('key1')).toBe(true)
      
      await storage.delete('key1')
      expect(await storage.has('key1')).toBe(false)
    })

    it('should clear all values', async () => {
      await storage.set('key1', 'value1', 1000)
      await storage.set('key2', 'value2', 1000)
      
      await storage.clear()
      
      expect(await storage.has('key1')).toBe(false)
      expect(await storage.has('key2')).toBe(false)
    })
  })

  describe('Expiration Handling', () => {
    it('should handle expired values', async () => {
      await storage.set('key1', 'value1', 1) // 1ms expiry
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const value = await storage.get('key1')
      expect(value).toBeNull()
    })

    it('should not return expired values', async () => {
      await storage.set('key1', 'value1', 1) // 1ms expiry
      
      // Immediate check should work
      expect(await storage.get('key1')).toBe('value1')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Should be null now
      expect(await storage.get('key1')).toBeNull()
    })

    it('should cleanup expired entries', async () => {
      await storage.set('key1', 'value1', 1) // Will expire
      await storage.set('key2', 'value2', 10000) // Won't expire
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Trigger cleanup by getting expired key
      await storage.get('key1')
      
      // First key should not exist, second should
      expect(await storage.has('key1')).toBe(false)
      expect(await storage.has('key2')).toBe(true)
    })
  })

  describe('Pattern Matching', () => {
    beforeEach(async () => {
      await storage.set('user:123:token', 'token1', 1000)
      await storage.set('user:456:token', 'token2', 1000)
      await storage.set('session:123', 'session1', 1000)
      await storage.set('other:key', 'other', 1000)
    })

    it('should find keys by pattern', async () => {
      const userTokens = await storage.keys('user:*:token')
      
      expect(userTokens).toHaveLength(2)
      expect(userTokens).toContain('user:123:token')
      expect(userTokens).toContain('user:456:token')
    })

    it('should delete keys by pattern', async () => {
      await storage.deleteByPattern('user:*')
      
      expect(await storage.has('user:123:token')).toBe(false)
      expect(await storage.has('user:456:token')).toBe(false)
      expect(await storage.has('session:123')).toBe(true)
      expect(await storage.has('other:key')).toBe(true)
    })

    it('should handle patterns with no matches', async () => {
      const noMatches = await storage.keys('nonexistent:*')
      expect(noMatches).toHaveLength(0)

      // Should not throw error
      await expect(storage.deleteByPattern('nonexistent:*')).resolves.not.toThrow()
    })
  })
})