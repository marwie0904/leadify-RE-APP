import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
        return null;
      }
      
      // Filter out sensitive information
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      if (event.request?.headers) {
        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
          delete event.request!.headers![header];
        });
      }
      
      // Remove sensitive user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      // Performance monitoring
      new Sentry.Integrations.Http({ tracing: true }),
      // Prisma integration if using Prisma
      // new Sentry.Integrations.Prisma({ client: prisma }),
    ],
    
    // Ignore common errors
    ignoreErrors: [
      // System errors
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EPIPE',
      // Application errors to ignore
      'AbortError',
    ],
  });
}