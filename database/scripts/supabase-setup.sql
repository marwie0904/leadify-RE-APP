-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    tone TEXT NOT NULL CHECK (tone IN ('Professional', 'Friendly', 'Neutral')),
    status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'ready', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_embeddings table with pgvector
CREATE TABLE IF NOT EXISTS agent_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI ada-002 embedding dimension
    file_name TEXT,
    chunk_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_configs table
CREATE TABLE IF NOT EXISTS agent_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    system_prompt TEXT NOT NULL,
    fallback_prompt TEXT NOT NULL,
    embedding_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_agent_id ON agent_embeddings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_embeddings_vector ON agent_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configs_updated_at BEFORE UPDATE ON agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Agents policies
CREATE POLICY "Users can view their own agents" ON agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents" ON agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON agents
    FOR UPDATE USING (auth.uid() = user_id);

-- Agent embeddings policies
CREATE POLICY "Users can view embeddings for their agents" ON agent_embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_embeddings.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert embeddings for their agents" ON agent_embeddings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_embeddings.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

-- Agent configs policies
CREATE POLICY "Users can view configs for their agents" ON agent_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_configs.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert configs for their agents" ON agent_configs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_configs.agent_id 
            AND agents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update configs for their agents" ON agent_configs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = agent_configs.agent_id 
            AND agents.user_id = auth.uid()
        )
    ); 

-- Organization Invites Table
CREATE TABLE IF NOT EXISTS organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  organization_id uuid NOT NULL,
  token text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone
); 

-- Enable RLS for organization_invites
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own invites
CREATE POLICY "Users can view their own invites" ON organization_invites
  FOR SELECT
  USING (email = auth.email());

-- Allow only org admins to insert invites
CREATE POLICY "Admins can insert invites" ON organization_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- Allow only org admins to update invites
CREATE POLICY "Admins can update invites" ON organization_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  );

-- Allow only org admins to delete invites
CREATE POLICY "Admins can delete invites" ON organization_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organization_invites.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'admin'
    )
  ); 