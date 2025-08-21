#!/usr/bin/env node

/**
 * Test Phase 4: Synchronous BANT Extraction
 * Verifies that BANT answers are recognized immediately and not repeated
 */

const http = require('http');

// Real agent ID
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

function sendMessage(message, conversationId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      message,
      agentId: AGENT_ID,
      conversationId,
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            success: true, 
            response: response.response, 
            intent: response.intent,
            conversationId: response.conversationId 
          });
        } catch (e) {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });
    
    req.write(payload);
    req.end();
  });
}

function generateUUID() {
  // Simple UUID v4 generator for testing
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testPhase4() {
  console.log('🧪 Phase 4 Test: Synchronous BANT Extraction');
  console.log('=' .repeat(70));
  console.log('Testing that BANT answers are recognized immediately\n');
  
  const convId = generateUUID();
  console.log(`Using conversation ID: ${convId}\n`);
  const testResults = [];
  
  // Test 1: Initial property interest triggers BANT
  console.log('📝 Test 1: Starting BANT flow');
  console.log('-'.repeat(60));
  const result1 = await sendMessage('I want to buy a house', convId);
  console.log(`User: "I want to buy a house"`);
  console.log(`AI: "${result1.response?.substring(0, 150)}..."`);
  console.log(`Intent: ${result1.intent}`);
  
  // Should ask for budget (Step 1)
  if (result1.response?.toLowerCase().includes('budget')) {
    console.log('✅ Correctly asks for budget (Step 1)');
    testResults.push({ test: 'Initial BANT', status: 'PASS' });
  } else {
    console.log('❌ Did not ask for budget');
    testResults.push({ test: 'Initial BANT', status: 'FAIL' });
  }
  
  // Test 2: Provide budget answer "50-60M"
  console.log('\n📝 Test 2: Provide budget answer');
  console.log('-'.repeat(60));
  const result2 = await sendMessage('50-60M', convId);
  console.log(`User: "50-60M"`);
  console.log(`AI: "${result2.response?.substring(0, 150)}..."`);
  console.log(`Intent: ${result2.intent}`);
  
  // Should NOT repeat budget question, should move to authority (Step 2)
  const repeatsBudget = result2.response?.toLowerCase().includes('budget') || 
                        result2.response?.toLowerCase().includes('investment') ||
                        result2.response?.toLowerCase().includes('how much');
  
  const asksAuthority = result2.response?.toLowerCase().includes('decision') ||
                        result2.response?.toLowerCase().includes('sole') ||
                        result2.response?.toLowerCase().includes('who else');
  
  if (!repeatsBudget && asksAuthority) {
    console.log('✅ Recognized budget answer, moved to authority (Step 2)');
    testResults.push({ test: 'Budget Recognition', status: 'PASS' });
  } else if (repeatsBudget) {
    console.log('❌ FAILED: Repeated budget question instead of moving to authority');
    testResults.push({ test: 'Budget Recognition', status: 'FAIL - Duplicate Question' });
  } else {
    console.log('⚠️ Unexpected response - check if it\'s asking for authority');
    testResults.push({ test: 'Budget Recognition', status: 'UNCLEAR' });
  }
  
  // Test 3: Provide authority answer "Yes I am"
  console.log('\n📝 Test 3: Provide authority answer');
  console.log('-'.repeat(60));
  const result3 = await sendMessage('Yes I am', convId);
  console.log(`User: "Yes I am"`);
  console.log(`AI: "${result3.response?.substring(0, 150)}..."`);
  console.log(`Intent: ${result3.intent}`);
  
  // Should NOT repeat authority question, should move to need (Step 3)
  const repeatsAuthority = result3.response?.toLowerCase().includes('decision') ||
                           result3.response?.toLowerCase().includes('sole');
  
  const asksNeed = result3.response?.toLowerCase().includes('residence') ||
                   result3.response?.toLowerCase().includes('investment') ||
                   result3.response?.toLowerCase().includes('purpose') ||
                   result3.response?.toLowerCase().includes('live') ||
                   result3.response?.toLowerCase().includes('use');
  
  if (!repeatsAuthority && asksNeed) {
    console.log('✅ Recognized authority answer, moved to need (Step 3)');
    testResults.push({ test: 'Authority Recognition', status: 'PASS' });
  } else if (repeatsAuthority) {
    console.log('❌ FAILED: Repeated authority question instead of moving to need');
    testResults.push({ test: 'Authority Recognition', status: 'FAIL - Duplicate Question' });
  } else {
    console.log('⚠️ Unexpected response - check if it\'s asking for need/purpose');
    testResults.push({ test: 'Authority Recognition', status: 'UNCLEAR' });
  }
  
  // Test 4: Continue with need
  console.log('\n📝 Test 4: Provide need answer');
  console.log('-'.repeat(60));
  const result4 = await sendMessage('for living', convId);
  console.log(`User: "for living"`);
  console.log(`AI: "${result4.response?.substring(0, 150)}..."`);
  console.log(`Intent: ${result4.intent}`);
  
  // Should move to timeline (Step 4)
  const asksTimeline = result4.response?.toLowerCase().includes('when') ||
                       result4.response?.toLowerCase().includes('timeline') ||
                       result4.response?.toLowerCase().includes('planning') ||
                       result4.response?.toLowerCase().includes('soon');
  
  if (asksTimeline) {
    console.log('✅ Recognized need answer, moved to timeline (Step 4)');
    testResults.push({ test: 'Need Recognition', status: 'PASS' });
  } else {
    console.log('⚠️ Check if asking for timeline');
    testResults.push({ test: 'Need Recognition', status: 'UNCLEAR' });
  }
  
  // Test 5: Provide timeline
  console.log('\n📝 Test 5: Provide timeline answer');
  console.log('-'.repeat(60));
  const result5 = await sendMessage('next month', convId);
  console.log(`User: "next month"`);
  console.log(`AI: "${result5.response?.substring(0, 150)}..."`);
  console.log(`Intent: ${result5.intent}`);
  
  // Should ask for contact info
  const asksContact = result5.response?.toLowerCase().includes('name') ||
                      result5.response?.toLowerCase().includes('contact') ||
                      result5.response?.toLowerCase().includes('number') ||
                      result5.response?.toLowerCase().includes('phone');
  
  if (asksContact) {
    console.log('✅ Recognized timeline answer, asking for contact');
    testResults.push({ test: 'Timeline Recognition', status: 'PASS' });
  } else {
    console.log('⚠️ Check if asking for contact info');
    testResults.push({ test: 'Timeline Recognition', status: 'UNCLEAR' });
  }
  
  // Print results summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(70));
  
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status.includes('FAIL')).length;
  const unclear = testResults.filter(r => r.status === 'UNCLEAR').length;
  
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Unclear: ${unclear}`);
  
  console.log('\nDetailed Results:');
  testResults.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status.includes('FAIL') ? '❌' : '⚠️';
    console.log(`  ${icon} ${r.test}: ${r.status}`);
  });
  
  if (failed > 0) {
    console.log('\n🚨 PHASE 4 IMPLEMENTATION NEEDS ATTENTION');
    console.log('The synchronous BANT extraction may not be working correctly.');
    console.log('Check server logs for [BANT EXTRACTION] entries.');
  } else if (passed === testResults.length) {
    console.log('\n✨ PHASE 4 IMPLEMENTATION SUCCESSFUL!');
    console.log('BANT answers are being recognized immediately without repetition.');
  } else {
    console.log('\n⚠️ PHASE 4 PARTIALLY WORKING');
    console.log('Some tests passed but results are unclear for others.');
  }
  
  // Performance note
  console.log('\n📈 Performance Note:');
  console.log('Synchronous extraction will add ~200-400ms to response time.');
  console.log('This is expected and acceptable for fixing duplicate questions.');
  
  console.log('\n✨ Test complete!\n');
}

// Run the test
testPhase4().catch(console.error);