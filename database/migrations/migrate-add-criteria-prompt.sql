-- Migration: Add criteria_prompt column to agent_configs table
-- Purpose: Store pre-generated BANT scoring prompts for AI-based lead scoring
-- Date: 2025-08-08

-- Add criteria_prompt column to agent_configs table
ALTER TABLE agent_configs 
ADD COLUMN IF NOT EXISTS criteria_prompt TEXT;

-- Add comment for documentation
COMMENT ON COLUMN agent_configs.criteria_prompt IS 'Pre-generated prompt for AI-based BANT scoring. Contains weights, criteria, and thresholds for lead qualification.';

-- Update existing records with a default prompt if needed
UPDATE agent_configs
SET criteria_prompt = 'You are an AI assistant that scores leads based on BANT criteria.

**Weight Distribution:**
- Budget: 25%
- Authority: 25%
- Need: 25%
- Timeline: 25%
- Contact: 0%

**Scoring Criteria:**
BUDGET (25% of total):
- High (>30M): 25 points
- Medium (10-30M): 15 points
- Low (<10M): 10 points

AUTHORITY (25% of total):
- Individual: 25 points
- Shared: 15 points

NEED (25% of total):
- Investment: 25 points
- Residence: 20 points
- Resale: 15 points

TIMELINE (25% of total):
- 1 month: 25 points
- 1-3 months: 20 points
- 3-6 months: 15 points
- 6+ months: 10 points

**Lead Classification:**
- Priority Lead: ≥90 points
- Hot Lead: ≥70 points
- Warm Lead: ≥50 points
- Cold Lead: <50 points

Calculate the weighted score for each category and provide a total BANT score (0-100).'
WHERE criteria_prompt IS NULL;

-- Create index for faster queries when fetching agent configs
CREATE INDEX IF NOT EXISTS idx_agent_configs_agent_id_criteria 
ON agent_configs(agent_id) 
WHERE criteria_prompt IS NOT NULL;