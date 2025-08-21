#!/usr/bin/env node

/**
 * Test GPT-5 Models Availability
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testModel(modelName) {
  console.log(`\n🧪 Testing model: ${modelName}`);
  console.log('=' .repeat(50));
  
  try {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Keep responses very brief.'
        },
        {
          role: 'user',
          content: 'Say "Hello, I am working!" if you can process this message.'
        }
      ],
      max_completion_tokens: 50,
      temperature: 0
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Model ${modelName} is WORKING!`);
    console.log(`📝 Response: ${response.choices[0].message.content}`);
    console.log(`⏱️ Response time: ${duration}ms`);
    console.log(`📊 Usage:`, {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens
    });
    
    return true;
  } catch (error) {
    console.log(`❌ Model ${modelName} FAILED`);
    console.log(`🔴 Error: ${error.message}`);
    
    if (error.response) {
      console.log(`📋 Status: ${error.response.status}`);
      console.log(`📋 Error details:`, error.response.data);
    }
    
    return false;
  }
}

async function testAllModels() {
  console.log('🚀 Testing GPT-5 Models Availability');
  console.log('=' .repeat(50));
  
  const models = [
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07',
    'gpt-4',  // Control test with known working model
    'gpt-4-turbo-preview'  // Another control test
  ];
  
  const results = {};
  
  for (const model of models) {
    const success = await testModel(model);
    results[model] = success;
  }
  
  console.log('\n📊 FINAL RESULTS');
  console.log('=' .repeat(50));
  
  for (const [model, success] of Object.entries(results)) {
    const status = success ? '✅ WORKING' : '❌ NOT AVAILABLE';
    console.log(`${model}: ${status}`);
  }
  
  // Test embeddings models too
  console.log('\n🧪 Testing Embedding Models');
  console.log('=' .repeat(50));
  
  const embeddingModels = [
    'text-embedding-3-small',
    'text-embedding-ada-002'
  ];
  
  for (const model of embeddingModels) {
    try {
      console.log(`Testing ${model}...`);
      const response = await openai.embeddings.create({
        model: model,
        input: 'Test embedding'
      });
      console.log(`✅ ${model}: WORKING (Dimensions: ${response.data[0].embedding.length})`);
    } catch (error) {
      console.log(`❌ ${model}: FAILED - ${error.message}`);
    }
  }
}

// Run the tests
testAllModels().catch(console.error);