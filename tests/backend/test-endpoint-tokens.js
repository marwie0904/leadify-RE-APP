#!/usr/bin/env node

/**
 * Test each endpoint individually to identify token tracking discrepancies
 * Compares tracked tokens in database vs expected tokens
 */

const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';
const testAgentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
const testUserId = 'test-user-' + Date.now();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function getTokensBefore() {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('total_tokens');
  
  if (error) throw error;
  return data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;
}

async function getTokensAfter(beforeCount) {
  // Wait for database writes to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('total_tokens');
  
  if (error) throw error;
  const afterCount = data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;
  return {
    total: afterCount,
    increase: afterCount - beforeCount
  };
}

async function getRecentTokenRecords(since) {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('operation_type, model, total_tokens, prompt_tokens, completion_tokens, reasoning_tokens')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

async function testEndpoint(name, testFunc) {
  console.log(`\n${colors.cyan}${colors.bold}Testing: ${name}${colors.reset}`);
  console.log(`${'='.repeat(60)}`);
  
  const beforeTokens = await getTokensBefore();
  const testStartTime = new Date();
  console.log(`Tokens before: ${colors.yellow}${beforeTokens.toLocaleString()}${colors.reset}`);
  
  try {
    // Run the test
    const result = await testFunc();
    
    // Get token increase
    const afterTokens = await getTokensAfter(beforeTokens);
    console.log(`Tokens after: ${colors.yellow}${afterTokens.total.toLocaleString()}${colors.reset}`);
    console.log(`Tokens tracked: ${colors.bold}${afterTokens.increase.toLocaleString()}${colors.reset}`);
    
    // Get detailed records
    const records = await getRecentTokenRecords(testStartTime);
    console.log(`\n${colors.blue}Database Records Created:${colors.reset}`);
    
    let totalByOperation = {};
    records.forEach(record => {
      const op = record.operation_type || 'unknown';
      if (!totalByOperation[op]) {
        totalByOperation[op] = { count: 0, tokens: 0, models: new Set() };
      }
      totalByOperation[op].count++;
      totalByOperation[op].tokens += record.total_tokens || 0;
      totalByOperation[op].models.add(record.model);
      
      console.log(`  • ${op}: ${record.total_tokens} tokens (${record.model})`);
      if (record.reasoning_tokens > 0) {
        console.log(`    ${colors.yellow}→ Reasoning tokens: ${record.reasoning_tokens}${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.blue}Summary by Operation:${colors.reset}`);
    Object.entries(totalByOperation).forEach(([op, data]) => {
      console.log(`  • ${op}: ${data.count} calls, ${data.tokens} tokens`);
      console.log(`    Models: ${Array.from(data.models).join(', ')}`);
    });
    
    // Check for issues
    console.log(`\n${colors.blue}Potential Issues:${colors.reset}`);
    
    // Check for duplicate operations
    const duplicates = Object.entries(totalByOperation).filter(([op, data]) => {
      if (op === 'chat_reply' && data.count > 1) return true;
      if (op === 'intent_classification' && data.count > 1) return true;
      if (op === 'bant_extraction' && data.count > 1) return true;
      return false;
    });
    
    if (duplicates.length > 0) {
      console.log(`  ${colors.red}⚠️  Duplicate tracking detected:${colors.reset}`);
      duplicates.forEach(([op, data]) => {
        console.log(`    - ${op}: tracked ${data.count} times (should be 1)`);
      });
    } else {
      console.log(`  ${colors.green}✓ No duplicate tracking detected${colors.reset}`);
    }
    
    // Check for missing reasoning tokens
    const gpt5Records = records.filter(r => r.model && r.model.includes('gpt-5'));
    const missingReasoning = gpt5Records.filter(r => !r.reasoning_tokens || r.reasoning_tokens === 0);
    if (missingReasoning.length > 0) {
      console.log(`  ${colors.yellow}⚠️  Missing reasoning tokens for GPT-5 models:${colors.reset}`);
      missingReasoning.forEach(r => {
        console.log(`    - ${r.operation_type}: ${r.model}`);
      });
    }
    
    return {
      name,
      tokensTracked: afterTokens.increase,
      records: records.length,
      operations: totalByOperation
    };
    
  } catch (error) {
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return {
      name,
      error: error.message
    };
  }
}

async function runTests() {
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    ENDPOINT TOKEN TRACKING TEST    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  
  console.log(`\n${colors.yellow}NOTE: Watch the backend console for detailed token tracking logs${colors.reset}`);
  console.log(`${colors.yellow}Look for: [Token Tracking] messages${colors.reset}\n`);
  
  const results = [];
  
  // Test 1: Simple greeting (minimal tokens)
  results.push(await testEndpoint('Simple Greeting', async () => {
    const conversationId = `test-simple-${Date.now()}`;
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: "Hello",
      agentId: testAgentId,
      conversationId,
      userId: testUserId,
      source: 'web'
    });
    console.log(`Response received (${response.data.aiResponse?.substring(0, 50)}...)`);
    return response.data;
  }));
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 2: BANT trigger (should create 3 OpenAI calls)
  results.push(await testEndpoint('BANT Trigger', async () => {
    const conversationId = `test-bant-${Date.now()}`;
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: "I'm looking for a property under $500k",
      agentId: testAgentId,
      conversationId,
      userId: testUserId,
      source: 'web'
    });
    console.log(`Response received (${response.data.aiResponse?.substring(0, 50)}...)`);
    return response.data;
  }));
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Contact extraction
  results.push(await testEndpoint('Contact Extraction', async () => {
    const conversationId = `test-contact-${Date.now()}`;
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: "My email is test@example.com and phone is 555-1234",
      agentId: testAgentId,
      conversationId,
      userId: testUserId,
      source: 'web'
    });
    console.log(`Response received (${response.data.aiResponse?.substring(0, 50)}...)`);
    return response.data;
  }));
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 4: General question
  results.push(await testEndpoint('General Question', async () => {
    const conversationId = `test-general-${Date.now()}`;
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: "What areas do you cover?",
      agentId: testAgentId,
      conversationId,
      userId: testUserId,
      source: 'web'
    });
    console.log(`Response received (${response.data.aiResponse?.substring(0, 50)}...)`);
    return response.data;
  }));
  
  // Final Summary
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    FINAL SUMMARY    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  let totalTracked = 0;
  results.forEach(result => {
    if (result.error) {
      console.log(`${colors.red}✗ ${result.name}: ERROR - ${result.error}${colors.reset}`);
    } else {
      totalTracked += result.tokensTracked;
      console.log(`${colors.green}✓ ${result.name}: ${result.tokensTracked.toLocaleString()} tokens${colors.reset}`);
      
      // Show operations summary
      Object.entries(result.operations).forEach(([op, data]) => {
        console.log(`    ${op}: ${data.count}x calls, ${data.tokens} tokens`);
      });
    }
  });
  
  console.log(`\n${colors.bold}Total Tokens Tracked: ${totalTracked.toLocaleString()}${colors.reset}`);
  
  console.log(`\n${colors.cyan}${colors.bold}Key Issues to Check:${colors.reset}`);
  console.log(`1. Are reasoning tokens being tracked for GPT-5 models?`);
  console.log(`2. Is each operation tracked exactly once (no duplicates)?`);
  console.log(`3. Do the tracked tokens match OpenAI dashboard?`);
  console.log(`4. Are embeddings being tracked correctly?`);
  
  console.log(`\n${colors.yellow}Compare this total (${totalTracked.toLocaleString()}) with your OpenAI dashboard${colors.reset}`);
  console.log(`${colors.yellow}If there's a discrepancy, check the backend logs for details${colors.reset}`);
}

// Run the tests
runTests().catch(console.error);