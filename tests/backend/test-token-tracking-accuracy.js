#!/usr/bin/env node

/**
 * Test script to verify token tracking accuracy after fixes
 * Should show only 1x tracking per operation (not 4x)
 */

const axios = require('axios');
require('dotenv').config();

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

async function sendMessage(message, conversationId) {
  const startTime = Date.now();
  
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
    
    const totalTime = Date.now() - startTime;
    return { success: true, totalTime, response: response.data };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`${colors.red}Error: ${error.response?.data?.message || error.message}${colors.reset}`);
    return { success: false, totalTime, error: error.message };
  }
}

async function runTokenTest() {
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    TOKEN TRACKING ACCURACY TEST    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  
  console.log(`\n${colors.bold}EXPECTED BEHAVIOR:${colors.reset}`);
  console.log(`• Each operation should track tokens ONCE (not 4x)`);
  console.log(`• No artificial overhead (was adding 5%)`);
  console.log(`• Embeddings counted correctly`);
  console.log(`• Detailed logging shows actual vs adjusted counts`);
  
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  const conversationId = `test-tokens-${Date.now()}`;
  
  // Test 1: Simple greeting
  console.log(`${colors.cyan}Test 1: Simple Greeting${colors.reset}`);
  console.log(`Message: "Hello"`);
  console.log(`\n${colors.yellow}Check backend logs for:${colors.reset}`);
  console.log(`• [Token Tracking] for intent_classification`);
  console.log(`• [Token Tracking] for chat_reply (should appear ONCE, not 4x)`);
  
  const test1 = await sendMessage("Hello", conversationId);
  
  if (test1.success) {
    console.log(`${colors.green}✓ Response received in ${test1.totalTime}ms${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Property question (triggers BANT)
  console.log(`\n${colors.cyan}Test 2: Property Question (triggers BANT)${colors.reset}`);
  console.log(`Message: "What properties do you have?"`);
  console.log(`\n${colors.yellow}Check backend logs for:${colors.reset}`);
  console.log(`• [Token Tracking] for intent_classification`);
  console.log(`• [Token Tracking] for bant_extraction`);
  console.log(`• [Token Tracking] for chat_reply (ONCE only)`);
  console.log(`• NO duplicate tracking for estimated tokens`);
  
  const test2 = await sendMessage("What properties do you have?", conversationId);
  
  if (test2.success) {
    console.log(`${colors.green}✓ Response received in ${test2.totalTime}ms${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: BANT answer
  console.log(`\n${colors.cyan}Test 3: BANT Answer${colors.reset}`);
  console.log(`Message: "My budget is $500,000"`);
  console.log(`\n${colors.yellow}Check backend logs for:${colors.reset}`);
  console.log(`• Should use cached agent config`);
  console.log(`• Single token tracking per operation`);
  console.log(`• No artificial overhead in totals`);
  
  const test3 = await sendMessage("My budget is $500,000", conversationId);
  
  if (test3.success) {
    console.log(`${colors.green}✓ Response received in ${test3.totalTime}ms${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
  }
  
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    VERIFICATION CHECKLIST    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  console.log(`${colors.bold}Check Backend Logs For:${colors.reset}`);
  console.log(`\n1. ${colors.cyan}Token Tracking Format:${colors.reset}`);
  console.log(`   [Token Tracking] ✅ Tracked <operation>:`);
  console.log(`     Model: <model-name>`);
  console.log(`     Prompt: X → X (adjusted)  ${colors.green}← Should be same (no overhead)${colors.reset}`);
  console.log(`     Completion: Y → Y (adjusted)`);
  console.log(`     Total Tracked: Z tokens`);
  
  console.log(`\n2. ${colors.cyan}No Duplicate Tracking:${colors.reset}`);
  console.log(`   • chat_reply should appear ONCE per message`);
  console.log(`   • No "Tracked chat_reply: ~X tokens" estimates`);
  console.log(`   • No multiple tracking for same operation`);
  
  console.log(`\n3. ${colors.cyan}Correct Totals:${colors.reset}`);
  console.log(`   • Total = Prompt + Completion (for chat models)`);
  console.log(`   • Total = Input tokens only (for embeddings)`);
  console.log(`   • No artificial 5% overhead added`);
  
  console.log(`\n${colors.bold}${colors.green}SUCCESS CRITERIA:${colors.reset}`);
  console.log(`✅ Each operation tracked exactly once`);
  console.log(`✅ No artificial overhead in counts`);
  console.log(`✅ Admin dashboard matches database totals`);
  
  console.log(`\n${colors.yellow}Note: Compare token counts in admin dashboard vs database after test${colors.reset}`);
}

// Run the test
runTokenTest().catch(console.error);