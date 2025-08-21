const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test configuration
const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpass123';

let authToken = null;
let conversationId = null;
let agentId = null;
let testResults = [];

// Helper function to check database operations
async function checkDatabaseOperations(checkpoint) {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Database query error:', error);
    return { operations: [], error };
  }
  
  return { operations: data || [], error: null };
}

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login function
async function login() {
  try {
    console.log(`${colors.cyan}🔐 Logging in...${colors.reset}`);
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token || response.data.access_token;
    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Login failed:${colors.reset}`, error.response?.data || error.message);
    return false;
  }
}

// Get agent for testing
async function getAgent() {
  // Use hardcoded agent ID from database
  agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca'; // Brown-Homes-Agent
  console.log(`${colors.green}✅ Using agent: ${agentId} (Brown-Homes-Agent)${colors.reset}`);
  return true;
}

// Send message to AI and track operations
async function sendMessageAndTrack(message, testName, expectedOperations = []) {
  console.log(`\n${colors.bright}${colors.blue}━━━ ${testName} ━━━${colors.reset}`);
  console.log(`${colors.cyan}📤 Sending: "${message}"${colors.reset}`);
  
  // Get baseline operations count
  const beforeOps = await checkDatabaseOperations('before');
  const beforeCount = beforeOps.operations.length;
  
  try {
    // Send message to AI
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message,
        conversationId,
        agentId,
        source: 'website'
      },
      {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.conversationId && !conversationId) {
      conversationId = response.data.conversationId;
      console.log(`${colors.yellow}📝 New conversation: ${conversationId}${colors.reset}`);
    }
    
    const aiResponse = response.data.response || response.data.message || 'No response';
    console.log(`${colors.green}🤖 AI Response: "${aiResponse.substring(0, 100)}..."${colors.reset}`);
    
    // Wait for operations to be logged
    await wait(3000);
    
    // Check database for new operations
    const afterOps = await checkDatabaseOperations('after');
    const newOps = afterOps.operations.slice(0, afterOps.operations.length - beforeCount);
    
    console.log(`\n${colors.magenta}📊 Operations Tracked:${colors.reset}`);
    if (newOps.length === 0) {
      console.log(`${colors.red}❌ NO OPERATIONS TRACKED!${colors.reset}`);
    } else {
      const opsSummary = {};
      newOps.forEach(op => {
        const opType = op.operation_type || 'unknown';
        opsSummary[opType] = (opsSummary[opType] || 0) + 1;
        console.log(`  • ${opType}: ${op.total_tokens} tokens (${op.model})`);
      });
      
      // Check expected vs actual
      console.log(`\n${colors.yellow}Expected Operations:${colors.reset}`, expectedOperations);
      console.log(`${colors.yellow}Actual Operations:${colors.reset}`, Object.keys(opsSummary));
      
      const missing = expectedOperations.filter(op => !opsSummary[op]);
      if (missing.length > 0) {
        console.log(`${colors.red}⚠️ MISSING: ${missing.join(', ')}${colors.reset}`);
      }
      
      // Check for chat_reply specifically
      if (!opsSummary['chat_reply'] && !opsSummary['bant_extraction']) {
        console.log(`${colors.red}🚨 CRITICAL: No chat_reply or response operation tracked!${colors.reset}`);
      }
    }
    
    // Record test result
    testResults.push({
      test: testName,
      message,
      tracked: newOps.length,
      operations: newOps.map(op => op.operation_type),
      totalTokens: newOps.reduce((sum, op) => sum + (op.total_tokens || 0), 0),
      missing: expectedOperations.filter(op => !newOps.some(tracked => tracked.operation_type === op))
    });
    
    return { success: true, operations: newOps };
    
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.response?.data?.error || error.message}${colors.reset}`);
    testResults.push({
      test: testName,
      message,
      error: error.message,
      tracked: 0
    });
    return { success: false, error };
  }
}

// Main test function
async function runComprehensiveTests() {
  console.log(`${colors.bright}${colors.cyan}🚀 COMPREHENSIVE AI TRACKING TEST${colors.reset}`);
  console.log('=' . repeat(70));
  
  // Login
  if (!await login()) {
    console.error('Failed to login, aborting tests');
    return;
  }
  
  // Get agent
  if (!await getAgent()) {
    console.error('No agent found, aborting tests');
    return;
  }
  
  // Clear any existing conversation
  conversationId = null;
  
  console.log(`\n${colors.bright}${colors.magenta}═══ TEST SUITE 1: BANT FLOW ═══${colors.reset}`);
  
  // Test 1: Greeting (should trigger intent_classification)
  await sendMessageAndTrack(
    "Hello, I'm looking for a property",
    "Test 1.1: Greeting",
    ['intent_classification', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 2: Budget (BANT)
  await sendMessageAndTrack(
    "My budget is around 25 million pesos",
    "Test 1.2: Budget",
    ['intent_classification', 'bant_extraction', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 3: Authority (BANT)
  await sendMessageAndTrack(
    "Yes, I'm the decision maker along with my spouse",
    "Test 1.3: Authority",
    ['intent_classification', 'bant_extraction', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 4: Need (BANT)
  await sendMessageAndTrack(
    "We need it for our family residence",
    "Test 1.4: Need",
    ['intent_classification', 'bant_extraction', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 5: Timeline (BANT)
  await sendMessageAndTrack(
    "We're planning to buy within 3 months",
    "Test 1.5: Timeline",
    ['intent_classification', 'bant_extraction', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 6: Contact Info
  await sendMessageAndTrack(
    "I'm John Smith, you can reach me at 09171234567",
    "Test 1.6: Contact Info",
    ['intent_classification', 'contact_extraction', 'bant_normalization', 'chat_reply']
  );
  
  await wait(3000);
  
  // Start new conversation for different flow
  conversationId = null;
  
  console.log(`\n${colors.bright}${colors.magenta}═══ TEST SUITE 2: ESTIMATION FLOW ═══${colors.reset}`);
  
  // Test 7: Estimation request
  await sendMessageAndTrack(
    "Can you help me estimate property prices?",
    "Test 2.1: Estimation Request",
    ['intent_classification', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 8: Property selection
  await sendMessageAndTrack(
    "I want a condominium",
    "Test 2.2: Property Type",
    ['intent_classification', 'property_extraction', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 9: Payment plan
  await sendMessageAndTrack(
    "Show me the 5-year payment plan",
    "Test 2.3: Payment Plan",
    ['intent_classification', 'payment_extraction', 'chat_reply']
  );
  
  await wait(3000);
  
  // Start new conversation for general questions
  conversationId = null;
  
  console.log(`\n${colors.bright}${colors.magenta}═══ TEST SUITE 3: GENERAL/EMBEDDINGS ═══${colors.reset}`);
  
  // Test 10: General question requiring embeddings
  await sendMessageAndTrack(
    "What amenities do your properties have?",
    "Test 3.1: Amenities Question",
    ['intent_classification', 'semantic_search', 'chat_reply']
  );
  
  await wait(2000);
  
  // Test 11: Location-based question
  await sendMessageAndTrack(
    "Do you have properties near Makati?",
    "Test 3.2: Location Question",
    ['intent_classification', 'semantic_search', 'chat_reply']
  );
  
  await wait(3000);
  
  // Final summary
  console.log(`\n${colors.bright}${colors.cyan}═══ TEST SUMMARY ═══${colors.reset}`);
  console.log('=' . repeat(70));
  
  // Get final operation count
  const finalOps = await checkDatabaseOperations('final');
  
  console.log(`\n${colors.bright}Overall Results:${colors.reset}`);
  console.log(`Total Tests Run: ${testResults.length}`);
  console.log(`Total Operations Tracked: ${finalOps.operations.length}`);
  console.log(`Total Tokens Used: ${finalOps.operations.reduce((sum, op) => sum + (op.total_tokens || 0), 0)}`);
  
  // Operation type summary
  const opTypeSummary = {};
  finalOps.operations.forEach(op => {
    const type = op.operation_type || 'unknown';
    opTypeSummary[type] = (opTypeSummary[type] || 0) + 1;
  });
  
  console.log(`\n${colors.bright}Operations by Type:${colors.reset}`);
  Object.entries(opTypeSummary).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Missing operations analysis
  console.log(`\n${colors.bright}${colors.red}Missing Operations Analysis:${colors.reset}`);
  const allMissing = {};
  testResults.forEach(result => {
    if (result.missing && result.missing.length > 0) {
      result.missing.forEach(op => {
        allMissing[op] = (allMissing[op] || 0) + 1;
      });
    }
  });
  
  if (Object.keys(allMissing).length === 0) {
    console.log(`${colors.green}✅ All expected operations were tracked!${colors.reset}`);
  } else {
    Object.entries(allMissing).forEach(([op, count]) => {
      console.log(`  ${colors.red}❌ ${op}: Missing in ${count} tests${colors.reset}`);
    });
  }
  
  // Critical findings
  console.log(`\n${colors.bright}${colors.yellow}Critical Findings:${colors.reset}`);
  if (!opTypeSummary['chat_reply']) {
    console.log(`${colors.red}🚨 CRITICAL: No 'chat_reply' operations tracked at all!${colors.reset}`);
    console.log(`   This means AI responses are not being tracked for tokens.`);
  }
  
  if (opTypeSummary['bant_extraction'] > testResults.filter(t => t.test.includes('BANT')).length) {
    console.log(`${colors.yellow}⚠️ WARNING: More BANT extractions than expected${colors.reset}`);
    console.log(`   Possible duplicate tracking or multiple extraction attempts.`);
  }
  
  // Token discrepancy estimate
  const expectedTokensPerResponse = 200; // Conservative estimate
  const missingChatReplies = testResults.length - (opTypeSummary['chat_reply'] || 0);
  const estimatedMissingTokens = missingChatReplies * expectedTokensPerResponse;
  
  console.log(`\n${colors.bright}${colors.cyan}Token Discrepancy Estimate:${colors.reset}`);
  console.log(`Expected chat_reply operations: ${testResults.length}`);
  console.log(`Actual chat_reply operations: ${opTypeSummary['chat_reply'] || 0}`);
  console.log(`Missing chat_reply operations: ${missingChatReplies}`);
  console.log(`${colors.yellow}Estimated missing tokens: ~${estimatedMissingTokens}${colors.reset}`);
  
  // Save detailed results
  const fs = require('fs');
  fs.writeFileSync('tracking-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.length,
      totalOperations: finalOps.operations.length,
      totalTokens: finalOps.operations.reduce((sum, op) => sum + (op.total_tokens || 0), 0),
      operationTypes: opTypeSummary,
      missingOperations: allMissing,
      estimatedMissingTokens
    },
    detailedResults: testResults,
    allOperations: finalOps.operations
  }, null, 2));
  
  console.log(`\n${colors.green}✅ Detailed results saved to tracking-test-results.json${colors.reset}`);
}

// Run the tests
runComprehensiveTests().catch(console.error);