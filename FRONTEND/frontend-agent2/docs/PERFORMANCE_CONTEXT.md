# Performance Optimization Context & Build Guide

## 🎯 Mission Critical Requirements

### Target Metrics (MUST ACHIEVE)
- **First Contentful Paint**: < 1.8s
- **Largest Contentful Paint**: < 2.5s  
- **Time to Interactive**: < 3.8s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size Reduction**: > 30%

### Working Environment
- **Branch**: feature/performance-optimization
- **Directory**: frontend-agent2
- **Framework**: Next.js 15 with React 18
- **Current Issues**: 
  - Unoptimized images (images.unoptimized: true)
  - Large bundle with 40+ Radix UI components
  - No code splitting implemented
  - Heavy dependencies (recharts, date-fns, etc.)

## 📋 Implementation Tasks (In Order)

### 1. Bundle Analysis Setup
```bash
npm install --save-dev @next/bundle-analyzer webpack-bundle-analyzer
npm install web-vitals
```
- Run initial analysis: `ANALYZE=true npm run build`
- Document baseline metrics

### 2. Code Splitting Implementation
**Heavy Components to Split**:
- `/components/analytics/*` - All chart components
- `/components/agents/agent-management-page.tsx`
- `/components/conversations/chat-interface.tsx`
- `recharts` library imports
- `react-day-picker` imports
- `embla-carousel-react` imports

**Route-based splitting required for**:
- `/analytics`
- `/agents` 
- `/conversations`
- `/leads`

### 3. Component Optimization

**Create Loading Skeletons**:
```typescript
// components/skeletons/analytics-skeleton.tsx
// components/skeletons/table-skeleton.tsx
// components/skeletons/chart-skeleton.tsx
```

**Dynamic Import Pattern**:
```typescript
const HeavyComponent = dynamic(
  () => import('@/components/path/to/component'),
  {
    loading: () => <ComponentSkeleton />,
    ssr: false // for client-only components
  }
);
```

### 4. Image Optimization
**Current images to optimize**:
- `/public/placeholder-*.{jpg,svg,png}`
- All images must use `next/image`
- Add blur placeholders
- Configure domains in next.config.js

### 5. Performance Monitoring Setup
**Required Files**:
- `/lib/performance/web-vitals.ts`
- `/lib/performance/lazy-load.ts`
- `/lib/performance/preload.ts`
- `/components/performance/web-vitals-reporter.tsx`
- `/components/performance/performance-dashboard.tsx`

### 6. Third-party Script Optimization
**Scripts to optimize**:
- Supabase client (lazy load)
- Analytics (use Next.js Script with afterInteractive)
- Any customer support widgets (idle load)

### 7. Caching Implementation
**Service Worker Tasks**:
- Create `/public/sw.js`
- Register in app layout
- Implement caching strategies:
  - Static assets: Cache first
  - API calls: Network first with cache fallback
  - Images: Cache first with expiry

### 8. Critical Performance Utilities

**Dynamic Component Loader** (`/lib/performance/dynamic-loader.ts`):
```typescript
export const dynamicComponents = {
  RevenueChart: {
    loader: () => import('@/components/analytics/revenue-chart'),
    loading: () => <ChartSkeleton />,
    ssr: false,
  },
  // Add all heavy components
};
```

**Image Preloader** (`/lib/performance/image-preloader.ts`):
- Preload critical images
- Implement intersection observer for lazy loading

## 🏗️ Build Configuration Updates

### next.config.mjs Updates
```javascript
{
  images: {
    domains: ['your-domains'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    unoptimized: false, // MUST CHANGE
  },
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  }
}
```

## 📊 Measurement & Validation

### After Each Phase, Measure:
1. Bundle size changes
2. Web Vitals scores
3. Lighthouse scores
4. Real user metrics

### Success Criteria Per Component:
- Chart components: < 50KB each after splitting
- Route bundles: < 100KB each
- Initial JS: < 200KB total
- Images: WebP/AVIF format with < 100KB each

## ⚠️ Critical Implementation Notes

1. **Order Matters**: 
   - Bundle analysis first
   - Then code splitting
   - Then optimization
   - Finally monitoring

2. **Testing Required**:
   - Test on Slow 3G
   - Test on low-end devices
   - Verify no hydration errors

3. **Common Pitfalls**:
   - Don't lazy load above the fold
   - Keep critical CSS inline
   - Preload fonts
   - Avoid layout shifts

4. **Dependencies to Watch**:
   - Recharts (300KB+) - MUST lazy load
   - All Radix components - Tree shake unused
   - date-fns - Import only needed functions

## 🚀 Quick Start Commands

```bash
# Initial setup
cd frontend-agent2
git checkout -b feature/performance-optimization

# Install deps
npm install --save-dev @next/bundle-analyzer webpack-bundle-analyzer
npm install web-vitals

# Run analysis
ANALYZE=true npm run build

# Dev with performance monitoring
npm run dev
# Open Chrome DevTools > Lighthouse
```

## 📝 Commit Strategy

Commit after each major milestone:
1. "perf: add bundle analyzer and initial metrics"
2. "perf: implement code splitting for analytics routes"
3. "perf: add lazy loading for heavy components"
4. "perf: optimize images with next/image"
5. "perf: add web vitals monitoring"
6. "perf: implement service worker caching"
7. "perf: complete performance optimization"

## 🎯 Final Checklist

- [ ] Bundle analyzer installed and baseline recorded
- [ ] All routes use dynamic imports
- [ ] Heavy components lazy loaded
- [ ] Images optimized with next/image
- [ ] Web Vitals tracking active
- [ ] Service worker registered
- [ ] Cache headers configured
- [ ] Performance dashboard implemented
- [ ] All target metrics achieved
- [ ] Documentation updated

## Emergency Rollback

If performance degrades:
```bash
git stash
git checkout main
```

Keep this document open during implementation!