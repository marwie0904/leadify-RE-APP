-- Helper script to get user IDs for seeding dev_members table
-- Run this in Supabase SQL Editor to find user IDs

-- Get all auth users with their IDs and emails
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Get users who already have organizations (likely active users)
SELECT DISTINCT
  u.id as user_id,
  u.email,
  o.name as organization_name,
  om.role as org_role
FROM auth.users u
JOIN public.organization_members om ON u.id = om.user_id
JOIN public.organizations o ON om.organization_id = o.id
ORDER BY u.created_at DESC
LIMIT 10;

-- After running the above queries, use the user IDs to add them to dev_members:
-- Example:
/*
INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active
) VALUES (
  'paste-user-id-here',
  'paste-email-here',
  'Admin Name',
  'admin', -- or 'super_admin' or 'developer'
  '["read", "write", "admin"]'::jsonb,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active;
*/