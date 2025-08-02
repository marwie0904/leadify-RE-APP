import { NextRequest, NextResponse } from 'next/server';

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
}

export class CORSMiddleware {
  private readonly defaultConfig: CORSConfig = {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  constructor(private config?: Partial<CORSConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }

  apply(request: NextRequest, response: NextResponse): NextResponse {
    const origin = request.headers.get('origin');
    const config = this.config as CORSConfig;

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      this.setCORSHeaders(preflightResponse, origin, config, true);
      return preflightResponse;
    }

    // Apply CORS headers to regular requests
    this.setCORSHeaders(response, origin, config, false);
    return response;
  }

  private setCORSHeaders(
    response: NextResponse, 
    origin: string | null, 
    config: CORSConfig,
    isPreflight: boolean
  ): void {
    // Set allowed origin
    if (origin && this.isAllowedOrigin(origin, config.allowedOrigins)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');
    } else if (config.allowedOrigins.includes('*') && !config.credentials) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    
    // Set credentials
    if (config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Set preflight-specific headers
    if (isPreflight) {
      response.headers.set(
        'Access-Control-Allow-Methods', 
        config.allowedMethods.join(', ')
      );
      
      response.headers.set(
        'Access-Control-Allow-Headers', 
        config.allowedHeaders.join(', ')
      );
      
      if (config.maxAge) {
        response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
      }
    }

    // Set exposed headers
    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      response.headers.set(
        'Access-Control-Expose-Headers', 
        config.exposedHeaders.join(', ')
      );
    }
  }

  private isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
    // Check for wildcard
    if (allowedOrigins.includes('*')) {
      return true;
    }

    // Check for exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Check for pattern matching (e.g., *.example.com)
    return allowedOrigins.some(allowed => {
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(domain) || origin === `https://${domain}` || origin === `http://${domain}`;
      }
      return false;
    });
  }

  /**
   * Create environment-specific CORS configuration
   */
  static createConfig(env: 'development' | 'staging' | 'production'): CORSConfig {
    const baseConfig: CORSConfig = {
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      credentials: true,
      maxAge: 86400,
      allowedOrigins: []
    };

    switch (env) {
      case 'development':
        baseConfig.allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];
        break;

      case 'staging':
        baseConfig.allowedOrigins = [
          process.env.NEXT_PUBLIC_APP_URL || '',
          '*.vercel.app' // Allow Vercel preview deployments
        ].filter(Boolean);
        break;

      case 'production':
        baseConfig.allowedOrigins = [
          process.env.NEXT_PUBLIC_APP_URL || '',
          process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || []
        ].flat().filter(Boolean);
        break;
    }

    return baseConfig;
  }
}