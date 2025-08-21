-- Final Handoff System Migration
-- Run this in Supabase SQL Editor to set up the handoff system

-- Add missing columns to conversation_handoffs table
ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

ALTER TABLE conversation_handoffs 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add handoff-related columns to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMPTZ;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS assigned_human_agent_id UUID REFERENCES auth.users(id);

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS handoff_status TEXT DEFAULT 'none';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_org 
ON conversation_handoffs(organization_id);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_status 
ON conversation_handoffs(status);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_priority 
ON conversation_handoffs(priority, requested_at);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_assigned 
ON conversation_handoffs(assigned_to);

CREATE INDEX IF NOT EXISTS idx_conversations_handoff_status 
ON conversations(handoff_status);

CREATE INDEX IF NOT EXISTS idx_conversations_assigned_human 
ON conversations(assigned_human_agent_id);

-- Add check constraint for priority values if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_handoffs_priority_check'
    ) THEN
        ALTER TABLE conversation_handoffs 
        ADD CONSTRAINT conversation_handoffs_priority_check 
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
END $$;

-- Add check constraint for status values if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversation_handoffs_status_check'
    ) THEN
        ALTER TABLE conversation_handoffs 
        ADD CONSTRAINT conversation_handoffs_status_check 
        CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled'));
    END IF;
END $$;

-- Add check constraint for conversation handoff_status if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'conversations_handoff_status_check'
    ) THEN
        ALTER TABLE conversations 
        ADD CONSTRAINT conversations_handoff_status_check 
        CHECK (handoff_status IN ('none', 'requested', 'assigned', 'completed', 'handoff_requested', 'handoff_assigned'));
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON conversation_handoffs TO authenticated;
GRANT ALL ON conversations TO authenticated;