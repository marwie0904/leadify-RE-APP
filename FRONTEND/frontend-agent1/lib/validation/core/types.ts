/**
 * Core validation types for the form validation system
 */

export interface ValidationRule {
  id: string;
  name: string;
  validate: (value: any) => ValidationResult;
  sanitize?: (value: any) => any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface FormSecurityContext {
  csrfToken: string;
  sessionId: string;
  timestamp: number;
  origin: string;
  userAgent?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  securityContext: FormSecurityContext;
  validationResults: ValidationResult;
  submittedAt: Date;
  processedAt?: Date;
}

export interface FieldValidationState {
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export type SanitizationFunction = (value: any) => any;
export type ValidationFunction = (value: any) => boolean | string | ValidationError;

export interface ValidationSchema {
  fields: Record<string, FieldValidation>;
  crossFieldValidations?: CrossFieldValidation[];
}

export interface FieldValidation {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: ValidationFunction[];
  sanitize?: SanitizationFunction[];
}

export interface CrossFieldValidation {
  fields: string[];
  validate: (values: Record<string, any>) => ValidationResult;
}