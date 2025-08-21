/**
 * Test the team members API endpoint
 */

const fetch = require('node-fetch');

async function testTeamAPI() {
  console.log('Testing team members API...\n');
  
  // First, login to get a token
  console.log('1. Logging in...');
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
  console.log('✅ Got token');
  
  // Test the team endpoint
  console.log('\n2. Testing /api/admin/team/members endpoint...');
  const teamResponse = await fetch('http://localhost:3001/api/admin/team/members', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const teamData = await teamResponse.json();
  console.log('Response status:', teamResponse.status);
  console.log('Response data:', JSON.stringify(teamData, null, 2));
  
  if (teamData.success && teamData.members) {
    console.log(`\n✅ Found ${teamData.members.length} team members:`);
    teamData.members.forEach(member => {
      console.log(`  - ${member.name} (${member.email}) - Role: ${member.role}, Status: ${member.status}`);
    });
  }
}

testTeamAPI();