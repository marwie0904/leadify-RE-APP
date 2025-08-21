-- Migration to make conversation_id nullable in leads table
-- This allows creating leads directly without requiring a conversation

-- Alter the leads table to make conversation_id nullable
ALTER TABLE leads 
ALTER COLUMN conversation_id DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN leads.conversation_id IS 'Reference to conversation if lead was created from chat. Can be NULL for directly created leads.';

-- Update any existing constraints if needed
-- No other changes required as the foreign key constraint remains valid