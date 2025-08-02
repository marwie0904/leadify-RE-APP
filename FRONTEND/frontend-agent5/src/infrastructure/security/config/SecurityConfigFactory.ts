import { SecurityHeadersConfig } from '@/domain/security/value-objects/SecurityHeaders';
import { defaultSecurityConfig } from './DefaultSecurityConfig';

export class SecurityConfigFactory {
  static create(env: 'development' | 'staging' | 'production'): SecurityHeadersConfig {
    const baseConfig = JSON.parse(JSON.stringify(defaultSecurityConfig)) as SecurityHeadersConfig;

    switch (env) {
      case 'development':
        // Relax CSP for development
        baseConfig.contentSecurityPolicy.directives['script-src'] = [
          "'self'", 
          "'unsafe-eval'", // For React DevTools and Next.js
          "'unsafe-inline'" // For development convenience
        ];
        baseConfig.contentSecurityPolicy.directives['style-src'] = [
          "'self'",
          "'unsafe-inline'" // For hot reload
        ];
        // Add localhost to connect-src
        baseConfig.contentSecurityPolicy.directives['connect-src'] = [
          "'self'",
          'http://localhost:*',
          'ws://localhost:*', // For hot reload websocket
          process.env.NEXT_PUBLIC_API_URL || ''
        ];
        baseConfig.contentSecurityPolicy.reportOnly = true;
        // Disable HSTS in development
        baseConfig.strictTransportSecurity.maxAge = 0;
        break;

      case 'staging':
        // Staging configuration
        baseConfig.contentSecurityPolicy.reportOnly = true;
        baseConfig.contentSecurityPolicy.reportUri = '/api/security/csp-report';
        // Allow staging API
        if (process.env.NEXT_PUBLIC_API_URL) {
          baseConfig.contentSecurityPolicy.directives['connect-src']?.push(
            process.env.NEXT_PUBLIC_API_URL
          );
        }
        break;

      case 'production':
        // Production configuration - strictest settings
        baseConfig.contentSecurityPolicy.reportUri = '/api/security/csp-report';
        // Remove unsafe-inline from style-src if using nonce
        if (baseConfig.contentSecurityPolicy.useNonce) {
          baseConfig.contentSecurityPolicy.directives['style-src'] = ["'self'"];
        }
        // Add any production-specific domains
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          const sentryUrl = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN);
          baseConfig.contentSecurityPolicy.directives['connect-src']?.push(
            sentryUrl.origin
          );
        }
        break;
    }

    return baseConfig;
  }

  /**
   * Get the current environment
   */
  static getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV;
    if (env === 'production' && process.env.VERCEL_ENV === 'preview') {
      return 'staging';
    }
    return env as 'development' | 'staging' | 'production';
  }

  /**
   * Get the configuration for the current environment
   */
  static getConfig(): SecurityHeadersConfig {
    return this.create(this.getCurrentEnvironment());
  }
}