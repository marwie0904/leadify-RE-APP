const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_EMAIL = `test${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

async function testOrganizationFlow() {
  console.log('🔧 Testing Organization Flow\n');
  
  try {
    // 1. Create test user
    console.log('1️⃣ Creating test user...');
    const createUserRes = await axios.post(`${API_URL}/test/create-user`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    
    const { token, user, organizationId } = createUserRes.data;
    console.log('✅ User created:');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Organization ID:', organizationId);
    console.log('   Token:', token.substring(0, 20) + '...\n');
    
    // 2. Test getting organization with the token
    console.log('2️⃣ Testing GET /api/organization...');
    try {
      const orgRes = await axios.get(`${API_URL}/organization`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Organization retrieved:', orgRes.data);
    } catch (error) {
      console.log('❌ Failed to get organization:', error.response?.data || error.message);
    }
    
    // 3. Test getting organization members
    console.log('\n3️⃣ Testing GET /api/organization/members...');
    try {
      const membersRes = await axios.get(`${API_URL}/organization/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Organization members:', membersRes.data);
    } catch (error) {
      console.log('❌ Failed to get members:', error.response?.data || error.message);
    }
    
    // 4. Test creating an agent
    console.log('\n4️⃣ Testing agent creation...');
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('name', 'Test Agent');
    formData.append('tone', 'Professional');
    formData.append('language', 'English');
    
    try {
      const agentRes = await axios.post(`${API_URL}/agents/create`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Agent created:', agentRes.data);
    } catch (error) {
      console.log('❌ Failed to create agent:', error.response?.data || error.message);
    }
    
    // 5. Debug - check what organizations exist
    console.log('\n5️⃣ Testing /api/debug/organizations...');
    try {
      const debugRes = await axios.get(`${API_URL}/debug/organizations`);
      console.log('✅ Debug organizations response:', debugRes.data);
    } catch (error) {
      console.log('❌ Failed to get debug organizations:', error.response?.data || error.message);
    }
    
    // 6. Debug - check what the auth middleware sees
    console.log('\n6️⃣ Testing /api/protected to see user info...');
    try {
      const protectedRes = await axios.get(`${API_URL}/protected`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Protected endpoint response:', protectedRes.data);
    } catch (error) {
      console.log('❌ Failed to access protected endpoint:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Check server first
axios.get(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    testOrganizationFlow();
  })
  .catch(() => {
    console.log('❌ Server is not running on port 3001');
  });