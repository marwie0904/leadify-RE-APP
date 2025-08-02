import { z } from 'zod';

/**
 * Common validation schemas using Zod
 * These can be used with the validateInput method
 */

// Basic type schemas
export const StringSchema = z.string().min(1).max(1000);
export const EmailSchema = z.string().email().max(254);
export const URLSchema = z.string().url().max(2000);
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
export const UUIDSchema = z.string().uuid();

// Password schema with common requirements
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character');

// File upload schema
export const FileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  type: z.string().min(1)
});

// User input schemas
export const UserRegistrationSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name'),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name'),
  phone: PhoneSchema.optional(),
  dateOfBirth: z.string().datetime().optional(),
  terms: z.boolean().refine(val => val === true, 'Must accept terms and conditions')
});

export const UserLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

export const UserProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name').optional(),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name').optional(),
  phone: PhoneSchema.optional(),
  bio: z.string().max(500).optional(),
  website: URLSchema.optional(),
  location: z.string().max(100).optional()
});

export const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation must match',
  path: ['confirmPassword']
});

// API request schemas
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.record(z.any()).optional(),
  ...PaginationSchema.shape
});

// Financial schemas (specific to this application)
export const AmountSchema = z.number().positive().multipleOf(0.01); // cents precision

export const TransactionSchema = z.object({
  amount: AmountSchema,
  description: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  date: z.string().datetime(),
  type: z.enum(['income', 'expense', 'transfer']),
  account: z.string().uuid(),
  tags: z.array(z.string().max(20)).max(10).optional()
});

export const AccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan']),
  balance: z.number(),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/, 'Invalid currency code'),
  institution: z.string().max(100).optional(),
  accountNumber: z.string().max(20).optional()
});

// Security-specific schemas
export const CSRFTokenSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid CSRF token format');

export const APIKeySchema = z.string()
  .min(32)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format');

export const JWTTokenSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'Invalid JWT format');

// Form validation schemas
export const ContactFormSchema = z.object({
  name: z.string().min(1).max(100),
  email: EmailSchema,
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(2000),
  phone: PhoneSchema.optional(),
  company: z.string().max(100).optional()
});

export const FeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(100),
  comment: z.string().min(10).max(1000),
  category: z.enum(['bug', 'feature', 'improvement', 'other']),
  email: EmailSchema.optional()
});

// Admin schemas
export const UserManagementSchema = z.object({
  userId: UUIDSchema,
  action: z.enum(['activate', 'deactivate', 'suspend', 'delete']),
  reason: z.string().min(1).max(500).optional()
});

export const SystemConfigSchema = z.object({
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
  maxFileUploadSize: z.number().positive(),
  sessionTimeout: z.number().positive(),
  passwordPolicy: z.object({
    minLength: z.number().int().min(6).max(128),
    requireUppercase: z.boolean(),
    requireLowercase: z.boolean(),
    requireNumbers: z.boolean(),
    requireSpecialChars: z.boolean()
  })
});

// Webhook schemas
export const WebhookPayloadSchema = z.object({
  event: z.string().min(1),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  signature: z.string().min(1)
});

// Rate limiting schemas
export const RateLimitConfigSchema = z.object({
  windowMs: z.number().positive(),
  maxRequests: z.number().positive(),
  skipSuccessfulRequests: z.boolean().optional(),
  skipFailedRequests: z.boolean().optional(),
  keyGenerator: z.function().optional()
});

/**
 * Helper function to create custom validation schemas
 */
export function createStringSchema(minLength: number = 1, maxLength: number = 255, pattern?: RegExp) {
  let schema = z.string().min(minLength).max(maxLength);
  if (pattern) {
    schema = schema.regex(pattern);
  }
  return schema;
}

export function createNumberSchema(min?: number, max?: number, integer?: boolean) {
  let schema = z.number();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  if (integer) schema = schema.int();
  return schema;
}

export function createArraySchema<T>(itemSchema: z.ZodSchema<T>, minItems?: number, maxItems?: number) {
  let schema = z.array(itemSchema);
  if (minItems !== undefined) schema = schema.min(minItems);
  if (maxItems !== undefined) schema = schema.max(maxItems);
  return schema;
}

/**
 * Common field sanitization schemas
 */
export const SanitizedStringSchema = z.string()
  .transform(str => str.trim())
  .refine(str => str.length > 0, 'String cannot be empty after trimming');

export const SanitizedHTMLSchema = z.string()
  .transform(str => {
    // Remove potentially dangerous HTML tags
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<iframe\b[^>]*>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
  });

/**
 * Validation error messages
 */
export const ValidationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  phone: 'Please enter a valid phone number',
  password: 'Password does not meet security requirements',
  uuid: 'Invalid ID format',
  positive: 'Value must be positive',
  maxLength: (max: number) => `Maximum ${max} characters allowed`,
  minLength: (min: number) => `Minimum ${min} characters required`,
  pattern: 'Invalid format'
} as const;