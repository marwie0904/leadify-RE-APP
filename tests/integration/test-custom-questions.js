// Test to verify custom BANT questions are being used
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testCustomQuestions() {
  console.log('='.repeat(70));
  console.log('CUSTOM BANT QUESTIONS TEST');
  console.log('='.repeat(70));
  
  // First, let's create a test agent with custom questions
  console.log('\n📝 Step 1: Setting up test data...');
  
  // Note: We'll use the existing agent ID from the logs
  const agentId = 'f950bd7b-9bea-4db2-aa83-825981e6009e';
  
  // Test chat request
  console.log('\n📝 Step 2: Testing chat with custom questions...');
  
  try {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message: 'Hi, I want to buy a property',
      agentId: agentId,
      conversationId: null,
      userId: 'test-custom-' + Date.now(),
      source: 'web'
    }, { 
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Response received:');
    console.log('   Status:', response.status);
    console.log('   Intent:', response.data.intent);
    console.log('   Response:', response.data.response);
    
    // Check if it's using custom questions
    const responseText = response.data.response.toLowerCase();
    
    // The custom question should be "What is your estimated budget?" 
    // NOT "To help find the perfect property for you, what's your budget range?"
    if (responseText.includes('estimated budget')) {
      console.log('\n✅ ✅ ✅ SUCCESS: Custom budget question is being used!');
      return true;
    } else if (responseText.includes('budget range')) {
      console.log('\n❌ ❌ ❌ FAILURE: Still using default hardcoded question');
      console.log('   Expected: "What is your estimated budget?"');
      console.log('   Got:', response.data.response);
      return false;
    } else {
      console.log('\n⚠️ WARNING: Unexpected response');
      console.log('   Response:', response.data.response);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

// Run the test
testCustomQuestions().then(success => {
  console.log('\n' + '='.repeat(70));
  if (success) {
    console.log('✅ Custom questions test PASSED!');
  } else {
    console.log('❌ Custom questions test FAILED!');
  }
  console.log('='.repeat(70));
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});