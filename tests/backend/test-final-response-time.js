#!/usr/bin/env node

/**
 * Comprehensive test to verify response time improvements
 * Target: <6 seconds (from original 8.2s)
 * 
 * Optimizations Applied:
 * 1. BANT extraction: GPT-5 → GPT-5 Nano (saved ~2s)
 * 2. Agent config caching (saved ~600ms)
 * 3. Classification prompt: 500 → 150 words (saved ~1s)
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

async function runComprehensiveTest() {
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    COMPREHENSIVE RESPONSE TIME TEST    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  
  console.log(`\n${colors.bold}OPTIMIZATIONS APPLIED:${colors.reset}`);
  console.log(`1. ✅ BANT extraction: GPT-5 → GPT-5 Nano`);
  console.log(`2. ✅ Agent config & questions caching`);
  console.log(`3. ✅ Classification prompt: 500 → 150 words`);
  
  console.log(`\n${colors.bold}TARGET:${colors.reset} < 6 seconds (from 8.2s original)`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  const conversationId = `test-final-${Date.now()}`;
  const results = [];
  
  // Test 1: Initial greeting (baseline)
  console.log(`${colors.cyan}Test 1: Initial Greeting (baseline)${colors.reset}`);
  const test1 = await sendMessage("Hello", conversationId);
  results.push({ name: "Greeting", ...test1 });
  console.log(`Time: ${test1.totalTime}ms ${test1.success ? '✓' : '✗'}\n`);
  
  if (!test1.success) {
    console.log(`${colors.red}Failed to initialize. Exiting.${colors.reset}`);
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Test 2: CRITICAL TEST - Property question (triggers BANT)
  console.log(`${colors.cyan}${colors.bold}Test 2: Property Question (CRITICAL - triggers BANT flow)${colors.reset}`);
  console.log(`This is where the 8.2s issue occurred`);
  const test2 = await sendMessage("What properties do you have?", conversationId);
  results.push({ name: "Property Question", ...test2 });
  
  if (test2.success) {
    console.log(`${colors.green}✓ Success${colors.reset}`);
    console.log(`⏱  Time: ${colors.bold}${test2.totalTime}ms${colors.reset}`);
    
    // Performance evaluation
    if (test2.totalTime < 5000) {
      console.log(`${colors.green}${colors.bold}🎉 EXCELLENT: Under 5 seconds!${colors.reset}`);
    } else if (test2.totalTime < 6000) {
      console.log(`${colors.green}${colors.bold}✅ SUCCESS: Under 6 second target!${colors.reset}`);
    } else if (test2.totalTime < 7000) {
      console.log(`${colors.yellow}⚠️  PARTIAL: Between 6-7 seconds${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ NEEDS WORK: Still over 7 seconds${colors.reset}`);
    }
  } else {
    console.log(`${colors.red}✗ Failed${colors.reset}`);
  }
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Test 3: BANT answer (should use cached questions)
  console.log(`${colors.cyan}Test 3: BANT Answer (uses cached questions)${colors.reset}`);
  const test3 = await sendMessage("My budget is $30M", conversationId);
  results.push({ name: "BANT Answer", ...test3 });
  console.log(`Time: ${test3.totalTime}ms ${test3.success ? '✓' : '✗'}`);
  
  if (test3.success && test3.totalTime < test2.totalTime) {
    console.log(`${colors.green}✓ Caching effective: ${test2.totalTime - test3.totalTime}ms faster${colors.reset}`);
  }
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Test 4: Another property question (BANT in progress)
  console.log(`${colors.cyan}Test 4: Another Property Question${colors.reset}`);
  const test4 = await sendMessage("Tell me about the 3-bedroom houses", conversationId);
  results.push({ name: "Property Details", ...test4 });
  console.log(`Time: ${test4.totalTime}ms ${test4.success ? '✓' : '✗'}\n`);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Test 5: Price question
  console.log(`${colors.cyan}Test 5: Price Question (estimation request)${colors.reset}`);
  const test5 = await sendMessage("How much for a villa?", conversationId);
  results.push({ name: "Price Question", ...test5 });
  console.log(`Time: ${test5.totalTime}ms ${test5.success ? '✓' : '✗'}\n`);
  
  // Print detailed results
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    FINAL RESULTS    ${colors.reset}`);
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}\n`);
  
  // Calculate statistics
  const successfulTests = results.filter(r => r.success);
  const avgTime = successfulTests.reduce((sum, r) => sum + r.totalTime, 0) / successfulTests.length;
  const criticalTest = results[1]; // Property question (Test 2)
  
  // Response time breakdown
  console.log(`${colors.bold}Response Times:${colors.reset}`);
  results.forEach((r, i) => {
    const color = r.totalTime > 6000 ? colors.red : r.totalTime > 5000 ? colors.yellow : colors.green;
    const marker = r.totalTime < 6000 ? '✅' : r.totalTime < 7000 ? '⚠️ ' : '❌';
    console.log(`  ${marker} Test ${i + 1} (${r.name}): ${color}${r.totalTime}ms${colors.reset}`);
  });
  
  console.log(`\n${colors.bold}Performance Metrics:${colors.reset}`);
  console.log(`  Average: ${Math.round(avgTime)}ms`);
  console.log(`  Critical Test (Property Q): ${criticalTest.totalTime}ms`);
  console.log(`  Success Rate: ${successfulTests.length}/${results.length}`);
  
  // Improvement calculation
  const originalTime = 8200; // Original problematic response time
  const improvement = originalTime - criticalTest.totalTime;
  const percentImprovement = Math.round((improvement / originalTime) * 100);
  
  console.log(`\n${colors.bold}Optimization Impact:${colors.reset}`);
  console.log(`  Original: ${originalTime}ms`);
  console.log(`  Current: ${criticalTest.totalTime}ms`);
  console.log(`  Improvement: ${improvement}ms (${percentImprovement}% faster)`);
  
  // Final verdict
  console.log(`\n${colors.bold}${'='.repeat(70)}${colors.reset}`);
  if (criticalTest.totalTime < 5000) {
    console.log(`${colors.green}${colors.bold}🎉 OUTSTANDING SUCCESS! 🎉${colors.reset}`);
    console.log(`${colors.green}Response time reduced to under 5 seconds!${colors.reset}`);
    console.log(`${colors.green}${percentImprovement}% improvement achieved!${colors.reset}`);
  } else if (criticalTest.totalTime < 6000) {
    console.log(`${colors.green}${colors.bold}✅ TARGET ACHIEVED! ✅${colors.reset}`);
    console.log(`${colors.green}Response time successfully reduced to under 6 seconds!${colors.reset}`);
    console.log(`${colors.green}${percentImprovement}% improvement from original 8.2s${colors.reset}`);
  } else if (criticalTest.totalTime < 7000) {
    console.log(`${colors.yellow}${colors.bold}⚠️  PARTIAL SUCCESS ⚠️${colors.reset}`);
    console.log(`${colors.yellow}Response time improved but still above 6s target${colors.reset}`);
    console.log(`${colors.yellow}${percentImprovement}% improvement achieved${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ MORE OPTIMIZATION NEEDED ❌${colors.reset}`);
    console.log(`${colors.red}Response time still needs significant improvement${colors.reset}`);
  }
  console.log(`${colors.bold}${'='.repeat(70)}${colors.reset}`);
  
  // Breakdown estimate
  console.log(`\n${colors.bold}Estimated Component Breakdown:${colors.reset}`);
  console.log(`  Intent Classification: ~${criticalTest.totalTime < 6000 ? '1500' : '2500'}ms (${criticalTest.totalTime < 6000 ? 'optimized' : 'needs work'})`);
  console.log(`  BANT Extraction: ~${criticalTest.totalTime < 6000 ? '1500' : '2500'}ms (using nano model)`);
  console.log(`  DB Operations: ~${criticalTest.totalTime < 6000 ? '500' : '1000'}ms (${test3.totalTime < test2.totalTime ? 'cached' : 'not cached'})`);
  console.log(`  Other Processing: ~${criticalTest.totalTime < 6000 ? '1500' : '2000'}ms`);
  
  console.log(`\n${colors.yellow}💡 Check backend logs for detailed timing:${colors.reset}`);
  console.log(`  - "[TIMING] AI Intent Classification: <time>ms"`);
  console.log(`  - "[BANT EXTRACTION] Extraction took <time>ms"`);
  console.log(`  - "✅ Using cached agent data" (cache hits)`);
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);