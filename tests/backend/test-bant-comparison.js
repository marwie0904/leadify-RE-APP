#!/usr/bin/env node

/**
 * Test 2: BANT Extraction - Direct Token Usage Comparison
 * Simplified version without stdin issues
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
  console.log('\n📊 CHECK YOUR OPENAI DASHBOARD BEFORE RUNNING THIS TEST');
  console.log('Dashboard URL: https://platform.openai.com/usage');
  console.log('\nStarting test in 3 seconds...\n');
  
  // Brief delay to allow checking dashboard
  await new Promise(resolve => setTimeout(resolve, 3000));
  
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

  console.log('📝 Test Configuration:');
  console.log('  Model: gpt-5-2025-08-07');
  console.log('  reasoning_effort: low (OPTIMIZED)');
  console.log('  max_completion_tokens: 2000 (INCREASED)');
  console.log(`  System prompt: ${systemPrompt.length} chars`);
  console.log(`  User message: ${conversation.length} chars`);
  
  console.log('\n🚀 Calling OpenAI API...');
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 2000,  // INCREASED from default
      reasoning_effort: 'low'  // OPTIMIZED from medium/high
    });

    const responseTime = Date.now() - startTime;
    const content = response.choices[0].message.content || '';
    
    console.log(`\n✅ Response received in ${responseTime}ms`);
    console.log('\n📋 BANT Extraction Result:');
    console.log(content);
    
    // Parse and display the JSON
    try {
      const parsed = JSON.parse(content);
      console.log('\n📊 Parsed BANT Data:');
      console.log(`  Budget: $${parsed.budget?.toLocaleString() || 'Not specified'}`);
      console.log(`  Authority: ${parsed.authority || 'Not specified'}`);
      console.log(`  Need: ${parsed.need || 'Not specified'}`);
      console.log(`  Timeline: ${parsed.timeline || 'Not specified'}`);
      console.log(`  Has Contact: ${parsed.hasContact ? 'Yes' : 'No'}`);
    } catch (e) {
      console.log('  (Could not parse JSON)');
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              TOKEN USAGE BREAKDOWN                         ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  Prompt Tokens:      ${String(response.usage.prompt_tokens).padEnd(37)}║`);
    console.log(`║  Completion Tokens:  ${String(response.usage.completion_tokens).padEnd(37)}║`);
    
    // Check for reasoning tokens
    if (response.usage.completion_tokens_details?.reasoning_tokens) {
      const reasoning = response.usage.completion_tokens_details.reasoning_tokens;
      const output = response.usage.completion_tokens - reasoning;
      console.log(`║    - Reasoning:      ${String(reasoning).padEnd(37)}║`);
      console.log(`║    - Output:         ${String(output).padEnd(37)}║`);
    }
    
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║  TOTAL TOKENS:       ${String(response.usage.total_tokens).padEnd(37)}║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    // Track in database with reasoning tokens
    const { error } = await supabase.from('ai_token_usage').insert({
      organization_id: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
      agent_id: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
      user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
      operation_type: 'bant_extraction_test2',
      prompt_tokens: response.usage.prompt_tokens || 0,
      completion_tokens: response.usage.completion_tokens || 0,
      reasoning_tokens: response.usage.completion_tokens_details?.reasoning_tokens || 0,
      total_tokens: response.usage.total_tokens || 0,
      model: 'gpt-5-2025-08-07',
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.log('\n⚠️ Database tracking failed:', error.message);
    } else {
      console.log('\n✅ Successfully tracked in database with reasoning_tokens');
    }
    
    // Check database for recent entries
    const { data: recentEntries } = await supabase
      .from('ai_token_usage')
      .select('total_tokens, reasoning_tokens, created_at')
      .eq('operation_type', 'bant_extraction_test2')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (recentEntries && recentEntries.length > 0) {
      console.log('\n📊 Database Entry Confirmed:');
      console.log(`  Total: ${recentEntries[0].total_tokens} tokens`);
      console.log(`  Reasoning: ${recentEntries[0].reasoning_tokens || 0} tokens`);
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 ACTION REQUIRED: CHECK YOUR OPENAI DASHBOARD NOW');
    console.log('═'.repeat(60));
    console.log('\n1. Go to: https://platform.openai.com/usage');
    console.log('2. Check the new token count');
    console.log('3. Calculate the difference from before the test');
    console.log(`4. Compare with our tracked: ${response.usage.total_tokens} tokens`);
    
    console.log('\n💡 Key Improvements Applied:');
    console.log('  ✓ reasoning_effort="low" (reduces ~128 hidden tokens)');
    console.log('  ✓ max_completion_tokens=2000 (prevents cutoff)');
    console.log('  ✓ Tracking reasoning_tokens separately');
    console.log('  ✓ Database now includes reasoning_tokens column');
    
    console.log('\n📈 Expected Result:');
    console.log('  The OpenAI dashboard increase should now be much closer');
    console.log(`  to our tracked ${response.usage.total_tokens} tokens (within 5-10%)`);
    
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
console.log('Starting BANT Extraction Token Comparison Test...\n');
testBANTExtraction()
  .then(tokens => {
    console.log(`\n✨ Test complete!`);
    console.log(`📊 Total tokens tracked: ${tokens}`);
    console.log('\nNow compare this with your OpenAI dashboard increase.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });