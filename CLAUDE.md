# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Real Estate AI Agent Web Application with a sophisticated backend API and multiple frontend implementations. The application enables users to create AI-powered real estate agents that handle lead qualification (BANT), property estimates, and integrate with Facebook Messenger and website embeds.

## Architecture

**Monorepo Structure:**
- `BACKEND/` - Express.js API server with Domain-Driven Design (DDD) architecture
- `FRONTEND/` - Multiple Next.js frontend implementations
  - `financial-dashboard-2/` - Primary production frontend (Next.js 15)
  - `api-agent[1-6]/` - Various agent-specific frontend implementations
  - `frontend-agent[1-6]/` - Alternative frontend variations
  - `frontend-arch-agent[1-3]/` - Architecture-focused implementations

**Technology Stack:**
- **Backend**: Express.js, TypeScript, Node.js 18+, Supabase, OpenAI GPT-4
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT tokens
- **Integration**: Facebook Messenger webhooks, OpenAI embeddings

## Development Commands

**Backend Development (from BACKEND/ directory):**
```bash
# Main backend server
npm run server              # Start Express server on port 3001 (Node.js)
npm run server:ts           # Start with tsx (TypeScript runtime)
npm run dev:server          # Development server with ts-node

# Alternative backend (from BACKEND/backend/ directory)
cd backend
npm run server              # Start backend server (compiled)
npm run dev                 # Development with ts-node-dev hot reload

# Build and deployment
npm run build               # Compile TypeScript to JavaScript
npm run build:server        # Build server specifically
npm run start               # Start production server from dist/

# Testing
npm run test                # Run Jest test suite
npm run test:coverage       # Run tests with coverage report
npm run test:integration    # Integration tests only
npm run test:unit           # Unit tests only
npm run test:domain         # Domain layer tests
npm run test:security       # Security tests

# Database and setup
npm run test-setup          # Verify Supabase and OpenAI connections
npm run setup-leads         # Initialize leads table
npm run migrate             # Run database migrations
npm run migrate:status      # Check migration status
```

**Frontend Development (from FRONTEND/financial-dashboard-2/ directory):**
```bash
cd FRONTEND/financial-dashboard-2
npm run dev                 # Start Next.js dev server on port 3000
npm run build               # Build for production
npm run start               # Start production server
npm run lint                # Run ESLint
npm run analyze             # Bundle analyzer for optimization
```

**Root Level Development:**
```bash
# Quick start both servers
npm run dev                 # Start Next.js (if package.json exists at root)
npm run server              # Start Express server (proxy to backend)
```

## Key Architecture Components

### Backend Architecture (Domain-Driven Design)

**Core Domains:**
- **Agent Management**: AI agent creation, configuration, document processing
- **Conversation Engine**: Multi-source chat handling (web, Facebook, embed)
- **Lead Management**: BANT qualification, lead scoring, CRM integration
- **Estimation System**: Property valuation with multi-step conversation flows
- **Human-in-Loop**: Agent handoff system for complex queries
- **Organization Management**: Multi-tenant support with role-based permissions

**Key Services:**
- `server.js` (root) or `BACKEND/src/server.ts` - Main API entry point
- `middleware/requireAuth.js` - JWT authentication middleware
- Domain services in `src/modules/` with DDD patterns
- Database schemas in various `*-table.sql` files

### Frontend Architecture

**Primary Frontend** (`financial-dashboard-2/`):
- **Framework**: Next.js 15 with App Router
- **State Management**: React Context (AuthProvider, SettingsProvider) + Zustand
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Query Management**: TanStack Query (React Query) for server state

**Key Features:**
- Dashboard with analytics and metrics
- Agent management with chat preview
- Lead management and tracking
- Conversation interface with real-time messaging
- Organization management and member invitations
- Human-in-loop handoff system

## Environment Setup

**Backend Environment Variables:**
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# AI Services
OPENAI_API_KEY=your_openai_key

# Authentication
JWT_SECRET=your_jwt_secret

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Frontend Environment Variables:**
```bash
# Supabase (Client-side)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Database Schema

**Core Tables:**
- `agents` - AI agent configurations and settings
- `conversations` - Chat sessions with status tracking
- `messages` - Individual chat messages with metadata
- `leads` - Qualified leads with BANT scoring (Budget, Authority, Need, Timeline)
- `organizations` - Multi-tenant organization management
- `organization_members` - User roles and permissions
- `bant_memory` - BANT conversation state persistence
- `estimation_memory` - Property estimation process state
- `agent_embeddings` - Document embeddings for context-aware responses
- `conversation_handoffs` - Human-in-loop handoff requests

## API Endpoints

**Core Chat System:**
- `POST /api/chat` - Main conversation endpoint with streaming responses
- `GET /api/messages/:conversationId` - Message polling endpoint
- `GET /api/stream/:conversationId` - Server-Sent Events streaming

**Agent Management:**
- `POST /api/agents` - Create new AI agent
- `GET /api/agents` - List user's agents
- `PUT /api/agents/:id` - Update agent configuration
- `POST /api/documents` - Upload agent training documents

**Lead Management:**
- `POST /api/leads` - Create or update leads
- `GET /api/leads` - Fetch leads with filtering and pagination
- `PUT /api/leads/:id` - Update lead information

**Organization Management:**
- `GET /api/organizations` - Get user's organizations
- `POST /api/organizations` - Create new organization
- `POST /api/organizations/:id/invite` - Invite team members

**Integration Endpoints:**
- `POST /webhook/facebook` - Facebook Messenger webhook
- `GET /api/health` - Backend health check endpoint

## Key Features and Systems

### AI Conversation System
- OpenAI GPT-4 integration with custom prompts
- Document embeddings for context-aware responses
- Multi-source conversation handling (web, Facebook, embed)
- Message streaming via Server-Sent Events (SSE)
- Automatic conversation state management

### BANT Lead Qualification
- Automated lead scoring based on conversation content
- Budget, Authority, Need, Timeline assessment
- Persistent conversation state across sessions
- Lead progression tracking and CRM integration

### Property Estimation System
- Multi-step estimation conversation flow
- Dynamic property type and payment plan selection
- Memory persistence across estimation steps
- Integration with property databases and market data

### Human-in-Loop System
- Agent handoff requests for complex queries
- Real-time notification system for agents
- Conversation mode indicators and status tracking
- Seamless transition between AI and human agents

## Testing Strategy

**Backend Testing:**
```bash
npm run test                # Full test suite
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:domain         # Domain layer tests
npm run test:coverage       # Coverage reporting
```

**Test Categories:**
- Unit tests for domain logic and utilities
- Integration tests for API endpoints
- Security tests for authentication and authorization
- Performance tests for high-load scenarios
- Database tests for data integrity

## Deployment Architecture

**Backend Deployment:**
- Containerized with Docker support
- Environment-specific configurations
- Database migrations handled automatically
- Health check endpoints for monitoring

**Frontend Deployment:**
- Static site generation (SSG) where possible
- Server-side rendering (SSR) for dynamic content
- CDN optimization for static assets
- Progressive Web App (PWA) capabilities

## Development Guidelines

### Code Organization
- Follow Domain-Driven Design patterns in backend
- Use TypeScript strict mode throughout
- Implement proper error handling and logging
- Follow REST API conventions with consistent responses

### Database Operations
- Use Supabase client for all database operations
- Implement Row Level Security (RLS) policies
- Handle database migrations through dedicated scripts
- Monitor query performance and optimize as needed

### Authentication & Security
- JWT-based authentication with Supabase
- Role-based access control (RBAC) for organizations
- Input validation using Zod schemas
- Rate limiting and request sanitization

### Performance Optimization
- Implement caching strategies for frequent queries
- Use database connection pooling
- Optimize bundle sizes with Next.js built-in tools
- Monitor Core Web Vitals and user experience metrics

## Common Development Tasks

1. **Adding new AI agent types**: Modify agent configuration schema and update frontend forms
2. **Extending BANT qualification**: Update scoring algorithms and conversation flows
3. **Adding new integrations**: Create webhook handlers and API endpoints
4. **Frontend feature development**: Use existing component patterns and state management
5. **Database schema changes**: Create migration scripts and update TypeScript types

## Troubleshooting

**Backend Issues:**
- Check Supabase connection with `npm run test-setup`
- Verify OpenAI API key and rate limits
- Monitor server logs for authentication errors
- Test individual endpoints with provided test scripts

**Frontend Issues:**
- Verify environment variables are properly set
- Check API connectivity and CORS configuration
- Monitor browser console for JavaScript errors
- Test authentication flow and token expiration