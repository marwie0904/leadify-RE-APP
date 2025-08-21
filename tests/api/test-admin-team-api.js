const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';
const TEST_CREDENTIALS = {
  email: 'marwryyy@gmail.com',
  password: 'ayokonga123'
};

async function testAdminTeamAPI() {
  console.log('🚀 Testing Admin Team API directly...\n');
  
  try {
    // Step 1: Login to get admin token
    console.log('1️⃣ Testing admin login...');
    const loginResponse = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password
      })
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log(`   ❌ Login failed: ${error}`);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log(`   ✅ Login successful`);
    console.log(`   User: ${loginData.user?.email || 'unknown'}`);
    console.log(`   Role: ${loginData.user?.role || 'unknown'}`);
    console.log(`   Token: ${loginData.token ? loginData.token.substring(0, 20) + '...' : 'none'}`);
    
    if (!loginData.token) {
      console.log('   ❌ No token received');
      return;
    }
    
    // Step 2: Test fetching team members
    console.log('\n2️⃣ Testing /api/admin/team endpoint...');
    const teamResponse = await fetch(`${API_URL}/api/admin/team`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${teamResponse.status}`);
    
    if (!teamResponse.ok) {
      const error = await teamResponse.text();
      console.log(`   ❌ Failed to fetch team: ${error}`);
      return;
    }
    
    const teamData = await teamResponse.json();
    console.log(`   ✅ Team data received`);
    console.log(`   Success: ${teamData.success}`);
    console.log(`   Total members: ${teamData.data?.total || 0}`);
    
    if (teamData.data?.members && teamData.data.members.length > 0) {
      console.log('\n   📋 Team Members:');
      teamData.data.members.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.name || 'N/A'} (${member.email})`);
        console.log(`      Role: ${member.role}, Status: ${member.status}`);
        console.log(`      Created: ${member.invitedAt || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ No team members found in response');
    }
    
    // Step 3: Test with missing token
    console.log('\n3️⃣ Testing without authentication...');
    const unauthResponse = await fetch(`${API_URL}/api/admin/team`);
    console.log(`   Status: ${unauthResponse.status}`);
    if (unauthResponse.status === 401 || unauthResponse.status === 403) {
      console.log('   ✅ Correctly rejected unauthenticated request');
    } else {
      console.log('   ⚠️ Unexpected response for unauthenticated request');
    }
    
    console.log('\n✅ API test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAdminTeamAPI().catch(console.error);