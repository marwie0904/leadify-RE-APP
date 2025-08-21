-- Grant admin access for AI Analytics by adding user to dev_members table
-- Run this in Supabase SQL Editor

-- First, get the user ID for the email address you want to grant access to
-- Replace 'your-email@example.com' with the actual email address
DO $$
DECLARE
    target_email TEXT := 'marwryyy@gmail.com'; -- Change this to your email
    target_user_id UUID;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found in auth.users', target_email;
    ELSE
        -- Insert or update the user in dev_members table
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
            target_user_id::TEXT,  -- Convert UUID to TEXT
            target_email,
            'Admin User',
            'developer',  -- This gives full admin access including AI Analytics
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

-- Verify the user was added
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

-- Alternative: Grant admin role in organization_members table
-- This is useful if the user is part of an organization
DO $$
DECLARE
    target_email TEXT := 'marwryyy@gmail.com'; -- Change this to your email
    target_user_id UUID;
BEGIN
    -- Get the user ID from auth.users
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