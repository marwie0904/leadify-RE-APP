# Form Validation & CSRF Protection - Implementation Plan

## Quick Start Guide for Agent 1

### Prerequisites Check
- ✅ Zod is already installed (v3.24.1)
- ✅ @hookform/resolvers is already installed (v3.9.1)
- ✅ react-hook-form is already installed (v7.54.1)
- ❌ Need to install: `csrf` package

### Installation Command
```bash
npm install csrf
```

## Directory Structure

```
frontend-agent1/
├── lib/
│   ├── validation/
│   │   ├── core/
│   │   │   ├── base-schemas.ts
│   │   │   └── types.ts
│   │   ├── domains/
│   │   │   ├── auth-schemas.ts
│   │   │   ├── profile-schemas.ts
│   │   │   ├── conversation-schemas.ts
│   │   │   ├── lead-schemas.ts
│   │   │   └── agent-schemas.ts
│   │   ├── validators.ts
│   │   ├── sanitizers.ts
│   │   └── error-messages.ts
│   └── security/
│       ├── csrf/
│       │   ├── token-manager.ts
│       │   ├── middleware.ts
│       │   └── types.ts
│       └── index.ts
├── hooks/
│   └── use-csrf.ts
├── components/
│   └── ui/
│       ├── form-field.tsx (enhanced)
│       ├── validated-input.tsx
│       ├── validated-textarea.tsx
│       └── validated-select.tsx
└── middleware.ts (update existing)
```

## Implementation Tasks

### Task 1: Install CSRF Package
```bash
npm install csrf
```

### Task 2: Create Base Validation Schemas

#### 2.1 Core Types (`lib/validation/core/types.ts`)
```typescript
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
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}
```

#### 2.2 Base Schemas (`lib/validation/core/base-schemas.ts`)
```typescript
import { z } from 'zod';

// Common refinements and transformations
export const trimmedString = z.string().trim();
export const normalizedEmail = z.string().email().toLowerCase().trim();
export const phoneNumber = z.string().regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number');

export const securePassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// XSS prevention sanitizers
export const sanitizedText = z.string().transform((val) => {
  return val
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
});

export const sanitizedRichText = z.string().transform((val) => {
  // Allow specific HTML tags but sanitize
  const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'p', 'br'];
  // Implementation will use DOMPurify in production
  return val; // Placeholder
});
```

### Task 3: Create Domain-Specific Schemas

#### 3.1 Auth Schemas (`lib/validation/domains/auth-schemas.ts`)
```typescript
import { z } from 'zod';
import { normalizedEmail, securePassword, trimmedString } from '../core/base-schemas';

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  csrfToken: z.string().min(1, 'Security token is required')
});

export const registerSchema = z.object({
  email: normalizedEmail,
  password: securePassword,
  confirmPassword: z.string(),
  name: trimmedString.min(2, 'Name must be at least 2 characters'),
  organization: trimmedString.optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' })
  }),
  csrfToken: z.string().min(1, 'Security token is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const passwordResetSchema = z.object({
  email: normalizedEmail,
  csrfToken: z.string().min(1, 'Security token is required')
});

export const newPasswordSchema = z.object({
  password: securePassword,
  confirmPassword: z.string(),
  resetToken: z.string().min(1, 'Reset token is required'),
  csrfToken: z.string().min(1, 'Security token is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
```

### Task 4: Implement CSRF Protection

#### 4.1 CSRF Token Manager (`lib/security/csrf/token-manager.ts`)
```typescript
import Tokens from 'csrf';

export class CSRFTokenManager {
  private tokens: Tokens;
  private tokenExpiry = 3600000; // 1 hour

  constructor() {
    this.tokens = new Tokens();
  }

  async generateToken(sessionId: string): Promise<string> {
    const secret = await this.tokens.secret();
    const token = this.tokens.create(secret);
    
    // Store in session/cache with expiry
    // Implementation depends on your session management
    
    return token;
  }

  async validateToken(token: string, sessionId: string): Promise<boolean> {
    try {
      // Retrieve secret from session/cache
      const secret = await this.getSecretForSession(sessionId);
      
      if (!secret) {
        return false;
      }
      
      return this.tokens.verify(secret, token);
    } catch {
      return false;
    }
  }

  private async getSecretForSession(sessionId: string): Promise<string | null> {
    // Implementation depends on your session management
    // This is a placeholder
    return null;
  }
}

export const csrfManager = new CSRFTokenManager();
```

#### 4.2 Update Middleware (`middleware.ts`)
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { csrfManager } from "@/lib/security/csrf/token-manager"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Allow access to auth page without authentication
  if (pathname === "/auth") {
    return res
  }

  // Redirect root to auth page immediately 
  if (pathname === "/") {
    console.log("[Middleware] Redirecting root path to /auth")
    return NextResponse.redirect(new URL("/auth", req.url))
  }

  // CSRF Protection for POST/PUT/DELETE requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers.get('X-CSRF-Token') || 
                  req.cookies.get('csrf-token')?.value;
    
    const sessionId = req.cookies.get('session-id')?.value;
    
    if (!token || !sessionId) {
      return new NextResponse('Missing CSRF token', { status: 403 });
    }
    
    const isValid = await csrfManager.validateToken(token, sessionId);
    
    if (!isValid) {
      return new NextResponse('Invalid CSRF token', { status: 403 });
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

### Task 5: Create Hooks

#### 5.1 useCSRF Hook (`hooks/use-csrf.ts`)
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseCSRFReturn {
  token: string | null;
  loading: boolean;
  error: Error | null;
  refreshToken: () => Promise<string | null>;
}

export function useCSRF(): UseCSRFReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setToken(data.token);
      return data.token;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return {
    token,
    loading,
    error,
    refreshToken: fetchToken
  };
}
```

### Task 6: Create Validated Components

#### 6.1 Validated Input (`components/ui/validated-input.tsx`)
```typescript
'use client';

import * as React from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input, InputProps } from '@/components/ui/input';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface ValidatedInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<InputProps, 'name' | 'defaultValue' | 'value' | 'onChange'> {
  control: Control<TFieldValues>;
  name: TName;
  showSuccess?: boolean;
  debounceMs?: number;
}

export function ValidatedInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  showSuccess = true,
  debounceMs = 300,
  className,
  ...props
}: ValidatedInputProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error, isDirty, isValidating }
  } = useController({
    name,
    control
  });

  const [localValidating, setLocalValidating] = React.useState(false);

  const debouncedValidation = useDebouncedCallback(
    () => {
      setLocalValidating(false);
    },
    debounceMs
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.onChange(e);
    setLocalValidating(true);
    debouncedValidation();
  };

  const showValidating = isValidating || localValidating;
  const showSuccessIcon = showSuccess && isDirty && !error && !showValidating;

  return (
    <FormItem>
      <FormControl>
        <div className="relative">
          <Input
            {...field}
            {...props}
            onChange={handleChange}
            className={cn(
              error && "border-destructive focus:ring-destructive",
              showSuccessIcon && "border-green-500 focus:ring-green-500",
              className
            )}
          />
          {showValidating && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {showSuccessIcon && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
          )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
```

### Task 7: Create API Endpoint for CSRF Tokens

Create `app/api/csrf-token/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { csrfManager } from '@/lib/security/csrf/token-manager';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get or create session ID
    const cookieStore = cookies();
    let sessionId = cookieStore.get('session-id')?.value;
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set('session-id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    }
    
    const token = await csrfManager.generateToken(sessionId);
    
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
```

### Task 8: Update Existing Forms

Example update for the login form in `app/auth/page.tsx`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validation/domains/auth-schemas';
import { useCSRF } from '@/hooks/use-csrf';
import { ValidatedInput } from '@/components/ui/validated-input';

// Inside component:
const { token: csrfToken } = useCSRF();
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
    email: '',
    password: '',
    rememberMe: false,
    csrfToken: ''
  }
});

// Update form values when CSRF token is available
useEffect(() => {
  if (csrfToken) {
    form.setValue('csrfToken', csrfToken);
  }
}, [csrfToken, form]);

// In the JSX:
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <ValidatedInput
      control={form.control}
      name="email"
      type="email"
      placeholder="Email"
      autoComplete="email"
    />
    <ValidatedInput
      control={form.control}
      name="password"
      type="password"
      placeholder="Password"
      autoComplete="current-password"
    />
    {/* Rest of form */}
  </form>
</Form>
```

## Testing Requirements

### Unit Tests
- Test all validation schemas
- Test CSRF token generation and validation
- Test sanitizer functions
- Test validator functions

### Integration Tests
- Test form submission with CSRF protection
- Test validation error display
- Test real-time validation feedback
- Test security headers

### E2E Tests
- Test complete user registration flow
- Test login with various error scenarios
- Test CSRF protection in real scenarios
- Test XSS prevention

## Coordination with Other Agents

### For Agent 4 (State Management)
- Zod is already installed, so Agent 4 can start immediately
- Form validation schemas will be available in `lib/validation/`
- Types are exported from each schema file

### For Agent 5 (Custom Hooks)
- CSRF hook will be in `hooks/use-csrf.ts`
- Can start planning custom hooks immediately
- CSRF implementation will be ready by the time integration is needed

### For Agent 6 (Error Boundaries)
- Error message system in `lib/validation/error-messages.ts`
- Form validation errors follow consistent structure
- Can prepare error boundary components early

## Performance Considerations

1. **Debounced Validation**: Default 300ms debounce on input
2. **Memoized Schemas**: Zod schemas are parsed once and cached
3. **Lazy Loading**: Heavy validation logic can be code-split
4. **Optimistic UI**: Show success states immediately

## Security Checklist

- [ ] CSRF tokens on all forms
- [ ] XSS prevention via input sanitization
- [ ] SQL injection prevention (if applicable)
- [ ] Rate limiting on form endpoints
- [ ] Secure session management
- [ ] HTTPS-only cookies in production
- [ ] Content Security Policy headers
- [ ] Input length limits
- [ ] File upload validation (if applicable)
- [ ] Error messages don't leak sensitive info

## Next Steps

1. Install `csrf` package
2. Create directory structure
3. Implement schemas in order (base → domain-specific)
4. Set up CSRF protection
5. Create validated components
6. Update existing forms
7. Write tests
8. Security audit