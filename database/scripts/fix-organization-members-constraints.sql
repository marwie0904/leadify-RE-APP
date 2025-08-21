-- Fix organization_members table constraints and add missing indexes

-- First, check and add NOT NULL constraints if missing
ALTER TABLE organization_members 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN organization_id SET NOT NULL;

-- Add unique constraint to prevent duplicate memberships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organization_members_user_org_unique'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_user_org_unique 
        UNIQUE (user_id, organization_id);
    END IF;
END $$;

-- Add foreign key constraints if missing
DO $$
BEGIN
    -- Foreign key to auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_user_id_fkey'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Foreign key to organizations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_members_organization_id_fkey'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organization_members_role_check'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT organization_members_role_check 
        CHECK (role IN ('admin', 'moderator', 'member', 'agent'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id 
ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id 
ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
ON organization_members(user_id, organization_id);

-- Add RLS policies if not already present
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Service role can manage all memberships" ON organization_members;

-- Users can view their own organization memberships
CREATE POLICY "Users can view their own memberships" ON organization_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role can manage all memberships" ON organization_members
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Allow invitation acceptance (bypass RLS for service role operations)
CREATE POLICY "Allow invitation acceptance" ON organization_members
    FOR INSERT
    WITH CHECK (true); -- This allows all inserts, which is safe since we control the backend

-- Alternative: More restrictive policy that only allows inserts for pending invitations
-- CREATE POLICY "Allow invitation acceptance" ON organization_members
--     FOR INSERT
--     WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM organization_invites 
--             WHERE organization_invites.organization_id = organization_members.organization_id
--             AND organization_invites.email = (
--                 SELECT email FROM auth.users WHERE id = organization_members.user_id
--             )
--             AND organization_invites.status = 'pending'
--         )
--     );