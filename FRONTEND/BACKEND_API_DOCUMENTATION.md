# Real Estate AI Agent API Documentation

Complete documentation for the Real Estate AI Agent API, including authentication, endpoints, examples, and development guidelines.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Agent Management](#agent-management)
  - [Conversation Management](#conversation-management)
  - [Lead Management](#lead-management)
  - [Health Monitoring](#health-monitoring)
- [Usage Examples](#usage-examples)
- [Development Integration](#development-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The Real Estate AI Agent API provides comprehensive functionality for managing AI-powered real estate agents, handling conversations, and managing leads through BANT qualification methodology.

### Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.realestate.example.com/api/v1` |
| Staging | `https://staging-api.realestate.example.com/api/v1` |
| Development | `http://localhost:3001/api/v1` |

### Key Features

- **Agent Management**: Create, configure, and manage AI real estate agents
- **Conversation Handling**: Real-time conversations with message streaming
- **Lead Management**: Capture, qualify, and score leads using BANT methodology
- **Document Processing**: Upload and process knowledge base documents
- **Health Monitoring**: Comprehensive system health checks
- **Webhook Integration**: Real-time event notifications

## Authentication

All API endpoints require JWT token authentication using Bearer token format.

### Obtaining an Access Token

```bash
# Example authentication request (implementation-specific)
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

### Using the Access Token

Include the JWT token in the Authorization header for all API requests:

```bash
curl -X GET "${BASE_URL}/agents" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Token Structure

```json
{
  "userId": "user-uuid",
  "organizationId": "org-uuid", 
  "role": "admin",
  "permissions": ["agent:read", "agent:create", "conversation:manage"],
  "exp": 1640995200
}
```

## Rate Limiting

API endpoints are rate limited to ensure fair usage and system stability:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Standard endpoints | 100 requests | 1 minute |
| Upload endpoints | 10 requests | 1 minute |
| Health endpoints | 200 requests | 1 minute |

Rate limit headers are included in all responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Error Handling

All errors follow a consistent structure with appropriate HTTP status codes.

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field causing error",
      "value": "invalid value"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `PAYLOAD_TOO_LARGE` | 413 | Request body too large |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## API Endpoints

### Agent Management

Manage AI real estate agents with configuration, knowledge base, and webhook integration.

#### List Agents

Get a paginated list of agents for your organization.

```http
GET /agents?page=1&limit=20&status=active&search=downtown
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status (creating, active, inactive, error)
- `search` (optional): Search by name or description
- `sort` (optional): Sort order (e.g., 'createdAt:desc', 'name:asc')

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Downtown Real Estate Expert",
        "organizationId": "org-uuid",
        "status": "active",
        "documentCount": 5,
        "conversationCount": 23,
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Create Agent

Create a new AI agent with configuration and settings.

```http
POST /agents
```

**Request Body:**

```json
{
  "name": "Downtown Real Estate Expert",
  "settings": {
    "tone": "Professional",
    "systemPrompt": "You are a knowledgeable real estate agent specializing in downtown properties. Help users find their perfect home by understanding their needs and budget.",
    "fallbackPrompt": "I apologize, but I need more information to help you with that specific request.",
    "maxTokens": 1000,
    "temperature": 0.7
  },
  "webhook": {
    "url": "https://your-app.com/webhooks/agent-events",
    "events": ["conversation.started", "lead.qualified", "conversation.ended"],
    "secretToken": "your-webhook-secret-token"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "agent": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Downtown Real Estate Expert",
      "organizationId": "org-uuid",
      "status": "creating",
      "settings": {
        "tone": "Professional",
        "systemPrompt": "You are a knowledgeable real estate agent...",
        "fallbackPrompt": "I apologize, but I need more information...",
        "maxTokens": 1000,
        "temperature": 0.7
      },
      "webhook": {
        "url": "https://your-app.com/webhooks/agent-events",
        "events": ["conversation.started", "lead.qualified", "conversation.ended"],
        "secretToken": "your-webhook-secret-token"
      },
      "documentCount": 0,
      "conversationCount": 0,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Get Agent Details

Retrieve detailed information about a specific agent.

```http
GET /agents/{agentId}
```

#### Update Agent

Update an existing agent's configuration.

```http
PUT /agents/{agentId}
```

**Request Body:**

```json
{
  "name": "Updated Agent Name",
  "settings": {
    "tone": "Friendly",
    "systemPrompt": "Updated system prompt...",
    "maxTokens": 1500
  }
}
```

#### Delete Agent

Permanently delete an agent and all associated data.

```http
DELETE /agents/{agentId}
```

#### Upload Agent Document

Upload knowledge base documents for an agent.

```http
POST /agents/{agentId}/documents
```

**Request Body:**

```json
{
  "document": {
    "name": "downtown-properties-guide.pdf",
    "content": "base64-encoded-content",
    "type": "knowledge_base",
    "mimeType": "application/pdf"
  }
}
```

#### List Agent Documents

Get all documents for a specific agent.

```http
GET /agents/{agentId}/documents?page=1&limit=20
```

### Conversation Management

Handle real-time conversations between users and AI agents.

#### List Conversations

Get conversations with optional filtering.

```http
GET /conversations?agentId={agentId}&status=active&source=web
```

#### Start Conversation

Initiate a new conversation with an agent.

```http
POST /conversations
```

**Request Body:**

```json
{
  "agentId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-12345",
  "source": "web",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "referrer": "https://your-website.com"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "conv-uuid",
      "agentId": "agent-uuid",
      "userId": "user-12345",
      "organizationId": "org-uuid",
      "source": "web",
      "status": "active",
      "metadata": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "referrer": "https://your-website.com"
      },
      "messageCount": 0,
      "startedAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Send Message

Send a message in a conversation.

```http
POST /conversations/{conversationId}/messages
```

**Request Body:**

```json
{
  "content": "Hi, I'm looking for a 3-bedroom house in downtown area with budget around $500k.",
  "sender": "user",
  "messageType": "text",
  "metadata": {
    "timestamp": "2024-01-01T12:05:00.000Z",
    "clientId": "client-12345"
  }
}
```

#### Get Conversation Messages

Retrieve messages for a conversation.

```http
GET /conversations/{conversationId}/messages?page=1&limit=50&since=2024-01-01T12:00:00.000Z
```

#### End Conversation

Mark a conversation as ended.

```http
PUT /conversations/{conversationId}/end
```

**Request Body:**

```json
{
  "reason": "lead_generated",
  "metadata": {
    "summary": "User is interested in downtown properties, budget $500k, qualified lead generated",
    "leadGenerated": true,
    "satisfactionScore": 8
  }
}
```

### Lead Management

Capture, qualify, and manage real estate leads using BANT methodology.

#### List Leads

Get leads with filtering and sorting options.

```http
GET /leads?status=qualified&source=web&qualificationScore=75&sort=createdAt:desc
```

#### Create Lead

Create a new lead from conversation or external source.

```http
POST /leads
```

**Request Body:**

```json
{
  "contactInfo": {
    "email": "john.doe@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "preferredContact": "email"
  },
  "source": {
    "channel": "web",
    "referrer": "https://your-website.com",
    "campaign": "downtown-properties-2024"
  },
  "conversationId": "conv-uuid",
  "initialBANT": {
    "budget": 8,
    "authority": 7,
    "need": 9,
    "timeline": 6
  },
  "notes": "Interested in 3-bedroom house, downtown area, budget around $500k"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "lead": {
      "id": "lead-uuid",
      "organizationId": "org-uuid",
      "contactInfo": {
        "email": "john.doe@example.com",
        "name": "John Doe",
        "phone": "+1234567890",
        "preferredContact": "email"
      },
      "source": {
        "channel": "web",
        "referrer": "https://your-website.com",
        "campaign": "downtown-properties-2024"
      },
      "status": "new",
      "conversationId": "conv-uuid",
      "bantScore": {
        "budget": 8,
        "authority": 7,
        "need": 9,
        "timeline": 6
      },
      "qualificationScore": 75,
      "notes": "Interested in 3-bedroom house, downtown area, budget around $500k",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Score Lead with BANT

Apply BANT scoring to a lead.

```http
POST /leads/{leadId}/bant-score
```

**Request Body:**

```json
{
  "budget": 8,
  "authority": 7,
  "need": 9,
  "timeline": 6
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "bantScore": {
      "budget": 8,
      "authority": 7,
      "need": 9,
      "timeline": 6
    },
    "qualificationScore": 75
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Update Lead Status

Update the status of a lead.

```http
PUT /leads/{leadId}/status
```

**Request Body:**

```json
{
  "status": "qualified",
  "reason": "High BANT score and strong interest in properties"
}
```

### Health Monitoring

System health checks and monitoring endpoints.

#### Overall Health Check

Check the overall health of the API system.

```http
GET /health
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "checks": {
      "database": {
        "status": "pass",
        "responseTime": 25,
        "message": "Database connection established"
      },
      "cache": {
        "status": "pass",
        "responseTime": 15,
        "message": "Cache connection established"
      },
      "memory": {
        "status": "pass",
        "usage": 65,
        "limit": 100,
        "message": "Memory usage normal"
      }
    },
    "metrics": {
      "requestsPerSecond": 12.5,
      "averageResponseTime": 150,
      "errorRate": 0.02,
      "memoryUsage": 65
    }
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "requestId": "req-12345",
    "version": "1.0.0"
  }
}
```

#### Readiness Probe

Check if the service is ready to accept requests (for load balancers).

```http
GET /health/ready
```

#### Liveness Probe

Check if the service is alive (for container orchestrators).

```http
GET /health/live
```

## Usage Examples

### Complete Workflow Example

Here's a complete example showing how to create an agent, start a conversation, and generate a lead:

#### 1. Create an Agent

```javascript
const createAgent = async () => {
  const response = await fetch(`${BASE_URL}/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Downtown Real Estate Expert',
      settings: {
        tone: 'Professional',
        systemPrompt: 'You are a knowledgeable real estate agent specializing in downtown properties.',
        fallbackPrompt: 'I apologize, but I need more information to help you with that.',
        maxTokens: 1000,
        temperature: 0.7
      },
      webhook: {
        url: 'https://your-app.com/webhooks/agent-events',
        events: ['conversation.started', 'lead.qualified'],
        secretToken: 'your-webhook-secret'
      }
    })
  });
  
  const data = await response.json();
  return data.data.agent.id;
};
```

#### 2. Start a Conversation

```javascript
const startConversation = async (agentId) => {
  const response = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agentId: agentId,
      userId: 'user-12345',
      source: 'web',
      metadata: {
        userAgent: navigator.userAgent,
        referrer: document.referrer
      }
    })
  });
  
  const data = await response.json();
  return data.data.conversation.id;
};
```

#### 3. Send Messages

```javascript
const sendMessage = async (conversationId, content, sender = 'user') => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: content,
      sender: sender,
      messageType: 'text',
      metadata: {
        timestamp: new Date().toISOString(),
        clientId: 'web-client-123'
      }
    })
  });
  
  return await response.json();
};

// Send user message
await sendMessage(conversationId, "Hi, I'm looking for a 3-bedroom house downtown with budget around $500k");

// Send agent response (this would typically be handled by your AI system)
await sendMessage(conversationId, "Great! I'd be happy to help you find a 3-bedroom house downtown. Let me ask you a few questions to better understand your needs...", 'agent');
```

#### 4. Create a Lead

```javascript
const createLead = async (conversationId) => {
  const response = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contactInfo: {
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        preferredContact: 'email'
      },
      source: {
        channel: 'web',
        referrer: 'https://your-website.com',
        campaign: 'downtown-properties-2024'
      },
      conversationId: conversationId,
      initialBANT: {
        budget: 8,    // High budget ($500k+)
        authority: 7, // Good decision-making authority
        need: 9,      // Strong need for housing
        timeline: 6   // Moderate timeline (3-6 months)
      },
      notes: 'Interested in 3-bedroom house, downtown area, budget around $500k'
    })
  });
  
  const data = await response.json();
  return data.data.lead.id;
};
```

#### 5. Score Lead with BANT

```javascript
const scoreLead = async (leadId) => {
  const response = await fetch(`${BASE_URL}/leads/${leadId}/bant-score`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      budget: 8,    // Confirmed budget
      authority: 8, // Primary decision maker
      need: 9,      // Urgent need
      timeline: 7   // Ready to move within 3 months
    })
  });
  
  const data = await response.json();
  console.log(`Lead qualification score: ${data.data.qualificationScore}%`);
  return data.data.qualificationScore;
};
```

### Real-time Message Streaming

For real-time message updates, you can use Server-Sent Events (SSE):

```javascript
const subscribeToMessages = (conversationId) => {
  const eventSource = new EventSource(
    `${BASE_URL}/conversations/${conversationId}/stream`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('New message:', message);
    // Update your UI with the new message
    displayMessage(message);
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // Implement reconnection logic
  };

  return eventSource;
};
```

### Webhook Integration

Handle webhook events for real-time notifications:

```javascript
// Express.js webhook handler example
app.post('/webhooks/agent-events', (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return res.status(401).send('Invalid signature');
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'conversation.started':
      console.log('New conversation started:', data.conversation.id);
      // Handle conversation start
      break;
      
    case 'lead.qualified':
      console.log('New qualified lead:', data.lead.id);
      // Notify sales team, add to CRM, etc.
      break;
      
    case 'conversation.ended':
      console.log('Conversation ended:', data.conversation.id);
      // Update analytics, send follow-up emails, etc.
      break;
  }
  
  res.status(200).send('OK');
});
```

## Development Integration

### SDK Integration

Example integration using a hypothetical JavaScript SDK:

```javascript
import { RealEstateAPI } from '@your-org/real-estate-api-sdk';

const api = new RealEstateAPI({
  baseURL: process.env.API_BASE_URL,
  token: process.env.API_TOKEN,
  timeout: 10000
});

// Create and configure an agent
const agent = await api.agents.create({
  name: 'Property Specialist',
  settings: {
    tone: 'Professional',
    systemPrompt: 'You are a helpful real estate agent...'
  }
});

// Start a conversation
const conversation = await api.conversations.start({
  agentId: agent.id,
  userId: 'user-123',
  source: 'web'
});

// Send messages
await api.conversations.sendMessage(conversation.id, {
  content: 'Hello, I need help finding a house',
  sender: 'user'
});

// Stream messages in real-time
api.conversations.streamMessages(conversation.id, (message) => {
  console.log('Received message:', message);
});
```

### Environment Configuration

```env
# API Configuration
API_BASE_URL=http://localhost:3001/api/v1
API_TOKEN=your-jwt-token
API_TIMEOUT=10000

# Webhook Configuration
WEBHOOK_URL=https://your-app.com/webhooks/agent-events
WEBHOOK_SECRET=your-webhook-secret-token

# Database Configuration (for local development)
DATABASE_URL=postgresql://localhost:5432/realestate_dev
REDIS_URL=redis://localhost:6379

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Integration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Build the application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/realestate
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=realestate
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Testing

### Unit Testing

```javascript
// Example unit test for agent creation
describe('Agent API', () => {
  test('should create agent with valid data', async () => {
    const agentData = {
      name: 'Test Agent',
      settings: {
        tone: 'Professional',
        systemPrompt: 'Test prompt'
      }
    };

    const response = await request(app)
      .post('/api/v1/agents')
      .set('Authorization', `Bearer ${validToken}`)
      .send(agentData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.agent.name).toBe(agentData.name);
  });

  test('should return validation error for invalid agent data', async () => {
    const invalidData = { name: 'ab' }; // Too short

    const response = await request(app)
      .post('/api/v1/agents')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData)
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Integration Testing

```javascript
// Example integration test
describe('Complete Workflow Integration', () => {
  let agentId, conversationId, leadId;

  test('should complete full agent-conversation-lead workflow', async () => {
    // Create agent
    const agentResponse = await createAgent();
    agentId = agentResponse.body.data.agent.id;

    // Start conversation
    const convResponse = await startConversation(agentId);
    conversationId = convResponse.body.data.conversation.id;

    // Send messages
    await sendMessage(conversationId, 'Hello', 'user');
    await sendMessage(conversationId, 'How can I help?', 'agent');

    // Create lead
    const leadResponse = await createLead(conversationId);
    leadId = leadResponse.body.data.lead.id;

    // Score lead
    const scoreResponse = await scoreLead(leadId);
    expect(scoreResponse.body.data.qualificationScore).toBeGreaterThan(70);

    // End conversation
    await endConversation(conversationId, 'lead_generated');
  });
});
```

### Load Testing

```javascript
// Example load test using Artillery
module.exports = {
  config: {
    target: 'http://localhost:3001',
    phases: [
      { duration: 60, arrivalRate: 10 },  // Warm up
      { duration: 120, arrivalRate: 50 }, // Load test
      { duration: 60, arrivalRate: 100 }  // Stress test
    ],
    defaults: {
      headers: {
        'Authorization': 'Bearer {{ $processEnvironment.API_TOKEN }}',
        'Content-Type': 'application/json'
      }
    }
  },
  scenarios: [
    {
      name: 'Create and manage agents',
      weight: 100,
      flow: [
        {
          post: {
            url: '/api/v1/agents',
            json: {
              name: 'Load Test Agent {{ $randomString() }}',
              settings: { tone: 'Professional' }
            },
            capture: {
              json: '$.data.agent.id',
              as: 'agentId'
            }
          }
        },
        {
          get: {
            url: '/api/v1/agents/{{ agentId }}'
          }
        },
        {
          delete: {
            url: '/api/v1/agents/{{ agentId }}'
          }
        }
      ]
    }
  ]
};
```

## Troubleshooting

### Common Issues

#### Authentication Errors

**Problem**: `401 Unauthorized` responses

**Solutions**:
- Verify JWT token is valid and not expired
- Check token format: `Bearer YOUR_JWT_TOKEN`
- Ensure user has required permissions
- Regenerate token if necessary

```bash
# Check token expiration
echo "YOUR_JWT_TOKEN" | base64 -d | jq .exp
# Compare with current timestamp
date +%s
```

#### Rate Limiting

**Problem**: `429 Rate Limit Exceeded` responses

**Solutions**:
- Implement exponential backoff retry logic
- Check rate limit headers in responses
- Consider request batching
- Upgrade to higher rate limit tier if needed

```javascript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

#### Validation Errors

**Problem**: `422 Validation Error` responses

**Solutions**:
- Check request body against API schema
- Verify required fields are present
- Validate data types and formats
- Check field length limits

#### Performance Issues

**Problem**: Slow API responses

**Solutions**:
- Monitor health endpoints for system status
- Check for database connection issues
- Implement request caching where appropriate
- Use pagination for large datasets

```javascript
// Health check monitoring
const checkHealth = async () => {
  const response = await fetch(`${BASE_URL}/health`);
  const health = await response.json();
  
  if (health.data.status !== 'healthy') {
    console.warn('API health issue:', health.data.checks);
  }
  
  return health;
};
```

#### Webhook Issues

**Problem**: Webhooks not being received

**Solutions**:
- Verify webhook URL is accessible from internet
- Check webhook signature validation
- Monitor webhook endpoint logs
- Test with tools like ngrok for local development

```bash
# Test webhook endpoint
curl -X POST https://your-app.com/webhooks/agent-events \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test" \
  -d '{"event":"test","data":{}}'
```

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
// Enable debug mode
const api = new RealEstateAPI({
  baseURL: process.env.API_BASE_URL,
  token: process.env.API_TOKEN,
  debug: true, // Enable debug logging
  timeout: 10000
});

// Debug mode will log:
// - Request URLs and payloads
// - Response status and data  
// - Rate limit headers
// - Error details
```

### Monitoring and Logging

Implement comprehensive monitoring:

```javascript
// Request logging middleware
const logRequests = (req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id']
  });
  next();
};

// Error logging
const logErrors = (error, req, res, next) => {
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString()
  });
  next(error);
};
```

---

For additional support or questions, please contact our API support team or refer to the [OpenAPI specification](./api-specification.yaml) for complete technical details.