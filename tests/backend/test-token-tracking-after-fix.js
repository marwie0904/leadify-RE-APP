#!/usr/bin/env node

/**
 * Test script to verify token tracking is now accurate after removing duplicates
 * This should show tokens matching OpenAI dashboard closely
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
    .select('total_tokens, created_at, operation_type, model')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching tokens:', error);
    return { total: 0, recent: [] };
  }
  
  const total = data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;
  return { total, recent: data || [] };
}

async function getTokensAfter(testStartTime) {
  // Wait for database writes to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, created_at, operation_type, model, prompt_tokens, completion_tokens, reasoning_tokens')
    .gte('created_at', testStartTime.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tokens:', error);
    return { records: [], total: 0 };
  }
  
  const total = data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0;
  return { records: data || [], total };
}

async function testConversation(message, conversationId, description) {
  console.log(`\n${colors.cyan}Testing: ${description}${colors.reset}`);
  console.log(`Message: "${message}"`);
  
  try {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message,
      agentId: testAgentId,
      conversationId,
      userId: testUserId,
      source: 'web'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log(`${colors.green}✓ Response received${colors.reset}`);
    if (response.data.aiResponse) {
      console.log(`Response preview: "${response.data.aiResponse.substring(0, 60)}..."`);
    }
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function runTest() {
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    TOKEN TRACKING VERIFICATION TEST (POST-FIX)    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  
  console.log(`\n${colors.yellow}EXPECTED BEHAVIOR AFTER FIXES:${colors.reset}`);
  console.log(`• Each operation tracked exactly ONCE (no duplicates)`);
  console.log(`• No fake/estimated token tracking`);
  console.log(`• Total tokens should match OpenAI dashboard closely`);
  console.log(`• Should see ~50% reduction compared to before fixes`);
  
  console.log(`\n${colors.yellow}NOTE: Make sure the server is running with the fixes applied${colors.reset}`);
  console.log(`${colors.yellow}Watch backend logs for [Token Tracking] messages${colors.reset}\n`);
  
  const testStartTime = new Date();
  
  // Get initial state
  const before = await getTokensBefore();
  console.log(`${colors.blue}Initial Database State:${colors.reset}`);
  console.log(`Total tokens in last 10 records: ${before.total.toLocaleString()}`);
  if (before.recent.length > 0) {
    console.log(`Recent operations:`);
    before.recent.slice(0, 3).forEach(r => {
      console.log(`  • ${r.operation_type}: ${r.total_tokens} tokens (${r.model})`);
    });
  }
  
  // Test 1: Simple greeting
  const conv1 = `test-simple-${Date.now()}`;
  await testConversation("Hello", conv1, "Simple Greeting");
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: BANT trigger
  const conv2 = `test-bant-${Date.now()}`;
  await testConversation("I'm looking for a property under $500k", conv2, "BANT Trigger");
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: General question
  const conv3 = `test-general-${Date.now()}`;
  await testConversation("What areas do you cover?", conv3, "General Question");
  
  // Get results
  const after = await getTokensAfter(testStartTime);
  
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    TEST RESULTS    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  console.log(`${colors.blue}Token Records Created:${colors.reset} ${after.records.length}`);
  console.log(`${colors.blue}Total Tokens Tracked:${colors.reset} ${after.total.toLocaleString()}`);
  
  if (after.records.length > 0) {
    console.log(`\n${colors.blue}Operations Tracked:${colors.reset}`);
    
    // Group by operation type
    const byOperation = {};
    after.records.forEach(r => {
      const op = r.operation_type || 'unknown';
      if (!byOperation[op]) {
        byOperation[op] = { count: 0, tokens: 0, models: new Set() };
      }
      byOperation[op].count++;
      byOperation[op].tokens += r.total_tokens || 0;
      byOperation[op].models.add(r.model);
    });
    
    Object.entries(byOperation).forEach(([op, data]) => {
      console.log(`  • ${op}: ${data.count} call(s), ${data.tokens} total tokens`);
      console.log(`    Models: ${Array.from(data.models).join(', ')}`);
    });
    
    // Check for duplicates
    const duplicateOps = Object.entries(byOperation).filter(([op, data]) => {
      // These operations should only occur once per message
      const singleOps = ['intent_classification', 'bant_extraction', 'bant_scoring'];
      return singleOps.includes(op) && data.count > 3; // 3 messages = max 3 calls
    });
    
    if (duplicateOps.length > 0) {
      console.log(`\n${colors.red}⚠️  WARNING: Possible duplicates detected:${colors.reset}`);
      duplicateOps.forEach(([op, data]) => {
        console.log(`    ${op}: ${data.count} calls (expected ≤3)`);
      });
    } else {
      console.log(`\n${colors.green}✅ No duplicate tracking detected!${colors.reset}`);
    }
    
    // Check for reasoning tokens
    const gpt5Records = after.records.filter(r => r.model && r.model.includes('gpt-5'));
    const withReasoning = gpt5Records.filter(r => r.reasoning_tokens && r.reasoning_tokens > 0);
    
    console.log(`\n${colors.blue}GPT-5 Reasoning Tokens:${colors.reset}`);
    console.log(`  GPT-5 calls: ${gpt5Records.length}`);
    console.log(`  With reasoning tokens: ${withReasoning.length}`);
    if (withReasoning.length > 0) {
      const totalReasoning = withReasoning.reduce((sum, r) => sum + r.reasoning_tokens, 0);
      console.log(`  Total reasoning tokens: ${totalReasoning}`);
    }
  }
  
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.green}    VERIFICATION CHECKLIST    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  const checksPass = [];
  const checksFail = [];
  
  // Check 1: Records created
  if (after.records.length > 0) {
    checksPass.push('Token records are being created');
  } else {
    checksFail.push('No token records created - check server connection');
  }
  
  // Check 2: No excessive duplicates
  const maxOpsPerType = Math.max(...Object.values(byOperation || {}).map(d => d.count));
  if (maxOpsPerType <= 6) { // 3 messages * possible retries
    checksPass.push('No excessive duplicate tracking detected');
  } else {
    checksFail.push(`Excessive operations detected (${maxOpsPerType} of same type)`);
  }
  
  // Check 3: Reasonable token counts
  const avgTokensPerOp = after.total / Math.max(1, after.records.length);
  if (avgTokensPerOp < 2000) { // Should be well under 2000 after fixes
    checksPass.push(`Reasonable token average: ${Math.round(avgTokensPerOp)} per operation`);
  } else {
    checksFail.push(`High token average: ${Math.round(avgTokensPerOp)} per operation (possible duplicates)`);
  }
  
  // Print results
  if (checksPass.length > 0) {
    console.log(`${colors.green}✅ Checks Passed:${colors.reset}`);
    checksPass.forEach(check => console.log(`   • ${check}`));
  }
  
  if (checksFail.length > 0) {
    console.log(`\n${colors.red}❌ Checks Failed:${colors.reset}`);
    checksFail.forEach(check => console.log(`   • ${check}`));
  }
  
  console.log(`\n${colors.bold}${colors.cyan}NEXT STEPS:${colors.reset}`);
  console.log(`1. Compare total tokens (${after.total}) with OpenAI dashboard`);
  console.log(`2. If still seeing discrepancies, check backend logs for warnings`);
  console.log(`3. Verify no "WARNING: OpenAI total != Database total" messages`);
  console.log(`4. Run same test messages in OpenAI playground to compare`);
  
  console.log(`\n${colors.green}The fixes should have reduced token tracking by ~50%${colors.reset}`);
}

// Run the test
runTest().catch(console.error);