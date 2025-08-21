-- Human-in-Loop Handoff System Extension
-- Additional tables for conversation handoffs and human agent management

-- Conversation handoffs table
CREATE TABLE IF NOT EXISTS public.conversation_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by TEXT DEFAULT 'system', -- 'system', 'user', or user_id
  assigned_to UUID REFERENCES auth.users(id), -- Human agent assigned to handle
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reason TEXT, -- Reason for handoff request
  notes TEXT, -- Additional notes from requester
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend conversations table to track handoff status
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS handoff_status TEXT DEFAULT 'none' CHECK (handoff_status IN ('none', 'requested', 'assigned', 'completed'));

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS assigned_human_agent UUID REFERENCES auth.users(id);

-- Extend messages table to support human agent messages
ALTER TABLE public.messages 
ALTER COLUMN role TYPE TEXT,
ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant', 'human_agent', 'system'));

-- Human agent profiles (extends users table with agent-specific info)
CREATE TABLE IF NOT EXISTS public.human_agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  specialties TEXT[], -- Array of specialties/skills
  max_concurrent_conversations INTEGER DEFAULT 5,
  current_conversation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS for new tables
ALTER TABLE public.conversation_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_agent_profiles ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_status ON public.conversation_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_priority ON public.conversation_handoffs(priority, requested_at);
CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_assigned_to ON public.conversation_handoffs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_handoff_status ON public.conversations(handoff_status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_agent ON public.conversations(assigned_human_agent);
CREATE INDEX IF NOT EXISTS idx_human_agent_profiles_active ON public.human_agent_profiles(is_active, organization_id);

-- RLS Policies (basic examples - adjust based on your security requirements)
CREATE POLICY "Users can view handoffs in their organizations" ON public.conversation_handoffs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create handoffs in their organizations" ON public.conversation_handoffs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view human agent profiles in their organizations" ON public.human_agent_profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );