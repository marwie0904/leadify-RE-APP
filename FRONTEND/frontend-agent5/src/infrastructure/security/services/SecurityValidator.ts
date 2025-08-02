import { z } from 'zod';
import crypto from 'crypto';
import { 
  IValidator, 
  ValidationResult, 
  ValidationError, 
  URLValidationOptions, 
  PasswordPolicy 
} from '@/domain/security/services/IValidator';
import { ISanitizer } from '@/domain/security/services/ISanitizer';

export class SecurityValidator implements IValidator {
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi
  ];
  
  private readonly sqlPatterns = [
    /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\?)|(\[)|(\])|(\{)|(\})|(>)|(<)|(\^)|(=))/gi,
    /union[\s\w]*select/gi,
    /select[\s\w]*from/gi,
    /insert[\s\w]*into/gi,
    /update[\s\w]*set/gi,
    /delete[\s\w]*from/gi,
    /drop[\s\w]*(table|database)/gi,
    /alter[\s\w]*table/gi,
    /exec(ute)?[\s\w]*\(/gi,
    /script\s*\(/gi
  ];

  private readonly defaultPasswordPolicy: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    prohibitedWords: ['password', 'admin', '123456', 'qwerty', 'letmein']
  };

  constructor(private sanitizer?: ISanitizer) {}

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!email || typeof email !== 'string') {
      errors.push({
        field: 'email',
        message: 'Email is required and must be a string',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Length validation
    if (trimmedEmail.length > 254) {
      errors.push({
        field: 'email',
        message: 'Email must be no more than 254 characters',
        code: 'MAX_LENGTH'
      });
    }

    // Format validation
    if (!this.emailRegex.test(trimmedEmail)) {
      errors.push({
        field: 'email',
        message: 'Email format is invalid',
        code: 'INVALID_FORMAT'
      });
    }

    // Additional security checks
    if (this.isXSS(trimmedEmail)) {
      errors.push({
        field: 'email',
        message: 'Email contains potentially malicious content',
        code: 'SECURITY_VIOLATION'
      });
    }

    // Check for suspicious patterns
    if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      errors.push({
        field: 'email',
        message: 'Email contains invalid dot patterns',
        code: 'INVALID_FORMAT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitized: trimmedEmail
    };
  }

  validateURL(url: string, options: URLValidationOptions = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const {
      allowedProtocols = ['http', 'https'],
      allowLocalhost = false,
      requireTLD = true
    } = options;

    if (!url || typeof url !== 'string') {
      errors.push({
        field: 'url',
        message: 'URL is required and must be a string',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    const trimmedUrl = url.trim();

    try {
      const parsedUrl = new URL(trimmedUrl);

      // Protocol validation
      const protocol = parsedUrl.protocol.replace(':', '');
      if (!allowedProtocols.includes(protocol)) {
        errors.push({
          field: 'url',
          message: `Protocol '${protocol}' is not allowed`,
          code: 'INVALID_PROTOCOL'
        });
      }

      // Localhost validation
      if (!allowLocalhost && (
        parsedUrl.hostname === 'localhost' ||
        parsedUrl.hostname === '127.0.0.1' ||
        parsedUrl.hostname.startsWith('192.168.') ||
        parsedUrl.hostname.startsWith('10.') ||
        parsedUrl.hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)
      )) {
        errors.push({
          field: 'url',
          message: 'Localhost and private IP addresses are not allowed',
          code: 'LOCALHOST_NOT_ALLOWED'
        });
      }

      // TLD validation
      if (requireTLD && !parsedUrl.hostname.includes('.')) {
        errors.push({
          field: 'url',
          message: 'URL must include a top-level domain',
          code: 'TLD_REQUIRED'
        });
      }

      // Security checks
      if (this.isXSS(trimmedUrl)) {
        errors.push({
          field: 'url',
          message: 'URL contains potentially malicious content',
          code: 'SECURITY_VIOLATION'
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
      errors: errors.length > 0 ? errors : undefined,
      sanitized: trimmedUrl
    };
  }

  validatePhone(phone: string, region?: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!phone || typeof phone !== 'string') {
      errors.push({
        field: 'phone',
        message: 'Phone number is required and must be a string',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    // Remove all non-numeric characters except + at the beginning
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (!this.phoneRegex.test(cleanPhone)) {
      errors.push({
        field: 'phone',
        message: 'Phone number format is invalid (E.164 format required)',
        code: 'INVALID_FORMAT'
      });
    }

    // Length validation (E.164 allows up to 15 digits)
    const digits = cleanPhone.replace(/^\+/, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.push({
        field: 'phone',
        message: 'Phone number must be between 7 and 15 digits',
        code: 'INVALID_LENGTH'
      });
    }

    // Security checks
    if (this.isXSS(phone)) {
      errors.push({
        field: 'phone',
        message: 'Phone number contains potentially malicious content',
        code: 'SECURITY_VIOLATION'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitized: cleanPhone
    };
  }

  validatePassword(password: string, policy: PasswordPolicy = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const appliedPolicy = { ...this.defaultPasswordPolicy, ...policy };

    if (!password || typeof password !== 'string') {
      errors.push({
        field: 'password',
        message: 'Password is required and must be a string',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    // Length validation
    if (password.length < appliedPolicy.minLength!) {
      errors.push({
        field: 'password',
        message: `Password must be at least ${appliedPolicy.minLength} characters long`,
        code: 'MIN_LENGTH'
      });
    }

    if (password.length > appliedPolicy.maxLength!) {
      errors.push({
        field: 'password',
        message: `Password must be no more than ${appliedPolicy.maxLength} characters long`,
        code: 'MAX_LENGTH'
      });
    }

    // Character requirement validation
    if (appliedPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one uppercase letter',
        code: 'REQUIRE_UPPERCASE'
      });
    }

    if (appliedPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one lowercase letter',
        code: 'REQUIRE_LOWERCASE'
      });
    }

    if (appliedPolicy.requireNumbers && !/\d/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one number',
        code: 'REQUIRE_NUMBERS'
      });
    }

    if (appliedPolicy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push({
        field: 'password',
        message: 'Password must contain at least one special character',
        code: 'REQUIRE_SPECIAL_CHARS'
      });
    }

    // Prohibited words validation
    const lowerPassword = password.toLowerCase();
    const foundProhibited = appliedPolicy.prohibitedWords?.find(word => 
      lowerPassword.includes(word.toLowerCase())
    );
    
    if (foundProhibited) {
      errors.push({
        field: 'password',
        message: `Password must not contain common words like "${foundProhibited}"`,
        code: 'PROHIBITED_WORD'
      });
    }

    // Security pattern validation
    if (this.isRepeatingPattern(password)) {
      errors.push({
        field: 'password',
        message: 'Password must not contain repeating patterns',
        code: 'REPEATING_PATTERN'
      });
    }

    if (this.isSequentialPattern(password)) {
      errors.push({
        field: 'password',
        message: 'Password must not contain sequential patterns',
        code: 'SEQUENTIAL_PATTERN'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  validateInput<T>(input: T, schema: z.ZodSchema): ValidationResult<T> {
    try {
      const result = schema.safeParse(input);
      
      if (result.success) {
        return {
          isValid: true,
          sanitized: result.data
        };
      } else {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.') || 'root',
          message: err.message,
          code: err.code
        }));

        return {
          isValid: false,
          errors
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'input',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken || typeof token !== 'string' || typeof sessionToken !== 'string') {
      return false;
    }

    try {
      // Generate expected CSRF token based on session token
      const expectedToken = crypto
        .createHmac('sha256', process.env.CSRF_SECRET || 'default-csrf-secret')
        .update(sessionToken)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(token, expectedToken);
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }

  isXSS(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.xssPatterns.some(pattern => pattern.test(input));
  }

  isSQLInjection(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Generate a CSRF token for a session
   */
  generateCSRFToken(sessionToken: string): string {
    if (!sessionToken) {
      throw new Error('Session token is required for CSRF token generation');
    }

    return crypto
      .createHmac('sha256', process.env.CSRF_SECRET || 'default-csrf-secret')
      .update(sessionToken)
      .digest('hex');
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: { name: string; size: number; type: string }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    if (!file || !file.name) {
      errors.push({
        field: 'file',
        message: 'File is required',
        code: 'REQUIRED'
      });
      return { isValid: false, errors };
    }

    // Size validation
    if (file.size > maxSize) {
      errors.push({
        field: 'file',
        message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // Type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        message: `File type '${file.type}' is not allowed`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // Extension validation
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push({
          field: 'file',
          message: `File extension '${extension}' is not allowed`,
          code: 'INVALID_FILE_EXTENSION'
        });
      }
    }

    // Security checks for filename
    if (this.isXSS(file.name) || this.isSQLInjection(file.name)) {
      errors.push({
        field: 'file',
        message: 'Filename contains potentially malicious content',
        code: 'SECURITY_VIOLATION'
      });
    }

    // Path traversal check
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      errors.push({
        field: 'file',
        message: 'Filename contains invalid path characters',
        code: 'INVALID_FILENAME'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitized: {
        ...file,
        name: file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      }
    };
  }

  private isRepeatingPattern(password: string): boolean {
    // Check for patterns like "aaa", "111", "abcabc"
    const repeatingChar = /(.)\1{2,}/.test(password);
    const repeatingSequence = /(..+)\1+/.test(password);
    
    return repeatingChar || repeatingSequence;
  }

  private isSequentialPattern(password: string): boolean {
    // Check for sequential patterns like "abc", "123", "qwerty" (minimum 4 chars)
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];

    const lowerPassword = password.toLowerCase();
    
    // Check for sequences of 4 or more characters
    return sequences.some(sequence => {
      for (let i = 0; i <= sequence.length - 4; i++) {
        const subseq = sequence.substring(i, i + 4);
        if (lowerPassword.includes(subseq)) {
          return true;
        }
      }
      
      // Also check reverse sequences
      const reversed = sequence.split('').reverse().join('');
      for (let i = 0; i <= reversed.length - 4; i++) {
        const subseq = reversed.substring(i, i + 4);
        if (lowerPassword.includes(subseq)) {
          return true;
        }
      }
      
      return false;
    });
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}