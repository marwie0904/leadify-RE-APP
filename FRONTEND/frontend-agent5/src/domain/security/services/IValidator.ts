import { z } from 'zod';

export interface IValidator {
  validateEmail(email: string): ValidationResult;
  validateURL(url: string, options?: URLValidationOptions): ValidationResult;
  validatePhone(phone: string, region?: string): ValidationResult;
  validatePassword(password: string, policy?: PasswordPolicy): ValidationResult;
  validateInput<T>(input: T, schema: z.ZodSchema): ValidationResult<T>;
  validateCSRFToken(token: string, sessionToken: string): boolean;
  isXSS(input: string): boolean;
  isSQLInjection(input: string): boolean;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  errors?: ValidationError[];
  sanitized?: T;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface URLValidationOptions {
  allowedProtocols?: string[];
  allowLocalhost?: boolean;
  requireTLD?: boolean;
}

export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  prohibitedWords?: string[];
}