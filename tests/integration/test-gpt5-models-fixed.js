#!/usr/bin/env node

/**
 * Test GPT-5 Models with Correct Parameters
 */

require('dotenv').config();
const OpenAI = require('openai');
const { trackTestTokens } = require('./test-token-tracker');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testGPT5Model(modelName) {
  console.log(`\n🧪 Testing model: ${modelName}`);
  console.log('=' .repeat(50));
  
  try {
    const startTime = Date.now();
    
    // GPT-5 models require temperature to be 1 (default)
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Keep responses very brief.'
        },
        {
          role: 'user',
          content: 'What is 2+2? Just give the number.'
        }
      ],
      max_completion_tokens: 50
      // No temperature parameter - use default
    });
    
    // Track token usage
    await trackTestTokens(response, 'model_test', 'test-gpt5-models-fixed.js');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Model ${modelName} is WORKING!`);
    console.log(`📝 Response: ${response.choices[0].message.content}`);
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📊 Model ID: ${response.model}`);
    console.log(`📊 Usage:`, {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens
    });
    
    // Test streaming capability
    console.log(`\n🔄 Testing streaming for ${modelName}...`);
    const streamResponse = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Say "streaming works"'
        }
      ],
      stream: true,
      max_completion_tokens: 20
    });
    
    let streamContent = '';
    for await (const chunk of streamResponse) {
      if (chunk.choices[0]?.delta?.content) {
        streamContent += chunk.choices[0].delta.content;
      }
    }
    console.log(`✅ Streaming works! Response: ${streamContent}`);
    
    return true;
  } catch (error) {
    console.log(`❌ Model ${modelName} FAILED`);
    console.log(`🔴 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📋 Status: ${error.response.status}`);
      console.log(`📋 Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

async function testModels() {
  console.log('🚀 Testing GPT-5 Models with Correct Parameters');
  console.log('=' .repeat(50));
  
  // Test GPT-5 models
  const gpt5Models = [
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07'
  ];
  
  for (const model of gpt5Models) {
    await testGPT5Model(model);
  }
  
  // Also test what parameters are supported
  console.log('\n📋 Testing Parameter Support for GPT-5 Mini');
  console.log('=' .repeat(50));
  
  const testParams = [
    { name: 'temperature=1', params: { temperature: 1 } },
    { name: 'temperature=0.5', params: { temperature: 0.5 } },
    { name: 'top_p=0.9', params: { top_p: 0.9 } },
    { name: 'frequency_penalty=0.5', params: { frequency_penalty: 0.5 } },
    { name: 'presence_penalty=0.5', params: { presence_penalty: 0.5 } }
  ];
  
  for (const test of testParams) {
    try {
      await openai.chat.completions.create({
        model: 'gpt-5-mini-2025-08-07',
        messages: [{ role: 'user', content: 'Hi' }],
        max_completion_tokens: 10,
        ...test.params
      });
      console.log(`✅ ${test.name}: SUPPORTED`);
    } catch (error) {
      console.log(`❌ ${test.name}: NOT SUPPORTED - ${error.message}`);
    }
  }
}

// Run the tests
testModels().catch(console.error);