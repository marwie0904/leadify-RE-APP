/**
 * Test Login API Directly
 */

const axios = require('axios');

async function testLoginAPI() {
  console.log('=======================================');
  console.log('   TESTING LOGIN API DIRECTLY');
  console.log('=======================================\n');

  try {
    console.log('1. Testing login endpoint...');
    console.log('   URL: http://localhost:3001/api/auth/login');
    console.log('   Credentials: marwryyy@gmail.com');
    
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Login successful!');
    console.log('   Status:', response.status);
    console.log('   Response structure:');
    console.log('   - success:', response.data.success);
    console.log('   - token:', response.data.token ? `${response.data.token.substring(0, 50)}...` : 'N/A');
    console.log('   - user:', response.data.user);
    
    if (response.data.token) {
      // Decode the JWT token to see its contents
      const tokenParts = response.data.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('\n2. JWT Token payload:');
        console.log('   - sub:', payload.sub);
        console.log('   - email:', payload.email);
        console.log('   - exp:', new Date(payload.exp * 1000).toISOString());
      }
      
      // Test admin endpoint with the token
      console.log('\n3. Testing admin access with token...');
      const adminResponse = await axios.get('http://localhost:3001/api/admin/ai-analytics/summary', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin access granted!');
      console.log('   Status:', adminResponse.status);
      console.log('   Data keys:', Object.keys(adminResponse.data));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
      
      if (error.response.status === 403) {
        console.log('\n⚠️ User authenticated but lacks admin privileges');
        console.log('   The user needs to be added to dev_members table');
      } else if (error.response.status === 401) {
        console.log('\n⚠️ Authentication failed');
        console.log('   Check credentials or token expiration');
      }
    }
  }
}

// Run the test
testLoginAPI();