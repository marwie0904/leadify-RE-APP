-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON organization_invites;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON organization_invites;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON organization_invites;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON organization_invites;
DROP POLICY IF EXISTS "Enable all for service role" ON organization_invites;

-- Create a policy that allows inserts for authenticated users who are members of the organization
CREATE POLICY "Members can create invites" 
ON organization_invites 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = organization_invites.organization_id
    AND organization_members.role IN ('admin', 'moderator')
  )
);

-- Allow users to read invitations they created or for their organization
CREATE POLICY "Members can view invites" 
ON organization_invites 
FOR SELECT 
TO authenticated
USING (
  invited_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = organization_invites.organization_id
  )
);

-- Allow updates to invitations (for accepting)
CREATE POLICY "Can update own invitations" 
ON organization_invites 
FOR UPDATE 
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow service role to bypass all policies
CREATE POLICY "Service role bypass" 
ON organization_invites 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Enable RLS on the table
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;