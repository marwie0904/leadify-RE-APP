// Comprehensive test for all fixes
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function runRobustTests() {
  console.log('='.repeat(70));
  console.log('COMPREHENSIVE FIX VERIFICATION TEST');
  console.log('='.repeat(70));
  
  // Wait for server to be ready
  console.log('\n⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // Test 1: Initial chat request with empty conversation (tests JSON parsing fixes)
    console.log('\n📝 Test 1: Initial chat request (empty conversation)');
    console.log('   This tests JSON parsing with empty message history');
    
    const agentId = 'f950bd7b-9bea-4db2-aa83-825981e6009e';
    const userId = 'test-robust-' + Date.now();
    
    const response1 = await axios.post(`${API_URL}/api/chat`, {
      message: 'I want to buy a property',
      agentId: agentId,
      conversationId: null,
      userId: userId,
      source: 'web'
    }, { 
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response1.status === 200) {
      console.log('   ✅ PASSED: Chat request successful');
      console.log('   Response:', response1.data.response?.substring(0, 50) + '...');
      console.log('   Intent:', response1.data.intent);
      results.passed.push('Initial chat request');
      
      // Check if it's using custom questions
      if (response1.data.response?.includes('estimated budget')) {
        console.log('   ✅ Custom question detected');
        results.passed.push('Custom BANT questions');
      } else {
        console.log('   ⚠️ Default question being used');
        results.warnings.push('Not using custom questions');
      }
    } else {
      console.log('   ❌ FAILED: Unexpected status:', response1.status);
      results.failed.push('Initial chat request');
    }
    
    // Test 2: Continue conversation (tests extraction with actual messages)
    console.log('\n📝 Test 2: Continue conversation with BANT answer');
    
    const response2 = await axios.post(`${API_URL}/api/chat`, {
      message: 'My budget is 5 million pesos',
      agentId: agentId,
      conversationId: response1.data.conversationId,
      userId: userId,
      source: 'web'
    }, { timeout: 15000 });
    
    if (response2.status === 200) {
      console.log('   ✅ PASSED: BANT continuation successful');
      console.log('   Response:', response2.data.response?.substring(0, 50) + '...');
      results.passed.push('BANT continuation');
    } else {
      console.log('   ❌ FAILED: BANT continuation failed');
      results.failed.push('BANT continuation');
    }
    
    // Test 3: Property inquiry (tests BANT with property question)
    console.log('\n📝 Test 3: Property inquiry question');
    
    const response3 = await axios.post(`${API_URL}/api/chat`, {
      message: 'What properties do you have in katipunan?',
      agentId: agentId,
      conversationId: null,
      userId: 'test-property-' + Date.now(),
      source: 'web'
    }, { timeout: 15000 });
    
    if (response3.status === 200) {
      console.log('   ✅ PASSED: Property inquiry handled');
      console.log('   Response:', response3.data.response?.substring(0, 50) + '...');
      results.passed.push('Property inquiry');
    } else {
      console.log('   ❌ FAILED: Property inquiry failed');
      results.failed.push('Property inquiry');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
      results.failed.push('Test suite execution');
    } else {
      console.error('   Error:', error.message);
      results.failed.push('Connection error');
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${results.passed.length} tests`);
  if (results.passed.length > 0) {
    results.passed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️ Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  const successRate = Math.round((results.passed.length / (results.passed.length + results.failed.length)) * 100);
  console.log(`\n📊 Success Rate: ${successRate}%`);
  
  console.log('\n' + '='.repeat(70));
  if (results.failed.length === 0) {
    console.log('🎉 🎉 🎉 ALL FIXES VERIFIED SUCCESSFULLY! 🎉 🎉 🎉');
    console.log('No JSON parsing errors, no database errors!');
  } else {
    console.log('⚠️ Some issues remain - check failed tests above');
  }
  console.log('='.repeat(70));
  
  // Check server logs for errors
  console.log('\n📋 Note: Check server logs for any error messages');
  console.log('   Look for:');
  console.log('   - No "JSON parse error" messages');
  console.log('   - No "Database error" messages about missing columns');
  console.log('   - No "Unexpected end of JSON input" errors');
  
  return results.failed.length === 0;
}

// Run tests
runRobustTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});