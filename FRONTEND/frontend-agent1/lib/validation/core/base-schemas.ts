import { z } from 'zod';

/**
 * Base schemas and transformations for form validation
 * These provide reusable, secure validation patterns
 */

// ===== String Validators =====

/**
 * Basic trimmed string - removes leading/trailing whitespace
 */
export const trimmedString = z.string().trim();

/**
 * Non-empty trimmed string
 */
export const nonEmptyString = trimmedString.min(1, 'This field is required');

/**
 * Normalized email - lowercase, trimmed, validated
 */
export const normalizedEmail = z.string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address')
  .max(254, 'Email address is too long'); // RFC 5321

/**
 * Phone number with international format support
 */
export const phoneNumber = z.string()
  .trim()
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,6}[-\s\.]?[0-9]{0,6}$/,
    'Please enter a valid phone number'
  )
  .min(10, 'Phone number is too short')
  .max(20, 'Phone number is too long');

/**
 * URL validation with protocol requirement
 */
export const urlString = z.string()
  .trim()
  .url('Please enter a valid URL')
  .refine(
    (url) => /^https?:\/\//.test(url),
    'URL must start with http:// or https://'
  );

// ===== Password Validators =====

/**
 * Basic password - minimum requirements
 */
export const basicPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long');

/**
 * Secure password with complexity requirements
 */
export const securePassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain more than 2 repeated characters in a row'
  )
  .refine(
    (password) => {
      const commonPasswords = ['password', '12345678', 'qwerty', 'admin'];
      return !commonPasswords.some(common => 
        password.toLowerCase().includes(common)
      );
    },
    'Password is too common. Please choose a more secure password'
  );

// ===== Sanitization Transformers =====

/**
 * Sanitized text - removes potential XSS vectors
 */
export const sanitizedText = z.string().transform((val) => {
  return val
    // Remove script tags
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
});

/**
 * Sanitized rich text - allows specific safe HTML tags
 */
export const sanitizedRichText = z.string().transform((val) => {
  // List of allowed tags
  const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'span', 'div'];
  const allowedAttributes = ['class', 'id'];
  
  // Remove dangerous elements
  let sanitized = val
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  // Remove non-allowed tags
  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      return match;
    }
    return '';
  });
  
  return sanitized.trim();
});

/**
 * Sanitized filename - prevents directory traversal
 */
export const sanitizedFilename = z.string().transform((val) => {
  return val
    // Remove directory traversal attempts
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '_')
    // Remove special characters that could cause issues
    .replace(/[<>:"|?*]/g, '_')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Limit length
    .substring(0, 255)
    .trim();
});

/**
 * Alphanumeric string with underscores and hyphens
 */
export const alphanumericString = z.string()
  .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores, and hyphens are allowed')
  .min(1, 'This field is required');

// ===== Number Validators =====

/**
 * Positive integer
 */
export const positiveInt = z.number()
  .int('Must be a whole number')
  .positive('Must be a positive number');

/**
 * Percentage (0-100)
 */
export const percentage = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

/**
 * Currency amount (2 decimal places)
 */
export const currencyAmount = z.number()
  .multipleOf(0.01, 'Amount must have at most 2 decimal places')
  .min(0, 'Amount cannot be negative');

// ===== Date Validators =====

/**
 * Future date validation
 */
export const futureDate = z.date()
  .refine(
    (date) => date > new Date(),
    'Date must be in the future'
  );

/**
 * Past date validation
 */
export const pastDate = z.date()
  .refine(
    (date) => date < new Date(),
    'Date must be in the past'
  );

/**
 * Date within range
 */
export const dateInRange = (min: Date, max: Date) => z.date()
  .refine(
    (date) => date >= min && date <= max,
    `Date must be between ${min.toLocaleDateString()} and ${max.toLocaleDateString()}`
  );

// ===== Boolean Validators =====

/**
 * Required checkbox (must be true)
 */
export const requiredCheckbox = z.boolean()
  .refine(val => val === true, 'This field must be checked');

// ===== Array Validators =====

/**
 * Non-empty array
 */
export const nonEmptyArray = <T extends z.ZodTypeAny>(schema: T) => 
  z.array(schema).min(1, 'At least one item is required');

/**
 * Unique array items
 */
export const uniqueArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).refine(
    (items) => new Set(items).size === items.length,
    'All items must be unique'
  );

// ===== Object Validators =====

/**
 * Address schema
 */
export const addressSchema = z.object({
  street: nonEmptyString.max(100, 'Street address is too long'),
  city: nonEmptyString.max(50, 'City name is too long'),
  state: nonEmptyString.max(50, 'State name is too long'),
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  country: nonEmptyString.max(50, 'Country name is too long')
});

// ===== Utility Functions =====

/**
 * Create a schema with conditional validation
 */
export const conditionalSchema = <T extends z.ZodTypeAny>(
  condition: (data: any) => boolean,
  trueSchema: T,
  falseSchema: T
) => z.union([trueSchema, falseSchema]).superRefine((val, ctx) => {
  if (condition(ctx)) {
    return trueSchema.parse(val);
  } else {
    return falseSchema.parse(val);
  }
});

/**
 * Create a schema with custom error messages
 */
export const withCustomErrors = <T extends z.ZodTypeAny>(
  schema: T,
  errorMap: Record<string, string>
) => schema.superRefine((val, ctx) => {
  const result = schema.safeParse(val);
  if (!result.success) {
    result.error.issues.forEach(issue => {
      const customMessage = errorMap[issue.code] || errorMap.default;
      if (customMessage) {
        ctx.addIssue({
          ...issue,
          message: customMessage
        });
      }
    });
  }
});

// ===== CSRF Token Schema =====

/**
 * CSRF token validation
 */
export const csrfToken = z.string()
  .min(32, 'Invalid security token')
  .regex(/^[A-Za-z0-9+/=]+$/, 'Invalid security token format');