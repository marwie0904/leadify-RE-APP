# Admin Login System - Complete Setup

## Overview

A separate admin login system has been created for the Leadify team members. This provides a dedicated portal for developers and administrators that is completely separate from the regular user authentication system.

## Key Features

### 1. Separate Admin Portal
- **URL**: `/admin/login`
- **Access**: Exclusively for users in the `dev_members` table
- **Security**: Only active dev_members with valid credentials can login
- **Auto-redirect**: Successfully authenticated admins are automatically redirected to `/admin`

### 2. Admin-Only Authentication
- **Backend Endpoint**: `POST /api/admin/login`
- **Verification**: `GET /api/admin/verify`
- **Requirements**:
  - User must exist in Supabase auth
  - User must be in `dev_members` table
  - Account must be active (`is_active = true`)

### 3. Separate Token Storage
- **Admin Token**: Stored as `admin_token` in localStorage
- **Admin User**: Stored as `admin_user` in localStorage
- **Isolation**: Completely separate from regular user auth tokens
- **Auto-verification**: Token validity is checked on each admin page load

## File Structure

### Frontend Files Created/Modified

1. **`/app/admin/login/page.tsx`** - Admin login page with dedicated UI
2. **`/contexts/admin-auth-context.tsx`** - Admin-specific authentication context
3. **`/app/admin/layout.tsx`** - Updated to use admin auth and protect routes
4. **`/lib/api/ai-analytics.ts`** - Updated to prioritize admin tokens

### Backend Endpoints Added

```javascript
// Admin login - Only for dev_members
POST /api/admin/login
Body: { email, password }
Response: { user, token, message }

// Verify admin token
GET /api/admin/verify
Headers: Authorization: Bearer <token>
Response: { valid, user }
```

## How It Works

### Login Flow
1. Admin navigates to `/admin/login`
2. Enters email and password
3. Backend verifies:
   - Credentials with Supabase auth
   - User exists in `dev_members` table
   - Account is active
4. If valid, returns token and user data
5. Frontend stores admin credentials
6. Auto-redirects to `/admin` dashboard

### Protection Flow
1. Admin layout checks for `admin_token` on each page load
2. Verifies token with backend `/api/admin/verify`
3. If invalid or missing, redirects to `/admin/login`
4. Login page is excluded from protection

## Security Features

1. **Dual Verification**: Both Supabase auth AND dev_members table check
2. **Active Account Check**: Inactive dev_members cannot login
3. **Token Verification**: Every admin page load verifies token validity
4. **Separate Storage**: Admin tokens stored separately from user tokens
5. **Automatic Logout**: Invalid tokens trigger automatic logout
6. **Security Notice**: Login page displays security warning about monitoring

## Admin Roles

The system supports three admin roles from `dev_members` table:
- `developer` - Standard developer access
- `admin` - Administrative access
- `super_admin` - Full system access

## Adding New Admin Users

To add a new admin user:

```sql
-- First, ensure the user exists in Supabase auth (they need to sign up)
-- Then add them to dev_members table:

INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active
) VALUES (
  'user-uuid-from-supabase',
  'admin@example.com',
  'Admin Name',
  'developer', -- or 'admin' or 'super_admin'
  ARRAY['read', 'write', 'admin'],
  true
);
```

## Testing

Test script provided: `test-admin-login.js`

```bash
node test-admin-login.js
```

This will:
1. Navigate to admin login page
2. Login with credentials
3. Verify redirect to admin dashboard
4. Test AI Analytics access
5. Test logout functionality

## URLs

- **Admin Login**: http://localhost:3000/admin/login
- **Admin Dashboard**: http://localhost:3000/admin
- **Regular User Login**: http://localhost:3000/auth

## Benefits

1. **Separation of Concerns**: Admin and user auth are completely separate
2. **Enhanced Security**: Additional verification layer for admin access
3. **Simplified Access**: Admins have a dedicated portal
4. **Better Control**: Easy to manage who has admin access
5. **Audit Trail**: All admin access can be monitored

## Current Admin Users

Currently active admin user:
- Email: marwryyy@gmail.com
- Role: developer
- Status: Active