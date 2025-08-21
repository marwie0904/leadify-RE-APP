-- bant_memory.sql
CREATE TABLE IF NOT EXISTS bant_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    budget TEXT,
    authority TEXT,
    need TEXT,
    timeline TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_method TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bant_memory_conversation_id ON bant_memory(conversation_id); 