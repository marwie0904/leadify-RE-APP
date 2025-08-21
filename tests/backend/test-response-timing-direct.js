#!/usr/bin/env node

/**
 * Direct backend test to measure response time components
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

// Test data - using the same agent from the logs
const testAgentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
const testUserId = 'preview-user';

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

async function testMessage(message, conversationId, messageNum) {
  console.log(`\n${colors.cyan}${colors.bold}Test ${messageNum}: "${message}"${colors.reset}`);
  
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
      timeout: 30000 // 30 second timeout
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`${colors.green}✓ Response received${colors.reset}`);
    console.log(`⏱  Total time: ${colors.bold}${totalTime}ms${colors.reset}`);
    
    // Try to get AI response
    if (response.data && response.data.conversationId) {
      console.log(`💬 AI Response: "${response.data.message || 'No message in response'}"`.substring(0, 100));
    }
    
    return { success: true, totalTime, conversationId: response.data?.conversationId };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.log(`⏱  Failed after: ${totalTime}ms`);
    return { success: false, totalTime, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Direct Backend Response Time Test${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Agent ID: ${testAgentId}`);
  console.log(`User ID: ${testUserId}`);
  
  // Create a new conversation for testing
  const conversationId = `test-conv-${Date.now()}`;
  console.log(`Conversation ID: ${conversationId}`);
  
  const results = [];
  
  // Test 1: Initial greeting
  console.log(`\n${colors.yellow}Test 1: Initial greeting (should be fast)${colors.reset}`);
  results.push(await testMessage("Hello", conversationId, 1));
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Properties question (should trigger BANT)
  console.log(`\n${colors.yellow}Test 2: Properties question (should trigger BANT flow)${colors.reset}`);
  results.push(await testMessage("What properties do you have?", conversationId, 2));
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: BANT answer (should use cached questions)
  console.log(`\n${colors.yellow}Test 3: BANT answer (should use cached questions)${colors.reset}`);
  results.push(await testMessage("My budget is around $500,000", conversationId, 3));
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Price question (should check BANT status but not duplicate)
  console.log(`\n${colors.yellow}Test 4: Price question (should use cached BANT status)${colors.reset}`);
  results.push(await testMessage("How much for a 3-bedroom house?", conversationId, 4));
  
  // Print summary
  console.log(`\n${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Test Summary${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  
  const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
  const successRate = results.filter(r => r.success).length / results.length * 100;
  
  console.log(`Tests Run: ${results.length}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`\nResponse Times:`);
  results.forEach((r, i) => {
    const color = r.totalTime > 6000 ? colors.red : r.totalTime > 4000 ? colors.yellow : colors.green;
    console.log(`  Test ${i + 1}: ${color}${r.totalTime}ms${colors.reset} ${r.success ? '✓' : '✗'}`);
  });
  console.log(`\nAverage: ${colors.bold}${Math.round(avgTime)}ms${colors.reset}`);
  
  // Analysis
  console.log(`\n${colors.bold}Analysis:${colors.reset}`);
  if (avgTime < 6000) {
    console.log(`${colors.green}✓ Average response time under 6 seconds target${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Average response time exceeds 6 seconds target${colors.reset}`);
  }
  
  // Check for improvements between calls
  if (results.length >= 3) {
    if (results[2].totalTime < results[1].totalTime) {
      console.log(`${colors.green}✓ Questions caching appears to be working (Test 3 faster than Test 2)${colors.reset}`);
    }
  }
  
  // Performance breakdown estimate
  console.log(`\n${colors.bold}Estimated Component Times:${colors.reset}`);
  console.log(`  Intent Classification: ~2.5s (using gpt-5-nano)`);
  console.log(`  BANT Extraction: ~3-4s (using gpt-5 full)`);
  console.log(`  Questions DB Query: ~200-700ms (first time only)`);
  console.log(`  Other operations: ~500-1000ms`);
  console.log(`\n${colors.yellow}Note: BANT extraction using full GPT-5 model is the bottleneck${colors.reset}`);
}

// Run the tests
runTests().catch(console.error);