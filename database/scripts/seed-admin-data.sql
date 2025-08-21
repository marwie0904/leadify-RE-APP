-- Seed data for admin dashboard
-- Run this in Supabase SQL Editor after running admin-dashboard-schema.sql

-- =====================================================
-- 1. Add sample dev members (admins)
-- =====================================================

-- First, ensure you have auth users to reference
-- You'll need to replace these user_ids with actual auth.users IDs from your Supabase instance

-- Add super admin (replace 'YOUR_SUPER_ADMIN_USER_ID' with an actual user ID)
INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active
) VALUES (
  'YOUR_SUPER_ADMIN_USER_ID', -- Replace with actual auth.users ID
  'admin@yourcompany.com', -- Replace with actual email
  'Super Admin',
  'super_admin',
  '["read", "write", "delete", "admin", "invite", "manage_team"]'::jsonb,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'super_admin',
  permissions = '["read", "write", "delete", "admin", "invite", "manage_team"]'::jsonb,
  is_active = true;

-- Add regular admin (replace 'YOUR_ADMIN_USER_ID' with an actual user ID)
INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active
) VALUES (
  'YOUR_ADMIN_USER_ID', -- Replace with actual auth.users ID
  'developer@yourcompany.com', -- Replace with actual email
  'Developer Admin',
  'admin',
  '["read", "write", "admin"]'::jsonb,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'admin',
  permissions = '["read", "write", "admin"]'::jsonb,
  is_active = true;

-- Add developer (replace 'YOUR_DEV_USER_ID' with an actual user ID)
INSERT INTO public.dev_members (
  user_id,
  email,
  full_name,
  role,
  permissions,
  is_active
) VALUES (
  'YOUR_DEV_USER_ID', -- Replace with actual auth.users ID
  'dev@yourcompany.com', -- Replace with actual email
  'Developer',
  'developer',
  '["read", "write"]'::jsonb,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  role = 'developer',
  permissions = '["read", "write"]'::jsonb,
  is_active = true;

-- =====================================================
-- 2. Add sample issues for testing
-- =====================================================

-- Add urgent bug report
INSERT INTO public.issues (
  organization_id,
  user_email,
  user_name,
  subject,
  description,
  category,
  priority,
  ai_priority_score,
  ai_classification,
  ai_suggested_actions,
  status,
  posthog_session_id,
  browser_info
) VALUES (
  (SELECT id FROM public.organizations LIMIT 1), -- Use first organization
  'user@example.com',
  'Test User',
  'Login authentication fails on mobile devices',
  'Users are unable to login on mobile browsers. The login button becomes unresponsive after entering credentials. This is affecting approximately 30% of our mobile users.',
  'bug',
  'urgent',
  0.95,
  '{"category": "bug", "priority": "urgent", "priorityScore": 0.95, "reasoning": "Authentication failure affecting significant user base"}'::jsonb,
  ARRAY['Investigate mobile browser compatibility', 'Check authentication token handling', 'Deploy hotfix immediately'],
  'open',
  'sess_12345',
  '{"userAgent": "Mozilla/5.0", "platform": "iPhone", "language": "en-US"}'::jsonb
);

-- Add high priority security issue
INSERT INTO public.issues (
  organization_id,
  user_email,
  user_name,
  subject,
  description,
  category,
  priority,
  ai_priority_score,
  ai_classification,
  ai_suggested_actions,
  status
) VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'security@example.com',
  'Security Analyst',
  'Potential SQL injection vulnerability in search endpoint',
  'The search API endpoint appears to be vulnerable to SQL injection attacks. User input is not being properly sanitized.',
  'security',
  'urgent',
  0.98,
  '{"category": "security", "priority": "urgent", "priorityScore": 0.98, "reasoning": "Critical security vulnerability"}'::jsonb,
  ARRAY['Immediately patch the vulnerability', 'Audit all SQL queries', 'Implement parameterized queries'],
  'investigating'
);

-- Add medium priority feature request
INSERT INTO public.issues (
  organization_id,
  user_email,
  user_name,
  subject,
  description,
  category,
  priority,
  ai_priority_score,
  ai_classification,
  ai_suggested_actions,
  status
) VALUES (
  (SELECT id FROM public.organizations LIMIT 1),
  'product@example.com',
  'Product Manager',
  'Add dark mode support',
  'Many users have requested dark mode support for better accessibility and reduced eye strain during night usage.',
  'feature_request',
  'medium',
  0.45,
  '{"category": "feature_request", "priority": "medium", "priorityScore": 0.45, "reasoning": "Popular feature request"}'::jsonb,
  ARRAY['Research dark mode implementation', 'Create design mockups', 'Add to next sprint planning'],
  'open'
);

-- =====================================================
-- 3. Add sample support tickets
-- =====================================================

INSERT INTO public.support_tickets (
  user_id,
  user_email,
  subject,
  initial_message,
  category,
  priority,
  status
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'support@example.com',
  'Cannot access dashboard after upgrade',
  'After upgrading to the premium plan, I cannot access my dashboard. Getting a 403 error.',
  'technical',
  'high',
  'open'
);

-- =====================================================
-- 4. Add sample AI token usage data
-- =====================================================

-- Add token usage for the last 7 days
INSERT INTO public.ai_token_usage (
  organization_id,
  user_id,
  model,
  operation_type,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  cost,
  created_at
)
SELECT 
  (SELECT id FROM public.organizations ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM auth.users ORDER BY RANDOM() LIMIT 1),
  CASE WHEN RANDOM() > 0.5 THEN 'gpt-4' ELSE 'gpt-3.5-turbo' END,
  (ARRAY['chat', 'embedding', 'classification', 'analysis'])[floor(random() * 4 + 1)],
  floor(random() * 1000 + 100)::integer,
  floor(random() * 500 + 50)::integer,
  floor(random() * 1500 + 150)::integer,
  (random() * 0.5 + 0.01)::decimal(10,4),
  NOW() - (random() * INTERVAL '7 days')
FROM generate_series(1, 50);

-- =====================================================
-- 5. Query to verify seed data
-- =====================================================

-- Check dev members
SELECT 'Dev Members:' as info;
SELECT email, role, is_active FROM public.dev_members;

-- Check issues
SELECT 'Issues:' as info;
SELECT subject, priority, status FROM public.issues LIMIT 5;

-- Check support tickets
SELECT 'Support Tickets:' as info;
SELECT subject, status, priority FROM public.support_tickets LIMIT 5;

-- Check token usage summary
SELECT 'AI Token Usage (Last 7 Days):' as info;
SELECT 
  COUNT(*) as total_operations,
  SUM(total_tokens) as total_tokens,
  ROUND(SUM(cost)::numeric, 2) as total_cost
FROM public.ai_token_usage
WHERE created_at > NOW() - INTERVAL '7 days';