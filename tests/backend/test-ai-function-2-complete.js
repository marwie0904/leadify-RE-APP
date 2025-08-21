#!/usr/bin/env node

/**
 * Complete test of AI Function 2: BANT Extraction with GPT-5
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
  const systemPrompt = `Extract BANT information from this real estate conversation.

Return a JSON object with:
- budget: number or null
- authority: "single", "dual", "group", or null
- need: string or null
- timeline: string or null
- hasContact: boolean

${previousBantState ? `Previous state: ${JSON.stringify(previousBantState)}` : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversationHistory }
  ];

  console.log('Calling OpenAI for BANT extraction...');
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-5-2025-08-07',
    messages: messages,
    max_completion_tokens: 800,
    reasoning_effort: 'low'  // Use low for simple extraction
  });

  const responseTime = Date.now() - startTime;
  console.log(`OpenAI responded in ${responseTime}ms`);
  
  const rawContent = response.choices[0].message.content;
  console.log(`Response length: ${rawContent.length} chars`);
  
  let bantInfo;
  try {
    // Try to find JSON in the response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      bantInfo = JSON.parse(jsonMatch[0]);
      console.log(`✅ Successfully extracted BANT:`, bantInfo);
    } else {
      console.log(`⚠️ No JSON found in response`);
      bantInfo = { raw: rawContent };
    }
  } catch (e) {
    console.log(`⚠️ Failed to parse JSON: ${e.message}`);
    bantInfo = { raw: rawContent };
  }
  
  // Track the tokens
  if (response.usage) {
    console.log(`Tokens - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
    
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
  console.log('  AI FUNCTION 2: BANT Extraction - Complete Test');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Get baseline token count
  console.log('\nGetting baseline token count...');
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline total (last 30s): ${beforeTotal} tokens`);
  
  // Test conversations
  const testConversations = [
    {
      name: "Simple Budget",
      history: "I have a budget of 10 million dollars"
    },
    {
      name: "Complete BANT",
      history: "I'm looking for a luxury penthouse in Miami. My budget is 25 million. My wife and I will decide together. We want to move in by next summer."
    },
    {
      name: "Conversation Style",
      history: `Agent: What's your budget for the property?
User: Around 8 to 10 million
Agent: Who will be making the decision?
User: Just me
Agent: When do you need to move?
User: Within 6 months`
    },
    {
      name: "Mixed Information",
      history: "Looking for investment property, budget flexible between 5-15M depending on ROI. Need good rental potential. Timeline is ASAP."
    },
    {
      name: "With Contact",
      history: "Budget is 20 million, looking for beachfront property. You can reach me at john@example.com or 555-0123. Need to close by Q2."
    }
  ];
  
  console.log('\n═══ TESTING CONVERSATIONS ═══\n');
  
  let totalTokens = 0;
  let successCount = 0;
  
  for (const test of testConversations) {
    console.log(`\n${test.name}`);
    console.log(`Input: "${test.history.substring(0, 80)}..."`);
    
    try {
      const result = await extractBANTInfo(test.history);
      
      if (result.usage) {
        totalTokens += result.usage.total_tokens;
      }
      
      if (result.bantInfo && !result.bantInfo.raw) {
        successCount++;
      }
      
      console.log('---');
    } catch (error) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }
  
  // Wait for DB updates
  console.log('\nWaiting 3 seconds for database updates...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get tokens after
  const { data: afterData } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens')
    .gte('created_at', new Date(Date.now() - 35000).toISOString())
    .eq('operation_type', 'bant_extraction');
  
  const afterTotal = afterData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  const newTokens = afterTotal - beforeTotal;
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SUCCESSFUL EXTRACTIONS: ${successCount}/${testConversations.length}`);
  console.log(`  TOKENS TRACKED IN DB: ${newTokens}`);
  console.log(`  TOKENS FROM OPENAI: ${totalTokens}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  console.log('\n📊 Please check your OpenAI Dashboard');
  console.log(`Compare with our total: ${totalTokens} tokens`);
  console.log('\nModel: GPT-5-2025-08-07');
}

testBANTExtraction().catch(console.error);