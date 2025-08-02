/**
 * Tests for validation utility functions
 */

import { describe, it, expect } from '@jest/globals'
import { 
  validators, 
  calculatePasswordStrength, 
  formatValidationError,
  combineValidators,
  createAsyncValidator
} from '@/lib/validation/validators'

describe('Validators', () => {
  describe('phone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '+1 (555) 123.4567',
        '1234567890'
      ]

      validPhones.forEach(phone => {
        expect(validators.phone(phone)).toBe(true)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        'abc123',
        '123',
        '12345678901234567890', // too long
        '+abc(def)ghi-jklm'
      ]

      invalidPhones.forEach(phone => {
        expect(validators.phone(phone)).toBe(false)
      })
    })
  })

  describe('url', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.example.com/path?param=value',
        'http://localhost:3000'
      ]

      validUrls.forEach(url => {
        expect(validators.url(url)).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // wrong protocol
        'javascript:alert("xss")',
        'example.com', // missing protocol
        ''
      ]

      invalidUrls.forEach(url => {
        expect(validators.url(url)).toBe(false)
      })
    })
  })

  describe('noScript', () => {
    it('should allow safe content', () => {
      const safeContent = [
        'Hello world',
        '<p>Safe HTML</p>',
        'Some text with script word but no tags'
      ]

      safeContent.forEach(content => {
        expect(validators.noScript(content)).toBe(true)
      })
    })

    it('should reject script tags', () => {
      const dangerousContent = [
        '<script>alert("xss")</script>',
        'Safe content <script>bad()</script> more content',
        '<SCRIPT>uppercase()</SCRIPT>'
      ]

      dangerousContent.forEach(content => {
        expect(validators.noScript(content)).toBe(false)
      })
    })
  })

  describe('noSqlInjection', () => {
    it('should allow safe input', () => {
      const safeInput = [
        'John Doe',
        'user@example.com',
        'Safe search terms',
        'Product123'
      ]

      safeInput.forEach(input => {
        expect(validators.noSqlInjection(input)).toBe(true)
      })
    })

    it('should reject SQL injection patterns', () => {
      const maliciousInput = [
        "'; DROP TABLE users; --",
        'SELECT * FROM users',
        "admin' OR '1'='1",
        'UNION SELECT password FROM users',
        'INSERT INTO logs VALUES',
        '/* comment */ SELECT',
        'xp_cmdshell'
      ]

      maliciousInput.forEach(input => {
        expect(validators.noSqlInjection(input)).toBe(false)
      })
    })
  })

  describe('strongPassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyVerySecure@Password2024',
        'C0mpl3x&P@ssw0rd'
      ]

      strongPasswords.forEach(password => {
        expect(validators.strongPassword(password)).toBe(true)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',
        '123456',
        'Password123', // no special char
        'weakpass'
      ]

      weakPasswords.forEach(password => {
        expect(validators.strongPassword(password)).toBe(false)
      })
    })
  })

  describe('creditCard', () => {
    it('should validate correct credit card numbers', () => {
      const validCards = [
        '4532015112830366', // Visa
        '5555555555554444', // Mastercard
        '378282246310005',  // American Express
        '4532 0151 1283 0366' // With spaces
      ]

      validCards.forEach(card => {
        expect(validators.creditCard(card)).toBe(true)
      })
    })

    it('should reject invalid credit card numbers', () => {
      const invalidCards = [
        '1234567890123456', // Invalid Luhn
        '123', // Too short
        '12345678901234567890', // Too long
        'abcd1234efgh5678', // Contains letters
        ''
      ]

      invalidCards.forEach(card => {
        expect(validators.creditCard(card)).toBe(false)
      })
    })
  })

  describe('strictEmail', () => {
    it('should validate correct emails', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'first.last@subdomain.example.com'
      ]

      validEmails.forEach(email => {
        expect(validators.strictEmail(email)).toBe(true)
      })
    })

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..double@example.com', // consecutive dots
        'user@domain', // no TLD
        'a'.repeat(65) + '@example.com', // local part too long
        'user@' + 'a'.repeat(250) + '.com' // total too long
      ]

      invalidEmails.forEach(email => {
        expect(validators.strictEmail(email)).toBe(false)
      })
    })
  })

  describe('futureDate', () => {
    it('should validate future dates', () => {
      const futureDate = new Date(Date.now() + 86400000) // Tomorrow
      const futureDateString = futureDate.toISOString()

      expect(validators.futureDate(futureDate)).toBe(true)
      expect(validators.futureDate(futureDateString)).toBe(true)
    })

    it('should reject past dates', () => {
      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const pastDateString = pastDate.toISOString()

      expect(validators.futureDate(pastDate)).toBe(false)
      expect(validators.futureDate(pastDateString)).toBe(false)
    })

    it('should reject invalid dates', () => {
      expect(validators.futureDate('invalid-date')).toBe(false)
      expect(validators.futureDate(new Date('invalid'))).toBe(false)
    })
  })

  describe('pastDate', () => {
    it('should validate past dates', () => {
      const pastDate = new Date(Date.now() - 86400000) // Yesterday
      const pastDateString = pastDate.toISOString()

      expect(validators.pastDate(pastDate)).toBe(true)
      expect(validators.pastDate(pastDateString)).toBe(true)
    })

    it('should reject future dates', () => {
      const futureDate = new Date(Date.now() + 86400000) // Tomorrow
      const futureDateString = futureDate.toISOString()

      expect(validators.pastDate(futureDate)).toBe(false)
      expect(validators.pastDate(futureDateString)).toBe(false)
    })
  })

  describe('age', () => {
    it('should validate valid ages', () => {
      expect(validators.age(25)).toBe(true)
      expect(validators.age(0)).toBe(true)
      expect(validators.age(100)).toBe(true)
    })

    it('should reject invalid ages', () => {
      expect(validators.age(-5)).toBe(false)
      expect(validators.age(151)).toBe(false)
      expect(validators.age(25.5)).toBe(false) // not integer
    })

    it('should respect custom min/max', () => {
      expect(validators.age(17, 18, 65)).toBe(false) // Under min
      expect(validators.age(70, 18, 65)).toBe(false) // Over max
      expect(validators.age(25, 18, 65)).toBe(true) // In range
    })
  })

  describe('username', () => {
    it('should validate correct usernames', () => {
      const validUsernames = [
        'john_doe',
        'user123',
        'test-user',
        'User_Name-123'
      ]

      validUsernames.forEach(username => {
        expect(validators.username(username)).toBe(true)
      })
    })

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(21), // too long
        'user@domain', // invalid characters
        'user spaces',
        ''
      ]

      invalidUsernames.forEach(username => {
        expect(validators.username(username)).toBe(false)
      })
    })
  })

  describe('hexColor', () => {
    it('should validate correct hex colors', () => {
      const validColors = [
        '#FF0000',
        '#00ff00',
        '#0000FF',
        '#FFFFFF',
        '#000000'
      ]

      validColors.forEach(color => {
        expect(validators.hexColor(color)).toBe(true)
      })
    })

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000', // missing #
        '#FFF', // too short
        '#FFFF0000', // too long
        '#GGGGGG', // invalid characters
        'red',
        ''
      ]

      invalidColors.forEach(color => {
        expect(validators.hexColor(color)).toBe(false)
      })
    })
  })

  describe('ipv4', () => {
    it('should validate correct IPv4 addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '127.0.0.1',
        '255.255.255.255',
        '0.0.0.0'
      ]

      validIPs.forEach(ip => {
        expect(validators.ipv4(ip)).toBe(true)
      })
    })

    it('should reject invalid IPv4 addresses', () => {
      const invalidIPs = [
        '256.1.1.1', // octet too high
        '192.168.1', // incomplete
        '192.168.1.1.1', // too many octets
        'not.an.ip.address',
        ''
      ]

      invalidIPs.forEach(ip => {
        expect(validators.ipv4(ip)).toBe(false)
      })
    })
  })

  describe('json', () => {
    it('should validate correct JSON strings', () => {
      const validJSON = [
        '{"key": "value"}',
        '[1, 2, 3]',
        '"string"',
        'true',
        'null',
        '123'
      ]

      validJSON.forEach(json => {
        expect(validators.json(json)).toBe(true)
      })
    })

    it('should reject invalid JSON strings', () => {
      const invalidJSON = [
        '{key: "value"}', // unquoted key
        '[1, 2, 3,]', // trailing comma
        'undefined',
        '{broken json',
        ''
      ]

      invalidJSON.forEach(json => {
        expect(validators.json(json)).toBe(false)
      })
    })
  })

  describe('base64', () => {
    it('should validate correct base64 strings', () => {
      const validBase64 = [
        'SGVsbG8gV29ybGQ=',
        'dGVzdA==',
        'YWJjZGVmZ2hpams=',
        'MTIzNDU2Nzg5MA=='
      ]

      validBase64.forEach(b64 => {
        expect(validators.base64(b64)).toBe(true)
      })
    })

    it('should reject invalid base64 strings', () => {
      const invalidBase64 = [
        'Hello World!', // not base64
        'SGVsbG8gV29ybGQ', // missing padding
        'SGVsbG8@V29ybGQ=', // invalid character
        'SGVsbG8gV29ybGQ===', // too much padding
        ''
      ]

      invalidBase64.forEach(b64 => {
        expect(validators.base64(b64)).toBe(false)
      })
    })
  })
})

describe('Password Strength Calculator', () => {
  it('should rate very weak passwords', () => {
    const result = calculatePasswordStrength('weak')
    expect(result.strength).toBe('weak')
    expect(result.score).toBeLessThanOrEqual(2)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('should rate strong passwords highly', () => {
    const result = calculatePasswordStrength('VerySecure@Password123!')
    expect(result.strength).toBe('very-strong')
    expect(result.score).toBeGreaterThanOrEqual(8)
  })

  it('should provide helpful feedback', () => {
    const result = calculatePasswordStrength('password')
    expect(result.feedback).toContain('Include uppercase letters')
    expect(result.feedback).toContain('Include numbers')
  })

  it('should detect common passwords', () => {
    const result = calculatePasswordStrength('password123')
    expect(result.score).toBeLessThan(5) // Should be penalized
  })

  it('should detect repeated characters', () => {
    const result = calculatePasswordStrength('aaa123ABC!')
    expect(result.feedback).toContain('Avoid repeated characters')
  })
})

describe('Utility Functions', () => {
  describe('formatValidationError', () => {
    it('should format string errors', () => {
      const result = formatValidationError('Simple error message')
      expect(result).toBe('Simple error message')
    })

    it('should format error objects', () => {
      const error = new Error('Error message')
      const result = formatValidationError(error)
      expect(result).toBe('Error message')
    })

    it('should format Zod-style errors', () => {
      const zodError = {
        issues: [{ message: 'Validation failed' }]
      }
      const result = formatValidationError(zodError)
      expect(result).toBe('Validation failed')
    })

    it('should handle unknown error formats', () => {
      const result = formatValidationError(123)
      expect(result).toBe('Validation failed')
    })
  })

  describe('combineValidators', () => {
    it('should combine multiple validators', () => {
      const isNotEmpty = (value: string) => value.length > 0 || 'Cannot be empty'
      const isEmail = (value: string) => value.includes('@') || 'Must be email'
      
      const combined = combineValidators(isNotEmpty, isEmail)
      
      expect(combined('')).toBe('Cannot be empty')
      expect(combined('test')).toBe('Must be email')
      expect(combined('test@example.com')).toBe(true)
    })

    it('should return true when all validators pass', () => {
      const validator1 = () => true
      const validator2 = () => true
      
      const combined = combineValidators(validator1, validator2)
      
      expect(combined('test')).toBe(true)
    })
  })

  describe('createAsyncValidator', () => {
    it('should handle async validation success', async () => {
      const asyncValidator = createAsyncValidator(async (value: string) => {
        return value === 'valid'
      })
      
      const result = await asyncValidator('valid')
      expect(result).toBe(true)
    })

    it('should handle async validation failure', async () => {
      const asyncValidator = createAsyncValidator(async (value: string) => {
        return value === 'valid' || 'Value must be valid'
      })
      
      const result = await asyncValidator('invalid')
      expect(result).toBe('Value must be valid')
    })

    it('should handle async errors', async () => {
      const asyncValidator = createAsyncValidator(async (value: string) => {
        throw new Error('Async error occurred')
      })
      
      const result = await asyncValidator('test')
      expect(result).toBe('Async error occurred')
    })
  })
})