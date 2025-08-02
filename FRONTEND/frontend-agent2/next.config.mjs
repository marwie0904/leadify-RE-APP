import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: false,
    domains: ['localhost', 'api.financial-dashboard.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack configuration for optimization
  webpack: (config, { isServer }) => {
    // Enable tree shaking and optimization
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    
    // Add performance hints in development
    if (!isServer && process.env.NODE_ENV === 'development') {
      config.performance = {
        hints: 'warning',
        maxAssetSize: 500000, // 500KB
        maxEntrypointSize: 500000,
      };
    }
    
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Output configuration
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Powered by header removal for security
  poweredByHeader: false,
}

export default bundleAnalyzer(nextConfig)
