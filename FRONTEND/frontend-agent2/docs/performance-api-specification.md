# Performance Monitoring API Specification

## Table of Contents
1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Request/Response Examples](#requestresponse-examples)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Security](#security)

## Overview

The Performance Monitoring API provides endpoints for collecting, analyzing, and reporting performance metrics for the financial dashboard application. It follows RESTful principles and uses JSON for data exchange.

### Base URL
```
Production: https://api.financial-dashboard.com/v1
Development: http://localhost:3001/api/v1
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

## API Endpoints

### 1. Metrics Collection

#### POST /performance/metrics
Collect performance metrics from client applications.

**Request Body:**
```typescript
{
  "sessionId": "uuid-v4",
  "userId": "user-id",
  "metrics": [
    {
      "name": "LCP" | "FCP" | "CLS" | "FID" | "TTFB" | "INP",
      "value": number,
      "timestamp": "ISO 8601",
      "url": "string",
      "userAgent": "string",
      "connectionType": "4g" | "3g" | "2g" | "slow-2g" | "wifi",
      "deviceMemory": number,
      "viewport": {
        "width": number,
        "height": number
      }
    }
  ],
  "resourceTimings": [
    {
      "name": "string",
      "entryType": "resource" | "navigation" | "paint",
      "startTime": number,
      "duration": number,
      "transferSize": number,
      "encodedBodySize": number,
      "decodedBodySize": number
    }
  ]
}
```

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "metricsReceived": number,
    "sessionId": "string",
    "processingTime": number
  }
}
```

### 2. Performance Reports

#### GET /performance/reports/summary
Get aggregated performance summary for a time range.

**Query Parameters:**
- `startDate` (required): ISO 8601 date
- `endDate` (required): ISO 8601 date
- `userId` (optional): Filter by user
- `url` (optional): Filter by page URL
- `percentile` (optional): P50, P75, P90, P95 (default: P75)

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "timeRange": {
      "start": "ISO 8601",
      "end": "ISO 8601"
    },
    "metrics": {
      "lcp": {
        "value": number,
        "rating": "good" | "needs-improvement" | "poor",
        "percentile": number,
        "samples": number
      },
      "fcp": { /* same structure */ },
      "cls": { /* same structure */ },
      "fid": { /* same structure */ },
      "ttfb": { /* same structure */ }
    },
    "deviceBreakdown": {
      "mobile": number,
      "desktop": number,
      "tablet": number
    },
    "topPages": [
      {
        "url": "string",
        "visits": number,
        "avgLcp": number,
        "bounceRate": number
      }
    ]
  }
}
```

#### GET /performance/reports/detailed/{sessionId}
Get detailed performance data for a specific session.

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "session": {
      "id": "string",
      "userId": "string",
      "startTime": "ISO 8601",
      "endTime": "ISO 8601",
      "device": {
        "type": "mobile" | "desktop" | "tablet",
        "userAgent": "string",
        "viewport": {
          "width": number,
          "height": number
        }
      }
    },
    "metrics": [
      {
        "name": "string",
        "value": number,
        "timestamp": "ISO 8601",
        "rating": "good" | "needs-improvement" | "poor"
      }
    ],
    "resourceTimings": [
      {
        "name": "string",
        "type": "script" | "css" | "image" | "font" | "xhr",
        "duration": number,
        "size": number,
        "cached": boolean
      }
    ],
    "navigation": {
      "domContentLoaded": number,
      "loadComplete": number,
      "firstByte": number
    }
  }
}
```

### 3. Bundle Analysis

#### GET /performance/bundle/analysis
Get current bundle analysis report.

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "timestamp": "ISO 8601",
    "totalSize": number,
    "breakdown": {
      "javascript": {
        "size": number,
        "gzipped": number,
        "percentage": number
      },
      "css": {
        "size": number,
        "gzipped": number,
        "percentage": number
      },
      "images": {
        "size": number,
        "count": number,
        "percentage": number
      },
      "fonts": {
        "size": number,
        "count": number,
        "percentage": number
      }
    },
    "chunks": [
      {
        "name": "string",
        "size": number,
        "gzipped": number,
        "modules": number,
        "isInitial": boolean,
        "isAsync": boolean,
        "imports": ["string"],
        "assets": ["string"]
      }
    ],
    "duplicates": [
      {
        "module": "string",
        "occurrences": number,
        "wastedBytes": number,
        "locations": ["string"]
      }
    ],
    "recommendations": [
      {
        "type": "code-split" | "tree-shake" | "lazy-load" | "minify",
        "description": "string",
        "impact": "high" | "medium" | "low",
        "estimatedSavings": number
      }
    ]
  }
}
```

#### POST /performance/bundle/optimize
Request bundle optimization with specific targets.

**Request Body:**
```typescript
{
  "targets": {
    "maxBundleSize": number, // in bytes
    "maxChunkSize": number,  // in bytes
    "maxAsyncRequests": number,
    "maxInitialRequests": number
  },
  "optimizations": {
    "codeSplitting": {
      "enabled": boolean,
      "granularity": "route" | "component" | "aggressive"
    },
    "treeshaking": {
      "enabled": boolean,
      "sideEffects": boolean
    },
    "compression": {
      "enabled": boolean,
      "algorithms": ["gzip", "brotli"]
    },
    "minification": {
      "enabled": boolean,
      "terserOptions": object
    }
  }
}
```

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "optimizationId": "string",
    "status": "pending" | "in-progress" | "completed" | "failed",
    "estimatedCompletion": "ISO 8601",
    "preview": {
      "currentSize": number,
      "optimizedSize": number,
      "reduction": number,
      "percentage": number
    }
  }
}
```

### 4. Cache Management

#### GET /performance/cache/status
Get current cache status and statistics.

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "caches": [
      {
        "name": "string",
        "type": "static" | "dynamic" | "api",
        "size": number,
        "entries": number,
        "hitRate": number,
        "missRate": number,
        "lastUpdated": "ISO 8601"
      }
    ],
    "storage": {
      "used": number,
      "quota": number,
      "percentage": number
    },
    "performance": {
      "avgCacheResponseTime": number,
      "avgNetworkResponseTime": number,
      "cacheEfficiency": number
    }
  }
}
```

#### POST /performance/cache/strategy
Update cache strategy configuration.

**Request Body:**
```typescript
{
  "strategies": [
    {
      "name": "string",
      "pattern": "regex string",
      "strategy": "cache-first" | "network-first" | "stale-while-revalidate",
      "maxAge": number, // seconds
      "maxEntries": number,
      "purgeOnQuotaError": boolean
    }
  ],
  "global": {
    "enableOffline": boolean,
    "offlinePage": "string",
    "precacheAssets": ["string"]
  }
}
```

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "applied": boolean,
    "strategies": number,
    "warnings": ["string"]
  }
}
```

#### DELETE /performance/cache/invalidate
Invalidate cache entries matching a pattern.

**Request Body:**
```typescript
{
  "pattern": "string", // regex or exact match
  "cacheNames": ["string"], // optional, defaults to all
  "immediate": boolean // force immediate purge
}
```

**Response:**
```typescript
{
  "status": "success",
  "data": {
    "invalidated": number,
    "caches": ["string"],
    "timestamp": "ISO 8601"
  }
}
```

### 5. Real-time Monitoring

#### WebSocket /performance/realtime
Real-time performance metrics stream.

**Connection:**
```javascript
const ws = new WebSocket('wss://api.financial-dashboard.com/v1/performance/realtime');
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['metrics', 'errors', 'resources'],
  sessionId: 'uuid-v4'
}));
```

**Message Types:**

**Metric Update:**
```typescript
{
  "type": "metric",
  "data": {
    "name": "string",
    "value": number,
    "timestamp": "ISO 8601",
    "sessionId": "string"
  }
}
```

**Error Event:**
```typescript
{
  "type": "error",
  "data": {
    "message": "string",
    "stack": "string",
    "timestamp": "ISO 8601",
    "impact": "high" | "medium" | "low"
  }
}
```

**Resource Timing:**
```typescript
{
  "type": "resource",
  "data": {
    "url": "string",
    "duration": number,
    "size": number,
    "cached": boolean,
    "timestamp": "ISO 8601"
  }
}
```

## Data Models

### Core Entities

```typescript
// Performance Session
interface PerformanceSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  device: DeviceInfo;
  metrics: PerformanceMetric[];
  resources: ResourceTiming[];
  errors: ErrorEvent[];
}

// Web Vitals Metric
interface PerformanceMetric {
  id: string;
  sessionId: string;
  name: 'LCP' | 'FCP' | 'CLS' | 'FID' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: Date;
  metadata: {
    url: string;
    viewport: Viewport;
    connection: ConnectionType;
  };
}

// Bundle Analysis
interface BundleAnalysis {
  id: string;
  timestamp: Date;
  totalSize: number;
  chunks: ChunkInfo[];
  modules: ModuleInfo[];
  duplicates: DuplicateModule[];
  recommendations: Recommendation[];
}

// Cache Entry
interface CacheEntry {
  url: string;
  cacheName: string;
  size: number;
  created: Date;
  lastAccessed: Date;
  accessCount: number;
  headers: Record<string, string>;
}
```

## Request/Response Examples

### Example: Collecting Metrics

**Request:**
```bash
curl -X POST https://api.financial-dashboard.com/v1/performance/metrics \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "metrics": [
      {
        "name": "LCP",
        "value": 2453.5,
        "timestamp": "2024-01-15T10:30:00.000Z",
        "url": "/dashboard",
        "userAgent": "Mozilla/5.0...",
        "connectionType": "4g",
        "deviceMemory": 8,
        "viewport": {
          "width": 1920,
          "height": 1080
        }
      }
    ]
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "metricsReceived": 1,
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "processingTime": 45
  }
}
```

### Example: Getting Performance Summary

**Request:**
```bash
curl -X GET "https://api.financial-dashboard.com/v1/performance/reports/summary?startDate=2024-01-01&endDate=2024-01-15&percentile=P75" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "timeRange": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-15T23:59:59.999Z"
    },
    "metrics": {
      "lcp": {
        "value": 2543.7,
        "rating": "needs-improvement",
        "percentile": 75,
        "samples": 15420
      },
      "fcp": {
        "value": 1823.4,
        "rating": "good",
        "percentile": 75,
        "samples": 15420
      }
    },
    "deviceBreakdown": {
      "mobile": 65.3,
      "desktop": 30.2,
      "tablet": 4.5
    }
  }
}
```

## Error Handling

### Error Response Format
```typescript
{
  "status": "error",
  "error": {
    "code": "string",
    "message": "string",
    "details": object, // optional
    "timestamp": "ISO 8601"
  }
}
```

### Error Codes
- `400` - Bad Request: Invalid parameters or request body
- `401` - Unauthorized: Invalid or missing authentication token
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server-side error
- `503` - Service Unavailable: Service temporarily unavailable

### Example Error Response
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_METRIC",
    "message": "Invalid metric name provided",
    "details": {
      "field": "metrics[0].name",
      "value": "INVALID",
      "allowed": ["LCP", "FCP", "CLS", "FID", "TTFB", "INP"]
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Rate Limiting

### Limits
- **Metrics Collection**: 1000 requests per minute per session
- **Reports**: 100 requests per minute per user
- **Bundle Analysis**: 10 requests per hour per user
- **Cache Operations**: 50 requests per minute per user

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642252800
```

### Rate Limit Response
```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 1000,
      "window": "1m",
      "retryAfter": 60
    }
  }
}
```

## Security

### Authentication
All API requests must include a valid Bearer token in the Authorization header.

### CORS Policy
```
Access-Control-Allow-Origin: https://financial-dashboard.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

### Content Security Policy
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://api.financial-dashboard.com; connect-src 'self' https://api.financial-dashboard.com wss://api.financial-dashboard.com
```

### Data Privacy
- All performance data is anonymized before storage
- Personal identifiers are hashed
- Data retention: 90 days for detailed metrics, 1 year for aggregated data
- GDPR compliant with right to deletion

## SDK Integration

### JavaScript/TypeScript SDK
```typescript
import { PerformanceMonitor } from '@financial-dashboard/performance-sdk';

const monitor = new PerformanceMonitor({
  apiKey: 'your-api-key',
  endpoint: 'https://api.financial-dashboard.com/v1',
  sessionId: 'auto', // or provide custom
  userId: 'user123'
});

// Automatic Web Vitals tracking
monitor.trackWebVitals();

// Manual metric tracking
monitor.trackMetric({
  name: 'custom-metric',
  value: 123.45
});

// Get performance report
const report = await monitor.getReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-15')
});
```

### React Integration
```typescript
import { PerformanceProvider, usePerformance } from '@financial-dashboard/performance-react';

// App wrapper
function App() {
  return (
    <PerformanceProvider config={{ apiKey: 'your-api-key' }}>
      <YourApp />
    </PerformanceProvider>
  );
}

// Component usage
function Dashboard() {
  const { trackEvent, metrics } = usePerformance();
  
  useEffect(() => {
    trackEvent('dashboard-loaded');
  }, []);
  
  return <div>Current LCP: {metrics.lcp}ms</div>;
}
```