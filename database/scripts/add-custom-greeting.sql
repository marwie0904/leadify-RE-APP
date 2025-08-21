-- Add custom_greeting column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_greeting TEXT;

-- Add comment for documentation
COMMENT ON COLUMN agents.custom_greeting IS 'Custom greeting message for the agent to use when users say hello';