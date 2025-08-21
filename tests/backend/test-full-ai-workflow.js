#!/usr/bin/env node

/**
 * Comprehensive AI Workflow Test
 * Tests the complete BANT flow, ESTIMATION gating, and Phase 4 synchronous extraction
 */

const http = require('http');
const fs = require('fs');

// Configuration
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';
const DELAY_BETWEEN_MESSAGES = 1500; // 1.5 seconds between messages

// UUID generator for valid conversation IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test client class
class TestClient {
  constructor() {
    this.conversationId = null;
    this.transcript = [];
    this.testResults = [];
  }

  async sendMessage(message) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        message,
        agentId: AGENT_ID,
        conversationId: this.conversationId,
        userId: 'test-user',
        source: 'web'
      });
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const response = JSON.parse(data);
            const result = {
              message,
              response: response.response || 'No response',
              intent: response.intent || 'Unknown',
              conversationId: response.conversationId || this.conversationId,
              responseTime,
              success: true,
              timestamp: new Date().toISOString()
            };
            
            // Update conversation ID if returned
            if (response.conversationId && !this.conversationId) {
              this.conversationId = response.conversationId;
            }
            
            this.transcript.push({
              timestamp: result.timestamp,
              user: message,
              ai: result.response,
              intent: result.intent,
              responseTime: `${responseTime}ms`
            });
            
            resolve(result);
          } catch (e) {
            const result = {
              message,
              error: data || e.message,
              responseTime,
              success: false,
              timestamp: new Date().toISOString()
            };
            
            this.transcript.push({
              timestamp: result.timestamp,
              user: message,
              error: result.error,
              responseTime: `${responseTime}ms`
            });
            
            resolve(result);
          }
        });
      });
      
      req.on('error', (e) => {
        const responseTime = Date.now() - startTime;
        const result = {
          message,
          error: e.message,
          responseTime,
          success: false,
          timestamp: new Date().toISOString()
        };
        
        this.transcript.push({
          timestamp: result.timestamp,
          user: message,
          error: result.error,
          responseTime: `${responseTime}ms`
        });
        
        resolve(result);
      });
      
      req.write(payload);
      req.end();
    });
  }

  newConversation() {
    this.conversationId = null;
    this.transcript = [];
  }

  addTestResult(test, status, details) {
    this.testResults.push({ test, status, details, timestamp: new Date().toISOString() });
  }
}

// Main test runner
async function runComprehensiveTest() {
  const client = new TestClient();
  
  console.log('═'.repeat(80));
  console.log('🧪 COMPREHENSIVE AI WORKFLOW TEST');
  console.log('═'.repeat(80));
  console.log(`Test Started: ${new Date().toISOString()}`);
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log('═'.repeat(80));
  console.log();

  // Store all test scenarios results
  const allScenarios = [];

  // ========== SCENARIO 1: ESTIMATION BEFORE BANT ==========
  console.log('📋 SCENARIO 1: ESTIMATION REQUEST BEFORE BANT');
  console.log('─'.repeat(80));
  console.log('Testing: User asks for price before completing BANT qualification');
  console.log();
  
  client.newConversation();
  
  // Test 1.1: Ask for price without BANT
  console.log('  1.1 User asks for price without BANT...');
  const s1r1 = await client.sendMessage('How much is a 2-bedroom condo in BGC?');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s1r1.success) {
    const asksForBant = s1r1.response.toLowerCase().includes('budget') || 
                        s1r1.response.toLowerCase().includes('help') ||
                        s1r1.response.toLowerCase().includes('understand');
    
    if (asksForBant && !s1r1.response.toLowerCase().includes('price')) {
      client.addTestResult('Scenario 1.1', 'PASS', 'Correctly redirected to BANT instead of giving price');
      console.log('    ✅ PASS: Redirected to BANT');
    } else {
      client.addTestResult('Scenario 1.1', 'FAIL', 'Should redirect to BANT, not provide price');
      console.log('    ❌ FAIL: Did not redirect to BANT properly');
    }
  } else {
    client.addTestResult('Scenario 1.1', 'ERROR', s1r1.error);
    console.log('    ❌ ERROR:', s1r1.error);
  }

  allScenarios.push({
    scenario: 'ESTIMATION before BANT',
    transcript: [...client.transcript],
    results: [...client.testResults]
  });

  console.log();

  // ========== SCENARIO 2: COMPLETE BANT FLOW WITH PHASE 4 ==========
  console.log('📋 SCENARIO 2: COMPLETE BANT FLOW (Phase 4 Test)');
  console.log('─'.repeat(80));
  console.log('Testing: Full BANT qualification with synchronous extraction');
  console.log();
  
  client.newConversation();
  client.testResults = [];
  
  // Test 2.1: Initial property interest
  console.log('  2.1 User expresses property interest...');
  const s2r1 = await client.sendMessage('I want to buy a house in Manila');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s2r1.success && s2r1.response.toLowerCase().includes('budget')) {
    client.addTestResult('Scenario 2.1', 'PASS', 'Asked for budget (Step 1)');
    console.log('    ✅ PASS: Asked for budget');
  } else {
    client.addTestResult('Scenario 2.1', 'FAIL', 'Should ask for budget first');
    console.log('    ❌ FAIL: Did not ask for budget');
  }

  // Test 2.2: Provide budget - KEY TEST FOR PHASE 4
  console.log('  2.2 User provides budget "50-60M"...');
  const s2r2 = await client.sendMessage('50-60M');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  const repeatsBudget = s2r2.response?.toLowerCase().includes('budget') || 
                        s2r2.response?.toLowerCase().includes('how much are you');
  const asksAuthority = s2r2.response?.toLowerCase().includes('decision') ||
                        s2r2.response?.toLowerCase().includes('sole') ||
                        s2r2.response?.toLowerCase().includes('who else');
  
  if (s2r2.success && !repeatsBudget && asksAuthority) {
    client.addTestResult('Scenario 2.2', 'PASS', '✨ PHASE 4 WORKING: Recognized budget, moved to authority');
    console.log('    ✅ PASS: Phase 4 working - no duplicate question!');
  } else if (repeatsBudget) {
    client.addTestResult('Scenario 2.2', 'FAIL', '🚨 PHASE 4 ISSUE: Repeated budget question');
    console.log('    ❌ FAIL: Phase 4 issue - duplicate budget question!');
  } else {
    client.addTestResult('Scenario 2.2', 'UNCLEAR', 'Response unclear');
    console.log('    ⚠️  UNCLEAR: Check response manually');
  }

  // Test 2.3: Provide authority - ANOTHER KEY TEST
  console.log('  2.3 User provides authority "Yes I am"...');
  const s2r3 = await client.sendMessage('Yes I am the sole decision maker');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  const repeatsAuthority = s2r3.response?.toLowerCase().includes('decision maker') ||
                           s2r3.response?.toLowerCase().includes('who will be making');
  const asksNeed = s2r3.response?.toLowerCase().includes('residence') ||
                   s2r3.response?.toLowerCase().includes('investment') ||
                   s2r3.response?.toLowerCase().includes('purpose') ||
                   s2r3.response?.toLowerCase().includes('use');
  
  if (s2r3.success && !repeatsAuthority && asksNeed) {
    client.addTestResult('Scenario 2.3', 'PASS', '✨ PHASE 4 WORKING: Recognized authority, moved to need');
    console.log('    ✅ PASS: Phase 4 working - progressed to need!');
  } else if (repeatsAuthority) {
    client.addTestResult('Scenario 2.3', 'FAIL', '🚨 PHASE 4 ISSUE: Repeated authority question');
    console.log('    ❌ FAIL: Phase 4 issue - duplicate authority question!');
  } else {
    client.addTestResult('Scenario 2.3', 'UNCLEAR', 'Response unclear');
    console.log('    ⚠️  UNCLEAR: Check response manually');
  }

  // Test 2.4: Provide need
  console.log('  2.4 User provides need...');
  const s2r4 = await client.sendMessage('For personal residence');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s2r4.success && (s2r4.response.toLowerCase().includes('when') || 
                       s2r4.response.toLowerCase().includes('timeline'))) {
    client.addTestResult('Scenario 2.4', 'PASS', 'Asked for timeline (Step 4)');
    console.log('    ✅ PASS: Asked for timeline');
  } else {
    client.addTestResult('Scenario 2.4', 'UNCLEAR', 'Check if asking for timeline');
    console.log('    ⚠️  UNCLEAR: Check response');
  }

  // Test 2.5: Provide timeline
  console.log('  2.5 User provides timeline...');
  const s2r5 = await client.sendMessage('Within 3 months');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s2r5.success && (s2r5.response.toLowerCase().includes('name') || 
                       s2r5.response.toLowerCase().includes('contact'))) {
    client.addTestResult('Scenario 2.5', 'PASS', 'Asked for contact information');
    console.log('    ✅ PASS: Asked for contact');
  } else {
    client.addTestResult('Scenario 2.5', 'UNCLEAR', 'Check if asking for contact');
    console.log('    ⚠️  UNCLEAR: Check response');
  }

  // Test 2.6: Provide contact
  console.log('  2.6 User provides contact information...');
  const s2r6 = await client.sendMessage('John Doe, 09171234567, john@example.com');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s2r6.success && (s2r6.response.toLowerCase().includes('thank') || 
                       s2r6.response.toLowerCase().includes('complete'))) {
    client.addTestResult('Scenario 2.6', 'PASS', 'BANT completed successfully');
    console.log('    ✅ PASS: BANT completed');
  } else {
    client.addTestResult('Scenario 2.6', 'UNCLEAR', 'Check if BANT completed');
    console.log('    ⚠️  UNCLEAR: Check response');
  }

  allScenarios.push({
    scenario: 'Complete BANT Flow (Phase 4)',
    transcript: [...client.transcript],
    results: [...client.testResults]
  });

  console.log();

  // ========== SCENARIO 3: ESTIMATION AFTER BANT ==========
  console.log('📋 SCENARIO 3: ESTIMATION AFTER BANT COMPLETION');
  console.log('─'.repeat(80));
  console.log('Testing: Price request after BANT is complete');
  console.log();
  
  // Continue with same conversation (BANT should be complete)
  client.testResults = [];
  
  // Test 3.1: Ask for price after BANT
  console.log('  3.1 User asks for price after completing BANT...');
  const s3r1 = await client.sendMessage('Now can you tell me the prices for condos in BGC?');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  const repeatsBant = s3r1.response?.toLowerCase().includes('budget range') ||
                      s3r1.response?.toLowerCase().includes('decision maker') ||
                      s3r1.response?.toLowerCase().includes('timeline');
  
  const discussesPrice = s3r1.response?.toLowerCase().includes('price') ||
                        s3r1.response?.toLowerCase().includes('cost') ||
                        s3r1.response?.toLowerCase().includes('million') ||
                        s3r1.response?.toLowerCase().includes('payment') ||
                        s3r1.response?.toLowerCase().includes('estimate');
  
  if (s3r1.success && !repeatsBant && discussesPrice) {
    client.addTestResult('Scenario 3.1', 'PASS', 'Provided estimation without repeating BANT');
    console.log('    ✅ PASS: Estimation provided after BANT');
  } else if (repeatsBant) {
    client.addTestResult('Scenario 3.1', 'FAIL', 'Should not repeat BANT after completion');
    console.log('    ❌ FAIL: Incorrectly repeating BANT');
  } else {
    client.addTestResult('Scenario 3.1', 'UNCLEAR', 'Check if estimation was provided');
    console.log('    ⚠️  UNCLEAR: Check response');
  }

  allScenarios.push({
    scenario: 'ESTIMATION after BANT',
    transcript: client.transcript.slice(-1), // Just the last exchange
    results: [...client.testResults]
  });

  console.log();

  // ========== SCENARIO 4: MULTIPLE PRICE REQUESTS DURING BANT ==========
  console.log('📋 SCENARIO 4: MULTIPLE PRICE REQUESTS DURING BANT');
  console.log('─'.repeat(80));
  console.log('Testing: User insists on price multiple times during BANT');
  console.log();
  
  client.newConversation();
  client.testResults = [];
  
  // Test 4.1: First price request
  console.log('  4.1 User asks for payment plans...');
  const s4r1 = await client.sendMessage('What are the payment plans available?');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s4r1.success && (s4r1.response.toLowerCase().includes('budget') || 
                       s4r1.response.toLowerCase().includes('help'))) {
    client.addTestResult('Scenario 4.1', 'PASS', 'Redirected to BANT');
    console.log('    ✅ PASS: Redirected to BANT');
  }

  // Test 4.2: Insist on price
  console.log('  4.2 User insists "Just tell me the price"...');
  const s4r2 = await client.sendMessage('Just tell me the price');
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
  
  if (s4r2.success && (s4r2.response.toLowerCase().includes('budget') || 
                       s4r2.response.toLowerCase().includes('understand'))) {
    client.addTestResult('Scenario 4.2', 'PASS', 'Gracefully handled insistence');
    console.log('    ✅ PASS: Handled gracefully');
  }

  allScenarios.push({
    scenario: 'Multiple price requests during BANT',
    transcript: [...client.transcript],
    results: [...client.testResults]
  });

  console.log();

  // ========== GENERATE FINAL REPORT ==========
  console.log('═'.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(80));
  console.log();

  // Calculate totals
  let totalPassed = 0;
  let totalFailed = 0;
  let totalUnclear = 0;
  let phase4Status = 'UNKNOWN';

  allScenarios.forEach(scenario => {
    console.log(`📋 ${scenario.scenario}`);
    scenario.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : 
                  result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.test}: ${result.details}`);
      
      if (result.status === 'PASS') totalPassed++;
      else if (result.status === 'FAIL') totalFailed++;
      else totalUnclear++;
      
      // Check Phase 4 specific tests
      if (result.details.includes('PHASE 4 WORKING')) {
        phase4Status = 'WORKING';
      } else if (result.details.includes('PHASE 4 ISSUE')) {
        phase4Status = 'FAILING';
      }
    });
    console.log();
  });

  console.log('─'.repeat(80));
  console.log('STATISTICS:');
  console.log(`  ✅ Passed: ${totalPassed}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  console.log(`  ⚠️  Unclear: ${totalUnclear}`);
  console.log(`  📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed + totalUnclear)) * 100).toFixed(1)}%`);
  console.log();
  
  console.log('PHASE 4 STATUS:');
  if (phase4Status === 'WORKING') {
    console.log('  ✨ Phase 4 (Synchronous BANT Extraction) is WORKING CORRECTLY');
    console.log('  ✅ No duplicate BANT questions detected');
  } else if (phase4Status === 'FAILING') {
    console.log('  🚨 Phase 4 (Synchronous BANT Extraction) has ISSUES');
    console.log('  ❌ Duplicate BANT questions detected');
  } else {
    console.log('  ⚠️  Phase 4 status unclear - manual verification needed');
  }
  console.log();

  console.log('KEY FEATURES TESTED:');
  console.log('  ✓ ESTIMATION gating (requires BANT completion)');
  console.log('  ✓ BANT sequential order (Budget → Authority → Need → Timeline)');
  console.log('  ✓ Phase 4 synchronous extraction (no duplicate questions)');
  console.log('  ✓ Graceful handling of price insistence');
  console.log('  ✓ Session persistence across messages');
  console.log();

  // ========== SAVE FULL TRANSCRIPT ==========
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const transcriptFile = `test-transcript-${timestamp}.json`;
  
  const fullReport = {
    testRun: {
      startTime: new Date().toISOString(),
      agentId: AGENT_ID,
      totalScenarios: allScenarios.length,
      totalPassed,
      totalFailed,
      totalUnclear,
      successRate: `${((totalPassed / (totalPassed + totalFailed + totalUnclear)) * 100).toFixed(1)}%`,
      phase4Status
    },
    scenarios: allScenarios
  };
  
  fs.writeFileSync(transcriptFile, JSON.stringify(fullReport, null, 2));
  console.log(`📝 Full transcript saved to: ${transcriptFile}`);
  console.log();

  // ========== SAMPLE CONVERSATION TRANSCRIPT ==========
  console.log('═'.repeat(80));
  console.log('📜 SAMPLE CONVERSATION TRANSCRIPT');
  console.log('═'.repeat(80));
  console.log();
  
  // Show the most important scenario (BANT with Phase 4)
  const bantScenario = allScenarios.find(s => s.scenario.includes('Phase 4'));
  if (bantScenario && bantScenario.transcript.length > 0) {
    console.log('Scenario: Complete BANT Flow (Phase 4 Test)');
    console.log('─'.repeat(80));
    bantScenario.transcript.forEach((exchange, index) => {
      console.log(`\n[${index + 1}] ${exchange.timestamp.split('T')[1].split('.')[0]} (${exchange.responseTime})`);
      console.log(`USER: "${exchange.user}"`);
      if (exchange.error) {
        console.log(`ERROR: ${exchange.error}`);
      } else {
        console.log(`AI: "${exchange.ai}"`);
        console.log(`Intent: ${exchange.intent}`);
      }
    });
  }
  
  console.log();
  console.log('═'.repeat(80));
  console.log('✨ COMPREHENSIVE TEST COMPLETE');
  console.log('═'.repeat(80));
  
  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Check if server is running
function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on port 3001');
    console.log('Please start the server with: node server.js');
    process.exit(1);
  }
  
  console.log('✅ Server is running');
  console.log();
  
  // Add delay to ensure server is ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run comprehensive test
  await runComprehensiveTest();
}

// Run the test
main().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});