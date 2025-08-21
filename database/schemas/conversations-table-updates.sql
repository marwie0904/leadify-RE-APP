-- Add new fields to conversations table for human in the loop functionality
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'ai' CHECK (mode IN ('ai', 'human', 'handoff_requested')),
ADD COLUMN IF NOT EXISTS assigned_human_agent_id UUID REFERENCES human_agents(id),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 3);

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_conversations_mode ON conversations(mode);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_human_agent_id ON conversations(assigned_human_agent_id);

-- Composite index for priority queue queries
CREATE INDEX IF NOT EXISTS idx_conversations_mode_priority_last_message 
ON conversations(mode, priority DESC, last_message_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN conversations.mode IS 'Conversation mode: ai (AI handling), human (human agent handling), handoff_requested (waiting for human agent)';
COMMENT ON COLUMN conversations.priority IS 'Priority level: 1=normal, 2=high, 3=urgent';
COMMENT ON COLUMN conversations.assigned_human_agent_id IS 'ID of human agent currently handling this conversation';

-- Update existing conversations to have default mode
UPDATE conversations SET mode = 'ai' WHERE mode IS NULL;