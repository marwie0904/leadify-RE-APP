# Performance Optimization Implementation Plan

## Quick Start Guide

This implementation plan provides step-by-step instructions for implementing performance optimizations in the financial dashboard application.

## Phase 1: Bundle Analysis & Setup (Day 1-2)

### 1.1 Install Dependencies

```bash
npm install --save-dev @next/bundle-analyzer webpack-bundle-analyzer
npm install web-vitals
```

### 1.2 Configure Bundle Analyzer

Create or update `next.config.mjs`:

```javascript
import { withBundleAnalyzer } from '@next/bundle-analyzer';

const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove these in production
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Enable image optimization
  images: {
    domains: ['your-image-domains.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack configuration for optimization
  webpack: (config, { isServer }) => {
    // Enable tree shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    
    return config;
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
};

export default withBundleAnalyzerConfig(nextConfig);
```

### 1.3 Run Initial Bundle Analysis

```bash
ANALYZE=true npm run build
```

Document current bundle sizes for comparison.

## Phase 2: Code Splitting Implementation (Day 3-5)

### 2.1 Route-Based Code Splitting

Update all page components to use dynamic imports:

```typescript
// app/analytics/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AnalyticsSkeleton } from '@/components/skeletons/analytics-skeleton';

const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/analytics-tab'),
  {
    loading: () => <AnalyticsSkeleton />,
    ssr: false, // Disable SSR for heavy client-side components
  }
);

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
```

### 2.2 Component-Level Code Splitting

Create a dynamic component loader utility:

```typescript
// lib/performance/dynamic-loader.ts
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

interface DynamicComponentMap {
  [key: string]: {
    loader: () => Promise<{ default: ComponentType<any> }>;
    loading?: ComponentType;
    ssr?: boolean;
  };
}

export const dynamicComponents: DynamicComponentMap = {
  // Analytics components
  RevenueChart: {
    loader: () => import('@/components/analytics/revenue-chart'),
    loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />,
    ssr: false,
  },
  MetricsCarousel: {
    loader: () => import('@/components/analytics/metrics-carousel'),
    loading: () => <div className="h-48 bg-muted animate-pulse rounded-lg" />,
  },
  
  // Heavy third-party components
  DateRangePicker: {
    loader: () => import('@/components/date-range-picker'),
    loading: () => <div className="h-10 w-64 bg-muted animate-pulse rounded" />,
  },
  FileUpload: {
    loader: () => import('@/components/ui/file-upload'),
    loading: () => <div className="h-32 border-2 border-dashed rounded-lg animate-pulse" />,
  },
};

export function getDynamicComponent(name: keyof typeof dynamicComponents) {
  const config = dynamicComponents[name];
  return dynamic(config.loader, {
    loading: config.loading,
    ssr: config.ssr ?? true,
  });
}
```

### 2.3 Implement Lazy Loading for Heavy Dependencies

Create wrappers for heavy libraries:

```typescript
// lib/performance/lazy-recharts.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <Skeleton className="w-full h-96" />,
    ssr: false,
  }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  {
    loading: () => <Skeleton className="w-full h-96" />,
    ssr: false,
  }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  {
    loading: () => <Skeleton className="w-full h-96" />,
    ssr: false,
  }
);

// Export other Recharts components as needed
```

## Phase 3: Image Optimization (Day 6-7)

### 3.1 Convert Images to Next.js Image Component

Create an optimized image component:

```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  objectFit = 'cover',
  placeholder = 'blur',
  blurDataURL,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate blur placeholder if not provided
  const shimmer = (w: number, h: number) => `
    <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <linearGradient id="g">
          <stop stop-color="#f6f7f8" offset="20%" />
          <stop stop-color="#edeef1" offset="50%" />
          <stop stop-color="#f6f7f8" offset="70%" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f6f7f8" />
      <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
      <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
    </svg>`;
  
  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str);
  
  const dataUrl = `data:image/svg+xml;base64,${toBase64(
    shimmer(width || 700, height || 475)
  )}`;
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || dataUrl}
        style={{ objectFit }}
        className={cn(
          'duration-700 ease-in-out',
          isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'
        )}
        onLoadingComplete={() => setIsLoading(false)}
      />
    </div>
  );
}
```

### 3.2 Image Preload Strategy

```typescript
// lib/performance/image-preloader.ts
export class ImagePreloader {
  private static instance: ImagePreloader;
  private preloadedImages = new Set<string>();
  
  static getInstance() {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader();
    }
    return ImagePreloader.instance;
  }
  
  preloadImage(src: string, priority: 'high' | 'low' = 'low') {
    if (this.preloadedImages.has(src)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }
    
    document.head.appendChild(link);
    this.preloadedImages.add(src);
  }
  
  preloadImages(images: string[]) {
    images.forEach(src => this.preloadImage(src));
  }
}
```

## Phase 4: Performance Monitoring Setup (Day 8-9)

### 4.1 Web Vitals Implementation

Create the Web Vitals tracking component:

```typescript
// components/performance/web-vitals-reporter.tsx
'use client';

import { useEffect } from 'react';
import { getCLS, getFCP, getFID, getLCP, getTTFB, getINP } from 'web-vitals';
import type { Metric } from 'web-vitals';

interface WebVitalsReporterProps {
  onReport?: (metric: Metric) => void;
}

export function WebVitalsReporter({ onReport }: WebVitalsReporterProps) {
  useEffect(() => {
    const reportMetric = (metric: Metric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, metric.value);
      }
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_id: metric.id,
          metric_value: metric.value,
          metric_delta: metric.delta,
        });
      }
      
      // Custom reporting
      onReport?.(metric);
      
      // Send to API
      fetch('/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          timestamp: Date.now(),
          url: window.location.href,
        }),
      }).catch(console.error);
    };
    
    getCLS(reportMetric);
    getFCP(reportMetric);
    getFID(reportMetric);
    getLCP(reportMetric);
    getTTFB(reportMetric);
    getINP(reportMetric);
  }, [onReport]);
  
  return null;
}
```

### 4.2 Performance Dashboard Component

```typescript
// components/performance/performance-dashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Metric } from 'web-vitals';

interface MetricData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  target: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Map<string, MetricData>>(new Map());
  
  const getMetricRating = (name: string, value: number): MetricData['rating'] => {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FCP: { good: 1800, poor: 3000 },
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      TTFB: { good: 800, poor: 1800 },
      INP: { good: 200, poor: 500 },
    };
    
    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value >= threshold.poor) return 'poor';
    return 'needs-improvement';
  };
  
  const handleMetric = (metric: Metric) => {
    setMetrics(prev => {
      const updated = new Map(prev);
      updated.set(metric.name, {
        name: metric.name,
        value: metric.value,
        rating: getMetricRating(metric.name, metric.value),
        target: getTargetValue(metric.name),
      });
      return updated;
    });
  };
  
  const getTargetValue = (name: string): number => {
    const targets: Record<string, number> = {
      LCP: 2500,
      FCP: 1800,
      CLS: 0.1,
      FID: 100,
      TTFB: 800,
      INP: 200,
    };
    return targets[name] || 0;
  };
  
  const getRatingColor = (rating: MetricData['rating']) => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
    }
  };
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50">
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(metrics.values()).map(metric => (
          <div key={metric.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{metric.name}</span>
              <span className={`text-sm ${getRatingColor(metric.rating)}`}>
                {metric.value.toFixed(metric.name === 'CLS' ? 3 : 0)}
                {metric.name === 'CLS' ? '' : 'ms'}
              </span>
            </div>
            <Progress 
              value={(metric.value / metric.target) * 100} 
              className="h-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

## Phase 5: Script Optimization (Day 10)

### 5.1 Third-Party Script Management

```typescript
// components/performance/script-loader.tsx
import Script from 'next/script';

export function ThirdPartyScripts() {
  return (
    <>
      {/* Google Analytics - Load after interactive */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
      
      {/* Customer support widget - Load on idle */}
      <Script
        id="support-widget"
        strategy="idle"
        onLoad={() => {
          console.log('Support widget loaded');
        }}
      >
        {`
          // Support widget initialization
          window.$crisp = [];
          window.CRISP_WEBSITE_ID = "YOUR_CRISP_ID";
        `}
      </Script>
      
      {/* Non-critical scripts - Lazy load */}
      <Script
        src="https://cdn.example.com/optional-feature.js"
        strategy="lazyOnload"
      />
    </>
  );
}
```

## Phase 6: Caching Implementation (Day 11-12)

### 6.1 Service Worker Setup

```typescript
// public/sw.js
const CACHE_NAME = 'financial-dashboard-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/offline.html',
  // Add critical assets
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event with strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API calls - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // Static assets - Cache first
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    );
    return;
  }
  
  // Default - Network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
```

### 6.2 Cache Headers Configuration

Create API middleware for cache headers:

```typescript
// middleware/cache-headers.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function withCacheHeaders(request: NextRequest) {
  const response = NextResponse.next();
  const url = new URL(request.url);
  
  // Static assets - long cache
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // API responses - short cache with revalidation
  else if (url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
  }
  
  // HTML pages - no cache
  else {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  return response;
}
```

## Performance Checklist

### Pre-deployment Checklist
- [ ] Bundle size < 200KB for initial load
- [ ] All routes use dynamic imports
- [ ] Images use next/image component
- [ ] Critical CSS is inlined
- [ ] Web fonts are preloaded
- [ ] Service worker is registered
- [ ] Cache headers are configured
- [ ] Web Vitals monitoring is active

### Monitoring Checklist
- [ ] LCP < 2.5s on 75th percentile
- [ ] FCP < 1.8s on 75th percentile
- [ ] CLS < 0.1
- [ ] FID < 100ms
- [ ] Bundle size reduced by 30%+

## Testing Performance

### Local Testing
```bash
# Build and analyze
ANALYZE=true npm run build

# Test with throttling
npm run dev
# Open Chrome DevTools > Network > Slow 3G

# Lighthouse audit
# Chrome DevTools > Lighthouse > Generate report
```

### Performance Budget
```javascript
// performance.budget.js
module.exports = {
  bundles: [
    {
      name: 'main',
      maxSize: '200KB',
    },
    {
      name: 'vendor',
      maxSize: '150KB',
    },
  ],
  resources: {
    scripts: {
      maxSize: '300KB',
      maxCount: 10,
    },
    styles: {
      maxSize: '50KB',
      maxCount: 5,
    },
    images: {
      maxSize: '2MB',
      maxCount: 20,
    },
  },
};
```

## Troubleshooting

### Common Issues

1. **Hydration Mismatch**
   - Ensure SSR is disabled for client-only components
   - Use `useEffect` for client-side only code

2. **Large Bundle Size**
   - Check for duplicate dependencies
   - Use dynamic imports more aggressively
   - Tree-shake unused exports

3. **Slow Initial Load**
   - Reduce the number of blocking resources
   - Implement resource hints (preload, prefetch)
   - Optimize critical rendering path

4. **Poor CLS Score**
   - Set explicit dimensions for images
   - Reserve space for dynamic content
   - Avoid inserting content above existing content

## Next Steps

1. Implement monitoring dashboard
2. Set up automated performance testing
3. Create performance regression alerts
4. Document performance best practices
5. Train team on performance optimization