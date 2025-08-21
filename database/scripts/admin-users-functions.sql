-- Admin User Management Functions
-- Comprehensive RPC functions for user administration

-- Add status and admin tracking columns to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivated_by UUID REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_email_search ON users USING gin(to_tsvector('english', email));
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Function to get admin users with all details
CREATE OR REPLACE FUNCTION get_admin_users(
  search_query TEXT DEFAULT NULL,
  org_filter UUID DEFAULT NULL,
  status_filter VARCHAR(20) DEFAULT NULL,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  organization_name VARCHAR(255),
  organization_id UUID,
  role VARCHAR(50),
  last_sign_in_at TIMESTAMPTZ,
  status VARCHAR(20),
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  leads_count BIGINT,
  conversations_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  offset_value INT;
BEGIN
  -- Calculate offset
  offset_value := (page_number - 1) * page_size;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.created_at,
    u.updated_at,
    o.name as organization_name,
    o.id as organization_id,
    COALESCE(om.role, 'viewer') as role,
    au.last_sign_in_at,
    COALESCE(u.status, 'active') as status,
    u.suspended_at,
    u.suspension_reason,
    (SELECT COUNT(*) FROM leads l WHERE l.user_id = u.id)::BIGINT as leads_count,
    (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id)::BIGINT as conversations_count
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id
  LEFT JOIN organization_members om ON u.id = om.user_id
  LEFT JOIN organizations o ON om.organization_id = o.id
  WHERE 
    -- Exclude soft-deleted users
    u.deleted_at IS NULL
    -- Search filter
    AND (
      search_query IS NULL 
      OR u.email ILIKE '%' || search_query || '%'
      OR u.first_name ILIKE '%' || search_query || '%'
      OR u.last_name ILIKE '%' || search_query || '%'
      OR o.name ILIKE '%' || search_query || '%'
    )
    -- Organization filter
    AND (org_filter IS NULL OR o.id = org_filter)
    -- Status filter
    AND (status_filter IS NULL OR COALESCE(u.status, 'active') = status_filter)
  ORDER BY u.created_at DESC
  LIMIT page_size
  OFFSET offset_value;
END;
$$;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  inactive_users BIGINT,
  suspended_users BIGINT,
  total_organizations BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)::BIGINT as active_users,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT as inactive_users,
    COUNT(*) FILTER (WHERE status = 'suspended')::BIGINT as suspended_users,
    (SELECT COUNT(DISTINCT id) FROM organizations)::BIGINT as total_organizations
  FROM users
  WHERE deleted_at IS NULL;
END;
$$;

-- Function to determine user activity status
CREATE OR REPLACE FUNCTION get_user_activity_status(last_sign_in TIMESTAMPTZ)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
BEGIN
  IF last_sign_in IS NULL THEN
    RETURN 'inactive';
  ELSIF last_sign_in > NOW() - INTERVAL '24 hours' THEN
    RETURN 'active';
  ELSIF last_sign_in > NOW() - INTERVAL '7 days' THEN
    RETURN 'active';
  ELSIF last_sign_in > NOW() - INTERVAL '30 days' THEN
    RETURN 'inactive';
  ELSE
    RETURN 'inactive';
  END IF;
END;
$$;

-- Function to format last active time
CREATE OR REPLACE FUNCTION format_last_active(last_sign_in TIMESTAMPTZ)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  time_diff INTERVAL;
  minutes INT;
  hours INT;
  days INT;
BEGIN
  IF last_sign_in IS NULL THEN
    RETURN 'Never';
  END IF;
  
  time_diff := NOW() - last_sign_in;
  minutes := EXTRACT(MINUTE FROM time_diff)::INT;
  hours := EXTRACT(HOUR FROM time_diff)::INT;
  days := EXTRACT(DAY FROM time_diff)::INT;
  
  IF days > 30 THEN
    RETURN 'Over a month ago';
  ELSIF days > 7 THEN
    RETURN days || ' days ago';
  ELSIF days > 1 THEN
    RETURN days || ' days ago';
  ELSIF days = 1 THEN
    RETURN '1 day ago';
  ELSIF hours > 1 THEN
    RETURN hours || ' hours ago';
  ELSIF hours = 1 THEN
    RETURN '1 hour ago';
  ELSIF minutes > 1 THEN
    RETURN minutes || ' minutes ago';
  ELSIF minutes = 1 THEN
    RETURN '1 minute ago';
  ELSE
    RETURN 'Just now';
  END IF;
END;
$$;

-- Function to get organization list for filters
CREATE OR REPLACE FUNCTION get_organizations_list()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COUNT(om.user_id)::BIGINT as user_count
  FROM organizations o
  LEFT JOIN organization_members om ON o.id = om.organization_id
  GROUP BY o.id, o.name
  ORDER BY o.name;
END;
$$;

-- Function for bulk user operations
CREATE OR REPLACE FUNCTION bulk_update_user_status(
  user_ids UUID[],
  new_status VARCHAR(20),
  updated_by UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE users
  SET 
    status = new_status,
    updated_at = NOW(),
    suspended_at = CASE WHEN new_status = 'suspended' THEN NOW() ELSE suspended_at END,
    suspended_by = CASE WHEN new_status = 'suspended' THEN updated_by ELSE suspended_by END,
    reactivated_at = CASE WHEN new_status = 'active' AND status = 'suspended' THEN NOW() ELSE reactivated_at END,
    reactivated_by = CASE WHEN new_status = 'active' AND status = 'suspended' THEN updated_by ELSE reactivated_by END
  WHERE id = ANY(user_ids)
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Create audit log table for user actions
CREATE TABLE IF NOT EXISTS user_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  performed_by UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target ON user_admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performer ON user_admin_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON user_admin_audit_log(created_at DESC);

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  action_type VARCHAR(50),
  target_user UUID,
  performer UUID,
  action_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO user_admin_audit_log (action, target_user_id, performed_by, details)
  VALUES (action_type, target_user, performer, action_details)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_admin_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_status TO authenticated;
GRANT EXECUTE ON FUNCTION format_last_active TO authenticated;
GRANT EXECUTE ON FUNCTION get_organizations_list TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_user_status TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Row Level Security for audit log
ALTER TABLE user_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view audit logs" ON user_admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON FUNCTION get_admin_users IS 'Retrieves paginated list of users with full details for admin dashboard';
COMMENT ON FUNCTION get_admin_user_stats IS 'Returns aggregate statistics about users for admin dashboard';
COMMENT ON FUNCTION bulk_update_user_status IS 'Allows bulk status updates for multiple users';
COMMENT ON FUNCTION log_admin_action IS 'Records admin actions for audit trail';