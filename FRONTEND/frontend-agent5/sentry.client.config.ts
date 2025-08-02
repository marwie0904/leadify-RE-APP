import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    
    // Filter sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
        return null;
      }
      
      // Filter out sensitive information
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      if (event.request?.headers) {
        // Remove sensitive headers
        const sensitiveHeaders = ['authorization', 'cookie', 'x-csrf-token'];
        sensitiveHeaders.forEach(header => {
          delete event.request!.headers![header];
        });
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Set sampling rate for performance monitoring
        tracingOrigins: ['localhost', process.env.NEXT_PUBLIC_APP_URL, /^\//],
        routingInstrumentation: Sentry.nextRouterInstrumentation,
      }),
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        // Mask sensitive CSS classes
        maskTextClass: ['sensitive', 'private', 'personal'],
        // Block specific DOM elements
        blockSelector: '[data-sensitive]',
      }),
    ],
    
    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
    ],
    
    // Deny URLs
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Other browser extensions
      /^moz-extension:\/\//i,
      /^ms-browser-extension:\/\//i,
    ],
  });
}