// Token tracking utility for test files
// This ensures test OpenAI API calls are tracked in the database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Track token usage from test files to the database
 * @param {Object} response - OpenAI API response object
 * @param {string} operation - Operation type (e.g., 'bant_extraction', 'intent_classification')
 * @param {string} testFile - Name of the test file making the call
 */
async function trackTestTokens(response, operation, testFile = 'unknown') {
  try {
    // Check if response has usage data
    if (!response?.usage) {
      console.log(`[TEST TOKEN TRACKER] No usage data in response for ${operation}`);
      return;
    }
    
    // Insert token usage record
    const { data, error } = await supabase
      .from('ai_token_usage')
      .insert({
        user_id: 'test-user',
        operation_type: `test_${operation}`,
        prompt_tokens: response.usage.prompt_tokens || 0,
        completion_tokens: response.usage.completion_tokens || 0,
        total_tokens: response.usage.total_tokens || 0,
        model: response.model || 'unknown',
        agent_id: 'test-agent',
        metadata: { test_file: testFile }
      });
    
    if (error) {
      console.error(`[TEST TOKEN TRACKER] Error inserting usage:`, error);
    } else {
      console.log(`[TEST TOKEN TRACKER] ✅ Tracked ${response.usage.total_tokens} tokens for ${operation} from ${testFile}`);
    }
  } catch (err) {
    console.error(`[TEST TOKEN TRACKER] Unexpected error:`, err);
  }
}

module.exports = { trackTestTokens };