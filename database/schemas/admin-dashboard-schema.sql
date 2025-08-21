-- Admin Dashboard Database Schema
-- Run this migration in Supabase SQL Editor

-- =====================================================
-- 1. DEV MEMBERS TABLE - Admin Access Control
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dev_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'developer' CHECK (role IN ('developer', 'admin', 'super_admin')),
  permissions JSONB DEFAULT '["read"]'::jsonb,
  added_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_dev_members_user_id ON public.dev_members(user_id);
CREATE INDEX idx_dev_members_email ON public.dev_members(email);
CREATE INDEX idx_dev_members_active ON public.dev_members(is_active) WHERE is_active = true;

-- =====================================================
-- 2. ISSUES TABLE - Bug Reports with AI Classification
-- =====================================================
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Issue details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'feature_request', 'performance', 'security', 'other')),
  
  -- AI Classification
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')) DEFAULT 'medium',
  ai_priority_score DECIMAL(3,2) CHECK (ai_priority_score >= 0 AND ai_priority_score <= 1),
  ai_classification JSONB DEFAULT '{}'::jsonb,
  ai_suggested_actions TEXT[],
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  assigned_to UUID REFERENCES public.dev_members(user_id),
  
  -- PostHog Integration
  posthog_session_id TEXT,
  posthog_recording_url TEXT,
  posthog_person_id TEXT,
  browser_info JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  attachments JSONB DEFAULT '[]'::jsonb,
  internal_notes TEXT,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  
  -- Computed fields
  days_since_created INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM COALESCE(closed_at, NOW()) - created_at)::INTEGER
  ) STORED,
  
  response_time_hours DECIMAL GENERATED ALWAYS AS (
    CASE 
      WHEN first_response_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600
      ELSE NULL
    END
  ) STORED
);

-- Create indexes for performance
CREATE INDEX idx_issues_org_id ON public.issues(organization_id);
CREATE INDEX idx_issues_user_id ON public.issues(user_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_priority ON public.issues(priority);
CREATE INDEX idx_issues_created_at ON public.issues(created_at DESC);
CREATE INDEX idx_issues_open_urgent ON public.issues(status, priority) 
  WHERE status IN ('open', 'investigating') AND priority = 'urgent';

-- =====================================================
-- 3. SUPPORT TICKETS - Customer Support System
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Ticket details
  subject TEXT,
  initial_message TEXT,
  category TEXT CHECK (category IN ('technical', 'billing', 'general', 'feature_request', 'complaint')),
  
  -- Status and assignment
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting_user', 'waiting_admin', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  assigned_to UUID REFERENCES public.dev_members(user_id),
  
  -- Metrics
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  satisfaction_feedback TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  first_response_at TIMESTAMPTZ,
  
  -- Computed fields
  total_messages INTEGER DEFAULT 0,
  admin_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0
);

-- Create indexes
CREATE INDEX idx_support_tickets_org_id ON public.support_tickets(organization_id);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_open ON public.support_tickets(status, created_at DESC) 
  WHERE status IN ('open', 'waiting_admin');

-- =====================================================
-- 4. SUPPORT MESSAGES - Chat Messages for Support
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT CHECK (sender_type IN ('user', 'admin', 'system')) NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  
  -- Message content
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_internal BOOLEAN DEFAULT false,
  edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- For real-time updates
  is_delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_sender ON public.support_messages(sender_id);
CREATE INDEX idx_support_messages_created ON public.support_messages(created_at DESC);

-- =====================================================
-- 5. AI TOKEN USAGE - Comprehensive Token Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Token details
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  
  -- Model and cost
  model TEXT NOT NULL,
  model_version TEXT,
  cost_per_1k_prompt DECIMAL(10, 6),
  cost_per_1k_completion DECIMAL(10, 6),
  total_cost DECIMAL(10, 6) GENERATED ALWAYS AS (
    (prompt_tokens::DECIMAL / 1000 * COALESCE(cost_per_1k_prompt, 0)) +
    (completion_tokens::DECIMAL / 1000 * COALESCE(cost_per_1k_completion, 0))
  ) STORED,
  
  -- Context
  operation_type TEXT CHECK (operation_type IN (
    'chat', 'bant_scoring', 'issue_classification', 'document_processing', 
    'embedding', 'estimation', 'handoff', 'other'
  )),
  endpoint TEXT,
  request_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Performance metrics
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE,
  hour INTEGER GENERATED ALWAYS AS (EXTRACT(HOUR FROM created_at)::INTEGER) STORED
);

-- Create indexes for analytics queries
CREATE INDEX idx_token_usage_org_date ON public.ai_token_usage(organization_id, date DESC);
CREATE INDEX idx_token_usage_agent ON public.ai_token_usage(agent_id, date DESC);
CREATE INDEX idx_token_usage_conversation ON public.ai_token_usage(conversation_id);
CREATE INDEX idx_token_usage_date_hour ON public.ai_token_usage(date, hour);
CREATE INDEX idx_token_usage_operation ON public.ai_token_usage(operation_type, date DESC);

-- Materialized view for daily aggregates (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.ai_token_usage_daily AS
SELECT 
  date,
  organization_id,
  agent_id,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as error_count
FROM public.ai_token_usage
GROUP BY date, organization_id, agent_id;

-- Create index on materialized view
CREATE INDEX idx_token_daily_org_date ON public.ai_token_usage_daily(organization_id, date DESC);

-- =====================================================
-- 6. ISSUE ACTIVITIES - Audit Trail for Issues
-- =====================================================
CREATE TABLE IF NOT EXISTS public.issue_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'status_changed', 'priority_changed', 
    'assigned', 'commented', 'resolved', 'closed', 'reopened'
  )),
  old_value JSONB,
  new_value JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_issue_activities_issue ON public.issue_activities(issue_id);
CREATE INDEX idx_issue_activities_created ON public.issue_activities(created_at DESC);

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.dev_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_activities ENABLE ROW LEVEL SECURITY;

-- Dev Members policies (only admins can view/modify)
CREATE POLICY "Admin users can view dev_members" ON public.dev_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

CREATE POLICY "Super admins can manage dev_members" ON public.dev_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() 
      AND dm.role = 'super_admin' 
      AND dm.is_active = true
    )
  );

-- Issues policies
CREATE POLICY "Users can create issues" ON public.issues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own issues" ON public.issues
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

CREATE POLICY "Admins can manage all issues" ON public.issues
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

-- Support tickets policies
CREATE POLICY "Users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

-- Support messages policies
CREATE POLICY "Users can send messages to their tickets" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

CREATE POLICY "Users can view messages in their tickets" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

-- AI token usage policies (admins only)
CREATE POLICY "Admins can view token usage" ON public.ai_token_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

CREATE POLICY "System can insert token usage" ON public.ai_token_usage
  FOR INSERT WITH CHECK (true); -- Will be restricted by service role key

-- Issue activities policies
CREATE POLICY "Users can view activities for their issues" ON public.issue_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.issues i
      WHERE i.id = issue_id AND i.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.dev_members dm 
      WHERE dm.user_id = auth.uid() AND dm.is_active = true
    )
  );

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
CREATE TRIGGER update_dev_members_updated_at BEFORE UPDATE ON public.dev_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update ticket message counts
CREATE OR REPLACE FUNCTION update_ticket_message_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.support_tickets
    SET 
      total_messages = total_messages + 1,
      admin_messages = admin_messages + CASE WHEN NEW.sender_type = 'admin' THEN 1 ELSE 0 END,
      user_messages = user_messages + CASE WHEN NEW.sender_type = 'user' THEN 1 ELSE 0 END,
      last_message_at = NEW.created_at,
      first_response_at = CASE 
        WHEN first_response_at IS NULL AND NEW.sender_type = 'admin' 
        THEN NEW.created_at 
        ELSE first_response_at 
      END
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_counts AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_message_counts();

-- Function to log issue activities
CREATE OR REPLACE FUNCTION log_issue_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.issue_activities (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.issue_activities (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'priority_changed',
        jsonb_build_object('priority', OLD.priority),
        jsonb_build_object('priority', NEW.priority)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.issue_activities (issue_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'assigned',
        jsonb_build_object('assigned_to', OLD.assigned_to),
        jsonb_build_object('assigned_to', NEW.assigned_to)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_issue_changes AFTER UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION log_issue_activity();

-- =====================================================
-- 9. INITIAL DATA (Optional - for testing)
-- =====================================================

-- Add yourself as the first super admin (replace with your actual user_id and email)
-- INSERT INTO public.dev_members (user_id, email, full_name, role, permissions)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   'your-email@example.com',
--   'Your Name',
--   'super_admin',
--   '["read", "write", "delete", "admin"]'::jsonb
-- );

-- =====================================================
-- 10. REFRESH MATERIALIZED VIEW (Schedule this)
-- =====================================================
-- This should be run periodically (e.g., every hour) to update the materialized view
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.ai_token_usage_daily;