-- Check current RLS policies on organization_invites table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'organization_invites'
ORDER BY policyname;

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'organization_invites';

-- Check current user and permissions
SELECT current_user, current_role;