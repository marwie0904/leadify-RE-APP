import { z } from 'zod';
import { 
  normalizedEmail, 
  securePassword, 
  basicPassword,
  nonEmptyString,
  csrfToken,
  trimmedString
} from '../core/base-schemas';

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: normalizedEmail,
  password: basicPassword.min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  csrfToken: csrfToken
});

/**
 * Registration form validation schema
 */
export const registerSchema = z.object({
  email: normalizedEmail,
  password: securePassword,
  confirmPassword: z.string(),
  name: trimmedString
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  organization: trimmedString
    .max(100, 'Organization name is too long')
    .optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' })
  }),
  marketingEmails: z.boolean().optional().default(false),
  csrfToken: csrfToken
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: normalizedEmail,
  csrfToken: csrfToken
});

/**
 * Password reset form schema
 */
export const passwordResetSchema = z.object({
  password: securePassword,
  confirmPassword: z.string(),
  resetToken: nonEmptyString
    .min(32, 'Invalid reset token')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid reset token format'),
  csrfToken: csrfToken
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

/**
 * Change password form schema (for logged-in users)
 */
export const changePasswordSchema = z.object({
  currentPassword: basicPassword.min(1, 'Current password is required'),
  newPassword: securePassword,
  confirmNewPassword: z.string(),
  csrfToken: csrfToken
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"]
});

/**
 * Two-factor authentication setup schema
 */
export const twoFactorSetupSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional(),
  authenticatorCode: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers')
    .optional(),
  method: z.enum(['sms', 'authenticator']),
  csrfToken: csrfToken
}).refine((data) => {
  if (data.method === 'sms' && !data.phoneNumber) {
    return false;
  }
  if (data.method === 'authenticator' && !data.authenticatorCode) {
    return false;
  }
  return true;
}, {
  message: "Required field is missing",
  path: ["method"]
});

/**
 * Two-factor authentication verification schema
 */
export const twoFactorVerifySchema = z.object({
  code: z.string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only numbers'),
  trustDevice: z.boolean().optional().default(false),
  csrfToken: csrfToken
});

/**
 * Email verification schema
 */
export const emailVerificationSchema = z.object({
  verificationCode: z.string()
    .length(6, 'Verification code must be 6 characters')
    .regex(/^[A-Z0-9]+$/, 'Invalid verification code format'),
  csrfToken: csrfToken
});

/**
 * Social login schema
 */
export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'github', 'facebook', 'twitter']),
  redirectUrl: z.string().url().optional(),
  csrfToken: csrfToken
});

// ===== Type Exports =====

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetRequestFormData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type TwoFactorSetupFormData = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerifyFormData = z.infer<typeof twoFactorVerifySchema>;
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>;
export type SocialLoginFormData = z.infer<typeof socialLoginSchema>;

// ===== Validation Helpers =====

/**
 * Check if a password meets the security requirements
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (!/[A-Z]/.test(password)) feedback.push('Include uppercase letters');
  if (!/[a-z]/.test(password)) feedback.push('Include lowercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Include numbers');
  if (!/[^A-Za-z0-9]/.test(password)) feedback.push('Include special characters');

  return {
    isValid: score >= 5,
    score: Math.min(score / 6, 1),
    feedback
  };
}