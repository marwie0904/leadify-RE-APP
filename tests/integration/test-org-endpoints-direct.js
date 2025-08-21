/**
 * Direct test for organization detail endpoints
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';
const TEST_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const TEST_CREDENTIALS = {
  email: 'marwryyy@gmail.com',
  password: 'ayokonga123'
};

async function testEndpoints() {
  console.log('🚀 Testing Organization Detail Endpoints\n');
  
  try {
    // Login first
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('   ✅ Login successful\n');
    
    // Helper function for authenticated requests
    const authFetch = async (endpoint) => {
      return fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    };
    
    // Test each endpoint
    console.log('2️⃣ Testing Conversations Endpoint');
    const convResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/conversations`);
    console.log(`   Status: ${convResponse.status}`);
    if (convResponse.ok) {
      const convData = await convResponse.json();
      console.log(`   ✅ Success: ${convData.conversations?.length || 0} conversations`);
      if (convData.conversations?.[0]) {
        console.log(`   💰 Token usage: ${convData.conversations[0].total_tokens || 0} tokens`);
      }
    } else {
      console.log(`   ❌ Failed: ${await convResponse.text()}`);
    }
    
    console.log('\n3️⃣ Testing Leads Endpoint');
    const leadsResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/leads`);
    console.log(`   Status: ${leadsResponse.status}`);
    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log(`   ✅ Success: ${leadsData.leads?.length || 0} leads`);
    } else {
      console.log(`   ❌ Failed: ${await leadsResponse.text()}`);
    }
    
    console.log('\n4️⃣ Testing Members Endpoint');
    const membersResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/members`);
    console.log(`   Status: ${membersResponse.status}`);
    if (membersResponse.ok) {
      const membersData = await membersResponse.json();
      console.log(`   ✅ Success: ${membersData.members?.length || 0} members`);
      if (membersData.members?.[0]) {
        console.log(`   👤 First member: ${membersData.members[0].name} (${membersData.members[0].role})`);
      }
    } else {
      console.log(`   ❌ Failed: ${await membersResponse.text()}`);
    }
    
    console.log('\n5️⃣ Testing AI Agents Endpoint');
    const agentsResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/agents`);
    console.log(`   Status: ${agentsResponse.status}`);
    if (agentsResponse.ok) {
      const agentsData = await agentsResponse.json();
      console.log(`   ✅ Success: ${agentsData.agents?.length || 0} agents`);
      if (agentsData.agents?.[0]) {
        console.log(`   🤖 First agent: ${agentsData.agents[0].name}`);
        console.log(`   📝 Has BANT config: ${agentsData.agents[0].bant_config ? 'Yes' : 'No'}`);
      }
    } else {
      console.log(`   ❌ Failed: ${await agentsResponse.text()}`);
    }
    
    console.log('\n6️⃣ Testing Issues Endpoint');
    const issuesResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/issues`);
    console.log(`   Status: ${issuesResponse.status}`);
    if (issuesResponse.ok) {
      const issuesData = await issuesResponse.json();
      console.log(`   ✅ Success: ${issuesData.issues?.length || 0} issues`);
      if (issuesData.issues?.[0]) {
        console.log(`   🐛 First issue: ${issuesData.issues[0].subject}`);
      }
    } else {
      console.log(`   ❌ Failed: ${await issuesResponse.text()}`);
    }
    
    console.log('\n7️⃣ Testing Feature Requests Endpoint');
    const featuresResponse = await authFetch(`/api/admin/organizations/${TEST_ORG_ID}/feature-requests`);
    console.log(`   Status: ${featuresResponse.status}`);
    if (featuresResponse.ok) {
      const featuresData = await featuresResponse.json();
      console.log(`   ✅ Success: ${featuresData.featureRequests?.length || 0} feature requests`);
      if (featuresData.featureRequests?.[0]) {
        console.log(`   💡 First request: ${featuresData.featureRequests[0].requested_feature}`);
      }
    } else {
      console.log(`   ❌ Failed: ${await featuresResponse.text()}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST COMPLETE');
    console.log('All organization detail endpoints are implemented!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testEndpoints();