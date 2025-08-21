-- =====================================================
-- GRANT ADMIN ACCESS FOR AI ANALYTICS (FIXED VERSION)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Grant admin access to marwryyy@gmail.com
INSERT INTO public.dev_members (
    user_id, 
    email, 
    full_name, 
    role, 
    permissions, 
    is_active,
    created_at,
    last_login
)
SELECT 
    id,  -- Keep as UUID, not TEXT
    email,
    'Admin User',
    'developer',  -- Grants full admin access including AI Analytics
    ARRAY['read', 'write', 'admin'],
    true,
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'marwryyy@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    is_active = true,
    role = 'developer',
    permissions = ARRAY['read', 'write', 'admin'],
    last_login = NOW();

-- Verify the access was granted
SELECT 
    user_id,
    email,
    full_name,
    role,
    permissions,
    is_active,
    created_at,
    last_login
FROM dev_members 
WHERE email = 'marwryyy@gmail.com';

-- Also update organization_members if the user exists there
UPDATE organization_members 
SET role = 'admin'
WHERE user_id IN (
    SELECT id::TEXT  -- organization_members uses TEXT for user_id
    FROM auth.users 
    WHERE email = 'marwryyy@gmail.com'
);

-- Check both tables for confirmation
SELECT 
    'dev_members' as table_name,
    dm.user_id::TEXT as user_id,
    dm.email,
    dm.role,
    dm.is_active
FROM dev_members dm
WHERE dm.email = 'marwryyy@gmail.com'

UNION ALL

SELECT 
    'organization_members' as table_name,
    om.user_id,
    au.email,
    om.role,
    true as is_active
FROM organization_members om
JOIN auth.users au ON om.user_id = au.id::TEXT
WHERE au.email = 'marwryyy@gmail.com';