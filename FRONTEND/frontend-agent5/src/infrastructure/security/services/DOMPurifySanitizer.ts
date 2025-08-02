import DOMPurify from 'isomorphic-dompurify';
import { ISanitizer, HTMLSanitizationOptions, SanitizationRules } from '@/domain/security/services/ISanitizer';

export class DOMPurifySanitizer implements ISanitizer {
  private readonly defaultHTMLOptions: HTMLSanitizationOptions = {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
      'blockquote': ['cite'],
      'img': ['src', 'alt', 'width', 'height']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    stripEmpty: true
  };

  sanitizeHTML(input: string, options?: HTMLSanitizationOptions): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const config = { ...this.defaultHTMLOptions, ...options };
    
    const purifyConfig: any = {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: this.flattenAllowedAttributes(config.allowedAttributes || {}),
      ALLOWED_URI_REGEXP: this.buildURIRegex(config.allowedSchemes || []),
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false
    };

    if (config.stripEmpty) {
      purifyConfig.REMOVE_EMPTY = true;
    }

    try {
      const result = DOMPurify.sanitize(input, purifyConfig);
      // Handle case where DOMPurify returns undefined (e.g., in test environment)
      if (result === undefined || result === null) {
        return this.escapeSpecialChars(input);
      }
      return result;
    } catch (error) {
      console.warn('HTML sanitization failed:', error);
      return this.escapeSpecialChars(input);
    }
  }

  sanitizeSQL(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/'/g, "''")  // Escape single quotes
      .replace(/;/g, '')    // Remove semicolons
      .replace(/--/g, '')   // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comments start
      .replace(/\*\//g, '') // Remove multi-line comments end
      .replace(/xp_/gi, '') // Remove extended stored procedures
      .replace(/sp_/gi, '') // Remove stored procedures
      .replace(/exec/gi, '') // Remove exec commands
      .replace(/execute/gi, '') // Remove execute commands
      .replace(/union/gi, '') // Remove union commands
      .replace(/select/gi, '') // Remove select commands
      .replace(/insert/gi, '') // Remove insert commands
      .replace(/update/gi, '') // Remove update commands
      .replace(/delete/gi, '') // Remove delete commands
      .replace(/drop/gi, '') // Remove drop commands
      .replace(/create/gi, '') // Remove create commands
      .replace(/alter/gi, '') // Remove alter commands
      .replace(/script/gi, ''); // Remove script tags
  }

  sanitizeJSON<T>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input !== 'object') {
      if (typeof input === 'string') {
        return this.escapeSpecialChars(input) as T;
      }
      return input;
    }

    const seen = new WeakSet();
    
    const sanitize = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      if (seen.has(obj)) {
        return '[Circular Reference]';
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

      if (obj instanceof RegExp) {
        return obj.toString();
      }

      if (typeof obj === 'function') {
        return '[Function]';
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
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    // Remove sensitive fields
    if (rules?.removeFields) {
      rules.removeFields.forEach(field => {
        delete result[field];
        // Also check for nested field patterns (e.g., user.password)
        if (field.includes('.')) {
          const parts = field.split('.');
          let current = result;
          for (let i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] && typeof current[parts[i]] === 'object') {
              current = current[parts[i]];
            } else {
              break;
            }
          }
          if (current && typeof current === 'object') {
            delete current[parts[parts.length - 1]];
          }
        }
      });
    }

    // Mask sensitive fields
    if (rules?.maskFields) {
      rules.maskFields.forEach(field => {
        if (result[field] !== undefined) {
          result[field] = this.mask(result[field]);
        }
      });
    }

    // Apply custom sanitizers
    if (rules?.customSanitizers) {
      Object.entries(rules.customSanitizers).forEach(([field, sanitizer]) => {
        if (result[field] !== undefined) {
          try {
            result[field] = sanitizer(result[field]);
          } catch (error) {
            console.warn(`Custom sanitizer failed for field ${field}:`, error);
            result[field] = '[Sanitization Failed]';
          }
        }
      });
    }

    return result;
  }

  removeScripts(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/expression\s*\(/gi, '');
  }

  escapeSpecialChars(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return input.replace(/[&<>"'`=/]/g, char => escapeMap[char] || char);
  }

  /**
   * Sanitize a URL to prevent XSS and ensure it's safe
   */
  sanitizeURL(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove dangerous protocols
    const dangerousProtocols = /^(javascript|vbscript|data|blob):/i;
    if (dangerousProtocols.test(url)) {
      return '';
    }

    try {
      const parsed = new URL(url);
      
      // Only allow safe protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '';
      }

      return parsed.toString();
    } catch {
      // If URL parsing fails, it's not a valid URL
      return '';
    }
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  sanitizeFilePath(path: string): string {
    if (!path || typeof path !== 'string') {
      return '';
    }

    return path
      .replace(/\.\./g, '') // Remove directory traversal attempts
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+/g, '/'); // Normalize multiple slashes
  }

  private buildURIRegex(schemes: string[]): RegExp {
    if (schemes.length === 0) {
      return /^https?:/i;
    }
    const schemePattern = schemes.join('|');
    return new RegExp(`^(${schemePattern}):`, 'i');
  }

  private flattenAllowedAttributes(allowedAttributes: Record<string, string[]>): string[] {
    return Object.values(allowedAttributes).flat();
  }

  private mask(value: any): string {
    const str = String(value);
    if (str.length <= 4) {
      return '*'.repeat(str.length);
    }
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }
}