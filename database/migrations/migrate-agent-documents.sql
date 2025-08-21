-- Migration to add agent_documents table for storing document metadata
-- This table will store information about uploaded documents for display in the frontend

-- Create agent_documents table
CREATE TABLE IF NOT EXISTS agent_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    file_path TEXT, -- Path in Supabase storage
    storage_bucket TEXT DEFAULT 'agent-documents',
    chunks_count INTEGER DEFAULT 0,
    text_length INTEGER DEFAULT 0,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_documents_agent_id ON agent_documents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_documents_status ON agent_documents(processing_status);

-- Enable RLS
ALTER TABLE agent_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view documents for agents they have access to
CREATE POLICY "Users can view documents for their agents" ON agent_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_documents.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Users can insert documents for their agents
CREATE POLICY "Users can insert documents for their agents" ON agent_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_documents.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Users can update documents for their agents
CREATE POLICY "Users can update documents for their agents" ON agent_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_documents.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Users can delete documents for their agents
CREATE POLICY "Users can delete documents for their agents" ON agent_documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_documents.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at
CREATE TRIGGER update_agent_documents_updated_at BEFORE UPDATE ON agent_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add a reference to the document in agent_embeddings table (optional - for linking chunks to documents)
ALTER TABLE agent_embeddings ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES agent_documents(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_document_id ON agent_embeddings(document_id);