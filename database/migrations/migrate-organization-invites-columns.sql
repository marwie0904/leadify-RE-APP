-- Add missing columns to organization_invites table

-- Add expires_at column if it doesn't exist
ALTER TABLE organization_invites 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Add invited_by column if it doesn't exist
ALTER TABLE organization_invites 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);

-- Add foreign key constraint to organizations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organization_invites_organization_id_fkey'
    ) THEN
        ALTER TABLE organization_invites 
        ADD CONSTRAINT organization_invites_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Set default expiration for existing invites (7 days from creation)
UPDATE organization_invites 
SET expires_at = created_at + INTERVAL '7 days' 
WHERE expires_at IS NULL;

-- Make expires_at NOT NULL after setting defaults
ALTER TABLE organization_invites 
ALTER COLUMN expires_at SET NOT NULL;

-- Add constraint to ensure expires_at is in the future when creating invites
ALTER TABLE organization_invites 
ADD CONSTRAINT check_expires_at CHECK (expires_at > created_at);

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);

-- Create index on status and expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_organization_invites_status_expires ON organization_invites(status, expires_at);