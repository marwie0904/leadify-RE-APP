-- =====================================================
-- Feature Requests Table Migration
-- Replaces support system with feature request functionality
-- =====================================================

-- Drop existing support-related tables if migrating from support system
-- Uncomment these lines if you want to remove the old support system
-- DROP TABLE IF EXISTS public.support_messages CASCADE;
-- DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- =====================================================
-- 1. CREATE FEATURE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information (auto-fetched from auth context)
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  
  -- Feature Request Details
  requested_feature TEXT NOT NULL,
  reason TEXT NOT NULL,
  
  -- Status Tracking
  status TEXT DEFAULT 'submitted' CHECK (status IN (
    'submitted',        -- Initial submission
    'under_review',     -- Being reviewed by team
    'planned',          -- Accepted and planned for development
    'in_development',   -- Currently being developed
    'completed',        -- Feature has been implemented
    'rejected',         -- Request was rejected
    'on_hold'          -- Temporarily on hold
  )),
  
  -- Priority Management
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Admin Management
  admin_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Additional Metadata
  expected_users INTEGER, -- How many users would benefit
  business_value TEXT,    -- Business justification
  technical_feasibility TEXT, -- Technical assessment
  estimated_effort TEXT CHECK (estimated_effort IN ('small', 'medium', 'large', 'extra_large')),
  
  -- Voting/Interest Tracking
  upvotes INTEGER DEFAULT 0,
  
  -- Related Information
  related_feature_ids UUID[],  -- Links to related feature requests
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  planned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Computed Fields
  days_since_submission INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (NOW() - created_at))::INTEGER
  ) STORED,
  
  days_in_current_status INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (NOW() - updated_at))::INTEGER
  ) STORED
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_feature_requests_org_id ON public.feature_requests(organization_id);
CREATE INDEX idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX idx_feature_requests_priority ON public.feature_requests(priority);
CREATE INDEX idx_feature_requests_created_at ON public.feature_requests(created_at DESC);
CREATE INDEX idx_feature_requests_updated_at ON public.feature_requests(updated_at DESC);
CREATE INDEX idx_feature_requests_assigned_to ON public.feature_requests(assigned_to);

-- Composite indexes for common queries
CREATE INDEX idx_feature_requests_status_priority ON public.feature_requests(status, priority);
CREATE INDEX idx_feature_requests_org_status ON public.feature_requests(organization_id, status);
CREATE INDEX idx_feature_requests_pending_high_priority ON public.feature_requests(status, priority) 
  WHERE status IN ('submitted', 'under_review') AND priority IN ('high', 'urgent');

-- =====================================================
-- 3. CREATE FEATURE REQUEST VOTES TABLE (for tracking user interest)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one vote per user per feature
  UNIQUE(feature_request_id, user_id)
);

CREATE INDEX idx_feature_request_votes_request ON public.feature_request_votes(feature_request_id);
CREATE INDEX idx_feature_request_votes_user ON public.feature_request_votes(user_id);

-- =====================================================
-- 4. CREATE FEATURE REQUEST COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  comment TEXT NOT NULL,
  is_admin_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feature_request_comments_request ON public.feature_request_comments(feature_request_id);
CREATE INDEX idx_feature_request_comments_user ON public.feature_request_comments(user_id);
CREATE INDEX idx_feature_request_comments_created ON public.feature_request_comments(created_at DESC);

-- =====================================================
-- 5. CREATE UPDATE TRIGGER FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_request_comments_updated_at
  BEFORE UPDATE ON public.feature_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE FUNCTION TO UPDATE VOTE COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION update_feature_request_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_requests 
    SET upvotes = upvotes + 1 
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_requests 
    SET upvotes = GREATEST(upvotes - 1, 0) 
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upvotes_on_vote
  AFTER INSERT OR DELETE ON public.feature_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_request_upvotes();

-- =====================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_comments ENABLE ROW LEVEL SECURITY;

-- Feature Requests Policies
-- Users can view all feature requests in their organization
CREATE POLICY "Users can view feature requests in their organization"
  ON public.feature_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create feature requests for their organization
CREATE POLICY "Users can create feature requests"
  ON public.feature_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own feature requests (limited fields)
CREATE POLICY "Users can update own feature requests"
  ON public.feature_requests FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any feature request in their organization
CREATE POLICY "Admins can manage feature requests"
  ON public.feature_requests FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Feature Request Votes Policies
-- Users can view all votes
CREATE POLICY "Users can view votes"
  ON public.feature_request_votes FOR SELECT
  USING (true);

-- Users can manage their own votes
CREATE POLICY "Users can manage own votes"
  ON public.feature_request_votes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Feature Request Comments Policies
-- Users can view comments on feature requests they can see
CREATE POLICY "Users can view comments"
  ON public.feature_request_comments FOR SELECT
  USING (
    feature_request_id IN (
      SELECT id FROM public.feature_requests
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create comments
CREATE POLICY "Users can create comments"
  ON public.feature_request_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    feature_request_id IN (
      SELECT id FROM public.feature_requests
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.feature_request_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.feature_request_comments FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 8. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for feature requests with vote counts and latest activity
CREATE OR REPLACE VIEW public.feature_requests_with_stats AS
SELECT 
  fr.*,
  COUNT(DISTINCT frc.id) as comment_count,
  MAX(frc.created_at) as last_comment_at,
  COALESCE(fr.upvotes, 0) as total_votes
FROM public.feature_requests fr
LEFT JOIN public.feature_request_comments frc ON fr.id = frc.feature_request_id
GROUP BY fr.id;

-- View for pending high-priority requests
CREATE OR REPLACE VIEW public.pending_priority_features AS
SELECT * FROM public.feature_requests
WHERE status IN ('submitted', 'under_review')
  AND priority IN ('high', 'urgent')
ORDER BY 
  CASE priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
  END,
  created_at ASC;

-- =====================================================
-- 9. GRANT PERMISSIONS (for service role)
-- =====================================================
GRANT ALL ON public.feature_requests TO service_role;
GRANT ALL ON public.feature_request_votes TO service_role;
GRANT ALL ON public.feature_request_comments TO service_role;
GRANT ALL ON public.feature_requests_with_stats TO service_role;
GRANT ALL ON public.pending_priority_features TO service_role;

-- =====================================================
-- 10. SEED INITIAL DATA (Optional - for testing)
-- =====================================================
-- Uncomment to add sample data
/*
INSERT INTO public.feature_requests (
  user_email, 
  user_name, 
  requested_feature, 
  reason, 
  status, 
  priority
) VALUES 
  ('user@example.com', 'John Doe', 'Dark mode support', 'Better for eyes during night work', 'under_review', 'high'),
  ('user2@example.com', 'Jane Smith', 'Export to Excel', 'Need to share data with team', 'planned', 'medium'),
  ('user3@example.com', 'Bob Wilson', 'Mobile app', 'Access on the go', 'submitted', 'low');
*/