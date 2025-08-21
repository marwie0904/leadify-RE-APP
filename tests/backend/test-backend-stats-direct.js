/**
 * Test backend stats endpoint directly
 */

const fetch = require('node-fetch');

async function testBackendStats() {
  console.log('Testing backend stats endpoint directly...\n');
  
  // First, login to get a token
  console.log('1. Logging in to get token...');
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test-admin@example.com',
      password: 'TestPassword123!'
    })
  });
  
  const loginData = await loginResponse.json();
  
  if (!loginResponse.ok) {
    console.log('Login failed:', loginData);
    return;
  }
  
  const token = loginData.token;
  console.log('✅ Got token:', token.substring(0, 50) + '...');
  
  // Now test the stats endpoint
  console.log('\n2. Testing /api/admin/users/stats endpoint...');
  const statsResponse = await fetch('http://localhost:3001/api/admin/users/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const statsData = await statsResponse.json();
  console.log('Response status:', statsResponse.status);
  console.log('Response data:', JSON.stringify(statsData, null, 2));
  
  // Also test the users list endpoint
  console.log('\n3. Testing /api/admin/users endpoint...');
  const usersResponse = await fetch('http://localhost:3001/api/admin/users?limit=10', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const usersData = await usersResponse.json();
  console.log('Users response status:', usersResponse.status);
  console.log('Number of users returned:', usersData.users?.length || 0);
  
  if (usersData.users && usersData.users.length > 0) {
    console.log('First user:', usersData.users[0].email);
  }
}

testBackendStats();