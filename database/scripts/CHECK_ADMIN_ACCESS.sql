-- =====================================================
-- CHECK WHO HAS ADMIN DASHBOARD ACCESS
-- Run this in Supabase SQL Editor to see all admin users
-- =====================================================

-- 1. Check dev_members table (AI Analytics & Admin Dashboard access)
SELECT 
    'dev_members' as source,
    dm.user_id,
    dm.email,
    dm.full_name,
    dm.role,
    dm.permissions,
    dm.is_active,
    dm.last_login,
    au.email as auth_email,
    au.created_at as user_created
FROM dev_members dm
LEFT JOIN auth.users au ON dm.user_id = au.id::text
WHERE dm.is_active = true
  AND dm.role IN ('developer', 'admin', 'super_admin')
ORDER BY 
    CASE 
        WHEN dm.role = 'super_admin' THEN 1
        WHEN dm.role = 'admin' THEN 2
        WHEN dm.role = 'developer' THEN 3
    END,
    dm.email;

-- 2. Check organization_members table (Organization-level admin access)
SELECT 
    'org_members' as source,
    om.user_id,
    au.email,
    om.role,
    om.organization_id,
    o.name as organization_name,
    om.created_at,
    om.updated_at
FROM organization_members om
LEFT JOIN organizations o ON om.organization_id = o.id
LEFT JOIN auth.users au ON om.user_id = au.id::text
WHERE om.role = 'admin'
ORDER BY o.name, au.email;

-- 3. Summary of all admin access
SELECT 
    'SUMMARY' as report_type,
    COUNT(DISTINCT CASE WHEN dm.role IN ('developer', 'admin', 'super_admin') AND dm.is_active THEN dm.user_id END) as dev_member_admins,
    COUNT(DISTINCT CASE WHEN om.role = 'admin' THEN om.user_id END) as org_admins,
    COUNT(DISTINCT au.id) as total_users
FROM auth.users au
LEFT JOIN dev_members dm ON dm.user_id = au.id::text
LEFT JOIN organization_members om ON om.user_id = au.id::text;

-- 4. Check if specific user has admin access
-- Replace 'marwryyy@gmail.com' with the email you want to check
WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'marwryyy@gmail.com'
)
SELECT 
    tu.email,
    tu.id as user_id,
    dm.role as dev_member_role,
    dm.is_active as dev_member_active,
    om.role as org_member_role,
    CASE 
        WHEN dm.role IN ('developer', 'admin', 'super_admin') AND dm.is_active THEN 'YES - via dev_members'
        WHEN om.role = 'admin' THEN 'YES - via organization_members'
        ELSE 'NO - No admin access'
    END as has_admin_access
FROM target_user tu
LEFT JOIN dev_members dm ON dm.user_id = tu.id::text
LEFT JOIN organization_members om ON om.user_id = tu.id::text;

-- 5. Roles explanation
SELECT 
    'ROLES EXPLANATION' as info,
    'dev_members.developer' as role,
    'Full admin access including AI Analytics, feature requests, issues' as access_level
UNION ALL
SELECT 
    'ROLES EXPLANATION',
    'dev_members.admin',
    'Admin access to dashboard features'
UNION ALL
SELECT 
    'ROLES EXPLANATION',
    'dev_members.super_admin',
    'Super admin with all permissions including user management'
UNION ALL
SELECT 
    'ROLES EXPLANATION',
    'organization_members.admin',
    'Organization-level admin access';