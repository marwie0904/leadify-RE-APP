-- Comprehensive Database Schema Migration Script
-- Generated: 2025-08-17T08:56:37.294Z
-- This script fixes all schema mismatches for the Real Estate AI Agent application


-- Add missing columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

------------------------------------------------------------

-- Add missing columns to organization_members table
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited'));

ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

------------------------------------------------------------

-- Add missing columns to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_enabled BOOLEAN DEFAULT false;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sales' CHECK (type IN ('sales', 'support', 'technical', 'custom'));

ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS token_usage INTEGER DEFAULT 0;

ALTER TABLE agents ADD COLUMN IF NOT EXISTS conversation_count INTEGER DEFAULT 0;

------------------------------------------------------------

-- Add missing columns to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,4) DEFAULT 0;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_name TEXT;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_email TEXT;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_phone TEXT;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' CHECK (source IN ('web', 'facebook', 'embed', 'api', 'whatsapp'));

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived'));

------------------------------------------------------------

-- Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE messages ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4';

ALTER TABLE messages ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

------------------------------------------------------------

-- Fix leads table - rename BAND to BANT and add missing columns
DO $$ 
       BEGIN 
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='band_completion') THEN
           ALTER TABLE leads RENAME COLUMN band_completion TO bant_completion;
         END IF;
       END $$;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_authority INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_need INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_completion INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'nurturing', 'lost'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_type TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_preference TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID;

------------------------------------------------------------

-- Create issues table if it does not exist
CREATE TABLE IF NOT EXISTS issues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'planned')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        type TEXT DEFAULT 'bug' CHECK (type IN ('bug', 'feature', 'enhancement', 'performance', 'security')),
        created_by UUID,
        assigned_to UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'::jsonb
      );

CREATE INDEX IF NOT EXISTS idx_issues_organization_id ON issues(organization_id);

CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);

CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type);

CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);

------------------------------------------------------------

-- Add foreign key constraints where missing
DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='agents_organization_id_fkey'
         ) THEN
           ALTER TABLE agents 
           ADD CONSTRAINT agents_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$;

DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='conversations_organization_id_fkey'
         ) THEN
           ALTER TABLE conversations 
           ADD CONSTRAINT conversations_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$;

DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='leads_organization_id_fkey'
         ) THEN
           ALTER TABLE leads 
           ADD CONSTRAINT leads_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$;

DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='issues_organization_id_fkey'
         ) THEN
           ALTER TABLE issues 
           ADD CONSTRAINT issues_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$;

------------------------------------------------------------

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

------------------------------------------------------------
