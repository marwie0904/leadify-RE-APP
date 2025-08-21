-- Migration: Update to GPT-5 Models and Enhanced Token Tracking
-- Date: 2025-08-13
-- Description: Updates AI token usage tracking for GPT-5 models with new pricing structure

-- Add new columns if they don't exist
ALTER TABLE public.ai_token_usage 
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_cached BOOLEAN DEFAULT FALSE;

-- Update model names in existing records (optional - for historical data)
-- This updates old model names to new GPT-5 variants
UPDATE public.ai_token_usage 
SET 
  model = CASE 
    WHEN model = 'gpt-4.1-mini-2025-04-14' THEN 'gpt-5-mini'
    WHEN model = 'gpt-4.1-nano-2025-04-14' THEN 'gpt-5-nano'
    ELSE model
  END,
  model_category = CASE 
    WHEN model IN ('gpt-4.1-mini-2025-04-14', 'gpt-5-mini') THEN 'gpt-5-mini'
    WHEN model IN ('gpt-4.1-nano-2025-04-14', 'gpt-5-nano') THEN 'gpt-5-nano'
    WHEN model = 'gpt-4-turbo-preview' THEN 'gpt-4-turbo'
    WHEN model = 'text-embedding-ada-002' THEN 'text-embedding-ada-002'
    WHEN model = 'text-embedding-3-small' THEN 'text-embedding-3-small'
    ELSE model_category
  END
WHERE model IN ('gpt-4.1-mini-2025-04-14', 'gpt-4.1-nano-2025-04-14');

-- Update cost calculations for historical data with new pricing
-- This recalculates costs based on the new GPT-5 pricing structure
UPDATE public.ai_token_usage 
SET 
  total_cost = CASE 
    -- GPT-5 Mini pricing
    WHEN model_category = 'gpt-5-mini' AND NOT is_cached THEN 
      ((prompt_tokens * 0.00025 + completion_tokens * 0.002) / 1000)
    WHEN model_category = 'gpt-5-mini' AND is_cached THEN 
      ((prompt_tokens * 0.000025 + completion_tokens * 0.002) / 1000)
    
    -- GPT-5 Nano pricing
    WHEN model_category = 'gpt-5-nano' AND NOT is_cached THEN 
      ((prompt_tokens * 0.00005 + completion_tokens * 0.0004) / 1000)
    WHEN model_category = 'gpt-5-nano' AND is_cached THEN 
      ((prompt_tokens * 0.000005 + completion_tokens * 0.0004) / 1000)
    
    -- GPT-4 Turbo pricing (keep existing)
    WHEN model_category = 'gpt-4-turbo' THEN 
      ((prompt_tokens * 0.01 + completion_tokens * 0.03) / 1000)
    
    -- Embedding models
    WHEN model_category = 'text-embedding-ada-002' THEN 
      ((COALESCE(input_tokens, prompt_tokens, 0) * 0.0001) / 1000)
    WHEN model_category = 'text-embedding-3-small' THEN 
      ((COALESCE(input_tokens, prompt_tokens, 0) * 0.00002) / 1000)
    
    ELSE total_cost
  END,
  cost_per_1k_prompt = CASE 
    WHEN model_category = 'gpt-5-mini' AND NOT is_cached THEN 0.00025
    WHEN model_category = 'gpt-5-mini' AND is_cached THEN 0.000025
    WHEN model_category = 'gpt-5-nano' AND NOT is_cached THEN 0.00005
    WHEN model_category = 'gpt-5-nano' AND is_cached THEN 0.000005
    WHEN model_category = 'gpt-4-turbo' THEN 0.01
    WHEN model_category = 'text-embedding-ada-002' THEN 0.0001
    WHEN model_category = 'text-embedding-3-small' THEN 0.00002
    ELSE cost_per_1k_prompt
  END,
  cost_per_1k_completion = CASE 
    WHEN model_category = 'gpt-5-mini' THEN 0.002
    WHEN model_category = 'gpt-5-nano' THEN 0.0004
    WHEN model_category = 'gpt-4-turbo' THEN 0.03
    WHEN model_category IN ('text-embedding-ada-002', 'text-embedding-3-small') THEN 0
    ELSE cost_per_1k_completion
  END
WHERE model_category IN ('gpt-5-mini', 'gpt-5-nano', 'gpt-4-turbo', 'text-embedding-ada-002', 'text-embedding-3-small')
  OR model IN ('gpt-4.1-mini-2025-04-14', 'gpt-4.1-nano-2025-04-14');

-- Create indexes for better query performance on new columns
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_is_cached 
ON public.ai_token_usage(is_cached);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_input_tokens 
ON public.ai_token_usage(input_tokens) 
WHERE input_tokens > 0;

-- Update the materialized view if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'ai_token_usage_daily'
  ) THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ai_token_usage_daily;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_token_usage.input_tokens IS 'Number of input tokens for embedding models';
COMMENT ON COLUMN public.ai_token_usage.is_cached IS 'Whether cached pricing was applied for this request';

-- Create a summary view for GPT-5 cost savings analysis
CREATE OR REPLACE VIEW gpt5_cost_savings AS
SELECT 
  organization_id,
  DATE(created_at) as date,
  model_category,
  COUNT(*) as request_count,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(input_tokens) as total_input_tokens,
  SUM(total_cost) as actual_cost,
  -- Calculate what it would have cost with old GPT-4 pricing
  SUM(
    CASE 
      WHEN model_category IN ('gpt-5-mini', 'gpt-5-nano') THEN
        ((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000)
      ELSE total_cost
    END
  ) as old_gpt4_cost,
  -- Calculate savings
  SUM(
    CASE 
      WHEN model_category IN ('gpt-5-mini', 'gpt-5-nano') THEN
        ((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000) - total_cost
      ELSE 0
    END
  ) as cost_savings,
  -- Calculate savings percentage
  CASE 
    WHEN SUM(CASE WHEN model_category IN ('gpt-5-mini', 'gpt-5-nano') THEN 
      ((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000) ELSE 0 END) > 0 
    THEN 
      (SUM(CASE WHEN model_category IN ('gpt-5-mini', 'gpt-5-nano') THEN
        ((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000) - total_cost ELSE 0 END) / 
       SUM(CASE WHEN model_category IN ('gpt-5-mini', 'gpt-5-nano') THEN
        ((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000) ELSE 0 END)) * 100
    ELSE 0
  END as savings_percentage
FROM public.ai_token_usage
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY organization_id, DATE(created_at), model_category
ORDER BY date DESC, organization_id;