-- Check for orphaned invitations (invitations without corresponding organizations)
SELECT 
    oi.id as invite_id,
    oi.email,
    oi.organization_id,
    oi.status,
    oi.created_at,
    o.id as org_exists,
    o.name as org_name
FROM organization_invites oi
LEFT JOIN organizations o ON oi.organization_id = o.id
WHERE oi.status = 'pending'
ORDER BY oi.created_at DESC;

-- Count orphaned invitations
SELECT COUNT(*) as orphaned_invites
FROM organization_invites oi
LEFT JOIN organizations o ON oi.organization_id = o.id
WHERE o.id IS NULL AND oi.status = 'pending';

-- If you need to clean up orphaned invitations, run this:
-- UPDATE organization_invites 
-- SET status = 'invalid', 
--     accepted_at = NOW()
-- WHERE organization_id NOT IN (SELECT id FROM organizations)
-- AND status = 'pending';

-- Check if there are any organizations at all
SELECT COUNT(*) as total_organizations FROM organizations;
SELECT id, name, created_at FROM organizations ORDER BY created_at DESC LIMIT 10;

-- Check a specific invitation by token (replace with actual token)
-- SELECT 
--     oi.*,
--     o.name as organization_name,
--     o.id as org_exists
-- FROM organization_invites oi
-- LEFT JOIN organizations o ON oi.organization_id = o.id
-- WHERE oi.token = 'YOUR_TOKEN_HERE';

-- Add a foreign key constraint if it's missing (this will fail for orphaned records)
-- ALTER TABLE organization_invites
-- ADD CONSTRAINT organization_invites_organization_id_fkey 
-- FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- To fix the immediate issue, you can either:
-- 1. Create the missing organization (if you know what it should be)
-- 2. Mark the invitation as invalid
-- 3. Update the invitation to point to a valid organization