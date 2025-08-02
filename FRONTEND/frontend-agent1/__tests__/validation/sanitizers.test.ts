/**
 * Tests for input sanitization utilities
 */

import { describe, it, expect } from '@jest/globals'
import { 
  sanitizers, 
  sanitizeInput, 
  sanitizeBatch,
  deepSanitize 
} from '@/lib/validation/sanitizers'

describe('Core Sanitizers', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizers.escapeHtml(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should handle mixed content', () => {
      const input = 'Hello <b>world</b> & "friends"'
      const result = sanitizers.escapeHtml(input)
      expect(result).toBe('Hello &lt;b&gt;world&lt;&#x2F;b&gt; &amp; &quot;friends&quot;')
    })

    it('should handle non-string input', () => {
      const result = sanitizers.escapeHtml(123 as any)
      expect(result).toBe('')
    })
  })

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>'
      const result = sanitizers.stripHtml(input)
      expect(result).toBe('Hello world')
    })

    it('should handle malformed HTML', () => {
      const input = '<p>Hello <strong>world</p>'
      const result = sanitizers.stripHtml(input)
      expect(result).toBe('Hello world')
    })
  })

  describe('removeScripts', () => {
    it('should remove script tags and content', () => {
      const input = 'Safe content <script>alert("danger")</script> more safe content'
      const result = sanitizers.removeScripts(input)
      expect(result).toBe('Safe content  more safe content')
    })

    it('should handle multiple script tags', () => {
      const input = '<script>bad1()</script><p>Good content</p><script>bad2()</script>'
      const result = sanitizers.removeScripts(input)
      expect(result).toBe('<p>Good content</p>')
    })
  })

  describe('removeDangerousAttributes', () => {
    it('should remove dangerous event handlers', () => {
      const input = '<div onclick="alert(\'xss\')" onload="bad()">Content</div>'
      const result = sanitizers.removeDangerousAttributes(input)
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('onload')
      expect(result).toContain('Content')
    })

    it('should remove javascript: protocols', () => {
      const input = '<a href="javascript:alert(\'xss\')">Link</a>'
      const result = sanitizers.removeDangerousAttributes(input)
      expect(result).not.toContain('javascript:')
      expect(result).toContain('Link')
    })
  })

  describe('cleanText', () => {
    it('should trim whitespace by default', () => {
      const result = sanitizers.cleanText('  hello world  ')
      expect(result).toBe('hello world')
    })

    it('should remove extra spaces', () => {
      const result = sanitizers.cleanText('hello    world   test')
      expect(result).toBe('hello world test')
    })

    it('should convert to lowercase when specified', () => {
      const result = sanitizers.cleanText('HELLO World', { toLowerCase: true })
      expect(result).toBe('hello world')
    })

    it('should remove special characters when specified', () => {
      const result = sanitizers.cleanText('hello@world#test!', { removeSpecialChars: true })
      expect(result).toBe('helloworldtest')
    })
  })

  describe('email', () => {
    it('should normalize email addresses', () => {
      const result = sanitizers.email('  USER@EXAMPLE.COM  ')
      expect(result).toBe('user@example.com')
    })

    it('should remove invalid characters', () => {
      const result = sanitizers.email('user<script>@example.com')
      expect(result).toBe('user@example.com')
    })

    it('should enforce length limit', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = sanitizers.email(longEmail)
      expect(result.length).toBeLessThanOrEqual(254)
    })
  })

  describe('phone', () => {
    it('should preserve valid phone characters', () => {
      const result = sanitizers.phone('+1 (555) 123-4567')
      expect(result).toBe('+1 (555) 123-4567')
    })

    it('should remove invalid characters', () => {
      const result = sanitizers.phone('+1abc(555)def123-4567')
      expect(result).toBe('+1(555)123-4567')
    })
  })

  describe('url', () => {
    it('should add https protocol when missing', () => {
      const result = sanitizers.url('example.com')
      expect(result).toBe('https://example.com')
    })

    it('should preserve existing protocol', () => {
      const result = sanitizers.url('http://example.com')
      expect(result).toBe('http://example.com')
    })
  })

  describe('username', () => {
    it('should normalize username', () => {
      const result = sanitizers.username('  USER123  ')
      expect(result).toBe('user123')
    })

    it('should remove invalid characters', () => {
      const result = sanitizers.username('user@#$123')
      expect(result).toBe('user123')
    })

    it('should enforce length limit', () => {
      const longUsername = 'a'.repeat(25)
      const result = sanitizers.username(longUsername)
      expect(result.length).toBe(20)
    })
  })

  describe('creditCard', () => {
    it('should keep only digits', () => {
      const result = sanitizers.creditCard('1234-5678-9012-3456')
      expect(result).toBe('1234567890123456')
    })

    it('should remove all non-digit characters', () => {
      const result = sanitizers.creditCard('1234 abcd 5678 efgh 9012')
      expect(result).toBe('123456789012')
    })
  })

  describe('numeric', () => {
    it('should allow decimal numbers by default', () => {
      const result = sanitizers.numeric('123.45')
      expect(result).toBe('123.45')
    })

    it('should allow negative numbers by default', () => {
      const result = sanitizers.numeric('-123.45')
      expect(result).toBe('-123.45')
    })

    it('should remove non-numeric characters', () => {
      const result = sanitizers.numeric('abc123.45def')
      expect(result).toBe('123.45')
    })

    it('should handle multiple decimal points', () => {
      const result = sanitizers.numeric('123.45.67')
      expect(result).toBe('123.4567')
    })

    it('should disallow decimals when specified', () => {
      const result = sanitizers.numeric('123.45', { allowDecimal: false })
      expect(result).toBe('12345')
    })

    it('should disallow negatives when specified', () => {
      const result = sanitizers.numeric('-123', { allowNegative: false })
      expect(result).toBe('123')
    })
  })

  describe('hexColor', () => {
    it('should normalize valid hex colors', () => {
      const result = sanitizers.hexColor('ff0000')
      expect(result).toBe('#FF0000')
    })

    it('should convert short hex to long hex', () => {
      const result = sanitizers.hexColor('#f0f')
      expect(result).toBe('#FF00FF')
    })

    it('should return default for invalid colors', () => {
      const result = sanitizers.hexColor('invalid')
      expect(result).toBe('#000000')
    })
  })
})

describe('High-level Sanitization Functions', () => {
  describe('sanitizeInput', () => {
    it('should apply type-specific sanitization', () => {
      const email = sanitizeInput('  USER@EXAMPLE.COM  ', 'email')
      expect(email).toBe('user@example.com')
    })

    it('should enforce max length', () => {
      const result = sanitizeInput('a'.repeat(100), 'text', { maxLength: 10 })
      expect(result.length).toBe(10)
    })

    it('should handle HTML type with allowHtml option', () => {
      const result = sanitizeInput('<p>Hello</p>', 'html', { allowHtml: true })
      expect(result).toContain('<p>')
    })

    it('should strip HTML when allowHtml is false', () => {
      const result = sanitizeInput('<p>Hello</p>', 'html', { allowHtml: false })
      expect(result).toBe('Hello')
    })
  })

  describe('sanitizeBatch', () => {
    it('should sanitize multiple fields according to schema', () => {
      const data = {
        email: '  USER@EXAMPLE.COM  ',
        username: '  User123!@#  ',
        phone: '555-abc-1234'
      }

      const schema = {
        email: { type: 'email' as const },
        username: { type: 'username' as const },
        phone: { type: 'phone' as const }
      }

      const result = sanitizeBatch(data, schema)

      expect(result.email).toBe('user@example.com')
      expect(result.username).toBe('user123')
      expect(result.phone).toBe('555-1234')
    })

    it('should preserve non-string values', () => {
      const data = {
        text: 'hello',
        number: 123,
        boolean: true
      }

      const schema = {
        text: { type: 'text' as const },
        number: { type: 'text' as const },
        boolean: { type: 'text' as const }
      }

      const result = sanitizeBatch(data, schema)

      expect(result.text).toBe('hello')
      expect(result.number).toBe(123)
      expect(result.boolean).toBe(true)
    })
  })

  describe('deepSanitize', () => {
    it('should sanitize nested objects', () => {
      const data = {
        user: {
          name: '<script>alert("xss")</script>John',
          details: {
            bio: 'Hello <b>world</b>'
          }
        }
      }

      const result = deepSanitize(data)

      expect(result.user.name).not.toContain('<script>')
      expect(result.user.name).toContain('John')
      expect(result.user.details.bio).not.toContain('<b>')
      expect(result.user.details.bio).toContain('world')
    })

    it('should sanitize arrays', () => {
      const data = {
        items: ['<script>bad</script>Good', 'Another <b>item</b>']
      }

      const result = deepSanitize(data)

      expect(result.items[0]).not.toContain('<script>')
      expect(result.items[0]).toContain('Good')
      expect(result.items[1]).not.toContain('<b>')
      expect(result.items[1]).toContain('item')
    })

    it('should respect max depth', () => {
      const deepData = {
        level1: {
          level2: {
            level3: {
              level4: '<script>deep</script>content'
            }
          }
        }
      }

      const result = deepSanitize(deepData, { maxDepth: 2 })

      // Should not sanitize beyond max depth
      expect(result.level1.level2.level3.level4).toBe('<script>deep</script>content')
    })

    it('should handle circular references gracefully', () => {
      const data: any = { name: '<script>test</script>John' }
      data.self = data

      expect(() => deepSanitize(data, { maxDepth: 3 })).not.toThrow()
    })
  })
})