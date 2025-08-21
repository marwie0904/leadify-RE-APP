#!/usr/bin/env node

/**
 * Optimized BANT Extraction for GPT-5
 * Adjusting parameters to get actual output instead of just reasoning
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testOptimizedBANT() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OPTIMIZED BANT EXTRACTION FOR GPT-5');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Simple test case
  const conversation = "I have a budget of 10 million dollars. I need a 5-bedroom house. My wife and I will decide together. We want to move in 3 months.";
  
  // Simpler prompt to reduce reasoning overhead
  const systemPrompt = `Extract BANT: Return JSON with budget(number), authority(single/dual/group), need(string), timeline(string), hasContact(boolean)`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversation }
  ];

  console.log('\n📝 Input:', conversation);
  console.log('System prompt length:', systemPrompt.length, 'chars');
  
  // Test 1: With higher max_completion_tokens to allow for reasoning + output
  console.log('\n🧪 Test 1: max_completion_tokens = 1000');
  try {
    const response1 = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 1000,
      reasoning_effort: 'low'
    });
    
    const content1 = response1.choices[0].message.content;
    console.log('Response:', content1 || '[EMPTY]');
    console.log('\n📊 Token Usage:');
    console.log(`  Prompt: ${response1.usage?.prompt_tokens}`);
    console.log(`  Completion: ${response1.usage?.completion_tokens}`);
    console.log(`  - Reasoning: ${response1.usage?.completion_tokens_details?.reasoning_tokens}`);
    console.log(`  - Output: ${(response1.usage?.completion_tokens || 0) - (response1.usage?.completion_tokens_details?.reasoning_tokens || 0)}`);
    console.log(`  TOTAL: ${response1.usage?.total_tokens}`);
    
    // Track in DB
    if (response1.usage) {
      await supabase.from('ai_token_usage').insert({
        organization_id: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
        agent_id: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
        operation_type: 'bant_optimized_test',
        prompt_tokens: response1.usage.prompt_tokens || 0,
        completion_tokens: response1.usage.completion_tokens || 0,
        total_tokens: response1.usage.total_tokens || 0,
        model: 'gpt-5-2025-08-07',
        created_at: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Without reasoning_effort to see default behavior
  console.log('\n🧪 Test 2: No reasoning_effort parameter, max_completion_tokens = 1000');
  try {
    const response2 = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 1000
      // No reasoning_effort
    });
    
    const content2 = response2.choices[0].message.content;
    console.log('Response:', content2 || '[EMPTY]');
    console.log('\n📊 Token Usage:');
    console.log(`  Prompt: ${response2.usage?.prompt_tokens}`);
    console.log(`  Completion: ${response2.usage?.completion_tokens}`);
    console.log(`  - Reasoning: ${response2.usage?.completion_tokens_details?.reasoning_tokens}`);
    console.log(`  - Output: ${(response2.usage?.completion_tokens || 0) - (response2.usage?.completion_tokens_details?.reasoning_tokens || 0)}`);
    console.log(`  TOTAL: ${response2.usage?.total_tokens}`);
    
    // Track in DB
    if (response2.usage) {
      await supabase.from('ai_token_usage').insert({
        organization_id: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
        agent_id: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
        operation_type: 'bant_optimized_test_2',
        prompt_tokens: response2.usage.prompt_tokens || 0,
        completion_tokens: response2.usage.completion_tokens || 0,
        total_tokens: response2.usage.total_tokens || 0,
        model: 'gpt-5-2025-08-07',
        created_at: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 CHECK YOUR OPENAI DASHBOARD');
  console.log('Note the actual billed tokens vs what we tracked above');
  console.log('The difference is likely hidden reasoning tokens!');
}

testOptimizedBANT().catch(console.error);