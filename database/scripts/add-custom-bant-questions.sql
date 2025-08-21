-- Migration: Add custom BANT questions table
-- This table stores custom BANT questions per agent, allowing users to define their own qualification questions

CREATE TABLE IF NOT EXISTS agent_bant_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('budget', 'authority', 'need', 'timeline')),
    question_text TEXT NOT NULL,
    question_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    placeholder_text TEXT,
    help_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_agent_id ON agent_bant_questions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_category ON agent_bant_questions(category);
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_order ON agent_bant_questions(agent_id, category, question_order);

-- Enable Row Level Security
ALTER TABLE agent_bant_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view BANT questions for their agents" ON agent_bant_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_bant_questions.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert BANT questions for their agents" ON agent_bant_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_bant_questions.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update BANT questions for their agents" ON agent_bant_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_bant_questions.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete BANT questions for their agents" ON agent_bant_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_bant_questions.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE TRIGGER update_agent_bant_questions_updated_at BEFORE UPDATE ON agent_bant_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default questions (used as templates for new agents)
INSERT INTO agent_bant_questions (agent_id, category, question_text, question_order, placeholder_text, help_text)
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'budget', 'What is your budget range for this property?', 1, 'e.g., $500K - $1M', 'Understanding your budget helps us find properties that match your financial capacity'),
    ('00000000-0000-0000-0000-000000000000', 'budget', 'Have you been pre-approved for financing?', 2, 'Yes/No', 'Pre-approval status helps us understand your readiness to purchase'),
    ('00000000-0000-0000-0000-000000000000', 'authority', 'Are you the sole decision maker for this purchase?', 1, 'Yes/No', 'This helps us understand who needs to be involved in the decision process'),
    ('00000000-0000-0000-0000-000000000000', 'authority', 'Who else will be involved in making this decision?', 2, 'e.g., Spouse, business partner', 'Knowing all stakeholders ensures everyone is aligned'),
    ('00000000-0000-0000-0000-000000000000', 'need', 'What is the primary purpose for this property?', 1, 'e.g., Primary residence, investment', 'Understanding your needs helps us recommend suitable properties'),
    ('00000000-0000-0000-0000-000000000000', 'need', 'What specific features are you looking for?', 2, 'e.g., 3 bedrooms, near schools', 'Specific requirements help narrow down the search'),
    ('00000000-0000-0000-0000-000000000000', 'timeline', 'When are you planning to make a purchase?', 1, 'e.g., Within 3 months', 'Your timeline helps us prioritize our efforts'),
    ('00000000-0000-0000-0000-000000000000', 'timeline', 'Do you have any specific deadlines or constraints?', 2, 'e.g., School year starting', 'Understanding constraints helps us work within your schedule')
ON CONFLICT DO NOTHING;