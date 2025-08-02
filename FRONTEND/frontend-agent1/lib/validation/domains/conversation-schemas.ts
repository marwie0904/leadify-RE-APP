import { z } from 'zod';
import {
  nonEmptyString,
  sanitizedText,
  sanitizedRichText,
  normalizedEmail,
  phoneNumber,
  urlString,
  csrfToken,
  trimmedString
} from '../core/base-schemas';

/**
 * Message input validation schema
 */
export const messageInputSchema = z.object({
  content: nonEmptyString
    .max(5000, 'Message is too long (max 5000 characters)')
    .refine(
      (content) => content.trim().length > 0,
      'Message cannot be empty'
    ),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
    type: z.string()
  })).max(5, 'Maximum 5 attachments allowed').optional(),
  replyTo: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
  csrfToken: csrfToken
});

/**
 * Conversation creation schema
 */
export const conversationCreateSchema = z.object({
  title: nonEmptyString
    .max(200, 'Title is too long')
    .optional(),
  leadId: z.string().uuid().optional(),
  agentId: z.string().uuid(),
  channel: z.enum(['web', 'email', 'sms', 'facebook', 'whatsapp', 'telegram']).default('web'),
  initialMessage: sanitizedText
    .max(5000, 'Initial message is too long')
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  csrfToken: csrfToken
});

/**
 * Lead information for conversation context
 */
export const conversationLeadSchema = z.object({
  name: nonEmptyString
    .max(100, 'Name is too long'),
  email: normalizedEmail.optional(),
  phone: phoneNumber.optional(),
  company: trimmedString
    .max(100, 'Company name is too long')
    .optional(),
  source: z.enum(['website', 'email', 'phone', 'social', 'referral', 'other']).optional(),
  notes: sanitizedText
    .max(1000, 'Notes are too long')
    .optional()
}).refine((data) => {
  // At least one contact method is required
  return !!(data.email || data.phone);
}, {
  message: "At least one contact method (email or phone) is required",
  path: ["email"]
});

/**
 * Conversation update schema
 */
export const conversationUpdateSchema = z.object({
  title: trimmedString
    .max(200, 'Title is too long')
    .optional(),
  status: z.enum(['active', 'archived', 'resolved', 'pending']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  tags: z.array(
    trimmedString.max(50, 'Tag is too long')
  ).max(10, 'Maximum 10 tags allowed').optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  csrfToken: csrfToken
});

/**
 * Handoff request schema
 */
export const handoffRequestSchema = z.object({
  reason: sanitizedText
    .max(500, 'Reason is too long')
    .optional(),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  requestedBy: z.enum(['user', 'agent', 'system']).default('user'),
  preferredAgent: z.string().uuid().optional(),
  notes: sanitizedText
    .max(1000, 'Notes are too long')
    .optional(),
  csrfToken: csrfToken
});

/**
 * Conversation search/filter schema
 */
export const conversationSearchSchema = z.object({
  query: trimmedString.optional(),
  status: z.array(z.enum(['active', 'archived', 'resolved', 'pending'])).optional(),
  channels: z.array(z.enum(['web', 'email', 'sms', 'facebook', 'whatsapp', 'telegram'])).optional(),
  assignedTo: z.array(z.string().uuid()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date()
  }).refine((data) => data.start <= data.end, {
    message: "Start date must be before end date",
    path: ["end"]
  }).optional(),
  tags: z.array(trimmedString).optional(),
  hasUnread: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

/**
 * Quick reply template schema
 */
export const quickReplySchema = z.object({
  name: nonEmptyString
    .max(100, 'Template name is too long'),
  content: nonEmptyString
    .max(1000, 'Template content is too long'),
  category: trimmedString
    .max(50, 'Category name is too long')
    .optional(),
  shortcuts: z.array(
    alphanumericString.max(20, 'Shortcut is too long')
  ).max(5, 'Maximum 5 shortcuts allowed').optional(),
  variables: z.array(z.object({
    name: alphanumericString,
    description: trimmedString.optional(),
    defaultValue: trimmedString.optional()
  })).optional(),
  isActive: z.boolean().default(true),
  csrfToken: csrfToken
});

/**
 * Conversation note schema
 */
export const conversationNoteSchema = z.object({
  content: nonEmptyString
    .max(2000, 'Note is too long'),
  isPrivate: z.boolean().default(false),
  mentions: z.array(z.string().uuid()).optional(),
  csrfToken: csrfToken
});

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'File size must be less than 10MB'
    )
    .refine(
      (file) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        return allowedTypes.includes(file.type);
      },
      'File type not allowed'
    ),
  conversationId: z.string().uuid(),
  description: sanitizedText
    .max(500, 'Description is too long')
    .optional(),
  csrfToken: csrfToken
});

// ===== Type Exports =====

export type MessageInputFormData = z.infer<typeof messageInputSchema>;
export type ConversationCreateFormData = z.infer<typeof conversationCreateSchema>;
export type ConversationLeadFormData = z.infer<typeof conversationLeadSchema>;
export type ConversationUpdateFormData = z.infer<typeof conversationUpdateSchema>;
export type HandoffRequestFormData = z.infer<typeof handoffRequestSchema>;
export type ConversationSearchFormData = z.infer<typeof conversationSearchSchema>;
export type QuickReplyFormData = z.infer<typeof quickReplySchema>;
export type ConversationNoteFormData = z.infer<typeof conversationNoteSchema>;
export type FileUploadFormData = z.infer<typeof fileUploadSchema>;

// ===== Validation Helpers =====

/**
 * Validate message content for prohibited content
 */
export function validateMessageContent(content: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check for potential spam patterns
  const spamPatterns = [
    /\b(?:viagra|cialis|casino|lottery)\b/i,
    /\b(?:click here|act now|limited time)\b/i,
    /\$\d+,?\d*\s*(?:dollars?|usd)/i
  ];
  
  spamPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      warnings.push('Message may be flagged as spam');
    }
  });
  
  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 10) {
    warnings.push('Excessive use of capital letters');
  }
  
  // Check for repeated characters
  if (/(.)\1{4,}/.test(content)) {
    warnings.push('Contains repeated characters');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}

// Import statement needed for the alphanumericString
import { alphanumericString } from '../core/base-schemas';