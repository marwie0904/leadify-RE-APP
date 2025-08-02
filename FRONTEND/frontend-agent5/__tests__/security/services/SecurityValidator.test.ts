import { SecurityValidator } from '@/infrastructure/security/services/SecurityValidator';
import { DOMPurifySanitizer } from '@/infrastructure/security/services/DOMPurifySanitizer';
import { PasswordPolicy } from '@/domain/security/services/IValidator';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;
  let sanitizer: DOMPurifySanitizer;

  beforeEach(() => {
    sanitizer = new DOMPurifySanitizer();
    validator = new SecurityValidator(sanitizer);
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const result = validator.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      const result = validator.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].code).toBe('INVALID_FORMAT');
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = validator.validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'MAX_LENGTH')).toBe(true);
    });

    it('should detect XSS attempts in emails', () => {
      const result = validator.validateEmail('test<script>alert("xss")</script>@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'SECURITY_VIOLATION')).toBe(true);
    });

    it('should sanitize email input', () => {
      const result = validator.validateEmail('  TEST@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });
  });

  describe('validateURL', () => {
    it('should validate correct URLs', () => {
      const result = validator.validateURL('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('https://example.com');
    });

    it('should reject invalid URL formats', () => {
      const result = validator.validateURL('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.errors![0].code).toBe('INVALID_FORMAT');
    });

    it('should reject disallowed protocols', () => {
      const result = validator.validateURL('ftp://example.com', {
        allowedProtocols: ['http', 'https']
      });
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_PROTOCOL')).toBe(true);
    });

    it('should reject localhost when not allowed', () => {
      const result = validator.validateURL('http://localhost:3000', {
        allowLocalhost: false
      });
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'LOCALHOST_NOT_ALLOWED')).toBe(true);
    });

    it('should detect XSS attempts in URLs', () => {
      const result = validator.validateURL('javascript:alert("xss")');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const result = validator.validatePhone('+1234567890');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('+1234567890');
    });

    it('should reject invalid phone formats', () => {
      const result = validator.validatePhone('123abc');
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_LENGTH')).toBe(true);
    });

    it('should clean phone number format', () => {
      const result = validator.validatePhone('(123) 456-7890');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('1234567890');
    });

    it('should reject numbers that are too short or too long', () => {
      const shortResult = validator.validatePhone('123');
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors?.some(e => e.code === 'INVALID_LENGTH')).toBe(true);

      const longResult = validator.validatePhone('1234567890123456');
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors?.some(e => e.code === 'INVALID_LENGTH')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    const defaultPolicy: PasswordPolicy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      prohibitedWords: ['password', '123456']
    };

    it('should validate strong passwords', () => {
      const result = validator.validatePassword('MyStr0ng!Pass', defaultPolicy);
      // This should be valid as it meets all requirements
      if (!result.isValid) {
        console.log('Password validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = validator.validatePassword('Sh0rt!', defaultPolicy);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'MIN_LENGTH')).toBe(true);
    });

    it('should reject passwords missing required character types', () => {
      const noUppercase = validator.validatePassword('lowercase123!', defaultPolicy);
      expect(noUppercase.isValid).toBe(false);
      expect(noUppercase.errors?.some(e => e.code === 'REQUIRE_UPPERCASE')).toBe(true);

      const noSpecialChars = validator.validatePassword('Password123', defaultPolicy);
      expect(noSpecialChars.isValid).toBe(false);
      expect(noSpecialChars.errors?.some(e => e.code === 'REQUIRE_SPECIAL_CHARS')).toBe(true);
    });

    it('should reject passwords with prohibited words', () => {
      const result = validator.validatePassword('MyPassword123!', defaultPolicy);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'PROHIBITED_WORD')).toBe(true);
    });

    it('should reject passwords with repeating patterns', () => {
      const result = validator.validatePassword('Aaaa1111!', defaultPolicy);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'REPEATING_PATTERN')).toBe(true);
    });

    it('should reject passwords with sequential patterns', () => {
      const result = validator.validatePassword('Abcd1234!Test', defaultPolicy);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'SEQUENTIAL_PATTERN')).toBe(true);
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate correct CSRF tokens', () => {
      const sessionToken = 'test-session-token';
      const csrfToken = validator.generateCSRFToken(sessionToken);
      const result = validator.validateCSRFToken(csrfToken, sessionToken);
      expect(result).toBe(true);
    });

    it('should reject invalid CSRF tokens', () => {
      const result = validator.validateCSRFToken('invalid-token', 'session-token');
      expect(result).toBe(false);
    });

    it('should reject CSRF tokens with wrong session', () => {
      const sessionToken = 'test-session-token';
      const csrfToken = validator.generateCSRFToken(sessionToken);
      const result = validator.validateCSRFToken(csrfToken, 'different-session');
      expect(result).toBe(false);
    });
  });

  describe('isXSS', () => {
    it('should detect script tags', () => {
      expect(validator.isXSS('<script>alert("xss")</script>')).toBe(true);
      expect(validator.isXSS('Normal text')).toBe(false);
    });

    it('should detect javascript URLs', () => {
      expect(validator.isXSS('javascript:alert("xss")')).toBe(true);
      expect(validator.isXSS('https://example.com')).toBe(false);
    });

    it('should detect event handlers', () => {
      expect(validator.isXSS('<img onload="alert(1)">')).toBe(true);
      expect(validator.isXSS('<img src="valid.jpg">')).toBe(false);
    });
  });

  describe('isSQLInjection', () => {
    it('should detect SQL injection attempts', () => {
      expect(validator.isSQLInjection("'; DROP TABLE users; --")).toBe(true);
      expect(validator.isSQLInjection('union select * from')).toBe(true);
      expect(validator.isSQLInjection('Normal search text')).toBe(false);
    });

    it('should detect various SQL keywords', () => {
      expect(validator.isSQLInjection('SELECT * FROM users')).toBe(true);
      expect(validator.isSQLInjection('INSERT INTO table')).toBe(true);
      expect(validator.isSQLInjection('UPDATE table SET')).toBe(true);
      expect(validator.isSQLInjection('DELETE FROM table')).toBe(true);
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct file uploads', () => {
      const file = {
        name: 'document.pdf',
        size: 1024 * 1024, // 1MB
        type: 'application/pdf'
      };

      const result = validator.validateFileUpload(file, {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['pdf']
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const file = {
        name: 'large.pdf',
        size: 10 * 1024 * 1024, // 10MB
        type: 'application/pdf'
      };

      const result = validator.validateFileUpload(file, {
        maxSize: 5 * 1024 * 1024 // 5MB
      });

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const file = {
        name: 'script.exe',
        size: 1024,
        type: 'application/exe'
      };

      const result = validator.validateFileUpload(file, {
        allowedTypes: ['application/pdf', 'image/jpeg']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
    });

    it('should detect malicious filenames', () => {
      const file = {
        name: '../../../etc/passwd',
        size: 1024,
        type: 'text/plain'
      };

      const result = validator.validateFileUpload(file);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(e => e.code === 'INVALID_FILENAME')).toBe(true);
    });

    it('should sanitize filenames', () => {
      const file = {
        name: 'my file (1).pdf',
        size: 1024,
        type: 'application/pdf'
      };

      const result = validator.validateFileUpload(file);
      expect(result.sanitized?.name).toBe('my_file__1_.pdf');
    });
  });
});