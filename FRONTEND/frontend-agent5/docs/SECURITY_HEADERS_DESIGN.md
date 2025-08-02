# Security Headers Middleware Design

## Overview
This document details the design and implementation of security headers middleware for Next.js applications.

## Middleware Architecture

### Core Components

```typescript
// src/domain/security/value-objects/SecurityHeaders.ts
export interface SecurityHeadersConfig {
  contentSecurityPolicy: ContentSecurityPolicyConfig;
  frameOptions: FrameOptionsConfig;
  contentTypeOptions: ContentTypeOptionsConfig;
  referrerPolicy: ReferrerPolicyConfig;
  permissionsPolicy: PermissionsPolicyConfig;
  strictTransportSecurity: StrictTransportSecurityConfig;
  customHeaders?: Record<string, string>;
}

// src/domain/security/value-objects/ContentSecurityPolicy.ts
export interface ContentSecurityPolicyConfig {
  directives: CSPDirectives;
  reportOnly?: boolean;
  reportUri?: string;
  useNonce?: boolean;
}

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'child-src'?: string[];
  'worker-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'report-uri'?: string[];
  'report-to'?: string;
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}
```

### Nonce Generation Strategy

```typescript
// src/domain/security/services/NonceService.ts
export interface INonceService {
  generate(): string;
  validate(nonce: string): boolean;
  store(nonce: string): void;
  cleanup(): void;
}

// src/infrastructure/security/services/CryptoNonceService.ts
import crypto from 'crypto';

export class CryptoNonceService implements INonceService {
  private nonceStore: Map<string, number> = new Map();
  private readonly NONCE_LENGTH = 32;
  private readonly NONCE_TTL = 5 * 60 * 1000; // 5 minutes

  generate(): string {
    const nonce = crypto.randomBytes(this.NONCE_LENGTH).toString('base64');
    this.store(nonce);
    return nonce;
  }

  validate(nonce: string): boolean {
    const timestamp = this.nonceStore.get(nonce);
    if (!timestamp) return false;
    
    const isValid = Date.now() - timestamp < this.NONCE_TTL;
    if (!isValid) {
      this.nonceStore.delete(nonce);
    }
    return isValid;
  }

  store(nonce: string): void {
    this.nonceStore.set(nonce, Date.now());
    this.cleanup();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.nonceStore.entries()) {
      if (now - timestamp > this.NONCE_TTL) {
        this.nonceStore.delete(nonce);
      }
    }
  }
}
```

### Security Headers Middleware Implementation

```typescript
// src/infrastructure/security/middleware/SecurityHeadersMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { SecurityHeadersConfig } from '@/domain/security/value-objects/SecurityHeaders';
import { INonceService } from '@/domain/security/services/NonceService';

export class SecurityHeadersMiddleware {
  constructor(
    private config: SecurityHeadersConfig,
    private nonceService: INonceService
  ) {}

  apply(request: NextRequest): NextResponse {
    const response = NextResponse.next();
    const nonce = this.config.contentSecurityPolicy.useNonce 
      ? this.nonceService.generate() 
      : undefined;

    // Apply security headers
    this.applyContentSecurityPolicy(response, nonce);
    this.applyFrameOptions(response);
    this.applyContentTypeOptions(response);
    this.applyReferrerPolicy(response);
    this.applyPermissionsPolicy(response);
    this.applyStrictTransportSecurity(response);
    this.applyCustomHeaders(response);

    // Store nonce in response for use in components
    if (nonce) {
      response.headers.set('X-Nonce', nonce);
    }

    return response;
  }

  private applyContentSecurityPolicy(response: NextResponse, nonce?: string): void {
    const { directives, reportOnly, reportUri } = this.config.contentSecurityPolicy;
    const cspString = this.buildCSPString(directives, nonce);
    
    const headerName = reportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';
    
    response.headers.set(headerName, cspString);
  }

  private buildCSPString(directives: CSPDirectives, nonce?: string): string {
    const parts: string[] = [];

    for (const [directive, value] of Object.entries(directives)) {
      if (value === undefined) continue;

      if (typeof value === 'boolean') {
        if (value) parts.push(directive);
      } else if (Array.isArray(value)) {
        let sources = value;
        
        // Add nonce to script-src and style-src if enabled
        if (nonce && (directive === 'script-src' || directive === 'style-src')) {
          sources = [...sources, `'nonce-${nonce}'`];
        }
        
        parts.push(`${directive} ${sources.join(' ')}`);
      } else {
        parts.push(`${directive} ${value}`);
      }
    }

    return parts.join('; ');
  }

  private applyFrameOptions(response: NextResponse): void {
    response.headers.set('X-Frame-Options', this.config.frameOptions.value);
  }

  private applyContentTypeOptions(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', this.config.contentTypeOptions.value);
  }

  private applyReferrerPolicy(response: NextResponse): void {
    response.headers.set('Referrer-Policy', this.config.referrerPolicy.value);
  }

  private applyPermissionsPolicy(response: NextResponse): void {
    const { directives } = this.config.permissionsPolicy;
    const policyString = Object.entries(directives)
      .map(([feature, allowList]) => `${feature}=(${allowList.join(' ')})`)
      .join(', ');
    
    response.headers.set('Permissions-Policy', policyString);
  }

  private applyStrictTransportSecurity(response: NextResponse): void {
    const { maxAge, includeSubDomains, preload } = this.config.strictTransportSecurity;
    let value = `max-age=${maxAge}`;
    
    if (includeSubDomains) value += '; includeSubDomains';
    if (preload) value += '; preload';
    
    response.headers.set('Strict-Transport-Security', value);
  }

  private applyCustomHeaders(response: NextResponse): void {
    if (this.config.customHeaders) {
      for (const [header, value] of Object.entries(this.config.customHeaders)) {
        response.headers.set(header, value);
      }
    }
  }
}
```

### Default Security Configuration

```typescript
// src/infrastructure/security/config/DefaultSecurityConfig.ts
export const defaultSecurityConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    useNonce: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'strict-dynamic'"],
      'style-src': ["'self'", "'unsafe-inline'"], // Will be replaced with nonce
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", process.env.NEXT_PUBLIC_API_URL || ''],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'child-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true
    }
  },
  frameOptions: {
    value: 'DENY'
  },
  contentTypeOptions: {
    value: 'nosniff'
  },
  referrerPolicy: {
    value: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    directives: {
      'camera': [],
      'microphone': [],
      'geolocation': [],
      'interest-cohort': [],
      'payment': ["'self'"],
      'usb': [],
      'fullscreen': ["'self'"],
      'accelerometer': [],
      'gyroscope': [],
      'magnetometer': [],
      'midi': [],
      'sync-xhr': [],
      'push': ["'self'"],
      'speaker': ["'self'"]
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};
```

### Integration with Next.js Middleware

```typescript
// src/middleware.ts
import { NextRequest } from 'next/server';
import { SecurityHeadersMiddleware } from '@/infrastructure/security/middleware/SecurityHeadersMiddleware';
import { CryptoNonceService } from '@/infrastructure/security/services/CryptoNonceService';
import { defaultSecurityConfig } from '@/infrastructure/security/config/DefaultSecurityConfig';

const nonceService = new CryptoNonceService();
const securityMiddleware = new SecurityHeadersMiddleware(defaultSecurityConfig, nonceService);

export async function middleware(request: NextRequest) {
  // Apply security headers
  const response = securityMiddleware.apply(request);
  
  // Additional middleware logic...
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Nonce Usage in Components

```typescript
// src/app/layout.tsx
import { headers } from 'next/headers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get('X-Nonce') || undefined;

  return (
    <html lang="en">
      <head>
        {/* Scripts with nonce */}
        <script nonce={nonce} dangerouslySetInnerHTML={{
          __html: `console.log('Inline script with nonce');`
        }} />
      </head>
      <body>
        {/* Pass nonce to providers if needed */}
        <Providers nonce={nonce}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Environment-Specific Configuration

```typescript
// src/infrastructure/security/config/SecurityConfigFactory.ts
export class SecurityConfigFactory {
  static create(env: 'development' | 'staging' | 'production'): SecurityHeadersConfig {
    const baseConfig = { ...defaultSecurityConfig };

    switch (env) {
      case 'development':
        // Relax CSP for development
        baseConfig.contentSecurityPolicy.directives['script-src'] = [
          "'self'", 
          "'unsafe-eval'", // For React DevTools
          "'unsafe-inline'" // For development convenience
        ];
        baseConfig.contentSecurityPolicy.reportOnly = true;
        break;

      case 'staging':
        // Staging configuration
        baseConfig.contentSecurityPolicy.reportOnly = true;
        baseConfig.contentSecurityPolicy.reportUri = '/api/csp-report';
        break;

      case 'production':
        // Production configuration - strictest settings
        baseConfig.contentSecurityPolicy.reportUri = '/api/csp-report';
        break;
    }

    return baseConfig;
  }
}
```

### CORS Configuration

```typescript
// src/infrastructure/security/middleware/CORSMiddleware.ts
export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
}

export class CORSMiddleware {
  constructor(private config: CORSConfig) {}

  apply(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');

    if (origin && this.isAllowedOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      
      if (this.config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (request.method === 'OPTIONS') {
        response.headers.set(
          'Access-Control-Allow-Methods', 
          this.config.allowedMethods.join(', ')
        );
        response.headers.set(
          'Access-Control-Allow-Headers', 
          this.config.allowedHeaders.join(', ')
        );
        
        if (this.config.maxAge) {
          response.headers.set('Access-Control-Max-Age', this.config.maxAge.toString());
        }
      }

      if (this.config.exposedHeaders && this.config.exposedHeaders.length > 0) {
        response.headers.set(
          'Access-Control-Expose-Headers', 
          this.config.exposedHeaders.join(', ')
        );
      }
    }

    return response;
  }

  private isAllowedOrigin(origin: string): boolean {
    return this.config.allowedOrigins.includes(origin) || 
           this.config.allowedOrigins.includes('*');
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/__tests__/infrastructure/security/middleware/SecurityHeadersMiddleware.test.ts
describe('SecurityHeadersMiddleware', () => {
  it('should apply all configured security headers', () => {
    // Test implementation
  });

  it('should generate and apply nonce when enabled', () => {
    // Test implementation
  });

  it('should build valid CSP string', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// src/__tests__/integration/security-headers.test.ts
describe('Security Headers Integration', () => {
  it('should apply headers to all responses', async () => {
    // Test implementation
  });

  it('should handle nonce propagation correctly', async () => {
    // Test implementation
  });
});
```

## Performance Considerations

1. **Nonce Caching**: Use in-memory cache with TTL
2. **Header Computation**: Pre-compute static headers
3. **Middleware Ordering**: Place security headers early in pipeline
4. **Response Caching**: Consider impact on CDN caching

## Security Considerations

1. **Nonce Uniqueness**: Ensure cryptographically secure generation
2. **CSP Violations**: Monitor and analyze reports
3. **Header Injection**: Validate all dynamic values
4. **Environment Isolation**: Different configs per environment