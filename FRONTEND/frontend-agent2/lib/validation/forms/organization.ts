import { z } from 'zod'

// Organization creation schema
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .min(3, 'Organization name must be at least 3 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim()
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Organization name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    ),
})

// Organization member invitation schema
export const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  role: z.enum(['member', 'agent', 'moderator', 'admin'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
})

// Organization update schema (for future use)
export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(3, 'Organization name must be at least 3 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim()
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Organization name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
})

// Type exports
export type CreateOrganizationData = z.infer<typeof createOrganizationSchema>
export type InviteMemberData = z.infer<typeof inviteMemberSchema>
export type UpdateOrganizationData = z.infer<typeof updateOrganizationSchema>