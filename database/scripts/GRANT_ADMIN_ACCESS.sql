-- =====================================================
-- GRANT ADMIN ACCESS FOR AI ANALYTICS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Grant admin access to marwryyy@gmail.com
DO $$
DECLARE
    target_email TEXT := 'marwryyy@gmail.com';
    target_user_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found in auth.users', target_email;
    ELSE
        -- Add to dev_members table for AI Analytics access
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
            target_user_id::TEXT,
            target_email,
            'Admin User',
            'developer',  -- Grants full admin access including AI Analytics
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
        
        RAISE NOTICE 'Successfully granted developer/admin access to %', target_email;
    END IF;
END $$;

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

-- Also update organization_members if exists (backup method)
DO $$
DECLARE
    target_email TEXT := 'marwryyy@gmail.com';
    target_user_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NOT NULL THEN
        -- Update all organization memberships to admin role
        UPDATE organization_members 
        SET role = 'admin'
        WHERE user_id = target_user_id::TEXT;
        
        RAISE NOTICE 'Updated organization_members role to admin for %', target_email;
    END IF;
END $$;

-- Check organization memberships
SELECT 
    om.user_id,
    om.role,
    om.organization_id,
    o.name as org_name
FROM organization_members om
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id IN (
    SELECT id::TEXT FROM auth.users WHERE email = 'marwryyy@gmail.com'
);