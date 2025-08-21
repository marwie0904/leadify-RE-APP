# AI Analytics Access Guide

## ✅ System Status
- **Backend Server**: Running on port 3001 ✅
- **Frontend Server**: Running on port 3005 ✅
- **Database Migration**: Applied ✅
- **Token Tracking**: Active ✅
- **API Endpoints**: Configured ✅

## 🔐 Authentication Requirements

To access the AI Analytics dashboard, you need:

### 1. **Be Logged In**
- Navigate to http://localhost:3005/auth/signin
- Login with your credentials

### 2. **Have Admin Privileges**
Your user must exist in the `dev_members` table with:
- `is_active`: true
- `role`: 'admin', 'super_admin', or 'developer'

### 3. **Add Your User to dev_members Table**

If you're getting a 404 error, you need to add your user to the dev_members table:

```sql
-- Run this in Supabase SQL Editor
-- Replace the values with your actual user information

INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active,
  created_at,
  last_login
) VALUES (
  '4c984a9a-150e-4673-8192-17f80a7ef4d7', -- Your user ID from auth.users
  'marwryyy@gmail.com', -- Your email
  'Your Name', -- Your full name
  'developer', -- Role: 'developer', 'admin', or 'super_admin'
  ARRAY['read', 'write', 'admin'], -- Permissions
  true, -- Active status
  NOW(), -- Created at
  NOW() -- Last login
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role = 'developer',
  permissions = ARRAY['read', 'write', 'admin'],
  last_login = NOW();
```

## 📊 Accessing AI Analytics

Once you have admin privileges:

1. **Login** at http://localhost:3005/auth/signin
2. **Navigate** to http://localhost:3005/admin/ai-analytics
3. **View** real-time analytics data

## 🔍 Troubleshooting

### "Request failed with status code 404"
- **Cause**: User doesn't have admin privileges
- **Fix**: Add user to dev_members table (see SQL above)

### "Request failed with status code 401"
- **Cause**: Not logged in or token expired
- **Fix**: Login again at /auth/signin

### "Request failed with status code 403"
- **Cause**: User exists but doesn't have proper role
- **Fix**: Update role in dev_members table to 'developer' or 'admin'

## ✅ Quick Verification

To verify your setup:

1. **Check if you're in dev_members**:
```sql
SELECT * FROM dev_members WHERE email = 'your-email@example.com';
```

2. **Check API directly** (replace YOUR_TOKEN):
```bash
curl http://localhost:3001/api/admin/ai-analytics/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Available Analytics

Once authenticated, you'll have access to:
- **Token Usage**: Total tokens and costs
- **Model Distribution**: GPT-4 vs GPT-3.5 usage
- **Operation Breakdown**: Usage by operation type
- **Organization Metrics**: Per-org analytics
- **Cost Analysis**: Historical costs and projections
- **Peak Usage Times**: Usage heatmaps
- **Performance Metrics**: Response times and success rates

## 🎯 Next Steps

1. Add your user to dev_members table
2. Login to the application
3. Navigate to AI Analytics dashboard
4. View your AI usage metrics!

---

**Note**: The AI Analytics system tracks all OpenAI API calls automatically. Data will accumulate as you use the system.