import { NextRequest, NextResponse } from 'next/server';
import { SecurityHeadersConfig, CSPDirectives } from '@/domain/security/value-objects/SecurityHeaders';
import { INonceService } from '@/domain/security/services/INonceService';

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
      .map(([feature, allowList]) => {
        if (!allowList || allowList.length === 0) {
          return `${feature}=()`;
        }
        return `${feature}=(${allowList.join(' ')})`;
      })
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

  /**
   * Checks if the request path should have security headers applied
   */
  public shouldApplyHeaders(pathname: string): boolean {
    // Skip for static assets
    const staticPaths = [
      '/_next/static',
      '/_next/image',
      '/favicon.ico',
      '/.well-known'
    ];

    return !staticPaths.some(path => pathname.startsWith(path));
  }
}