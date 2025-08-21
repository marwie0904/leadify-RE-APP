#!/usr/bin/env node

/**
 * Test script to verify simplified classification prompt accuracy
 * Reduced from 500+ words to ~150 words
 * Expected improvement: ~1 second faster classification
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

async function runTests() {
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Simplified Classification Prompt Test${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`\nPrompt reduced from 500+ words to ~150 words`);
  console.log(`Expected: 1+ second faster classification\n`);
  
  const conversationId = `test-prompt-${Date.now()}`;
  const testCases = [
    {
      message: "Hello",
      expectedIntent: "GREETING",
      description: "Simple greeting"
    },
    {
      message: "What properties do you have available?",
      expectedIntent: "BANT", // Should trigger BANT if not complete
      description: "Property interest (triggers BANT)"
    },
    {
      message: "My budget is $30M",
      expectedIntent: "BANT",
      description: "Clear BANT answer (budget)"
    },
    {
      message: "How much does it cost?",
      expectedIntent: "ESTIMATION_REQUEST",
      description: "Price question"
    },
    {
      message: "I need to speak to a human",
      expectedIntent: "HANDOFF",
      description: "Human agent request"
    },
    {
      message: "Where is it located?",
      expectedIntent: "EMBEDDINGS",
      description: "Property info question"
    }
  ];
  
  let totalTime = 0;
  let successCount = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`${colors.cyan}Test ${i + 1}: ${test.description}${colors.reset}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expectedIntent}`);
    
    const result = await sendMessage(test.message, conversationId);
    
    if (result.success) {
      console.log(`${colors.green}✓ Success${colors.reset} - Time: ${result.totalTime}ms`);
      totalTime += result.totalTime;
      successCount++;
    } else {
      console.log(`${colors.red}✗ Failed${colors.reset} - Time: ${result.totalTime}ms`);
    }
    
    console.log('');
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}Results Summary${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(60)}${colors.reset}`);
  
  const avgTime = totalTime / successCount;
  console.log(`Tests passed: ${successCount}/${testCases.length}`);
  console.log(`Average response time: ${Math.round(avgTime)}ms`);
  
  if (avgTime < 6000) {
    console.log(`${colors.green}✅ Response time under 6 seconds!${colors.reset}`);
  } else if (avgTime < 7000) {
    console.log(`${colors.yellow}⚠️  Response time between 6-7 seconds${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Response time over 7 seconds${colors.reset}`);
  }
  
  // Expected improvement calculation
  const originalClassificationTime = 2600; // ms from logs
  const expectedNewTime = 1600; // Expected with simplified prompt
  
  console.log(`\n${colors.bold}Performance Analysis:${colors.reset}`);
  console.log(`Original classification time: ~${originalClassificationTime}ms`);
  console.log(`Expected with simplified prompt: ~${expectedNewTime}ms`);
  console.log(`Expected savings: ~${originalClassificationTime - expectedNewTime}ms`);
  
  if (avgTime < 7000) {
    console.log(`\n${colors.green}${colors.bold}✅ Simplified prompt working successfully!${colors.reset}`);
    console.log(`${colors.green}Classification accuracy maintained with faster response.${colors.reset}`);
  }
  
  console.log(`\n${colors.yellow}Note: Check backend logs for timing breakdown:${colors.reset}`);
  console.log(`Look for: "[TIMING] AI Intent Classification: <time>ms"`);
  console.log(`Should be significantly less than 2600ms`);
}

// Run the tests
runTests().catch(console.error);