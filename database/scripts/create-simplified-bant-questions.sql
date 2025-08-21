-- Complete migration for simplified BANT questions feature
-- Run this in Supabase SQL Editor

-- 1. Create the table with nullable placeholder_text and help_text
CREATE TABLE IF NOT EXISTS agent_bant_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('budget', 'authority', 'need', 'timeline')),
    question_text TEXT NOT NULL,
    question_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    placeholder_text TEXT, -- Nullable for simplified form
    help_text TEXT,        -- Nullable for simplified form
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_agent_id ON agent_bant_questions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_category ON agent_bant_questions(category);

-- 3. Enable Row Level Security
ALTER TABLE agent_bant_questions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
-- Users can view questions for their own agents
CREATE POLICY "Users can view their own agent questions" ON agent_bant_questions
    FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    );

-- Users can insert questions for their own agents
CREATE POLICY "Users can insert questions for their own agents" ON agent_bant_questions
    FOR INSERT
    WITH CHECK (
        agent_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    );

-- Users can update questions for their own agents
CREATE POLICY "Users can update questions for their own agents" ON agent_bant_questions
    FOR UPDATE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    );

-- Users can delete questions for their own agents
CREATE POLICY "Users can delete questions for their own agents" ON agent_bant_questions
    FOR DELETE
    USING (
        agent_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    );

-- 5. Insert simplified default questions (no placeholder or help text)
INSERT INTO agent_bant_questions (agent_id, category, question_text, question_order, is_active)
VALUES 
    -- Budget questions
    ('00000000-0000-0000-0000-000000000000', 'budget', 'What is your budget range for this property?', 1, true),
    ('00000000-0000-0000-0000-000000000000', 'budget', 'Have you been pre-approved for financing?', 2, true),
    
    -- Authority questions
    ('00000000-0000-0000-0000-000000000000', 'authority', 'Are you the sole decision maker for this purchase?', 1, true),
    ('00000000-0000-0000-0000-000000000000', 'authority', 'Who else will be involved in making this decision?', 2, true),
    
    -- Need questions
    ('00000000-0000-0000-0000-000000000000', 'need', 'What is the primary purpose for this property?', 1, true),
    ('00000000-0000-0000-0000-000000000000', 'need', 'What specific features are you looking for?', 2, true),
    
    -- Timeline questions
    ('00000000-0000-0000-0000-000000000000', 'timeline', 'When are you planning to make a purchase?', 1, true),
    ('00000000-0000-0000-0000-000000000000', 'timeline', 'Do you have any specific deadlines or constraints?', 2, true)
ON CONFLICT DO NOTHING;

-- 6. Add table comment for documentation
COMMENT ON TABLE agent_bant_questions IS 'Stores custom BANT questions for each agent. Simplified form only requires question_text.';
COMMENT ON COLUMN agent_bant_questions.placeholder_text IS 'Optional placeholder text (deprecated in favor of simplified form)';
COMMENT ON COLUMN agent_bant_questions.help_text IS 'Optional help text (deprecated in favor of simplified form)';