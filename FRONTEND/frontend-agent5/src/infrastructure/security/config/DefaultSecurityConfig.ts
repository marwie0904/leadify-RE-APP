import { SecurityHeadersConfig } from '@/domain/security/value-objects/SecurityHeaders';

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