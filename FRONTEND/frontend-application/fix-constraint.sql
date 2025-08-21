-- Fix the foreign key constraint to point to auth.users instead of public.users

-- First, drop the existing wrong constraint
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

-- Add the correct constraint pointing to auth.users
ALTER TABLE organization_members 
ADD CONSTRAINT organization_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'organization_members'
  AND kcu.column_name = 'user_id';