/**
 * Comprehensive tests for validation schemas
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
import { 
  loginSchema, 
  registerSchema,
  passwordResetRequestSchema,
  type LoginFormData,
  type RegisterFormData 
} from '@/lib/validation/domains/auth-schemas'
import { 
  normalizedEmail,
  securePassword,
  sanitizedText,
  csrfToken
} from '@/lib/validation/core/base-schemas'

describe('Base Schemas', () => {
  describe('normalizedEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@subdomain.example.org'
      ]

      validEmails.forEach(email => {
        const result = normalizedEmail.safeParse(email)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(email.toLowerCase())
        }
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        ''
      ]

      invalidEmails.forEach(email => {
        const result = normalizedEmail.safeParse(email)
        expect(result.success).toBe(false)
      })
    })

    it('should normalize email to lowercase', () => {
      const result = normalizedEmail.safeParse('USER@EXAMPLE.COM')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('user@example.com')
      }
    })
  })

  describe('securePassword', () => {
    it('should accept secure passwords', () => {
      const securePasswords = [
        'MyVerySecure@Code123!',
        'UncommonSecure@Key2024!',
        'Complex&UnusualSecret2024!'
      ]

      securePasswords.forEach(password => {
        const result = securePassword.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'pass', // too short
        'password', // no uppercase
        'PASSWORD', // no lowercase
        'Password', // no number
        'Password123' // no special character
      ]

      weakPasswords.forEach(password => {
        const result = securePassword.safeParse(password)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('sanitizedText', () => {
    it('should sanitize HTML content', () => {
      const result = sanitizedText.safeParse('<script>alert("xss")</script>Hello')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toContain('<script>')
        expect(result.data).toContain('Hello')
      }
    })

    it('should trim whitespace', () => {
      const result = sanitizedText.safeParse('  Hello World  ')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('Hello World')
      }
    })
  })

  describe('csrfToken', () => {
    it('should accept valid CSRF tokens', () => {
      const validTokens = [
        'a'.repeat(32), // minimum length
        'b'.repeat(64), // longer valid token
        '1234567890abcdef1234567890abcdef', // 32 chars alphanumeric
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef' // 32 chars mixed case
      ]

      validTokens.forEach(token => {
        const result = csrfToken.safeParse(token)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid CSRF tokens', () => {
      const invalidTokens = [
        '', // empty
        'short', // too short (under 32)
        'a'.repeat(31), // just under minimum
        'a'.repeat(129), // too long
        'token with spaces and more text here', // has spaces
        'token@with#special$characters!here' // invalid characters
      ]

      invalidTokens.forEach(token => {
        const result = csrfToken.safeParse(token)
        expect(result.success).toBe(false)
      })
    })
  })
})

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    const validLoginData: LoginFormData = {
      email: 'user@example.com',
      password: 'password123', // Note: login schema uses basicPassword, not securePassword
      rememberMe: false,
      csrfToken: 'a'.repeat(32) // Valid 32-character CSRF token
    }

    it('should validate correct login data', () => {
      const result = loginSchema.safeParse(validLoginData)
      expect(result.success).toBe(true)
    })

    it('should require email', () => {
      const result = loginSchema.safeParse({
        ...validLoginData,
        email: ''
      })
      expect(result.success).toBe(false)
    })

    it('should require password', () => {
      const result = loginSchema.safeParse({
        ...validLoginData,
        password: ''
      })
      expect(result.success).toBe(false)
    })

    it('should require CSRF token', () => {
      const result = loginSchema.safeParse({
        ...validLoginData,
        csrfToken: ''
      })
      expect(result.success).toBe(false)
    })

    it('should default rememberMe to false', () => {
      const { rememberMe, ...dataWithoutRememberMe } = validLoginData
      const result = loginSchema.safeParse(dataWithoutRememberMe)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rememberMe).toBe(false)
      }
    })
  })

  describe('registerSchema', () => {
    const validRegisterData: RegisterFormData = {
      email: 'user@example.com',
      password: 'MyVerySecure@Code123!', // Secure, uncommon password
      confirmPassword: 'MyVerySecure@Code123!',
      name: 'John Doe', // Changed from fullName to name
      acceptTerms: true,
      csrfToken: 'a'.repeat(32) // Valid 32-character CSRF token
    }

    it('should validate correct registration data', () => {
      const result = registerSchema.safeParse(validRegisterData)
      expect(result.success).toBe(true)
    })

    it('should require all fields', () => {
      const requiredFields: (keyof RegisterFormData)[] = [
        'email', 'password', 'confirmPassword', 'name', 'csrfToken'
      ]

      requiredFields.forEach(field => {
        const testData = { ...validRegisterData, [field]: '' }
        const result = registerSchema.safeParse(testData)
        expect(result.success).toBe(false)
      })
    })

    it('should require password confirmation to match', () => {
      const result = registerSchema.safeParse({
        ...validRegisterData,
        confirmPassword: 'DifferentSecure@Code123!'
      })
      expect(result.success).toBe(false)
    })

    it('should require terms acceptance', () => {
      const result = registerSchema.safeParse({
        ...validRegisterData,
        acceptTerms: false
      })
      expect(result.success).toBe(false)
    })

    it('should enforce secure password requirements', () => {
      const result = registerSchema.safeParse({
        ...validRegisterData,
        password: 'weak',
        confirmPassword: 'weak'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('passwordResetRequestSchema', () => {
    it('should validate email for password reset request', () => {
      const result = passwordResetRequestSchema.safeParse({
        email: 'user@example.com',
        csrfToken: 'a'.repeat(32) // Valid 32-character CSRF token
      })
      expect(result.success).toBe(true)
    })

    it('should require valid email', () => {
      const result = passwordResetRequestSchema.safeParse({
        email: 'invalid-email',
        csrfToken: 'a'.repeat(32)
      })
      expect(result.success).toBe(false)
    })

    it('should require CSRF token', () => {
      const result = passwordResetRequestSchema.safeParse({
        email: 'user@example.com',
        csrfToken: ''
      })
      expect(result.success).toBe(false)
    })
  })
})