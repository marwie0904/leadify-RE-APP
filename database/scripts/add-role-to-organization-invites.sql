-- Add role and display_name columns to organization_invites table

-- Add the role column with default value 'member'
ALTER TABLE organization_invites 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'member';

-- Add firstName and lastName columns for new user invitations
ALTER TABLE organization_invites 
ADD COLUMN IF NOT EXISTS first_name text;

ALTER TABLE organization_invites 
ADD COLUMN IF NOT EXISTS last_name text;

-- Add check constraint to ensure valid roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'organization_invites_role_check'
    ) THEN
        ALTER TABLE organization_invites 
        ADD CONSTRAINT organization_invites_role_check 
        CHECK (role IN ('admin', 'moderator', 'member', 'agent'));
    END IF;
END $$;

-- Update any existing invites without a role to have 'member' role
UPDATE organization_invites 
SET role = 'member' 
WHERE role IS NULL;

-- Make the role column NOT NULL after setting defaults
ALTER TABLE organization_invites 
ALTER COLUMN role SET NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'organization_invites' 
AND column_name IN ('role', 'first_name', 'last_name')
ORDER BY column_name;