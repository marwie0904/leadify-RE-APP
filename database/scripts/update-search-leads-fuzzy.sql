-- Update search_leads_fuzzy function to support organization filtering

-- First, check if the function exists and drop it
DROP FUNCTION IF EXISTS search_leads_fuzzy(text);

-- Create the updated function with organization filtering
CREATE OR REPLACE FUNCTION search_leads_fuzzy(q text, org_id uuid DEFAULT NULL)
RETURNS SETOF leads AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM leads
  WHERE 
    -- Filter by organization if provided
    (org_id IS NULL OR organization_id = org_id)
    AND
    -- Fuzzy search across multiple fields
    (
      full_name ILIKE '%' || q || '%' OR
      mobile_number ILIKE '%' || q || '%' OR
      email ILIKE '%' || q || '%' OR
      budget_details ILIKE '%' || q || '%' OR
      need_details ILIKE '%' || q || '%' OR
      authority_details ILIKE '%' || q || '%' OR
      lead_classification ILIKE '%' || q || '%'
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_leads_fuzzy(text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_leads_fuzzy(text, uuid) IS 'Search leads with fuzzy matching across multiple fields, optionally filtered by organization_id';