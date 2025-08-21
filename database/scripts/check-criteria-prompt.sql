-- Check where the AI scoring prompts are stored in the database
-- Location: agent_configs table, criteria_prompt column

-- View all agents with their scoring prompt status
SELECT 
  ac.agent_id,
  a.name as agent_name,
  CASE 
    WHEN ac.criteria_prompt IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_ai_scoring_prompt,
  LENGTH(ac.criteria_prompt) as prompt_length,
  ac.created_at,
  ac.updated_at
FROM agent_configs ac
LEFT JOIN agents a ON a.id = ac.agent_id
ORDER BY ac.updated_at DESC;

-- View a sample of the actual prompt (first 500 characters)
SELECT 
  agent_id,
  SUBSTRING(criteria_prompt, 1, 500) as prompt_preview
FROM agent_configs
WHERE criteria_prompt IS NOT NULL
LIMIT 1;

-- Check specific agent's scoring configuration
-- Replace 'YOUR_AGENT_ID' with actual agent ID
SELECT 
  agent_id,
  criteria_prompt,
  system_prompt,
  fallback_prompt
FROM agent_configs
WHERE agent_id = 'YOUR_AGENT_ID';