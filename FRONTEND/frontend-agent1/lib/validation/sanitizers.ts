/**
 * Input sanitization utilities for XSS prevention and data cleaning
 * These functions clean and sanitize user input before processing
 */

/**
 * HTML entity mapping for XSS prevention
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
  '=': '&#x3D;'
};

/**
 * Core sanitization functions
 */
export const sanitizers = {
  /**
   * Escape HTML entities to prevent XSS attacks
   */
  escapeHtml: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITIES[char] || char);
  },

  /**
   * Remove all HTML tags from input
   */
  stripHtml: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '');
  },

  /**
   * Remove script tags and their content
   */
  removeScripts: (input: string): string => {
    if (typeof input !== 'string') return '';
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  },

  /**
   * Remove dangerous HTML attributes that can execute JavaScript
   */
  removeDangerousAttributes: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    const dangerousAttrs = [
      'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
      'onkeydown', 'onkeyup', 'onkeypress', 'onchange', 'onsubmit',
      'onreset', 'onselect', 'onblur', 'onfocus', 'onabort',
      'javascript:', 'vbscript:', 'data:'
    ];
    
    let sanitized = input;
    dangerousAttrs.forEach(attr => {
      const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    return sanitized;
  },

  /**
   * Clean and normalize text input
   */
  cleanText: (input: string, options: {
    trim?: boolean;
    removeExtraSpaces?: boolean;
    toLowerCase?: boolean;
    removeSpecialChars?: boolean;
  } = {}): string => {
    if (typeof input !== 'string') return '';
    
    const {
      trim = true,
      removeExtraSpaces = true,
      toLowerCase = false,
      removeSpecialChars = false
    } = options;
    
    let cleaned = input;
    
    if (trim) {
      cleaned = cleaned.trim();
    }
    
    if (removeExtraSpaces) {
      cleaned = cleaned.replace(/\s+/g, ' ');
    }
    
    if (toLowerCase) {
      cleaned = cleaned.toLowerCase();
    }
    
    if (removeSpecialChars) {
      cleaned = cleaned.replace(/[^\w\s.-]/g, '');
    }
    
    return cleaned;
  },

  /**
   * Sanitize email input
   */
  email: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .toLowerCase()
      .replace(/[^\w@.-]/g, '') // Remove non-email characters
      .substring(0, 254); // RFC 5321 limit
  },

  /**
   * Sanitize phone number input
   */
  phone: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Keep only digits, spaces, parentheses, hyphens, and plus
    return input.replace(/[^\d\s()\-+]/g, '').trim();
  },

  /**
   * Sanitize URL input
   */
  url: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    const cleaned = input.trim();
    
    // Ensure protocol exists
    if (cleaned && !cleaned.match(/^https?:\/\//)) {
      return `https://${cleaned}`;
    }
    
    return cleaned;
  },

  /**
   * Sanitize username input
   */
  username: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') // Allow only alphanumeric, underscore, hyphen
      .substring(0, 20); // Limit length
  },

  /**
   * Sanitize search query input
   */
  searchQuery: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potential XSS characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .substring(0, 200); // Limit length
  },

  /**
   * Sanitize file name
   */
  fileName: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '') // Remove filesystem dangerous characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 255); // Filesystem limit
  },

  /**
   * Sanitize SQL input (basic protection)
   */
  sql: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Remove common SQL injection patterns
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION',
      'ALTER', 'CREATE', 'EXEC', 'EXECUTE', '--', '/*', '*/',
      'xp_', 'sp_'
    ];
    
    let sanitized = input;
    sqlKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
    
    // Remove semicolons and quotes
    sanitized = sanitized.replace(/[;'"]/g, '');
    
    return sanitized.trim();
  },

  /**
   * Sanitize credit card number
   */
  creditCard: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Keep only digits
    return input.replace(/\D/g, '');
  },

  /**
   * Sanitize numeric input
   */
  numeric: (input: string, options: {
    allowDecimal?: boolean;
    allowNegative?: boolean;
    maxLength?: number;
  } = {}): string => {
    if (typeof input !== 'string') return '';
    
    const { allowDecimal = true, allowNegative = true, maxLength = 20 } = options;
    
    let pattern = '\\d';
    if (allowDecimal) pattern += '.';
    if (allowNegative) pattern += '-';
    
    const regex = new RegExp(`[^${pattern}]`, 'g');
    let sanitized = input.replace(regex, '');
    
    // Ensure only one decimal point
    if (allowDecimal) {
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
      }
    }
    
    // Ensure only one negative sign at the beginning
    if (allowNegative) {
      const negativeCount = (sanitized.match(/-/g) || []).length;
      if (negativeCount > 1 || (negativeCount === 1 && !sanitized.startsWith('-'))) {
        sanitized = sanitized.replace(/-/g, '');
        if (input.startsWith('-')) {
          sanitized = '-' + sanitized;
        }
      }
    }
    
    return sanitized.substring(0, maxLength);
  },

  /**
   * Sanitize JSON input
   */
  json: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    try {
      // Try to parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed);
    } catch {
      // If invalid JSON, return empty string
      return '';
    }
  },

  /**
   * Sanitize hex color input
   */
  hexColor: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    const cleaned = input.trim().toUpperCase();
    
    // Add # if missing
    const withHash = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    
    // Keep only valid hex characters
    const sanitized = withHash.replace(/[^#0-9A-F]/g, '');
    
    // Ensure proper length (7 characters including #)
    if (sanitized.length === 7) {
      return sanitized;
    } else if (sanitized.length === 4) {
      // Convert short hex (#RGB) to long hex (#RRGGBB)
      const [, r, g, b] = sanitized;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    
    return '#000000'; // Default to black if invalid
  },

  /**
   * Sanitize base64 input
   */
  base64: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    // Keep only valid base64 characters
    return input.replace(/[^A-Za-z0-9+/=]/g, '');
  }
};

/**
 * Comprehensive input sanitizer that applies multiple sanitization methods
 */
export function sanitizeInput(
  input: string,
  type: 'text' | 'email' | 'url' | 'phone' | 'username' | 'search' | 'filename' | 'numeric' | 'html',
  options: {
    maxLength?: number;
    allowHtml?: boolean;
    customPattern?: RegExp;
  } = {}
): string {
  if (typeof input !== 'string') return '';
  
  const { maxLength = 1000, allowHtml = false } = options;
  
  let sanitized = input;
  
  // Apply basic cleaning
  sanitized = sanitizers.cleanText(sanitized, { trim: true, removeExtraSpaces: true });
  
  // Apply type-specific sanitization
  switch (type) {
    case 'email':
      sanitized = sanitizers.email(sanitized);
      break;
    case 'url':
      sanitized = sanitizers.url(sanitized);
      break;
    case 'phone':
      sanitized = sanitizers.phone(sanitized);
      break;
    case 'username':
      sanitized = sanitizers.username(sanitized);
      break;
    case 'search':
      sanitized = sanitizers.searchQuery(sanitized);
      break;
    case 'filename':
      sanitized = sanitizers.fileName(sanitized);
      break;
    case 'numeric':
      sanitized = sanitizers.numeric(sanitized);
      break;
    case 'html':
      if (allowHtml) {
        sanitized = sanitizers.removeDangerousAttributes(sanitized);
        sanitized = sanitizers.removeScripts(sanitized);
      } else {
        sanitized = sanitizers.stripHtml(sanitized);
      }
      break;
    case 'text':
    default:
      if (!allowHtml) {
        sanitized = sanitizers.escapeHtml(sanitized);
      }
      break;
  }
  
  // Apply length limit
  sanitized = sanitized.substring(0, maxLength);
  
  return sanitized;
}

/**
 * Batch sanitize multiple inputs
 */
export function sanitizeBatch<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, {
    type: Parameters<typeof sanitizeInput>[1];
    options?: Parameters<typeof sanitizeInput>[2];
  }>
): T {
  const sanitized = { ...data };
  
  Object.keys(schema).forEach((key) => {
    const field = key as keyof T;
    const { type, options } = schema[field];
    
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field] as string, type, options) as T[keyof T];
    }
  });
  
  return sanitized;
}

/**
 * Create a sanitization middleware for forms
 */
export function createSanitizationMiddleware<T extends Record<string, any>>(
  schema: Record<keyof T, {
    type: Parameters<typeof sanitizeInput>[1];
    options?: Parameters<typeof sanitizeInput>[2];
  }>
) {
  return (data: T): T => {
    return sanitizeBatch(data, schema);
  };
}

/**
 * Deep sanitize nested objects
 */
export function deepSanitize(
  obj: any,
  options: {
    maxDepth?: number;
    currentDepth?: number;
    allowHtml?: boolean;
  } = {}
): any {
  const { maxDepth = 10, currentDepth = 0, allowHtml = false } = options;
  
  if (currentDepth >= maxDepth) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj, 'text', { allowHtml });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => 
      deepSanitize(item, { ...options, currentDepth: currentDepth + 1 })
    );
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = deepSanitize(
        obj[key], 
        { ...options, currentDepth: currentDepth + 1 }
      );
    });
    return sanitized;
  }
  
  return obj;
}