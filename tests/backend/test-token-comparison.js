#!/usr/bin/env node

/**
 * Test 2: BANT Extraction - Token Usage Comparison
 * Run this to compare with OpenAI Dashboard
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

async function testBANTExtraction() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST 2: BANT EXTRACTION - TOKEN USAGE COMPARISON');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 CHECK YOUR OPENAI DASHBOARD NOW - NOTE THE CURRENT TOKEN COUNT');
  console.log('Dashboard URL: https://platform.openai.com/usage');
  console.log('\nPress Enter when ready to run the test...');
  
  // Wait for user to check dashboard
  await new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
  
  // Test conversation with full BANT information
  const conversation = "I'm looking for a 4-bedroom house in Miami Beach. My budget is 15 million dollars. My wife and I will decide together. We need to move by January 2025 for our kids' school. You can reach me at john@example.com";
  
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

  console.log('\n📝 Test Configuration:');
  console.log('  Model: gpt-5-2025-08-07');
  console.log('  reasoning_effort: low');
  console.log('  max_completion_tokens: 2000');
  console.log(`  System prompt length: ${systemPrompt.length} chars`);
  console.log(`  User message length: ${conversation.length} chars`);
  
  console.log('\n🚀 Calling OpenAI API...');
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 2000,  // Using our optimized setting
      reasoning_effort: 'low'  // Using our optimized setting
    });

    const responseTime = Date.now() - startTime;
    const content = response.choices[0].message.content || '';
    
    console.log(`\n✅ Response received in ${responseTime}ms`);
    console.log('\n📋 BANT Extraction Result:');
    console.log(content);
    
    // Parse and display the JSON
    try {
      const parsed = JSON.parse(content);
      console.log('\n📊 Parsed BANT:');
      console.log(`  Budget: $${parsed.budget?.toLocaleString() || 'Not specified'}`);
      console.log(`  Authority: ${parsed.authority || 'Not specified'}`);
      console.log(`  Need: ${parsed.need || 'Not specified'}`);
      console.log(`  Timeline: ${parsed.timeline || 'Not specified'}`);
      console.log(`  Has Contact: ${parsed.hasContact ? 'Yes' : 'No'}`);
    } catch (e) {
      console.log('  (Could not parse JSON)');
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TOKEN USAGE BREAKDOWN:');
    console.log('═'.repeat(60));
    console.log(`  Prompt Tokens: ${response.usage.prompt_tokens}`);
    console.log(`  Completion Tokens: ${response.usage.completion_tokens}`);
    
    // Check for reasoning tokens
    if (response.usage.completion_tokens_details?.reasoning_tokens) {
      console.log(`    - Reasoning Tokens: ${response.usage.completion_tokens_details.reasoning_tokens}`);
      console.log(`    - Output Tokens: ${response.usage.completion_tokens - response.usage.completion_tokens_details.reasoning_tokens}`);
    }
    
    console.log(`  ──────────────────────────`);
    console.log(`  TOTAL TOKENS: ${response.usage.total_tokens}`);
    console.log('═'.repeat(60));
    
    // Track in database with reasoning tokens
    const { error } = await supabase.from('ai_token_usage').insert({
      organization_id: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
      agent_id: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
      user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
      operation_type: 'bant_extraction_comparison',
      prompt_tokens: response.usage.prompt_tokens || 0,
      completion_tokens: response.usage.completion_tokens || 0,
      reasoning_tokens: response.usage.completion_tokens_details?.reasoning_tokens || 0,
      total_tokens: response.usage.total_tokens || 0,
      model: 'gpt-5-2025-08-07',
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.log('\n⚠️ Failed to track in database:', error.message);
    } else {
      console.log('\n✅ Successfully tracked in database');
    }
    
    // Display full usage object for debugging
    console.log('\n🔍 Full Usage Object (for debugging):');
    console.log(JSON.stringify(response.usage, null, 2));
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 NOW CHECK YOUR OPENAI DASHBOARD AGAIN');
    console.log('═'.repeat(60));
    console.log('\n1. Go to: https://platform.openai.com/usage');
    console.log('2. Note the new token count');
    console.log('3. Calculate the difference');
    console.log(`4. Compare with our tracked total: ${response.usage.total_tokens} tokens`);
    console.log('\nWith our optimizations:');
    console.log('  - reasoning_effort="low" reduces reasoning overhead');
    console.log('  - max_completion_tokens=2000 ensures we get output');
    console.log('  - We now track reasoning tokens separately');
    
    return response.usage.total_tokens;
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return 0;
  }
}

// Run the test
testBANTExtraction()
  .then(tokens => {
    console.log(`\n✨ Test complete. Total tokens used: ${tokens}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });