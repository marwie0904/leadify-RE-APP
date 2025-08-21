-- Update messages table to support human_agent sender type
-- First, check if we need to add a constraint or just update existing one

-- Remove existing check constraint if it exists (this will fail silently if not exists)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_check;

-- Add new check constraint with human_agent option
ALTER TABLE messages 
ADD CONSTRAINT messages_sender_check 
CHECK (sender IN ('user', 'ai', 'human_agent'));

-- Add index for sender type for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

-- Add comment for documentation
COMMENT ON COLUMN messages.sender IS 'Message sender type: user, ai, or human_agent';