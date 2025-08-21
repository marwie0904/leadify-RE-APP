# AI Analytics Quick Start Guide

## 🚀 Quick Access Links

### 1. Test Your Access
**Go here first:** http://localhost:3000/admin/test-access

This page will show you:
- Your current user ID
- Whether you're logged in
- The exact SQL to run if you need access

### 2. View AI Analytics Dashboard
**After setup:** http://localhost:3000/admin/ai-analytics

## 🔧 If You Get Access Denied

1. **Visit the test page first**: http://localhost:3000/admin/test-access
2. **Copy your user ID** from the test page
3. **Run this SQL in Supabase** (replace YOUR_USER_ID):

```sql
INSERT INTO public.dev_members (
  user_id, 
  email, 
  full_name, 
  role, 
  permissions, 
  is_active
) VALUES (
  'YOUR_USER_ID',  -- Copy from test page
  'your-email@example.com',
  'Your Name',
  'developer',
  ARRAY['read', 'write', 'admin'],
  true
) ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role = 'developer',
  permissions = ARRAY['read', 'write', 'admin'],
  last_login = NOW();
```

4. **Refresh the page** and you should have access!

## ✅ System Status

- **Frontend**: Running on http://localhost:3000
- **Backend**: Running on http://localhost:3001
- **Database**: Migration applied ✅
- **Token Tracking**: Active ✅
- **Current Data**: 20 records, $4.86 tracked

## 📊 What You'll See

Once you have access, the AI Analytics dashboard shows:
- Total tokens used across all organizations
- Total costs with breakdown by model
- Token usage graphs per conversation
- Model distribution (GPT-4 vs GPT-3.5)
- Operation type breakdown
- Peak usage times
- Organization-level metrics
- Month-over-month trends

## 🆘 Troubleshooting

### "Page Not Found" Error
- Make sure you're using port 3000, not 3005
- URL should be: http://localhost:3000/admin/ai-analytics

### "Access Denied" Error
- You need to be added to the dev_members table
- Visit http://localhost:3000/admin/test-access to get your user ID
- Run the SQL above with your user ID

### "No Data" in Dashboard
- Token tracking just started
- Data will accumulate as you use the AI chat features
- Check console for any API errors

## 🎯 Next Steps

1. **Test your access**: http://localhost:3000/admin/test-access
2. **Add yourself to dev_members** if needed
3. **View analytics**: http://localhost:3000/admin/ai-analytics
4. **Use the system** to generate more analytics data

---
Ready to go! Start with the test page: http://localhost:3000/admin/test-access