-- Enhanced AI Token Usage Table Migration
-- This migration adds missing fields to the ai_token_usage table

-- Add model_category column for mapping custom model names to standard GPT models
ALTER TABLE public.ai_token_usage 
ADD COLUMN IF NOT EXISTS model_category TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_organization_created 
ON public.ai_token_usage(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_operation_type 
ON public.ai_token_usage(operation_type);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_model_category 
ON public.ai_token_usage(model_category);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_conversation 
ON public.ai_token_usage(conversation_id);

-- Create a materialized view for daily aggregates (optional for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_token_usage_daily AS
SELECT 
  DATE(created_at) as date,
  organization_id,
  operation_type,
  model_category,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(total_cost) as total_cost,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time
FROM public.ai_token_usage
GROUP BY DATE(created_at), organization_id, operation_type, model_category;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_token_usage_daily_unique 
ON ai_token_usage_daily(date, organization_id, operation_type, model_category);

-- Create a function to refresh the materialized view (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_ai_token_usage_daily()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_token_usage_daily;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE public.ai_token_usage IS 'Tracks all AI model token usage for analytics and cost tracking';
COMMENT ON COLUMN public.ai_token_usage.model_category IS 'Standardized model category (gpt-4 or gpt-3.5-turbo) for cost calculation';
COMMENT ON COLUMN public.ai_token_usage.operation_type IS 'Type of operation: chat_reply, bant_extraction, lead_scoring, intent_classification, estimation';