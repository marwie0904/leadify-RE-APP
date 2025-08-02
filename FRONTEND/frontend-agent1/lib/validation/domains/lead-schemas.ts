import { z } from 'zod';
import {
  nonEmptyString,
  normalizedEmail,
  phoneNumber,
  sanitizedText,
  trimmedString,
  urlString,
  currencyAmount,
  csrfToken,
  addressSchema
} from '../core/base-schemas';

/**
 * Lead creation schema
 */
export const leadCreateSchema = z.object({
  // Basic Information
  firstName: nonEmptyString
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  lastName: nonEmptyString
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  email: normalizedEmail,
  phone: phoneNumber.optional(),
  alternatePhone: phoneNumber.optional(),
  
  // Company Information
  company: trimmedString
    .max(100, 'Company name is too long')
    .optional(),
  jobTitle: trimmedString
    .max(100, 'Job title is too long')
    .optional(),
  industry: z.enum([
    'technology',
    'healthcare',
    'finance',
    'retail',
    'manufacturing',
    'education',
    'real_estate',
    'consulting',
    'marketing',
    'other'
  ]).optional(),
  companySize: z.enum([
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1001-5000',
    '5001+'
  ]).optional(),
  
  // Lead Details
  source: z.enum([
    'website',
    'email',
    'phone',
    'social_media',
    'referral',
    'advertisement',
    'event',
    'partner',
    'other'
  ]),
  sourceDetails: trimmedString
    .max(200, 'Source details are too long')
    .optional(),
  status: z.enum([
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
    'disqualified'
  ]).default('new'),
  score: z.number()
    .int()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score cannot exceed 100')
    .optional(),
  
  // Additional Information
  website: urlString.optional().or(z.literal('')),
  linkedIn: urlString
    .refine(
      (url) => !url || url.includes('linkedin.com'),
      'Please enter a valid LinkedIn URL'
    )
    .optional()
    .or(z.literal('')),
  address: addressSchema.optional(),
  timezone: z.string().optional(),
  preferredContactMethod: z.enum(['email', 'phone', 'sms', 'any']).default('any'),
  
  // Custom Fields
  customFields: z.record(z.string(), z.any()).optional(),
  tags: z.array(
    trimmedString.max(30, 'Tag is too long')
  ).max(10, 'Maximum 10 tags allowed').optional(),
  
  // Internal
  assignedTo: z.string().uuid().optional(),
  notes: sanitizedText
    .max(2000, 'Notes are too long')
    .optional(),
  csrfToken: csrfToken
});

/**
 * Lead update schema (partial update)
 */
export const leadUpdateSchema = leadCreateSchema.partial().extend({
  id: z.string().uuid(),
  csrfToken: csrfToken
});

/**
 * Lead import schema (bulk import)
 */
export const leadImportSchema = z.object({
  leads: z.array(
    leadCreateSchema.omit({ csrfToken: true })
  ).min(1, 'At least one lead is required')
    .max(1000, 'Maximum 1000 leads can be imported at once'),
  duplicateHandling: z.enum(['skip', 'update', 'create_new']).default('skip'),
  assignTo: z.string().uuid().optional(),
  defaultTags: z.array(trimmedString).optional(),
  sendWelcomeEmail: z.boolean().default(false),
  csrfToken: csrfToken
});

/**
 * Lead search/filter schema
 */
export const leadSearchSchema = z.object({
  query: trimmedString.optional(),
  status: z.array(z.enum([
    'new',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
    'disqualified'
  ])).optional(),
  sources: z.array(z.enum([
    'website',
    'email',
    'phone',
    'social_media',
    'referral',
    'advertisement',
    'event',
    'partner',
    'other'
  ])).optional(),
  scoreRange: z.object({
    min: z.number().int().min(0).max(100),
    max: z.number().int().min(0).max(100)
  }).refine((data) => data.min <= data.max, {
    message: "Minimum score must be less than or equal to maximum",
    path: ["max"]
  }).optional(),
  assignedTo: z.array(z.string().uuid()).optional(),
  tags: z.array(trimmedString).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }).refine((data) => data.start <= data.end, {
    message: "Start date must be before end date",
    path: ["end"]
  }).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['created_at', 'updated_at', 'score', 'name', 'company']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Lead assignment schema
 */
export const leadAssignmentSchema = z.object({
  leadIds: z.array(z.string().uuid())
    .min(1, 'At least one lead must be selected'),
  assignTo: z.string().uuid().optional().nullable(),
  reason: sanitizedText
    .max(500, 'Reason is too long')
    .optional(),
  notifyAssignee: z.boolean().default(true),
  csrfToken: csrfToken
});

/**
 * Lead conversion schema
 */
export const leadConversionSchema = z.object({
  leadId: z.string().uuid(),
  conversionType: z.enum(['customer', 'opportunity', 'disqualified']),
  value: currencyAmount.optional(),
  probability: z.number()
    .min(0, 'Probability must be at least 0%')
    .max(100, 'Probability cannot exceed 100%')
    .optional(),
  expectedCloseDate: z.date()
    .min(new Date(), 'Close date must be in the future')
    .optional(),
  notes: sanitizedText
    .max(1000, 'Notes are too long')
    .optional(),
  createAccount: z.boolean().default(true),
  createContact: z.boolean().default(true),
  csrfToken: csrfToken
});

/**
 * Lead activity schema
 */
export const leadActivitySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  subject: nonEmptyString
    .max(200, 'Subject is too long'),
  description: sanitizedText
    .max(2000, 'Description is too long')
    .optional(),
  outcome: z.enum(['successful', 'no_answer', 'rescheduled', 'cancelled']).optional(),
  scheduledAt: z.date().optional(),
  duration: z.number()
    .int()
    .min(0, 'Duration must be positive')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional(), // in minutes
  csrfToken: csrfToken
});

/**
 * Lead scoring rule schema
 */
export const leadScoringRuleSchema = z.object({
  name: nonEmptyString
    .max(100, 'Rule name is too long'),
  description: sanitizedText
    .max(500, 'Description is too long')
    .optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than']),
    value: z.any()
  })).min(1, 'At least one condition is required'),
  scoreChange: z.number()
    .int()
    .min(-100, 'Score change cannot be less than -100')
    .max(100, 'Score change cannot exceed 100'),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  csrfToken: csrfToken
});

// ===== Type Exports =====

export type LeadCreateFormData = z.infer<typeof leadCreateSchema>;
export type LeadUpdateFormData = z.infer<typeof leadUpdateSchema>;
export type LeadImportFormData = z.infer<typeof leadImportSchema>;
export type LeadSearchFormData = z.infer<typeof leadSearchSchema>;
export type LeadAssignmentFormData = z.infer<typeof leadAssignmentSchema>;
export type LeadConversionFormData = z.infer<typeof leadConversionSchema>;
export type LeadActivityFormData = z.infer<typeof leadActivitySchema>;
export type LeadScoringRuleFormData = z.infer<typeof leadScoringRuleSchema>;

// ===== Validation Helpers =====

/**
 * Calculate lead score based on data completeness and quality
 */
export function calculateLeadScore(lead: Partial<LeadCreateFormData>): number {
  let score = 0;
  
  // Basic information (40 points)
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.firstName && lead.lastName) score += 10;
  if (lead.company) score += 10;
  
  // Professional information (30 points)
  if (lead.jobTitle) score += 10;
  if (lead.industry) score += 10;
  if (lead.companySize) score += 10;
  
  // Engagement (20 points)
  if (lead.website) score += 5;
  if (lead.linkedIn) score += 5;
  if (lead.preferredContactMethod !== 'any') score += 10;
  
  // Quality (10 points)
  if (lead.notes && lead.notes.length > 50) score += 5;
  if (lead.tags && lead.tags.length > 0) score += 5;
  
  return Math.min(score, 100);
}