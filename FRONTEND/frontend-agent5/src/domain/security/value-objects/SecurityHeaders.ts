export interface SecurityHeadersConfig {
  contentSecurityPolicy: ContentSecurityPolicyConfig;
  frameOptions: FrameOptionsConfig;
  contentTypeOptions: ContentTypeOptionsConfig;
  referrerPolicy: ReferrerPolicyConfig;
  permissionsPolicy: PermissionsPolicyConfig;
  strictTransportSecurity: StrictTransportSecurityConfig;
  customHeaders?: Record<string, string>;
}

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

export interface FrameOptionsConfig {
  value: 'DENY' | 'SAMEORIGIN';
}

export interface ContentTypeOptionsConfig {
  value: 'nosniff';
}

export interface ReferrerPolicyConfig {
  value: 
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';
}

export interface PermissionsPolicyConfig {
  directives: PermissionsPolicyDirectives;
}

export interface PermissionsPolicyDirectives {
  camera?: string[];
  microphone?: string[];
  geolocation?: string[];
  'interest-cohort'?: string[];
  payment?: string[];
  usb?: string[];
  fullscreen?: string[];
  accelerometer?: string[];
  gyroscope?: string[];
  magnetometer?: string[];
  midi?: string[];
  'sync-xhr'?: string[];
  push?: string[];
  speaker?: string[];
}

export interface StrictTransportSecurityConfig {
  maxAge: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}