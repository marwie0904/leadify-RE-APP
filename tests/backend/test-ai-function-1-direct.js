#!/usr/bin/env node

/**
 * Direct test of AI Function 1: Intent Classification
 * Directly calls the masterIntentClassifier function
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Track token usage
async function trackTokenUsage({ organizationId, agentId, operationType, usage }) {
  if (!usage) return;
  
  await supabase.from('ai_token_usage').insert({
    organization_id: organizationId || 'test-org',
    agent_id: agentId || 'test-agent',
    user_id: 'test-user',
    operation_type: operationType,
    prompt_tokens: usage.prompt_tokens || 0,
    completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    model: 'gpt-5-2025-08-07',
    created_at: new Date().toISOString()
  });
}

// Direct implementation of masterIntentClassifier
async function masterIntentClassifier(userMessage, agent = null) {
  const systemPrompt = `You are a classification system. Analyze the user's message and determine their primary intent.

Classify the intent as one of:
- BANT: If discussing budget, authority, need, or timeline for purchasing
- ESTIMATION: If asking for property estimates, valuations, or pricing
- CONTACT: If providing or updating contact information
- GENERAL: For general questions or conversation

Return ONLY the classification word, nothing else.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  console.log('Calling OpenAI for intent classification...');
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5-2025-08-07',
    messages: messages,
    temperature: 0.3,
    max_tokens: 10
  });

  const responseTime = Date.now() - startTime;
  console.log(`OpenAI responded in ${responseTime}ms`);
  
  const intent = response.choices[0].message.content.trim().toUpperCase();
  console.log(`Classified intent: ${intent}`);
  
  // Track the tokens
  if (response.usage) {
    console.log(`Tokens used - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
    
    await trackTokenUsage({
      organizationId: agent?.organization_id || 'test-org',
      agentId: agent?.id || 'test-agent',
      operationType: 'intent_classification',
      usage: response.usage
    });
  }
  
  return { intent, usage: response.usage };
}

async function testIntentClassification() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AI FUNCTION 1: Intent Classification (Direct Test)');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Get baseline token count
  console.log('\nGetting baseline token count...');
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline total (last 30s): ${beforeTotal} tokens`);
  
  // Test messages
  const testMessages = [
    "I have a budget of 50 million dollars for buying a house",
    "What's the estimated value of properties in Miami?",
    "My email is john@example.com",
    "What areas do you cover?"
  ];
  
  console.log('\n═══ TESTING MESSAGES ═══\n');
  
  let totalTokens = 0;
  
  for (const message of testMessages) {
    console.log(`Message: "${message}"`);
    
    try {
      const result = await masterIntentClassifier(message);
      
      if (result.usage) {
        totalTokens += result.usage.total_tokens;
      }
      
      console.log('---\n');
    } catch (error) {
      console.error(`Error: ${error.message}\n`);
    }
  }
  
  // Wait for DB updates
  console.log('Waiting 3 seconds for database updates...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get tokens after
  const { data: afterData } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens')
    .gte('created_at', new Date(Date.now() - 35000).toISOString())
    .eq('operation_type', 'intent_classification');
  
  const afterTotal = afterData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  const newTokens = afterTotal - beforeTotal;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  TOKENS TRACKED IN DB: ${newTokens}`);
  console.log(`  TOKENS FROM OPENAI: ${totalTokens}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n📊 Please check your OpenAI Dashboard');
  console.log(`Compare with our total: ${totalTokens} tokens`);
}

testIntentClassification().catch(console.error);