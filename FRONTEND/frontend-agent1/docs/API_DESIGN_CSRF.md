# CSRF Token Management API Design

## Overview

This document outlines the API design for CSRF (Cross-Site Request Forgery) token management in the financial dashboard application.

## API Endpoints

### 1. Get CSRF Token

**Endpoint**: `GET /api/csrf-token`

**Description**: Retrieves a CSRF token for the current session.

**Request Headers**:
```
Cookie: session-id=<session-id>
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-20T12:00:00Z"
}
```

**Error Responses**:
- `500 Internal Server Error`: Token generation failed

**Implementation Details**:
- Creates session ID if not present
- Token expires after 1 hour
- Token is bound to session ID

### 2. Refresh CSRF Token

**Endpoint**: `POST /api/csrf-token/refresh`

**Description**: Refreshes an existing CSRF token.

**Request Headers**:
```
Cookie: session-id=<session-id>
X-CSRF-Token: <current-token>
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-20T13:00:00Z"
}
```

**Error Responses**:
- `403 Forbidden`: Invalid current token
- `500 Internal Server Error`: Token generation failed

### 3. Validate CSRF Token (Internal)

**Function**: `validateCSRFToken(token: string, sessionId: string): Promise<boolean>`

**Description**: Internal function used by middleware to validate tokens.

**Parameters**:
- `token`: The CSRF token to validate
- `sessionId`: The session ID to validate against

**Returns**: `true` if valid, `false` otherwise

## Token Format

### Token Structure
```typescript
interface CSRFToken {
  sessionId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}
```

### Token Encoding
- Tokens are base64url encoded
- Contains timestamp for expiry validation
- Includes cryptographic signature

## Security Headers

All responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

## Integration Points

### 1. Middleware Integration
```typescript
// Automatic CSRF validation for state-changing requests
if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
  const token = request.headers.get('X-CSRF-Token');
  if (!validateCSRFToken(token, sessionId)) {
    return new Response('Invalid CSRF token', { status: 403 });
  }
}
```

### 2. Form Integration
```typescript
// All forms must include CSRF token
const { token } = useCSRF();

<input type="hidden" name="csrfToken" value={token} />
// OR
headers: {
  'X-CSRF-Token': token
}
```

### 3. API Client Integration
```typescript
// Enhanced API client automatically includes CSRF token
apiClient.addRequestInterceptor(async (endpoint, options) => {
  const token = await getCSRFToken();
  return [endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token
    }
  }];
});
```

## Token Storage

### Client-Side Storage
- Stored in memory (React state)
- Never stored in localStorage
- Can be stored in httpOnly cookie (double-submit pattern)

### Server-Side Storage
- Stored in session store (Redis/Memory)
- Indexed by session ID
- TTL set to 1 hour

## Rate Limiting

### Token Generation
- Max 10 tokens per session per hour
- Max 100 tokens per IP per hour

### Token Validation
- No rate limit (checked on every request)
- Failed validations logged for security monitoring

## Error Handling

### Client-Side Errors
```typescript
try {
  const token = await fetchCSRFToken();
} catch (error) {
  // Retry with exponential backoff
  // Show user-friendly error after max retries
}
```

### Server-Side Errors
- Log all token generation failures
- Monitor for unusual patterns
- Alert on high failure rates

## Monitoring & Metrics

### Key Metrics
1. **Token Generation Rate**: Tokens generated per minute
2. **Validation Success Rate**: Successful validations / total validations
3. **Token Expiry Rate**: Expired tokens / total tokens
4. **Error Rate**: Failed operations / total operations

### Alerts
- Token generation failures > 5% (5 min window)
- Validation failures > 10% (5 min window)
- Unusual spike in token requests

## Migration Strategy

### Phase 1: Soft Launch
1. Implement CSRF token generation
2. Add tokens to new forms
3. Log but don't enforce validation

### Phase 2: Enforcement
1. Enable validation in middleware
2. Update all existing forms
3. Monitor for issues

### Phase 3: Optimization
1. Implement token caching
2. Add rate limiting
3. Performance tuning

## Example Usage

### React Component
```typescript
function SecureForm() {
  const { token, loading, error } = useCSRF();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token
      },
      body: JSON.stringify(formData)
    });
    
    if (response.status === 403) {
      // Token expired, refresh and retry
      const newToken = await refreshToken();
      // Retry request
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### API Route
```typescript
export async function POST(request: Request) {
  // CSRF validation handled by middleware
  
  const data = await request.json();
  
  // Process form data
  return Response.json({ success: true });
}
```

## Testing

### Unit Tests
```typescript
describe('CSRF Token Manager', () => {
  it('should generate valid token', async () => {
    const token = await csrfManager.generateToken('session-123');
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(20);
  });

  it('should validate correct token', async () => {
    const token = await csrfManager.generateToken('session-123');
    const isValid = await csrfManager.validateToken(token, 'session-123');
    expect(isValid).toBe(true);
  });

  it('should reject token for different session', async () => {
    const token = await csrfManager.generateToken('session-123');
    const isValid = await csrfManager.validateToken(token, 'session-456');
    expect(isValid).toBe(false);
  });
});
```

### Integration Tests
```typescript
describe('CSRF Protection', () => {
  it('should block requests without token', async () => {
    const response = await request(app)
      .post('/api/protected')
      .send({ data: 'test' });
      
    expect(response.status).toBe(403);
  });

  it('should allow requests with valid token', async () => {
    const tokenResponse = await request(app).get('/api/csrf-token');
    const { token } = tokenResponse.body;
    
    const response = await request(app)
      .post('/api/protected')
      .set('X-CSRF-Token', token)
      .send({ data: 'test' });
      
    expect(response.status).toBe(200);
  });
});
```

## Future Enhancements

1. **Token Rotation**: Automatically rotate tokens after sensitive operations
2. **Per-Form Tokens**: Generate unique tokens for each form
3. **Token Binding**: Bind tokens to user agent and IP
4. **Distributed Storage**: Use Redis for multi-server deployments
5. **Advanced Analytics**: ML-based anomaly detection