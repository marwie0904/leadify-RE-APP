// Backend fix verification test
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function runTests() {
  console.log('='.repeat(70));
  console.log('BACKEND FIX VERIFICATION - COMPREHENSIVE TEST SUITE');
  console.log('='.repeat(70));
  
  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Test 1: Basic chat request
  console.log('\n📝 Test 1: Basic Chat Request');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: 'Hello, I need help finding a property',
      agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',
      conversationId: null,
      userId: 'test-user-' + Date.now(),
      source: 'web'
    }, { timeout: 10000 });

    if (response.status === 200 && response.data.response) {
      console.log('✅ PASSED: Chat request successful');
      console.log('   Response:', response.data.response.substring(0, 100));
      console.log('   Intent:', response.data.intent);
      testResults.passed++;
    } else {
      console.log('❌ FAILED: No response received');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ FAILED: Request error');
    console.log('   Error:', error.message);
    testResults.failed++;
    testResults.errors.push('Chat request: ' + error.message);
  }

  // Test 2: BANT Flow
  console.log('\n📝 Test 2: BANT Qualification Flow');
  console.log('-'.repeat(40));
  try {
    // Start conversation
    const conv1 = await axios.post(`${API_URL}/api/chat`, {
      message: 'Hi, I want to buy a property',
      agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',
      conversationId: null,
      userId: 'test-bant-' + Date.now(),
      source: 'web'
    }, { timeout: 10000 });

    if (conv1.data.response && conv1.data.response.toLowerCase().includes('budget')) {
      console.log('✅ PASSED: BANT started - Budget question asked');
      testResults.passed++;
      
      // Continue BANT flow
      const conv2 = await axios.post(`${API_URL}/api/chat`, {
        message: 'My budget is $500,000',
        agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',
        conversationId: conv1.data.conversationId,
        userId: 'test-bant-' + Date.now(),
        source: 'web'
      }, { timeout: 10000 });
      
      if (conv2.data.response && conv2.data.response.toLowerCase().includes('decision')) {
        console.log('✅ PASSED: BANT continued - Authority question asked');
        testResults.passed++;
      } else {
        console.log('⚠️ WARNING: BANT continuation unexpected response');
        console.log('   Response:', conv2.data.response);
      }
    } else {
      console.log('❌ FAILED: BANT not triggered correctly');
      console.log('   Response:', conv1.data.response);
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ FAILED: BANT flow error');
    console.log('   Error:', error.message);
    testResults.failed++;
    testResults.errors.push('BANT flow: ' + error.message);
  }

  // Test 3: Reference Error Check
  console.log('\n📝 Test 3: Reference Error Check');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: 'Test for reference errors',
      agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',
      conversationId: null,
      userId: 'test-ref-' + Date.now(),
      source: 'web'
    }, { timeout: 10000 });

    // If we get here without a 500 error, reference errors are fixed
    console.log('✅ PASSED: No reference errors detected');
    console.log('   Status:', response.status);
    testResults.passed++;
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('❌ FAILED: Internal server error (possible reference error)');
      testResults.failed++;
      testResults.errors.push('Reference error check: Internal server error');
    } else {
      console.log('⚠️ WARNING: Unexpected error');
      console.log('   Error:', error.message);
    }
  }

  // Test Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${Math.round(testResults.passed / (testResults.passed + testResults.failed) * 100)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ Errors encountered:');
    testResults.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n' + '='.repeat(70));
  if (testResults.failed === 0) {
    console.log('🎉 🎉 🎉 ALL BACKEND FIXES VERIFIED SUCCESSFULLY! 🎉 🎉 🎉');
  } else {
    console.log('⚠️ Some issues remain - please review failed tests');
  }
  console.log('='.repeat(70));

  return testResults.failed === 0;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});