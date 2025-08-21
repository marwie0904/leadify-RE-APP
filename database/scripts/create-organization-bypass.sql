-- Create a function that bypasses RLS for testing purposes
-- This should only be used in development/testing environments

CREATE OR REPLACE FUNCTION create_organization_bypass(
  org_id UUID,
  org_name TEXT,
  user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner
AS $$
DECLARE
  result JSON;
BEGIN
  -- Create organization
  INSERT INTO organizations (id, name, created_at, updated_at)
  VALUES (org_id, org_name, NOW(), NOW());
  
  -- Add user as admin
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, user_id, 'admin', NOW());
  
  -- Return success
  result = json_build_object(
    'success', true,
    'organization_id', org_id,
    'message', 'Organization created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    result = json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_bypass TO authenticated;