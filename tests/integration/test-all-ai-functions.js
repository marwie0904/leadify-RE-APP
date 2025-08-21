const axios = require('axios');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';

// Test results collector
const testResults = [];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function logTest(name, success, tokens, details) {
  const status = success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  const tokenInfo = tokens ? `(${tokens} tokens)` : '(NO TOKENS)';
  console.log(`${status} ${name} ${tokenInfo}`);
  if (details) {
    console.log(`   ${colors.cyan}Details: ${details}${colors.reset}`);
  }
  testResults.push({ name, success, tokens, details });
}

// Test 1: Direct OpenAI Chat Completion
async function testDirectChatCompletion() {
  console.log('\n📝 Testing Direct Chat Completion...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in 5 words.' }
      ],
      max_tokens: 20
    });
    
    const hasUsage = response.usage !== undefined;
    const tokens = response.usage?.total_tokens || 0;
    
    logTest(
      'Direct Chat Completion',
      hasUsage && tokens > 0,
      tokens,
      `prompt: ${response.usage?.prompt_tokens}, completion: ${response.usage?.completion_tokens}`
    );
    
    return { success: hasUsage, tokens };
  } catch (error) {
    logTest('Direct Chat Completion', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Test 2: Direct OpenAI Embedding
async function testDirectEmbedding() {
  console.log('\n📝 Testing Direct Embedding...');
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'Test embedding for token tracking verification'
    });
    
    const hasUsage = response.usage !== undefined;
    const tokens = response.usage?.total_tokens || 0;
    
    logTest(
      'Direct Embedding',
      hasUsage && tokens > 0,
      tokens,
      `total_tokens: ${response.usage?.total_tokens}, prompt_tokens: ${response.usage?.prompt_tokens}`
    );
    
    return { success: hasUsage, tokens };
  } catch (error) {
    logTest('Direct Embedding', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Test 3: GPT-5 Model (if available)
async function testGPT5Model() {
  console.log('\n📝 Testing GPT-5 Model...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'Reply with one word only.' },
        { role: 'user', content: 'Hello' }
      ],
      max_completion_tokens: 10,
      reasoning_effort: 'low'
    });
    
    const hasUsage = response.usage !== undefined;
    const tokens = response.usage?.total_tokens || 0;
    
    logTest(
      'GPT-5 Mini Model',
      hasUsage && tokens > 0,
      tokens,
      `prompt: ${response.usage?.prompt_tokens}, completion: ${response.usage?.completion_tokens}`
    );
    
    return { success: hasUsage, tokens };
  } catch (error) {
    logTest('GPT-5 Mini Model', false, 0, `Skipped - ${error.message}`);
    return { success: false, tokens: 0 };
  }
}

// Test 4: Master Intent Classification via API
async function testMasterIntentClassifier() {
  console.log('\n📝 Testing Master Intent Classifier (via API)...');
  
  // First, get token count before
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const beforeTokens = beforeData?.[0];
  
  try {
    // Make API call that triggers intent classification
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: 'Hello, I need help',
        conversationId: 'test-' + Date.now(),
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        source: 'web',
        userId: '8ad6ed68-ac60-4483-b22d-e6747727971b'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '8ad6ed68-ac60-4483-b22d-e6747727971b'
        },
        timeout: 30000
      }
    );
    
    // Wait a bit for token tracking to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if new tokens were tracked
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const newTokens = afterData?.filter(t => 
      !beforeTokens || new Date(t.created_at) > new Date(beforeTokens.created_at)
    );
    
    const hasNewTokens = newTokens && newTokens.length > 0;
    const totalNewTokens = newTokens?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;
    
    logTest(
      'Master Intent Classifier',
      hasNewTokens && totalNewTokens > 0,
      totalNewTokens,
      `${newTokens?.length || 0} new token entries, intent: ${response.data?.intent}`
    );
    
    return { success: hasNewTokens, tokens: totalNewTokens };
  } catch (error) {
    logTest('Master Intent Classifier', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Test 5: BANT Extraction
async function testBANTExtraction() {
  console.log('\n📝 Testing BANT Extraction (via API)...');
  
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const beforeTokens = beforeData?.[0];
  
  try {
    // Trigger BANT conversation
    const messages = [
      'I am looking for a property',
      '30M budget',
      'yes I can decide',
      'for residency',
      'next month',
      'John Doe, 555-1234'
    ];
    
    let totalNewTokens = 0;
    
    for (const message of messages) {
      await axios.post(
        `${API_URL}/api/chat`,
        {
          message: message,
          conversationId: '9826beca-4d97-4b51-9170-4515fbcc096c',
          agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
          source: 'web',
          userId: '8ad6ed68-ac60-4483-b22d-e6747727971b'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '8ad6ed68-ac60-4483-b22d-e6747727971b'
          },
          timeout: 30000
        }
      );
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Wait for token tracking
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check new tokens
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    const newTokens = afterData?.filter(t => 
      !beforeTokens || new Date(t.created_at) > new Date(beforeTokens.created_at)
    );
    
    totalNewTokens = newTokens?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;
    
    logTest(
      'BANT Extraction',
      totalNewTokens > 0,
      totalNewTokens,
      `${newTokens?.length || 0} token entries for BANT flow`
    );
    
    return { success: totalNewTokens > 0, tokens: totalNewTokens };
  } catch (error) {
    logTest('BANT Extraction', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Test 6: Check for System Token Entries
async function testSystemTokenTracking() {
  console.log('\n📝 Testing System Token Tracking...');
  
  try {
    const { data, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .in('agent_id', ['system', 'system_extraction', 'system_embedding', 'system_search'])
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const hasSystemTokens = data && data.length > 0;
    const totalSystemTokens = data?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;
    
    logTest(
      'System Token Tracking',
      hasSystemTokens,
      totalSystemTokens,
      `${data?.length || 0} system entries found`
    );
    
    if (hasSystemTokens) {
      console.log('   Recent system calls:');
      data.slice(0, 3).forEach(entry => {
        console.log(`     - ${entry.operation_type}: ${entry.total_tokens} tokens (${entry.agent_id})`);
      });
    }
    
    return { success: hasSystemTokens, tokens: totalSystemTokens };
  } catch (error) {
    logTest('System Token Tracking', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Test 7: Property Extraction (tests the fixed functions)
async function testPropertyExtraction() {
  console.log('\n📝 Testing Property Extraction (Estimation Flow)...');
  
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const beforeTokens = beforeData?.[0];
  
  try {
    // Trigger estimation conversation
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: 'I want to check property estimation',
        conversationId: 'test-estimation-' + Date.now(),
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        source: 'web',
        userId: '8ad6ed68-ac60-4483-b22d-e6747727971b'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '8ad6ed68-ac60-4483-b22d-e6747727971b'
        },
        timeout: 30000
      }
    );
    
    // Wait for token tracking
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for new tokens, especially system tokens
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const newTokens = afterData?.filter(t => 
      !beforeTokens || new Date(t.created_at) > new Date(beforeTokens.created_at)
    );
    
    const systemTokens = newTokens?.filter(t => t.agent_id?.startsWith('system'));
    const totalNewTokens = newTokens?.reduce((sum, t) => sum + (t.total_tokens || 0), 0) || 0;
    
    logTest(
      'Property Extraction',
      totalNewTokens > 0,
      totalNewTokens,
      `${systemTokens?.length || 0} system token entries (indicates fix working)`
    );
    
    return { success: totalNewTokens > 0, tokens: totalNewTokens };
  } catch (error) {
    logTest('Property Extraction', false, 0, error.message);
    return { success: false, tokens: 0 };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 AI TOKEN TRACKING VERIFICATION TEST SUITE');
  console.log('=' . repeat(60));
  console.log('Testing all AI functions to ensure token tracking is working\n');
  
  // Run all tests
  await testDirectChatCompletion();
  await testDirectEmbedding();
  await testGPT5Model();
  await testMasterIntentClassifier();
  await testBANTExtraction();
  await testSystemTokenTracking();
  await testPropertyExtraction();
  
  // Summary
  console.log('\n' + '=' . repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' . repeat(60));
  
  const passed = testResults.filter(t => t.success).length;
  const failed = testResults.filter(t => !t.success).length;
  const totalTokens = testResults.reduce((sum, t) => sum + (t.tokens || 0), 0);
  
  console.log(`\nTests Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Tests Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`Total Tokens Tracked: ${colors.cyan}${totalTokens}${colors.reset}`);
  
  // Detailed results
  console.log('\nDetailed Results:');
  testResults.forEach(test => {
    const icon = test.success ? '✅' : '❌';
    const tokens = test.tokens ? `${test.tokens} tokens` : 'no tokens';
    console.log(`  ${icon} ${test.name}: ${tokens}`);
  });
  
  // Check if fix is working
  console.log('\n🔍 TOKEN TRACKING FIX VERIFICATION:');
  const hasSystemTokens = testResults.find(t => t.name === 'System Token Tracking')?.success;
  
  if (hasSystemTokens) {
    console.log(`${colors.green}✅ FIX IS WORKING!${colors.reset}`);
    console.log('   System-level token tracking detected.');
    console.log('   This means extraction functions without agents are being tracked.');
  } else {
    console.log(`${colors.yellow}⚠️ No system tokens found yet.${colors.reset}`);
    console.log('   This could mean:');
    console.log('   1. Server needs to be restarted with the fix');
    console.log('   2. No extraction functions have been called yet');
    console.log('   3. All functions had valid agent IDs');
  }
  
  // Final recommendation
  console.log('\n📋 RECOMMENDATIONS:');
  if (passed === testResults.length) {
    console.log(`${colors.green}✅ All tests passed! Token tracking is fully operational.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ Some tests failed. Please check:${colors.reset}`);
    console.log('   1. Is the server running with the latest changes?');
    console.log('   2. Are all environment variables set correctly?');
    console.log('   3. Check server logs for any errors');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Monitor token usage for 24 hours');
  console.log('   2. Compare app tracking with OpenAI dashboard');
  console.log('   3. Look for "System call" entries in server logs');
}

// Run tests
runAllTests().catch(console.error);