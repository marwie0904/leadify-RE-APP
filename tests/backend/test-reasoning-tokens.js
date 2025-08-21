#!/usr/bin/env node

/**
 * Test to check if reasoning_effort affects token usage
 */

const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testReasoningTokens() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  REASONING TOKENS TEST');
  console.log('═══════════════════════════════════════════════════════════');
  
  const conversation = "I have a budget of 10 million dollars for a property.";
  const systemPrompt = `Extract BANT information and return JSON with: budget, authority, need, timeline, hasContact`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversation }
  ];

  // Test 1: reasoning_effort = 'low'
  console.log('\n🧪 Test 1: reasoning_effort = "low"');
  try {
    const response1 = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 200,
      reasoning_effort: 'low'
    });
    
    console.log('Response:', response1.choices[0].message.content?.substring(0, 100));
    console.log('\n📊 Usage with LOW reasoning:');
    console.log(JSON.stringify(response1.usage, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: reasoning_effort = 'medium'
  console.log('\n🧪 Test 2: reasoning_effort = "medium"');
  try {
    const response2 = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 200,
      reasoning_effort: 'medium'
    });
    
    console.log('Response:', response2.choices[0].message.content?.substring(0, 100));
    console.log('\n📊 Usage with MEDIUM reasoning:');
    console.log(JSON.stringify(response2.usage, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: reasoning_effort = 'high'
  console.log('\n🧪 Test 3: reasoning_effort = "high"');
  try {
    const response3 = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 200,
      reasoning_effort: 'high'
    });
    
    console.log('Response:', response3.choices[0].message.content?.substring(0, 100));
    console.log('\n📊 Usage with HIGH reasoning:');
    console.log(JSON.stringify(response3.usage, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n⚠️ IMPORTANT: Check your OpenAI Dashboard for the actual tokens billed!');
  console.log('Reasoning tokens may be billed but not shown in the usage object.');
}

testReasoningTokens().catch(console.error);