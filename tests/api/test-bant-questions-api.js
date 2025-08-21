// Direct API test for BANT custom questions
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testBANTQuestions() {
  console.log('='.repeat(70));
  console.log('BANT CUSTOM QUESTIONS API TEST');
  console.log('='.repeat(70));
  
  // Wait for server to be ready
  console.log('\n⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Test with the agent ID that has custom questions
    const agentId = 'f950bd7b-9bea-4db2-aa83-825981e6009e';
    const testUserId = 'test-bant-' + Date.now();
    
    console.log('\n📝 Test 1: Initial message to trigger BANT');
    console.log('   Agent ID:', agentId);
    console.log('   User ID:', testUserId);
    
    const response1 = await axios.post(`${API_URL}/api/chat`, {
      message: 'Hello, I want to buy a property',
      agentId: agentId,
      conversationId: null,
      userId: testUserId,
      source: 'web'
    }, { 
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📥 Response 1:');
    console.log('   Status:', response1.status);
    console.log('   Intent:', response1.data.intent);
    console.log('   Conversation ID:', response1.data.conversationId);
    console.log('   Response text:', response1.data.response);
    
    // Check what question was asked
    const responseText = response1.data.response ? response1.data.response.toLowerCase() : '';
    
    console.log('\n🔍 Analysis:');
    if (responseText.includes('estimated budget')) {
      console.log('   ✅ Using CUSTOM budget question: "What is your estimated budget?"');
      
      // Continue with BANT flow
      console.log('\n📝 Test 2: Answer budget question');
      const response2 = await axios.post(`${API_URL}/api/chat`, {
        message: 'My budget is 5 million pesos',
        agentId: agentId,
        conversationId: response1.data.conversationId,
        userId: testUserId,
        source: 'web'
      }, { timeout: 15000 });
      
      console.log('\n📥 Response 2:');
      console.log('   Response:', response2.data.response);
      
      // Check if custom authority question is used
      const response2Text = response2.data.response ? response2.data.response.toLowerCase() : '';
      if (response2Text.includes('sole decision maker')) {
        console.log('   ✅ Authority question asked (may be default or custom)');
      }
      
      return true;
    } else if (responseText.includes('budget range')) {
      console.log('   ❌ Using DEFAULT budget question: "what\'s your budget range?"');
      console.log('   This means custom questions are NOT being used properly');
      return false;
    } else {
      console.log('   ⚠️ Unexpected response - not a budget question');
      console.log('   Full response:', response1.data.response);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running on port 3001');
      console.error('   Please start the backend server first');
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

// Run the test
testBANTQuestions().then(success => {
  console.log('\n' + '='.repeat(70));
  if (success) {
    console.log('✅ ✅ ✅ CUSTOM QUESTIONS ARE WORKING! ✅ ✅ ✅');
  } else {
    console.log('❌ ❌ ❌ CUSTOM QUESTIONS NOT WORKING! ❌ ❌ ❌');
  }
  console.log('='.repeat(70));
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});