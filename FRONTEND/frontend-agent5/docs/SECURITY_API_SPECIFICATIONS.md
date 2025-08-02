# Security API Specifications

## Overview
RESTful API specifications for security services including authentication, CSRF protection, monitoring, and rate limiting.

## Base Configuration
```yaml
baseURL: https://api.example.com
version: v1
authentication: Bearer Token
contentType: application/json
```

## Security Endpoints

### 1. CSRF Token Management

#### Generate CSRF Token
```http
POST /api/security/csrf-token
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T10:30:00Z",
  "expiresIn": 3600
}
```

**Status Codes:**
- `200 OK` - Token generated successfully
- `401 Unauthorized` - Invalid or missing authentication
- `429 Too Many Requests` - Rate limit exceeded

#### Validate CSRF Token
```http
POST /api/security/csrf-token/validate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "expiresAt": "2024-01-15T10:30:00Z",
  "remainingTime": 2400
}
```

**Status Codes:**
- `200 OK` - Validation result returned
- `401 Unauthorized` - Invalid or missing authentication

### 2. Nonce Management

#### Generate Nonce
```http
GET /api/security/nonce
```

**Response:**
```json
{
  "nonce": "dGVzdC1ub25jZS0xMjM0NTY3ODkw",
  "expiresAt": "2024-01-15T10:30:00Z",
  "ttl": 300
}
```

**Status Codes:**
- `200 OK` - Nonce generated successfully
- `429 Too Many Requests` - Rate limit exceeded

### 3. Security Headers Configuration

#### Get Security Headers Config
```http
GET /api/security/headers/config
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "contentSecurityPolicy": {
    "directives": {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'nonce-{nonce}'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'", "https://api.example.com"]
    },
    "reportUri": "/api/security/csp-report",
    "useNonce": true
  },
  "frameOptions": "DENY",
  "contentTypeOptions": "nosniff",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "permissionsPolicy": {
    "camera": [],
    "microphone": [],
    "geolocation": ["'self'"]
  },
  "strictTransportSecurity": {
    "maxAge": 31536000,
    "includeSubDomains": true,
    "preload": true
  }
}
```

#### Update Security Headers Config
```http
PUT /api/security/headers/config
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "contentSecurityPolicy": {
    "directives": {
      "script-src": ["'self'", "'nonce-{nonce}'", "https://trusted-cdn.com"]
    }
  }
}
```

**Response:**
```json
{
  "message": "Security headers configuration updated",
  "appliedAt": "2024-01-15T10:00:00Z"
}
```

**Status Codes:**
- `200 OK` - Configuration updated successfully
- `400 Bad Request` - Invalid configuration
- `401 Unauthorized` - Insufficient permissions
- `403 Forbidden` - Admin access required

### 4. Content Security Policy Reporting

#### Report CSP Violation
```http
POST /api/security/csp-report
Content-Type: application/csp-report

{
  "csp-report": {
    "document-uri": "https://example.com/page",
    "referrer": "https://example.com/",
    "violated-directive": "script-src",
    "effective-directive": "script-src",
    "original-policy": "default-src 'self'; script-src 'self'",
    "disposition": "enforce",
    "blocked-uri": "https://malicious.com/script.js",
    "line-number": 10,
    "column-number": 20,
    "source-file": "https://example.com/page",
    "status-code": 200,
    "script-sample": "alert('XSS')"
  }
}
```

**Response:**
```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "received": true
}
```

**Status Codes:**
- `204 No Content` - Report received
- `400 Bad Request` - Invalid report format
- `429 Too Many Requests` - Rate limit exceeded

## Monitoring Endpoints

### 5. Error Reporting

#### Submit Error Report
```http
POST /api/monitoring/errors
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "error": {
    "name": "TypeError",
    "message": "Cannot read property 'foo' of undefined",
    "stack": "TypeError: Cannot read property...",
    "timestamp": "2024-01-15T10:00:00Z"
  },
  "context": {
    "environment": "production",
    "release": "1.2.3",
    "component": "UserDashboard",
    "url": "https://example.com/dashboard"
  },
  "userContext": {
    "id": "user123",
    "email": "user@example.com"
  },
  "breadcrumbs": [
    {
      "timestamp": "2024-01-15T09:59:50Z",
      "type": "navigation",
      "category": "route",
      "message": "Navigated to /dashboard"
    }
  ],
  "tags": {
    "feature": "user-profile",
    "browser": "chrome"
  }
}
```

**Response:**
```json
{
  "errorId": "err_1234567890",
  "received": true,
  "processingTime": 45
}
```

**Status Codes:**
- `201 Created` - Error report created
- `400 Bad Request` - Invalid error format
- `401 Unauthorized` - Invalid authentication
- `413 Payload Too Large` - Error report too large
- `429 Too Many Requests` - Rate limit exceeded

#### Get Error Reports
```http
GET /api/monitoring/errors?
  startDate=2024-01-01T00:00:00Z&
  endDate=2024-01-15T23:59:59Z&
  severity=error&
  page=1&
  limit=20
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "errors": [
    {
      "id": "err_1234567890",
      "timestamp": "2024-01-15T10:00:00Z",
      "error": {
        "name": "TypeError",
        "message": "Cannot read property 'foo' of undefined"
      },
      "occurrences": 5,
      "affectedUsers": 3,
      "status": "unresolved",
      "firstSeen": "2024-01-15T09:00:00Z",
      "lastSeen": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### 6. Application Logging

#### Submit Log Entries
```http
POST /api/monitoring/logs
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "entries": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "level": "error",
      "service": "frontend",
      "message": "Failed to fetch user profile",
      "context": {
        "module": "UserService",
        "function": "fetchProfile",
        "userId": "user123"
      },
      "metadata": {
        "errorCode": "PROFILE_FETCH_FAILED",
        "httpStatus": 500
      }
    }
  ]
}
```

**Response:**
```json
{
  "received": 1,
  "rejected": 0,
  "processingTime": 23
}
```

**Status Codes:**
- `202 Accepted` - Logs accepted for processing
- `400 Bad Request` - Invalid log format
- `401 Unauthorized` - Invalid authentication
- `413 Payload Too Large` - Log batch too large
- `429 Too Many Requests` - Rate limit exceeded

### 7. Performance Metrics

#### Submit Performance Metrics
```http
POST /api/monitoring/metrics
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "metrics": [
    {
      "name": "page.load.time",
      "value": 1234,
      "unit": "ms",
      "tags": {
        "page": "/dashboard",
        "device": "desktop"
      },
      "timestamp": "2024-01-15T10:00:00Z"
    },
    {
      "name": "api.response.time",
      "value": 234,
      "unit": "ms",
      "tags": {
        "endpoint": "/api/users",
        "method": "GET"
      },
      "timestamp": "2024-01-15T10:00:01Z"
    }
  ]
}
```

**Response:**
```json
{
  "received": 2,
  "processingTime": 15
}
```

### 8. User Activity Tracking

#### Track User Activity
```http
POST /api/monitoring/activities
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "activities": [
    {
      "type": "page_view",
      "category": "navigation",
      "action": "view",
      "label": "/dashboard",
      "value": 5000,
      "metadata": {
        "referrer": "/login",
        "duration": 5000
      },
      "consent": {
        "analytics": true,
        "performance": true
      }
    }
  ]
}
```

**Response:**
```json
{
  "tracked": 1,
  "rejected": 0
}
```

## Rate Limiting Information

### Rate Limit Headers
All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T10:30:00Z
```

### Rate Limit Response
When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

## Authentication & Authorization

### Required Headers
```http
Authorization: Bearer {access_token}
X-CSRF-Token: {csrf_token}  # For state-changing operations
X-Request-ID: {unique_request_id}  # Optional but recommended
```

### Permission Levels
- **Public**: No authentication required
- **User**: Standard user authentication
- **Admin**: Administrative privileges required
- **Service**: Service-to-service authentication

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ],
    "requestId": "req_1234567890",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `413` - Payload Too Large
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Webhooks

### Security Event Webhook
```http
POST https://your-webhook-url.com/security-events
Content-Type: application/json
X-Webhook-Signature: sha256=...

{
  "event": "security.violation",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "type": "csp_violation",
    "severity": "medium",
    "details": {
      "directive": "script-src",
      "blockedUri": "https://malicious.com/script.js",
      "documentUri": "https://example.com/page"
    }
  }
}
```

### Webhook Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${hash}` === signature;
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { SecurityClient } from '@example/security-sdk';

const client = new SecurityClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.example.com'
});

// Generate CSRF token
const { token } = await client.csrf.generateToken();

// Track error
await client.monitoring.trackError({
  error: new Error('Something went wrong'),
  context: {
    component: 'UserDashboard'
  }
});

// Log event
await client.monitoring.log('info', 'User action completed', {
  userId: 'user123',
  action: 'profile_update'
});
```

### cURL Examples
```bash
# Generate CSRF token
curl -X POST https://api.example.com/api/security/csrf-token \
  -H "Authorization: Bearer your-token"

# Submit error report
curl -X POST https://api.example.com/api/monitoring/errors \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "error": {
      "name": "Error",
      "message": "Test error"
    }
  }'
```