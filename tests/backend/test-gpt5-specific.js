/**
 * Test GPT-5 models with specific version names
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testGPT5Models() {
  console.log('Testing GPT-5 models with date-versioned names...\n');

  // Test GPT-5 Mini
  console.log('1. Testing gpt-5-mini-2025-08-07...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and tell me your model name.' }
      ],
      max_completion_tokens: 50
    });
    
    console.log('✅ GPT-5 Mini SUCCESS!');
    console.log('Response:', response.choices[0].message.content);
    console.log('Tokens used:', response.usage.total_tokens);
    console.log('Model:', response.model);
  } catch (error) {
    console.log('❌ GPT-5 Mini FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n2. Testing gpt-5-nano-2025-08-07...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'system', content: 'Classify as: question or statement.' },
        { role: 'user', content: 'What is the weather today?' }
      ],
      max_completion_tokens: 10
    });
    
    console.log('✅ GPT-5 Nano SUCCESS!');
    console.log('Response:', response.choices[0].message.content);
    console.log('Tokens used:', response.usage.total_tokens);
    console.log('Model:', response.model);
  } catch (error) {
    console.log('❌ GPT-5 Nano FAILED');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Also test if the models work with the old max_tokens parameter
  console.log('\n3. Testing with max_tokens parameter (legacy)...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'user', content: 'Count to 5.' }
      ],
      max_tokens: 20
    });
    
    console.log('✅ Legacy parameter (max_tokens) works!');
    console.log('Response:', response.choices[0].message.content);
  } catch (error) {
    console.log('❌ Legacy parameter (max_tokens) failed');
    console.log('Error:', error.message);
  }
}

testGPT5Models().catch(console.error);