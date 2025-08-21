const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLoginAndFetchAgents() {
  const API_URL = 'http://localhost:3001';
  
  console.log('=== Testing Login and Agent Fetch ===\n');
  
  // Step 1: Login
  console.log('1. Attempting login...');
  const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'super_admin@org.co',
      password: 'SecurePassword123!'  // Use the actual password
    })
  });
  
  if (!loginResponse.ok) {
    const error = await loginResponse.json();
    console.error('Login failed:', error);
    return;
  }
  
  const loginData = await loginResponse.json();
  console.log('Login successful!');
  console.log('User ID:', loginData.user.id);
  console.log('Email:', loginData.user.email);
  console.log('Session token received:', loginData.token ? 'Yes' : 'No');
  
  if (!loginData.token) {
    console.error('No token received from login');
    return;
  }
  
  // Step 2: Use the token to fetch agents
  console.log('\n2. Fetching agents with session token...');
  const agentsResponse = await fetch(`${API_URL}/api/agents`, {
    headers: {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!agentsResponse.ok) {
    const error = await agentsResponse.text();
    console.error('Failed to fetch agents:', error);
    return;
  }
  
  const agentsData = await agentsResponse.json();
  console.log('Agents fetched successfully!');
  console.log('Response:', JSON.stringify(agentsData, null, 2));
  
  // Step 3: Also test the organization members endpoint
  console.log('\n3. Fetching organization members...');
  const membersResponse = await fetch(`${API_URL}/api/organization/members`, {
    headers: {
      'Authorization': `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!membersResponse.ok) {
    const error = await membersResponse.text();
    console.error('Failed to fetch members:', error);
    return;
  }
  
  const membersData = await membersResponse.json();
  console.log('Organization members fetched successfully!');
  console.log('Organization ID:', membersData.organizationId);
  console.log('Members count:', Array.isArray(membersData.members) ? membersData.members.length : 0);
}

// Run the test
testLoginAndFetchAgents().catch(console.error);