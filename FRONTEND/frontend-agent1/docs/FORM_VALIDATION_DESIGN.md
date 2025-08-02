# Form Validation & CSRF Protection System Design

## Executive Summary

This document outlines the design for a comprehensive form validation and CSRF protection system for the financial dashboard application. The design follows Domain-Driven Design (DDD) principles and provides a layered architecture that ensures security, maintainability, and excellent user experience.

## Architecture Overview

### Domain Model

```typescript
// Core Domain Entities
interface ValidationRule {
  id: string;
  name: string;
  validate: (value: any) => ValidationResult;
  sanitize?: (value: any) => any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

interface FormSecurityContext {
  csrfToken: string;
  sessionId: string;
  timestamp: number;
  origin: string;
}

interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  securityContext: FormSecurityContext;
  validationResults: ValidationResult;
  submittedAt: Date;
}
```

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                         │
│  - Form Components (ValidatedInput, ValidatedTextarea, etc)  │
│  - Real-time Validation Feedback                             │
│  - Error Display Components                                  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                          │
│  - Form Hooks (useValidatedForm, useCSRF)                   │
│  - Validation Orchestration                                  │
│  - Security Token Management                                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                              │
│  - Validation Rules & Schemas                                │
│  - Security Policies                                         │
│  - Business Logic                                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                         │
│  - CSRF Token Generation/Storage                             │
│  - Middleware Integration                                     │
│  - External API Communication                                 │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Validation Schema Architecture

#### Base Schema Structure
```typescript
// lib/validation/core/base-schemas.ts
import { z } from 'zod';

// Common refinements and transformations
export const trimmedString = z.string().trim();
export const normalizedEmail = z.string().email().toLowerCase().trim();
export const securePassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// XSS prevention sanitizers
export const sanitizedText = z.string().transform((val) => {
  // Remove potential XSS vectors
  return val
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
});
```

#### Domain-Specific Schemas
```typescript
// lib/validation/domains/auth-schemas.ts
export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  csrfToken: z.string().min(1, 'Security token is required')
});

export const registrationSchema = z.object({
  email: normalizedEmail,
  password: securePassword,
  confirmPassword: z.string(),
  name: trimmedString.min(2, 'Name must be at least 2 characters'),
  organization: trimmedString.optional(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  csrfToken: z.string().min(1, 'Security token is required')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

### 2. CSRF Protection Design

#### Token Generation & Management
```typescript
// lib/security/csrf/token-manager.ts
export class CSRFTokenManager {
  private readonly algorithm = 'SHA-256';
  private readonly tokenExpiry = 3600000; // 1 hour

  async generateToken(sessionId: string): Promise<string> {
    const timestamp = Date.now();
    const data = `${sessionId}-${timestamp}-${Math.random()}`;
    const hash = await this.hash(data);
    
    return base64url.encode({
      hash,
      timestamp,
      sessionId
    });
  }

  async validateToken(token: string, sessionId: string): Promise<boolean> {
    try {
      const decoded = base64url.decode(token);
      const { timestamp } = decoded;
      
      // Check expiry
      if (Date.now() - timestamp > this.tokenExpiry) {
        return false;
      }
      
      // Validate session binding
      return decoded.sessionId === sessionId;
    } catch {
      return false;
    }
  }
}
```

#### Middleware Integration
```typescript
// lib/security/csrf/middleware.ts
export function csrfMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return response;
  }
  
  // Extract and validate CSRF token
  const token = request.headers.get('X-CSRF-Token') || 
                request.cookies.get('csrf-token')?.value;
  
  if (!token || !validateCSRFToken(token, request)) {
    return new NextResponse('Invalid CSRF token', { status: 403 });
  }
  
  return response;
}
```

### 3. Component Architecture

#### Base Validated Input Component
```typescript
// components/ui/validated-input.tsx
interface ValidatedInputProps extends InputProps {
  name: string;
  control: Control<any>;
  rules?: RegisterOptions;
  showSuccess?: boolean;
  debounceMs?: number;
}

export function ValidatedInput({
  name,
  control,
  rules,
  showSuccess = true,
  debounceMs = 300,
  ...props
}: ValidatedInputProps) {
  const [localValue, setLocalValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  const debouncedValidation = useDebouncedCallback(
    async (value: string) => {
      setIsValidating(true);
      await trigger(name);
      setIsValidating(false);
    },
    debounceMs
  );

  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                {...props}
                onChange={(e) => {
                  field.onChange(e);
                  setLocalValue(e.target.value);
                  debouncedValidation(e.target.value);
                }}
                className={cn(
                  fieldState.error && "border-destructive",
                  fieldState.isDirty && !fieldState.error && showSuccess && "border-success"
                )}
              />
              {isValidating && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin" />
              )}
              {!isValidating && fieldState.isDirty && !fieldState.error && showSuccess && (
                <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-success" />
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

### 4. Security Hooks

#### useCSRF Hook
```typescript
// hooks/use-csrf.ts
export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch('/api/csrf-token');
        const data = await response.json();
        setToken(data.token);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, []);

  const refreshToken = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/csrf-token', { method: 'POST' });
      const data = await response.json();
      setToken(data.token);
      return data.token;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { token, loading, refreshToken };
}
```

### 5. Form Validation Utilities

#### Common Validators
```typescript
// lib/validation/validators.ts
export const validators = {
  phone: (value: string) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value);
  },
  
  url: (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  noScript: (value: string) => {
    return !/<script[^>]*>.*?<\/script>/gi.test(value);
  },
  
  strongPassword: (value: string) => {
    const strength = calculatePasswordStrength(value);
    return strength >= 3; // Minimum strength threshold
  }
};
```

#### Input Sanitizers
```typescript
// lib/validation/sanitizers.ts
export const sanitizers = {
  html: (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href']
    });
  },
  
  sql: (input: string): string => {
    // Basic SQL injection prevention
    return input.replace(/['";\\]/g, '');
  },
  
  filename: (input: string): string => {
    // Remove path traversal attempts
    return input.replace(/[\/\\\.]+/g, '_');
  }
};
```

### 6. Error Handling & Feedback

#### Error Message System
```typescript
// lib/validation/error-messages.ts
export const errorMessages = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  password: {
    min: 'Password must be at least 8 characters',
    uppercase: 'Password must contain at least one uppercase letter',
    lowercase: 'Password must contain at least one lowercase letter',
    number: 'Password must contain at least one number',
    special: 'Password must contain at least one special character'
  },
  match: (field1: string, field2: string) => `${field1} and ${field2} must match`,
  csrf: 'Security validation failed. Please refresh and try again.'
};
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. Set up CSRF token generation and validation system
2. Implement middleware for CSRF protection
3. Create base validation schemas and utilities
4. Set up security headers

### Phase 2: Schema Development (Week 2)
1. Create all domain-specific validation schemas
2. Implement sanitizers and validators
3. Build error message system
4. Add unit tests for all schemas

### Phase 3: Component Development (Week 3)
1. Build validated form components
2. Create useCSRF and useValidatedForm hooks
3. Implement real-time validation feedback
4. Add accessibility features

### Phase 4: Integration & Testing (Week 4)
1. Integrate with existing forms
2. Add E2E tests for all forms
3. Security audit and penetration testing
4. Performance optimization

## Security Considerations

### XSS Prevention
- All user inputs are sanitized using DOMPurify
- Content Security Policy headers are implemented
- React's built-in XSS protection is leveraged

### CSRF Protection
- Double Submit Cookie pattern implementation
- Token bound to user session
- Automatic token rotation on sensitive operations

### Input Validation
- Client-side validation for UX
- Server-side validation for security
- Type-safe validation using Zod schemas

### Rate Limiting
- Form submission rate limiting
- Failed attempt tracking
- Progressive delays for repeated failures

## Performance Optimizations

### Debounced Validation
- 300ms default debounce for field validation
- Immediate validation on blur
- Async validation with loading states

### Bundle Size
- Tree-shakeable validator functions
- Lazy loading for heavy validation logic
- Minimal runtime overhead

### Caching
- CSRF tokens cached with TTL
- Validation results memoized
- Schema compilation cached

## Testing Strategy

### Unit Tests
```typescript
// __tests__/validation/auth-schemas.test.ts
describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
        csrfToken: 'valid-token'
      };
      
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
        csrfToken: 'valid-token'
      };
      
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain('email');
    });
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/csrf-protection.test.ts
describe('CSRF Protection', () => {
  it('should block requests without CSRF token', async () => {
    const response = await fetch('/api/protected', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    });
    
    expect(response.status).toBe(403);
  });
  
  it('should allow requests with valid CSRF token', async () => {
    const token = await getCSRFToken();
    const response = await fetch('/api/protected', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token
      },
      body: JSON.stringify({ data: 'test' })
    });
    
    expect(response.status).toBe(200);
  });
});
```

## Migration Guide

### Existing Form Migration
1. Replace basic inputs with ValidatedInput components
2. Add CSRF token to form submissions
3. Implement proper error handling
4. Add loading states for async validation

### API Integration
1. Update API endpoints to validate CSRF tokens
2. Add rate limiting to form endpoints
3. Implement proper error responses
4. Add security headers

## Monitoring & Maintenance

### Metrics to Track
- Form submission success/failure rates
- CSRF token validation failures
- Validation error frequencies
- Performance metrics (validation time)

### Alerts
- High rate of CSRF failures
- Unusual form submission patterns
- Performance degradation
- Security incident detection

## Conclusion

This design provides a comprehensive, secure, and user-friendly form validation system that follows DDD principles and industry best practices. The layered architecture ensures maintainability while the security features protect against common web vulnerabilities.