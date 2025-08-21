const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:3001/api';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

let authToken = null;
let testUserId = null;
let testAgentId = null;

async function setupTestUser() {
  console.log('🔧 Setting up test user...\n');
  
  try {
    const response = await axios.post(`${API_URL}/test/create-user`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      testUserId = response.data.user.id;
      console.log('✅ Test user created successfully');
      console.log('   Email:', TEST_EMAIL);
      console.log('   User ID:', testUserId);
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to create test user:', error.response?.data || error.message);
  }
  
  return false;
}

async function createTestAgent() {
  console.log('\n🤖 Creating test agent...');
  
  try {
    const formData = new FormData();
    formData.append('name', 'Test Agent');
    formData.append('tone', 'Professional');
    formData.append('language', 'English');
    
    const createAgentRes = await axios.post(`${API_URL}/agents/create`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (createAgentRes.data.agent) {
      testAgentId = createAgentRes.data.agent.id;
      console.log('✅ Agent created successfully');
      console.log('   Agent ID:', testAgentId);
      return true;
    }
  } catch (error) {
    console.error('❌ Failed to create agent:', error.response?.data || error.message);
  }
  return false;
}

async function testChat() {
  console.log('\n💬 Testing chat endpoint...');
  
  try {
    const chatRes = await axios.post(`${API_URL}/chat`, {
      agentId: testAgentId,
      message: 'Hello, I need help finding a house',
      source: 'web',
      userId: 'test-user-123'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Chat successful:', {
      conversationId: chatRes.data.conversationId,
      responseLength: chatRes.data.response?.length
    });
    return true;
  } catch (error) {
    console.error('❌ Chat failed:', error.response?.data || error.message);
    return false;
  }
}

async function testProfileUpdate() {
  console.log('\n👤 Testing profile update...');
  
  try {
    const updateRes = await axios.post(`${API_URL}/settings/profile`, {
      full_name: 'Test User Updated',
      phone: '+1234567890'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ Profile update successful:', updateRes.data);
    return true;
  } catch (error) {
    console.error('❌ Profile update failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 TESTING FAILING ENDPOINTS\n');
  console.log('Server:', API_URL);
  console.log('=' * 60);
  
  // Check if server is running
  try {
    await axios.get(`${API_URL}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running on port 3001');
    return;
  }
  
  // Setup test user
  if (!await setupTestUser()) {
    console.error('\n❌ Failed to setup test user. Cannot continue.');
    return;
  }
  
  // Create test agent
  if (!await createTestAgent()) {
    console.error('\n❌ Failed to create agent. Some tests may fail.');
  }
  
  // Run tests
  const results = {
    chat: await testChat(),
    profile: await testProfileUpdate()
  };
  
  // Summary
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY\n');
  console.log('Chat endpoint:', results.chat ? '✅ PASSED' : '❌ FAILED');
  console.log('Profile update:', results.profile ? '✅ PASSED' : '❌ FAILED');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`\nTotal: ${passed}/${total} passed (${((passed/total) * 100).toFixed(0)}%)`);
}

runTests();