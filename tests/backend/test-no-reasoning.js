#!/usr/bin/env node

/**
 * Test GPT-5 without reasoning_effort parameter
 */

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testWithoutReasoning() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST WITHOUT reasoning_effort PARAMETER');
  console.log('═══════════════════════════════════════════════════════════');
  
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

  console.log('\n🧪 Test: GPT-5 WITHOUT reasoning_effort');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 200
      // NO reasoning_effort parameter
    });
    
    console.log('\n📝 Response:', response.choices[0].message.content);
    console.log('\n📊 Usage WITHOUT reasoning_effort:');
    console.log(JSON.stringify(response.usage, null, 2));
    
    console.log('\n🔍 Key Observations:');
    if (response.usage?.completion_tokens_details?.reasoning_tokens) {
      console.log(`⚠️ Reasoning tokens: ${response.usage.completion_tokens_details.reasoning_tokens}`);
    } else {
      console.log('✅ No reasoning tokens reported');
    }
    console.log(`Total tokens: ${response.usage?.total_tokens}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n📊 CHECK YOUR OPENAI DASHBOARD');
  console.log('Compare the actual billed tokens with what we see here.');
}

testWithoutReasoning().catch(console.error);