import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Security headers will be applied via middleware instead of here
  // to allow for dynamic nonce generation
}

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses all logs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true, // Hides source maps from generated client bundles
  disableLogger: true, // Automatically tree-shake Sentry logger statements to reduce bundle size
  widenClientFileUpload: true, // Upload a larger set of source maps for prettier stack traces
};

// Export with Sentry only if DSN is configured
const config = process.env.NEXT_PUBLIC_SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;
