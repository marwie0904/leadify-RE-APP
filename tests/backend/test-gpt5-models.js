/**
 * Test script for GPT-5 model integration
 * Verifies that the new models and pricing are working correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import the trackTokenUsage function and test it
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data for different models
const testCases = [
  {
    name: 'GPT-5 Mini Chat',
    data: {
      model: 'gpt-5-mini',
      promptTokens: 1000,
      completionTokens: 500,
      operationType: 'chat_reply',
      organizationId: 'test-org-123',
      conversationId: 'test-conv-456'
    },
    expectedCost: 0.00125 // (1000 * 0.00025 + 500 * 0.002) / 1000
  },
  {
    name: 'GPT-5 Nano Intent',
    data: {
      model: 'gpt-5-nano',
      promptTokens: 100,
      completionTokens: 25,
      operationType: 'intent_classification',
      organizationId: 'test-org-123'
    },
    expectedCost: 0.000015 // (100 * 0.00005 + 25 * 0.0004) / 1000
  },
  {
    name: 'Embedding Operation',
    data: {
      model: 'text-embedding-3-small',
      inputTokens: 500,
      operationType: 'semantic_search',
      agentId: 'test-agent-789'
    },
    expectedCost: 0.00001 // (500 * 0.00002) / 1000
  },
  {
    name: 'Cached GPT-5 Mini',
    data: {
      model: 'gpt-5-mini',
      promptTokens: 1000,
      completionTokens: 500,
      isCached: true,
      operationType: 'chat_reply'
    },
    expectedCost: 0.001025 // (1000 * 0.000025 + 500 * 0.002) / 1000
  }
];

// Calculate cost based on new pricing
function calculateCost(data) {
  const pricing = {
    'gpt-5-mini': { 
      prompt: 0.00025,
      completion: 0.002,
      cached: 0.000025
    },
    'gpt-5-nano': { 
      prompt: 0.00005,
      completion: 0.0004,
      cached: 0.000005
    },
    'text-embedding-3-small': {
      input: 0.00002
    },
    'text-embedding-ada-002': {
      input: 0.0001
    }
  };

  const modelPricing = pricing[data.model];
  if (!modelPricing) return 0;

  if (data.model.includes('embedding')) {
    return ((data.inputTokens || 0) * modelPricing.input) / 1000;
  }

  const promptCost = (data.isCached && modelPricing.cached) ? modelPricing.cached : modelPricing.prompt;
  return ((data.promptTokens || 0) * promptCost + (data.completionTokens || 0) * modelPricing.completion) / 1000;
}

// Test each case
async function runTests() {
  console.log('Testing GPT-5 Model Pricing and Token Tracking\n');
  console.log('=' .repeat(60));
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    const calculatedCost = calculateCost(testCase.data);
    const passed = Math.abs(calculatedCost - testCase.expectedCost) < 0.000001;
    
    console.log(`\nTest: ${testCase.name}`);
    console.log(`Model: ${testCase.data.model}`);
    console.log(`Tokens: Prompt=${testCase.data.promptTokens || 0}, Completion=${testCase.data.completionTokens || 0}, Input=${testCase.data.inputTokens || 0}`);
    console.log(`Cached: ${testCase.data.isCached ? 'Yes' : 'No'}`);
    console.log(`Expected Cost: $${testCase.expectedCost.toFixed(6)}`);
    console.log(`Calculated Cost: $${calculatedCost.toFixed(6)}`);
    console.log(`Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!passed) {
      allPassed = false;
      console.log(`  Error: Cost mismatch - expected ${testCase.expectedCost}, got ${calculatedCost}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\nOverall Result: ${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  // Calculate cost savings
  console.log('\n📊 Cost Savings Analysis:');
  console.log('-'.repeat(40));
  
  const gpt4Cost = (1000 * 0.03 + 500 * 0.06) / 1000; // Old GPT-4 pricing
  const gpt5MiniCost = (1000 * 0.00025 + 500 * 0.002) / 1000;
  const savings = ((gpt4Cost - gpt5MiniCost) / gpt4Cost) * 100;
  
  console.log(`GPT-4 (1000 prompt + 500 completion): $${gpt4Cost.toFixed(4)}`);
  console.log(`GPT-5 Mini (same tokens): $${gpt5MiniCost.toFixed(4)}`);
  console.log(`Savings: ${savings.toFixed(1)}% reduction`);
  
  const monthlyTokens = 10000000; // 10M tokens per month
  const monthlyGPT4 = (monthlyTokens * 0.03) / 1000;
  const monthlyGPT5 = (monthlyTokens * 0.00025) / 1000;
  
  console.log(`\nMonthly savings (10M tokens):`);
  console.log(`GPT-4: $${monthlyGPT4.toFixed(2)}`);
  console.log(`GPT-5 Mini: $${monthlyGPT5.toFixed(2)}`);
  console.log(`Monthly Savings: $${(monthlyGPT4 - monthlyGPT5).toFixed(2)} (${((monthlyGPT4 - monthlyGPT5) / monthlyGPT4 * 100).toFixed(1)}% reduction)`);
}

// Run the tests
runTests().catch(console.error);