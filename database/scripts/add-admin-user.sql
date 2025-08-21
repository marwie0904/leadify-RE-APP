-- Add marwryyy@gmail.com to dev_members table for AI Analytics access
-- Run this in Supabase SQL Editor

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
  '4c984a9a-150e-4673-8192-17f80a7ef4d7',  -- Your user ID from authentication
  'marwryyy@gmail.com',
  'Admin User',
  'developer',  -- This gives you full admin access
  ARRAY['read', 'write', 'admin'],
  true,
  NOW(),
  NOW()
) ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role = 'developer',
  permissions = ARRAY['read', 'write', 'admin'],
  last_login = NOW();

-- Verify the user was added
SELECT * FROM dev_members WHERE email = 'marwryyy@gmail.com';