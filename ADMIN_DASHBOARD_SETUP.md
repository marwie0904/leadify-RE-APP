# Admin Dashboard Setup Guide

## Overview
The admin dashboard provides comprehensive monitoring and management capabilities for the Real Estate AI Agent application. It includes issue tracking with AI classification, real-time support chat, token usage analytics, and team management.

## Quick Setup

### 1. Database Setup
Run the migration scripts in Supabase SQL Editor in this order:

```sql
-- 1. First, run the main schema
-- Copy and run: BACKEND/admin-dashboard-schema.sql

-- 2. Get your user IDs
-- Copy and run: BACKEND/scripts/get-user-ids.sql

-- 3. Add admin users (edit with your user IDs first)
-- Copy and run: BACKEND/scripts/seed-admin-data.sql
```

### 2. Environment Configuration

#### Backend (.env)
```bash
# Already configured
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_key  # Optional for email invites
```

#### Frontend (.env.local)
```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001

# PostHog Analytics (already set)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_PROJECT_ID=your_project_id
```

### 3. Validate Setup
```bash
cd BACKEND

# Validate all environment variables and connections
npm run admin:validate

# Run integration tests
npm run admin:test
```

### 4. Start Services
```bash
# Terminal 1: Backend
cd BACKEND
npm run server

# Terminal 2: Frontend
cd FRONTEND/financial-dashboard-2
npm run dev
```

### 5. Access Admin Dashboard
1. Login with an account that's in the `dev_members` table
2. Navigate to `/admin`
3. If you get a 403 error, your user is not in `dev_members`

## Features

### 🐛 Issue Reporting & AI Classification
- **Location**: Help Center → Report Issue
- **Features**:
  - AI-powered priority classification (urgent/high/medium/low)
  - Category detection (bug/feature/performance/security)
  - PostHog session replay integration
  - Browser metadata capture
  - Suggested actions from AI

### 💬 Real-Time Support Chat
- **Location**: Help Center → Support
- **Features**:
  - Server-Sent Events (SSE) for real-time messaging
  - Floating chat widget
  - Admin-side ticket management
  - Status tracking (open/investigating/resolved)

### 📊 Dashboard Analytics
- **Location**: `/admin`
- **Metrics**:
  - Urgent bug count with trends
  - Open support requests
  - AI token usage (daily/weekly/monthly)
  - Per-organization token consumption
  - System health monitoring

### 👥 Team Management
- **Location**: `/admin/team`
- **Features**:
  - Invite team members via email (Resend)
  - Role assignment (developer/admin/super_admin)
  - Permission management
  - Activity tracking

### 🏢 Organization Management
- **Location**: `/admin/organizations`
- **Features**:
  - Organization statistics
  - User activity monitoring
  - PostHog analytics integration
  - Token usage by organization

## Testing

### Unit Tests
```bash
cd BACKEND
npm test tests/admin-dashboard.test.js
```

### Integration Tests
```bash
cd BACKEND
npm run admin:test
```

### Manual Testing Checklist
- [ ] Admin can login and access /admin
- [ ] Dashboard stats load correctly
- [ ] Issue reporting creates record with AI classification
- [ ] PostHog session ID is captured
- [ ] Support chat connects via SSE
- [ ] Messages stream in real-time
- [ ] Token usage is tracked
- [ ] Logout works from settings

## Troubleshooting

### Common Issues

#### 1. "Admin access required" error
**Solution**: Add your user to `dev_members` table
```sql
INSERT INTO public.dev_members (user_id, email, role, is_active)
VALUES ('your-user-id', 'your-email', 'admin', true);
```

#### 2. Dashboard stats not loading
**Solution**: Check if tables have data
```bash
npm run admin:validate
# If empty, run seed script
```

#### 3. SSE not connecting for support chat
**Solution**: Check CORS settings and ensure backend is running on correct port

#### 4. PostHog session replay not working
**Solution**: Verify `NEXT_PUBLIC_POSTHOG_PROJECT_ID` is set correctly

#### 5. Tests failing
**Solution**: Tests use mocked data, ensure mocks are properly configured

## Security Considerations

1. **Access Control**: Only users in `dev_members` table can access admin features
2. **Role-Based Permissions**: Three levels - developer, admin, super_admin
3. **Input Sanitization**: All user inputs are sanitized before database storage
4. **Rate Limiting**: API endpoints have rate limiting to prevent abuse
5. **Audit Logging**: All admin actions are logged in activity tables

## API Endpoints

### Admin-Only Endpoints
- `POST /api/admin/verify` - Verify admin access
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/issues` - List all issues
- `PUT /api/admin/issues/:id` - Update issue status
- `GET /api/admin/support/tickets` - List support tickets
- `GET /api/admin/ai-analytics` - Token usage analytics
- `POST /api/admin/team/invite` - Send team invitations
- `GET /api/admin/users` - List all users
- `GET /api/admin/organizations` - List organizations

### User Endpoints (Authenticated)
- `POST /api/issues/report` - Report an issue
- `POST /api/support/start` - Start support chat
- `POST /api/support/message` - Send support message
- `GET /api/support/stream/:ticketId` - SSE stream for chat

## Next Steps

1. **Production Deployment**:
   - Set up proper SSL certificates
   - Configure production environment variables
   - Set up monitoring and alerting
   - Configure backup strategies

2. **Enhancements**:
   - Add email notifications for urgent issues
   - Implement issue assignment workflow
   - Add export functionality for analytics
   - Create mobile-responsive admin views

3. **Monitoring**:
   - Set up error tracking (Sentry)
   - Configure performance monitoring
   - Add custom PostHog events
   - Create admin activity dashboards