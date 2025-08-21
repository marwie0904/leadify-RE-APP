-- Create leads table for storing contact information and BAND data
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    full_name TEXT,
    mobile_number TEXT,
    email TEXT,
    contact_method TEXT CHECK (contact_method IN ('call', 'text', 'viber')),
    budget_range TEXT CHECK (budget_range IN ('high', 'medium', 'low')),
    budget_details TEXT,
    timeline TEXT CHECK (timeline IN ('1m', '1-3m', '3-6m', '6m+')),
    timeline_readable TEXT,
    authority TEXT CHECK (authority IN ('individual', 'shared')),
    authority_details TEXT,
    need TEXT CHECK (need IN ('residence', 'investment', 'resale')),
    need_details TEXT,
    band_completion INTEGER DEFAULT 0,
    lead_score INTEGER,
    lead_classification TEXT CHECK (lead_classification IN ('Hot', 'Warm', 'Cold')),
    lead_score_justification TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_lead_classification ON leads(lead_classification);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "Users can view leads for their conversations" ON leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            JOIN agents ON conversations.agent_id = agents.id
            WHERE conversations.id = leads.conversation_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads for their conversations" ON leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            JOIN agents ON conversations.agent_id = agents.id
            WHERE conversations.id = leads.conversation_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads for their conversations" ON leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            JOIN agents ON conversations.agent_id = agents.id
            WHERE conversations.id = leads.conversation_id 
            AND agents.user_id = auth.uid()
        )
    ); 