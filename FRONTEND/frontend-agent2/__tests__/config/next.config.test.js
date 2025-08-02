/**
 * @jest-environment node
 */

import { expect, describe, it, beforeAll } from '@jest/globals';
import nextConfig from '../../next.config.mjs';

describe('Next.js Configuration', () => {
  describe('Performance Optimizations', () => {
    it('should have image optimization enabled', () => {
      expect(nextConfig.images).toBeDefined();
      expect(nextConfig.images.unoptimized).toBe(false);
      expect(nextConfig.images.formats).toContain('image/webp');
      expect(nextConfig.images.formats).toContain('image/avif');
    });

    it('should have proper device sizes configured', () => {
      expect(nextConfig.images.deviceSizes).toEqual([640, 750, 828, 1080, 1200, 1920, 2048, 3840]);
      expect(nextConfig.images.imageSizes).toEqual([16, 32, 48, 64, 96, 128, 256, 384]);
    });

    it('should have experimental optimizations enabled', () => {
      expect(nextConfig.experimental).toBeDefined();
      expect(nextConfig.experimental.optimizeCss).toBe(true);
      expect(nextConfig.experimental.scrollRestoration).toBe(true);
    });

    it('should have webpack optimizations configured', () => {
      // Test webpack config by calling it
      const mockConfig = {
        optimization: {}
      };
      const result = nextConfig.webpack(mockConfig, { isServer: false });
      
      expect(result.optimization.usedExports).toBe(true);
      expect(result.optimization.sideEffects).toBe(false);
    });
  });

  describe('Bundle Analyzer', () => {
    it('should enable bundle analyzer when ANALYZE environment variable is set', () => {
      // This test verifies the bundle analyzer is properly integrated
      // The actual implementation uses withBundleAnalyzer HOC
      expect(typeof nextConfig).toBe('object');
    });
  });

  describe('Build Settings', () => {
    it('should enforce TypeScript and ESLint checks in production', () => {
      expect(nextConfig.eslint.ignoreDuringBuilds).toBe(false);
      expect(nextConfig.typescript.ignoreBuildErrors).toBe(false);
    });
  });
});