-- Remove handoff_requested mode since we now use direct auto-assignment
-- Update conversations table constraint to only allow 'ai' and 'human' modes

-- Drop the existing constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_mode_check;

-- Add new constraint with only ai and human modes
ALTER TABLE conversations 
ADD CONSTRAINT conversations_mode_check 
CHECK (mode IN ('ai', 'human'));

-- Update any existing handoff_requested conversations to ai mode (as fallback)
UPDATE conversations SET mode = 'ai' WHERE mode = 'handoff_requested';

-- Update comment
COMMENT ON COLUMN conversations.mode IS 'Conversation mode: ai (AI handling), human (human agent handling). Auto-assignment removes need for handoff_requested state.';