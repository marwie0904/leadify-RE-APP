#!/usr/bin/env node

/**
 * Direct test of AI Function 2: BANT Extraction
 * Tests the BANT extraction functionality
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

// Direct implementation of BANT extraction
async function extractBANTInfo(conversationHistory, previousBantState = null) {
  const systemPrompt = `Extract BANT (Budget, Authority, Need, Timeline) information from the real estate conversation.

Previous BANT state: ${JSON.stringify(previousBantState || {})}

Return ONLY a valid JSON object with these exact fields:
- budget: number or null (in dollars)
- authority: "single" or "dual" or "group" or null
- need: string or null (what they're looking for)
- timeline: string or null (when they want to buy)
- hasContact: true or false

Example response:
{"budget": 30000000, "authority": "dual", "need": "5 bedroom home", "timeline": "3 months", "hasContact": false}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversationHistory }
  ];

  console.log('Calling OpenAI for BANT extraction...');
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5-2025-08-07',
    messages: messages,
    max_completion_tokens: 500,
    reasoning_effort: 'medium'
  });

  const responseTime = Date.now() - startTime;
  console.log(`OpenAI responded in ${responseTime}ms`);
  
  const rawContent = response.choices[0].message.content;
  console.log(`Raw response: "${rawContent}"`);
  
  let bantInfo;
  try {
    bantInfo = JSON.parse(rawContent);
    console.log(`Extracted BANT:`, bantInfo);
  } catch (e) {
    console.log(`Failed to parse JSON, using raw content`);
    bantInfo = { raw: rawContent };
  }
  
  // Track the tokens
  if (response.usage) {
    console.log(`Tokens used - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
    
    await trackTokenUsage({
      organizationId: 'test-org',
      agentId: 'test-agent',
      operationType: 'bant_extraction',
      usage: response.usage
    });
  }
  
  return { bantInfo, usage: response.usage };
}

async function testBANTExtraction() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AI FUNCTION 2: BANT Extraction (Direct Test)');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Get baseline token count
  console.log('\nGetting baseline token count...');
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline total (last 30s): ${beforeTotal} tokens`);
  
  // Test conversations with BANT information
  const testConversations = [
    {
      name: "Full BANT",
      history: "User: I'm looking for a house with a budget of 30 million dollars. I need a 5 bedroom home for my family. We want to move in within 3 months. Both my wife and I will be making the decision together."
    },
    {
      name: "Partial BANT",
      history: "User: My budget is around 5 million. I'm looking for a condo downtown."
    },
    {
      name: "With Previous State",
      history: "User: Actually, I think we can go up to 35 million for the right property.",
      previousState: { budget: 30000000, authority: "dual", need: "5 bedroom home", timeline: "3 months" }
    },
    {
      name: "Complex Conversation",
      history: `Agent: How can I help you today?
User: I'm interested in buying property in Miami
Agent: What's your budget?
User: Between 10 and 15 million
Agent: When are you looking to purchase?
User: As soon as possible, ideally within the next month
Agent: Who will be making the decision?
User: Just me, I'm buying it as an investment`
    }
  ];
  
  console.log('\n═══ TESTING CONVERSATIONS ═══\n');
  
  let totalTokens = 0;
  
  for (const test of testConversations) {
    console.log(`Test: ${test.name}`);
    console.log(`Conversation: "${test.history.substring(0, 100)}..."`);
    
    try {
      const result = await extractBANTInfo(test.history, test.previousState);
      
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
    .eq('operation_type', 'bant_extraction');
  
  const afterTotal = afterData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  const newTokens = afterTotal - beforeTotal;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  TOKENS TRACKED IN DB: ${newTokens}`);
  console.log(`  TOKENS FROM OPENAI: ${totalTokens}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n📊 Please check your OpenAI Dashboard');
  console.log(`Compare with our total: ${totalTokens} tokens`);
  console.log('\nNote: BANT Extraction uses GPT-5-2025-08-07 model');
}

testBANTExtraction().catch(console.error);