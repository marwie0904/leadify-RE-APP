-- Migration: Add organization_id to leads table for proper multi-tenant support

-- Add organization_id column if it doesn't exist
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);

-- Update existing leads to set organization_id from their associated conversations
UPDATE leads 
SET organization_id = agents.organization_id
FROM conversations
JOIN agents ON conversations.agent_id = agents.id
WHERE leads.conversation_id = conversations.id
AND leads.organization_id IS NULL;

-- Make organization_id NOT NULL after populating existing records
-- Note: This will fail if there are any NULL values remaining
-- Run the UPDATE statement above first to ensure all records have organization_id
ALTER TABLE leads 
ALTER COLUMN organization_id SET NOT NULL;

-- Update RLS policies to use organization_id for better performance
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view leads for their conversations" ON leads;
DROP POLICY IF EXISTS "Users can insert leads for their conversations" ON leads;
DROP POLICY IF EXISTS "Users can update leads for their conversations" ON leads;

-- Create new policies using organization_id
CREATE POLICY "Users can view leads in their organization" ON leads
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads in their organization" ON leads
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads in their organization" ON leads
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON COLUMN leads.organization_id IS 'Organization that owns this lead, denormalized from conversation->agent->organization for performance';