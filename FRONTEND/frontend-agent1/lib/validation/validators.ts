/**
 * Common validation utility functions
 * These can be used with Zod schemas or standalone
 */

/**
 * Phone number validation
 */
export const validators = {
  /**
   * Validate phone number format
   */
  phone: (value: string): boolean => {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,6}[-\s\.]?[0-9]{0,6}$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  },

  /**
   * Validate URL format
   */
  url: (value: string): boolean => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Check for script tags (XSS prevention)
   */
  noScript: (value: string): boolean => {
    return !/<script[^>]*>.*?<\/script>/gi.test(value);
  },

  /**
   * Check for SQL injection patterns
   */
  noSqlInjection: (value: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
      /(--|\/\*|\*\/|xp_|sp_|;)/,
      /(\bOR\b\s*\d+\s*=\s*\d+)/i,
      /(\bAND\b\s*\d+\s*=\s*\d+)/i,
    ];
    return !sqlPatterns.some(pattern => pattern.test(value));
  },

  /**
   * Validate strong password
   */
  strongPassword: (value: string): boolean => {
    const strength = calculatePasswordStrength(value);
    return strength.score >= 3;
  },

  /**
   * Validate credit card number (Luhn algorithm)
   */
  creditCard: (value: string): boolean => {
    const sanitized = value.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(sanitized)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  },

  /**
   * Validate email more strictly than standard email validation
   */
  strictEmail: (value: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(value)) return false;
    
    // Additional checks
    const [localPart, domain] = value.split('@');
    
    // Check local part length
    if (localPart.length > 64) return false;
    
    // Check total length
    if (value.length > 254) return false;
    
    // Check for consecutive dots
    if (value.includes('..')) return false;
    
    // Check domain has at least one dot
    if (!domain.includes('.')) return false;
    
    return true;
  },

  /**
   * Validate date is in the future
   */
  futureDate: (value: Date | string): boolean => {
    const date = value instanceof Date ? value : new Date(value);
    return date > new Date() && !isNaN(date.getTime());
  },

  /**
   * Validate date is in the past
   */
  pastDate: (value: Date | string): boolean => {
    const date = value instanceof Date ? value : new Date(value);
    return date < new Date() && !isNaN(date.getTime());
  },

  /**
   * Validate age (must be between min and max)
   */
  age: (value: number, min = 0, max = 150): boolean => {
    return Number.isInteger(value) && value >= min && value <= max;
  },

  /**
   * Validate file size
   */
  fileSize: (file: File, maxSizeInMB: number): boolean => {
    return file.size <= maxSizeInMB * 1024 * 1024;
  },

  /**
   * Validate file type
   */
  fileType: (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(file.type);
  },

  /**
   * Validate image dimensions
   */
  imageDimensions: async (
    file: File,
    constraints: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const { minWidth = 0, maxWidth = Infinity, minHeight = 0, maxHeight = Infinity } = constraints;
        
        resolve(
          img.width >= minWidth &&
          img.width <= maxWidth &&
          img.height >= minHeight &&
          img.height <= maxHeight
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      img.src = url;
    });
  },

  /**
   * Validate username format
   */
  username: (value: string): boolean => {
    // 3-20 characters, alphanumeric, underscore, hyphen
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    return usernameRegex.test(value);
  },

  /**
   * Validate hex color
   */
  hexColor: (value: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
  },

  /**
   * Validate IPv4 address
   */
  ipv4: (value: string): boolean => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(value);
  },

  /**
   * Validate JSON string
   */
  json: (value: string): boolean => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate base64 string
   */
  base64: (value: string): boolean => {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(value) && value.length % 4 === 0;
  },
};

/**
 * Password strength calculator
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length checks
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Pattern checks
  if (!/(.)\1{2,}/.test(password)) score++; // No repeated characters
  if (!/^(password|12345678|qwerty|admin)/i.test(password)) score++; // Not common

  // Generate feedback
  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (password.length < 12) feedback.push('Consider using 12+ characters for better security');
  if (!/[a-z]/.test(password)) feedback.push('Include lowercase letters');
  if (!/[A-Z]/.test(password)) feedback.push('Include uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Include numbers');
  if (!/[^A-Za-z0-9]/.test(password)) feedback.push('Include special characters');
  if (/(.)\1{2,}/.test(password)) feedback.push('Avoid repeated characters');
  
  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'fair';
  else if (score <= 6) strength = 'good';
  else if (score <= 8) strength = 'strong';
  else strength = 'very-strong';

  return {
    score: Math.min(score, 10),
    strength,
    feedback
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationError(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.issues?.[0]?.message) return error.issues[0].message;
  return 'Validation failed';
}

/**
 * Combine multiple validators
 */
export function combineValidators(
  ...validators: Array<(value: any) => boolean | string>
): (value: any) => boolean | string {
  return (value: any) => {
    for (const validator of validators) {
      const result = validator(value);
      if (result !== true) {
        return result;
      }
    }
    return true;
  };
}

/**
 * Create async validator wrapper
 */
export function createAsyncValidator<T>(
  validator: (value: T) => Promise<boolean | string>
): (value: T) => Promise<boolean | string> {
  return async (value: T) => {
    try {
      return await validator(value);
    } catch (error) {
      return error instanceof Error ? error.message : 'Validation failed';
    }
  };
}