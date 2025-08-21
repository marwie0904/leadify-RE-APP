#!/usr/bin/env node

/**
 * BANT Test Scenario 1: Simple Budget Only
 * Testing individual scenario to track exact token usage
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

async function testScenario1() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BANT SCENARIO 1: Simple Budget Only');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Record OpenAI dashboard reading BEFORE test
  console.log('\n📊 BEFORE TEST:');
  console.log('Check your OpenAI Dashboard token count before and after this test');
  
  // Get baseline from database
  const { data: beforeDB } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  const beforeDBTotal = beforeDB?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Database baseline (last 60s): ${beforeDBTotal} tokens`);
  
  // The test conversation
  const conversation = "I have a budget of 10 million dollars for a property.";
  
  const systemPrompt = `You are analyzing a real estate conversation to extract BANT information.

Extract and return a JSON object with these fields:
- budget: number (in dollars) or null if not mentioned
- authority: "single", "dual", "group", or null if not mentioned  
- need: string describing what they want or null if not mentioned
- timeline: string describing when they want to buy or null if not mentioned
- hasContact: true if email/phone provided, false otherwise

Return ONLY the JSON object, no explanation.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Extract BANT from this conversation:\n${conversation}` }
  ];

  console.log('\n📝 Test Details:');
  console.log(`Input: "${conversation}"`);
  console.log(`System Prompt Length: ${systemPrompt.length} chars`);
  console.log(`User Prompt Length: ${conversation.length} chars`);
  
  console.log('\n🚀 Calling OpenAI GPT-5-2025-08-07...');
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 500,
      reasoning_effort: 'low'
    });

    const responseTime = Date.now() - startTime;
    const rawContent = response.choices[0].message.content || '';
    
    console.log(`\n✅ Response received in ${responseTime}ms`);
    console.log(`Response: ${rawContent}`);
    
    // Parse JSON
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('\n📋 Parsed BANT:');
        console.log(JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.log('Failed to parse JSON');
    }
    
    // Display token usage
    if (response.usage) {
      console.log('\n📊 TOKEN USAGE FROM OPENAI RESPONSE:');
      console.log(`  Prompt Tokens: ${response.usage.prompt_tokens}`);
      console.log(`  Completion Tokens: ${response.usage.completion_tokens}`);
      console.log(`  TOTAL TOKENS: ${response.usage.total_tokens}`);
      
      // Check ALL fields in usage object
      console.log('\n🔍 FULL USAGE OBJECT:');
      console.log(JSON.stringify(response.usage, null, 2));
      
      // Track in database
      const { error } = await supabase.from('ai_token_usage').insert({
        organization_id: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
        agent_id: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
        operation_type: 'bant_extraction_test_1',
        prompt_tokens: response.usage.prompt_tokens || 0,
        completion_tokens: response.usage.completion_tokens || 0,
        total_tokens: response.usage.total_tokens || 0,
        model: 'gpt-5-2025-08-07',
        created_at: new Date().toISOString()
      });
      
      if (error) {
        console.log('Failed to track in database:', error.message);
      } else {
        console.log('✅ Tracked in database');
      }
    }
    
    // Check for reasoning tokens
    if (response.usage?.reasoning_tokens) {
      console.log(`\n⚠️ REASONING TOKENS DETECTED: ${response.usage.reasoning_tokens}`);
      console.log('These may not be included in total_tokens but are billed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Wait and check database
  console.log('\n⏳ Waiting 3 seconds for database sync...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const { data: afterDB } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 65000).toISOString());
  
  const afterDBTotal = afterDB?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  const dbIncrease = afterDBTotal - beforeDBTotal;
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(`Database tokens increased by: ${dbIncrease}`);
  console.log('\n🔍 NOW CHECK YOUR OPENAI DASHBOARD');
  console.log('How many tokens did it increase by?');
  console.log('Compare with our reported total above.');
}

// Run test
testScenario1().catch(console.error);