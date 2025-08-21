-- Migration to make placeholder_text and help_text fields nullable
-- This allows for a simpler BANT questions form with only the question text required

-- Make placeholder_text nullable (it might already be nullable, but this ensures it)
ALTER TABLE agent_bant_questions 
ALTER COLUMN placeholder_text DROP NOT NULL;

-- Make help_text nullable (it might already be nullable, but this ensures it) 
ALTER TABLE agent_bant_questions 
ALTER COLUMN help_text DROP NOT NULL;

-- Update existing default questions to remove placeholder and help text
UPDATE agent_bant_questions 
SET placeholder_text = NULL, help_text = NULL 
WHERE agent_id = '00000000-0000-0000-0000-000000000000';

-- Add comment to table documenting the simplified structure
COMMENT ON TABLE agent_bant_questions IS 'Stores custom BANT questions for each agent. Only question_text is required for a simplified user experience.';