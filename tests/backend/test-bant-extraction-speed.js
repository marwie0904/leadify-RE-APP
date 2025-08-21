#!/usr/bin/env node

/**
 * Test script to verify BANT extraction speed improvement
 * Should now use gpt-5-nano instead of full GPT-5
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
    
    // If it's a 500 error, try to extract any useful info
    if (error.response?.status === 500) {
      console.log(`${colors.yellow}Server returned 500. Check if agent ID exists: ${testAgentId}${colors.reset}`);
    }
    
    return { success: false, totalTime, error: error.message };
  }
}

async function runTest() {
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}BANT Extraction Speed Test${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`\nExpected improvement: BANT extraction from ~4s to ~1s`);
  console.log(`Model change: GPT-5 Full → GPT-5 Nano\n`);
  
  const conversationId = `test-bant-${Date.now()}`;
  
  // Test 1: Initial greeting
  console.log(`${colors.cyan}Test 1: Initial greeting${colors.reset}`);
  const test1 = await sendMessage("Hello", conversationId);
  console.log(`Time: ${test1.totalTime}ms ${test1.success ? '✓' : '✗'}\n`);
  
  if (!test1.success) {
    console.log(`${colors.red}Failed to initialize conversation. Exiting.${colors.reset}`);
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Trigger BANT with property question
  console.log(`${colors.cyan}Test 2: Property question (triggers BANT)${colors.reset}`);
  console.log(`Message: "What properties do you have available?"`);
  const test2 = await sendMessage("What properties do you have available?", conversationId);
  
  if (test2.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`Total time: ${colors.bold}${test2.totalTime}ms${colors.reset}`);
    
    // Estimate breakdown
    console.log(`\n${colors.bold}Estimated Breakdown:${colors.reset}`);
    console.log(`  Intent Classification: ~2.5s`);
    console.log(`  BANT Extraction: ~${Math.max(0, test2.totalTime - 3500)}ms ${colors.green}(should be ~1s with nano)${colors.reset}`);
    console.log(`  Other operations: ~1s`);
    
    if (test2.totalTime < 6000) {
      console.log(`\n${colors.green}${colors.bold}✅ SUCCESS: Response time under 6 seconds!${colors.reset}`);
      console.log(`${colors.green}Model change appears to be working.${colors.reset}`);
    } else if (test2.totalTime < 7000) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  PARTIAL SUCCESS: Response time improved but still over 6s${colors.reset}`);
      console.log(`${colors.yellow}Some improvement seen, but may need further optimization.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}${colors.bold}❌ NO IMPROVEMENT: Response time still over 7s${colors.reset}`);
      console.log(`${colors.red}Model change may not be working. Check server logs.${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
    console.log(`Time: ${test2.totalTime}ms`);
  }
  
  // Test 3: Second BANT question (should use cached questions)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`\n${colors.cyan}Test 3: BANT answer (uses cached questions)${colors.reset}`);
  console.log(`Message: "My budget is $500,000"`);
  const test3 = await sendMessage("My budget is $500,000", conversationId);
  
  if (test3.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`Total time: ${colors.bold}${test3.totalTime}ms${colors.reset}`);
    
    if (test3.totalTime < test2.totalTime) {
      console.log(`${colors.green}✓ Caching working: This request was ${test2.totalTime - test3.totalTime}ms faster${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
    console.log(`Time: ${test3.totalTime}ms`);
  }
  
  console.log(`\n${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  
  if (test2.success) {
    const improvement = 8200 - test2.totalTime;
    const percentImprovement = Math.round((improvement / 8200) * 100);
    
    console.log(`Original time: 8200ms`);
    console.log(`New time: ${test2.totalTime}ms`);
    console.log(`Improvement: ${improvement}ms (${percentImprovement}%)`);
    
    if (improvement > 2000) {
      console.log(`\n${colors.green}${colors.bold}✅ Model change is working successfully!${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.yellow}Note: Check backend logs for model confirmation:${colors.reset}`);
  console.log(`Should see: "[EXTRACT BANT] 🚀 Calling AI with model: gpt-5-nano-2025-08-07"`);
  console.log(`Instead of: "[EXTRACT BANT] 🚀 Calling AI with model: gpt-5-2025-08-07"`);
}

// Run the test
runTest().catch(console.error);