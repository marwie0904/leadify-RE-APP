import { IValidator } from '@/domain/security/services/IValidator';
import { ISanitizer } from '@/domain/security/services/ISanitizer';
import { SecurityValidator } from '@/infrastructure/security/services/SecurityValidator';
import { DOMPurifySanitizer } from '@/infrastructure/security/services/DOMPurifySanitizer';

export class ValidationFactory {
  private static instance: IValidator;
  private static sanitizer: ISanitizer;

  /**
   * Get or create a singleton validator instance
   */
  static getValidator(sanitizer?: ISanitizer): IValidator {
    if (!ValidationFactory.instance) {
      ValidationFactory.sanitizer = sanitizer || new DOMPurifySanitizer();
      ValidationFactory.instance = new SecurityValidator(ValidationFactory.sanitizer);
    }
    return ValidationFactory.instance;
  }

  /**
   * Create a new validator instance (useful for testing)
   */
  static createValidator(sanitizer?: ISanitizer): IValidator {
    const validatorSanitizer = sanitizer || new DOMPurifySanitizer();
    return new SecurityValidator(validatorSanitizer);
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    ValidationFactory.instance = null as any;
    ValidationFactory.sanitizer = null as any;
  }
}

/**
 * Convenience function to get the default validator
 */
export function getValidator(): IValidator {
  return ValidationFactory.getValidator();
}

/**
 * Validation decorators for class methods
 */
export function ValidateInput(schema: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const validator = getValidator();
      
      // Validate each argument against the schema
      for (let i = 0; i < args.length; i++) {
        const result = validator.validateInput(args[i], schema);
        if (!result.isValid) {
          throw new Error(`Validation failed for argument ${i}: ${result.errors?.map(e => e.message).join(', ')}`);
        }
        // Replace argument with sanitized version if available
        if (result.sanitized !== undefined) {
          args[i] = result.sanitized;
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Email validation decorator
 */
export function ValidateEmail(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (email: string, ...otherArgs: any[]) {
    const validator = getValidator();
    const result = validator.validateEmail(email);
    
    if (!result.isValid) {
      throw new Error(`Email validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
    }

    return originalMethod.apply(this, [result.sanitized, ...otherArgs]);
  };

  return descriptor;
}

/**
 * URL validation decorator
 */
export function ValidateURL(options?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (url: string, ...otherArgs: any[]) {
      const validator = getValidator();
      const result = validator.validateURL(url, options);
      
      if (!result.isValid) {
        throw new Error(`URL validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }

      return originalMethod.apply(this, [result.sanitized, ...otherArgs]);
    };

    return descriptor;
  };
}

/**
 * Password validation decorator
 */
export function ValidatePassword(policy?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (password: string, ...otherArgs: any[]) {
      const validator = getValidator();
      const result = validator.validatePassword(password, policy);
      
      if (!result.isValid) {
        throw new Error(`Password validation failed: ${result.errors?.map(e => e.message).join(', ')}`);
      }

      return originalMethod.apply(this, [password, ...otherArgs]);
    };

    return descriptor;
  };
}