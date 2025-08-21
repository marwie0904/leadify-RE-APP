#!/usr/bin/env node

/**
 * Test script to verify caching improvements for agent config and questions
 * Expected improvement: ~600ms saved on repeated requests
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
    return { success: false, totalTime, error: error.message };
  }
}

async function runTest() {
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Agent Config & Questions Caching Test${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`\nExpected improvement: ~600ms saved on cached requests`);
  console.log(`Caching: Agent config + BANT questions\n`);
  
  const conversationId = `test-cache-${Date.now()}`;
  
  // Test 1: Initial request (no cache)
  console.log(`${colors.cyan}Test 1: Initial request (cold cache)${colors.reset}`);
  const test1 = await sendMessage("Hello", conversationId);
  console.log(`Time: ${test1.totalTime}ms ${test1.success ? '✓' : '✗'}`);
  
  if (!test1.success) {
    console.log(`${colors.red}Failed to initialize conversation. Exiting.${colors.reset}`);
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: BANT trigger (should populate cache)
  console.log(`\n${colors.cyan}Test 2: BANT trigger (populates cache)${colors.reset}`);
  console.log(`Message: "What properties do you have?"`);
  const test2 = await sendMessage("What properties do you have?", conversationId);
  
  if (test2.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`Total time: ${colors.bold}${test2.totalTime}ms${colors.reset}`);
    console.log(`Note: First BANT request, caches agent config & questions`);
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
    console.log(`Time: ${test2.totalTime}ms`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Another BANT answer (should use cached data)
  console.log(`\n${colors.cyan}Test 3: BANT answer (uses cache)${colors.reset}`);
  console.log(`Message: "My budget is $500,000"`);
  const test3 = await sendMessage("My budget is $500,000", conversationId);
  
  if (test3.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`Total time: ${colors.bold}${test3.totalTime}ms${colors.reset}`);
    
    if (test3.totalTime < test2.totalTime) {
      const savings = test2.totalTime - test3.totalTime;
      console.log(`${colors.green}✓ Cache working: ${savings}ms faster than Test 2${colors.reset}`);
      
      if (savings >= 500) {
        console.log(`${colors.green}✅ EXCELLENT: Saved ${savings}ms (target was 600ms)${colors.reset}`);
      } else if (savings >= 300) {
        console.log(`${colors.yellow}⚠️  GOOD: Saved ${savings}ms (target was 600ms)${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️  MINIMAL: Only saved ${savings}ms (target was 600ms)${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ No improvement detected${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
    console.log(`Time: ${test3.totalTime}ms`);
  }
  
  // Test 4: New conversation to verify cache is agent-specific
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const newConversationId = `test-cache-new-${Date.now()}`;
  console.log(`\n${colors.cyan}Test 4: New conversation (verifies cache is agent-specific)${colors.reset}`);
  console.log(`Message: "I need a house"`);
  const test4 = await sendMessage("I need a house", newConversationId);
  
  if (test4.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`Total time: ${colors.bold}${test4.totalTime}ms${colors.reset}`);
    
    // Should be faster than test2 because agent config is cached
    if (test4.totalTime < test2.totalTime - 300) {
      console.log(`${colors.green}✓ Agent cache working across conversations${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  
  const results = [test1, test2, test3, test4].filter(t => t.success);
  if (results.length >= 3) {
    const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
    console.log(`Average response time: ${Math.round(avgTime)}ms`);
    
    if (test3.success && test2.success) {
      const improvement = test2.totalTime - test3.totalTime;
      const percentImprovement = Math.round((improvement / test2.totalTime) * 100);
      console.log(`Cache improvement: ${improvement}ms (${percentImprovement}%)`);
      
      if (improvement >= 500) {
        console.log(`\n${colors.green}${colors.bold}✅ Caching optimization successful!${colors.reset}`);
      }
    }
  }
  
  console.log(`\n${colors.yellow}Note: Check backend logs for cache hits:${colors.reset}`);
  console.log(`Should see: "✅ Using cached agent data" and "✅ Using cached config"`);
}

// Run the test
runTest().catch(console.error);