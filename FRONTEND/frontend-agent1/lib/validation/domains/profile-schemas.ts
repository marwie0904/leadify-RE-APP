import { z } from 'zod';
import {
  normalizedEmail,
  nonEmptyString,
  phoneNumber,
  urlString,
  sanitizedText,
  trimmedString,
  alphanumericString,
  csrfToken,
  addressSchema
} from '../core/base-schemas';

/**
 * User profile update schema
 */
export const userProfileSchema = z.object({
  name: nonEmptyString
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  email: normalizedEmail,
  phone: phoneNumber.optional().or(z.literal('')),
  bio: sanitizedText
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  jobTitle: trimmedString
    .max(100, 'Job title is too long')
    .optional(),
  department: trimmedString
    .max(100, 'Department name is too long')
    .optional(),
  timezone: z.string()
    .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Please select a valid timezone'),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh']).default('en'),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  avatar: urlString.optional().or(z.literal('')),
  csrfToken: csrfToken
});

/**
 * Organization settings schema
 */
export const organizationSettingsSchema = z.object({
  name: nonEmptyString
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name is too long'),
  slug: alphanumericString
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: sanitizedText
    .max(1000, 'Description is too long')
    .optional(),
  website: urlString.optional().or(z.literal('')),
  email: normalizedEmail.optional(),
  phone: phoneNumber.optional().or(z.literal('')),
  address: addressSchema.optional(),
  logo: urlString.optional().or(z.literal('')),
  primaryColor: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color')
    .optional(),
  industry: z.enum([
    'technology',
    'healthcare',
    'finance',
    'retail',
    'manufacturing',
    'education',
    'other'
  ]).optional(),
  size: z.enum([
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1001+'
  ]).optional(),
  csrfToken: csrfToken
});

/**
 * Notification preferences schema
 */
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.object({
    messages: z.boolean().default(true),
    leads: z.boolean().default(true),
    teamUpdates: z.boolean().default(true),
    systemAlerts: z.boolean().default(true),
    marketing: z.boolean().default(false),
    digest: z.enum(['never', 'daily', 'weekly', 'monthly']).default('weekly')
  }),
  pushNotifications: z.object({
    enabled: z.boolean().default(false),
    messages: z.boolean().default(true),
    leads: z.boolean().default(true),
    mentions: z.boolean().default(true)
  }),
  smsNotifications: z.object({
    enabled: z.boolean().default(false),
    criticalAlerts: z.boolean().default(true),
    phoneNumber: phoneNumber.optional()
  }).refine((data) => {
    // If SMS is enabled, phone number is required
    if (data.enabled && !data.phoneNumber) {
      return false;
    }
    return true;
  }, {
    message: "Phone number is required when SMS notifications are enabled",
    path: ["phoneNumber"]
  }),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
    endTime: z.string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)'),
    timezone: z.string()
  }).optional(),
  csrfToken: csrfToken
});

/**
 * Privacy settings schema
 */
export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'team', 'private']).default('team'),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showActivity: z.boolean().default(true),
  allowTeamInvites: z.boolean().default(true),
  dataSharing: z.object({
    analytics: z.boolean().default(true),
    improvement: z.boolean().default(true),
    thirdParty: z.boolean().default(false)
  }),
  csrfToken: csrfToken
});

/**
 * API key creation schema
 */
export const apiKeySchema = z.object({
  name: nonEmptyString
    .max(100, 'API key name is too long'),
  description: sanitizedText
    .max(500, 'Description is too long')
    .optional(),
  permissions: z.array(z.enum([
    'read:leads',
    'write:leads',
    'read:conversations',
    'write:conversations',
    'read:agents',
    'write:agents',
    'read:analytics',
    'admin'
  ])).min(1, 'At least one permission is required'),
  expiresAt: z.date()
    .min(new Date(), 'Expiration date must be in the future')
    .optional(),
  ipWhitelist: z.array(
    z.string().ip({ version: 'v4' })
  ).optional(),
  csrfToken: csrfToken
});

/**
 * Team member invitation schema
 */
export const teamInviteSchema = z.object({
  email: normalizedEmail,
  name: nonEmptyString
    .max(100, 'Name is too long')
    .optional(),
  role: z.enum(['admin', 'manager', 'member', 'viewer']),
  departments: z.array(trimmedString).optional(),
  message: sanitizedText
    .max(500, 'Message is too long')
    .optional(),
  sendEmail: z.boolean().default(true),
  csrfToken: csrfToken
});

// ===== Type Exports =====

export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type OrganizationSettingsFormData = z.infer<typeof organizationSettingsSchema>;
export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>;
export type PrivacySettingsFormData = z.infer<typeof privacySettingsSchema>;
export type ApiKeyFormData = z.infer<typeof apiKeySchema>;
export type TeamInviteFormData = z.infer<typeof teamInviteSchema>;