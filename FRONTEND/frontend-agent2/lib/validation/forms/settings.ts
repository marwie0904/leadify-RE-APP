import { z } from 'zod'

// Profile update schema
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
})

// Email change schema
export const changeEmailSchema = z.object({
  newEmail: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  confirmEmail: z
    .string()
    .min(1, 'Please confirm your email')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  currentPassword: z
    .string()
    .min(1, 'Current password is required to change email'),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Email addresses don't match",
  path: ["confirmEmail"],
})

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must be less than 100 characters')
    .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
})

// Type exports
export type UpdateProfileData = z.infer<typeof updateProfileSchema>
export type ChangeEmailData = z.infer<typeof changeEmailSchema>
export type ChangePasswordData = z.infer<typeof changePasswordSchema>