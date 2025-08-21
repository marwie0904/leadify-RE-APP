// Direct API test to verify backend fixes
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testChatAPI() {
  console.log('='.repeat(70));
  console.log('DIRECT API CHAT TEST - BACKEND VALIDATION');
  console.log('='.repeat(70));
  console.log('Testing backend fixes directly without UI...\n');

  try {
    // Test data
    const testData = {
      message: 'Hello, I need help finding a property',
      agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',  // Using the agent ID from logs
      conversationId: null,  // New conversation
      userId: 'test-user-direct',
      source: 'web'
    };

    console.log('📤 Sending chat request to backend...');
    console.log('   Endpoint:', `${API_URL}/api/chat`);
    console.log('   Request data:', JSON.stringify(testData, null, 2));
    console.log();

    const startTime = Date.now();
    
    // Make the request
    const response = await axios.post(`${API_URL}/api/chat`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000  // 15 second timeout
    });

    const responseTime = Date.now() - startTime;
    
    console.log('✅ Response received in', responseTime, 'ms');
    console.log();
    console.log('📥 Response details:');
    console.log('   Status:', response.status);
    console.log('   Headers:', response.headers['content-type']);
    
    if (response.data) {
      console.log('   Response data:');
      // Note: API sends 'response' field, not 'message'
      console.log('   - Message:', response.data.response || response.data.message || 'No message');
      console.log('   - Conversation ID:', response.data.conversationId || 'Not provided');
      console.log('   - Intent:', response.data.intent || 'Not specified');
      
      const messageContent = response.data.response || response.data.message;
      if (messageContent) {
        console.log();
        console.log('🤖 AI Response:');
        console.log('   "' + messageContent + '"');
        
        // Check if it's a BANT question
        if (messageContent.toLowerCase().includes('budget') || 
            messageContent.toLowerCase().includes('authority') ||
            messageContent.toLowerCase().includes('need') ||
            messageContent.toLowerCase().includes('timeline')) {
          console.log();
          console.log('✅ BANT qualification detected in response!');
        }
      }
    }
    
    console.log();
    console.log('='.repeat(70));
    console.log('✅ ✅ ✅ BACKEND TEST PASSED - FIXES WORKING! ✅ ✅ ✅');
    console.log('='.repeat(70));
    
    return true;
    
  } catch (error) {
    console.error();
    console.error('❌ API Request failed:');
    
    if (error.response) {
      // Server responded with error
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 500) {
        console.error();
        console.error('⚠️ INTERNAL SERVER ERROR (500)');
        console.error('This indicates the reference errors might still be occurring.');
        console.error('Check backend logs for detailed error information.');
      }
    } else if (error.request) {
      // Request made but no response
      console.error('   No response received from server');
      console.error('   Is the backend running on port 3001?');
    } else {
      // Error setting up request
      console.error('   Error:', error.message);
    }
    
    console.error();
    console.error('='.repeat(70));
    console.error('❌ ❌ ❌ BACKEND TEST FAILED! ❌ ❌ ❌');
    console.error('='.repeat(70));
    console.error();
    console.error('Debug steps:');
    console.error('1. Check if backend is running: curl http://localhost:3001/api/health');
    console.error('2. Check backend logs for detailed error messages');
    console.error('3. Verify the agent ID exists in the database');
    console.error('4. Check if Supabase connection is working');
    
    return false;
  }
}

// Run the test
testChatAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});