// Test script for Manual Human Handoff System
const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  agent1: {
    email: process.env.TEST_AGENT1_EMAIL || 'agent1@test.com',
    password: process.env.TEST_AGENT1_PASSWORD || 'password123'
  },
  agent2: {
    email: process.env.TEST_AGENT2_EMAIL || 'agent2@test.com', 
    password: process.env.TEST_AGENT2_PASSWORD || 'password123'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'password123'
  },
  conversationId: process.env.TEST_CONVERSATION_ID || 'test-conversation-id'
};

// Helper function to authenticate and get token
async function authenticate(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Auth failed: ${data.error || response.statusText}`);
    }

    return data.token;
  } catch (error) {
    console.error(`❌ Authentication failed for ${email}:`, error.message);
    return null;
  }
}

// Test 1: Agent isolation - each agent should only see their own handoff conversations
async function testAgentIsolation() {
  console.log('\n=== Test 1: Agent Isolation ===');
  
  const agent1Token = await authenticate(TEST_CONFIG.agent1.email, TEST_CONFIG.agent1.password);
  const agent2Token = await authenticate(TEST_CONFIG.agent2.email, TEST_CONFIG.agent2.password);
  
  if (!agent1Token || !agent2Token) {
    console.log('❌ Failed to authenticate both agents - skipping isolation test');
    return false;
  }

  // Get handoff conversations for both agents
  const [agent1Response, agent2Response] = await Promise.all([
    fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: { 'Authorization': `Bearer ${agent1Token}` }
    }),
    fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: { 'Authorization': `Bearer ${agent2Token}` }
    })
  ]);

  const agent1Data = await agent1Response.json();
  const agent2Data = await agent2Response.json();

  console.log(`Agent 1 sees ${agent1Data.conversations?.length || 0} handoff conversations`);
  console.log(`Agent 2 sees ${agent2Data.conversations?.length || 0} handoff conversations`);

  // Check for overlapping conversation IDs (should be none)
  const agent1ConvIds = new Set(agent1Data.conversations?.map(c => c.id) || []);
  const agent2ConvIds = new Set(agent2Data.conversations?.map(c => c.id) || []);
  const overlap = [...agent1ConvIds].filter(id => agent2ConvIds.has(id));

  if (overlap.length === 0) {
    console.log('✅ Agent isolation working correctly - no conversation overlap');
    return true;
  } else {
    console.log(`❌ Agent isolation failed - ${overlap.length} conversations visible to both agents`);
    return false;
  }
}

// Test 1b: Admin visibility - admin should see all handoff conversations in organization
async function testAdminVisibility() {
  console.log('\n=== Test 1b: Admin Visibility ===');
  
  const adminToken = await authenticate(TEST_CONFIG.admin.email, TEST_CONFIG.admin.password);
  const agent1Token = await authenticate(TEST_CONFIG.agent1.email, TEST_CONFIG.agent1.password);
  
  if (!adminToken || !agent1Token) {
    console.log('❌ Failed to authenticate admin or agent - skipping admin visibility test');
    return false;
  }

  // Get handoff conversations for admin and agent
  const [adminResponse, agentResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }),
    fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: { 'Authorization': `Bearer ${agent1Token}` }
    })
  ]);

  const adminData = await adminResponse.json();
  const agentData = await agentResponse.json();

  console.log(`Admin sees ${adminData.conversations?.length || 0} handoff conversations (viewMode: ${adminData.viewMode})`);
  console.log(`Agent sees ${agentData.conversations?.length || 0} handoff conversations (viewMode: ${agentData.viewMode})`);

  // Admin should see equal or more conversations than individual agent
  const adminCount = adminData.conversations?.length || 0;
  const agentCount = agentData.conversations?.length || 0;

  if (adminData.viewMode === 'organization' && agentData.viewMode === 'personal') {
    console.log('✅ Correct view modes: admin=organization, agent=personal');
    if (adminCount >= agentCount) {
      console.log('✅ Admin visibility working correctly - sees equal or more conversations');
      return true;
    } else {
      console.log('❌ Admin sees fewer conversations than agent - this should not happen');
      return false;
    }
  } else {
    console.log('❌ Incorrect view modes or missing data');
    return false;
  }
}

// Test 2: Manual transfer to human
async function testTransferToHuman() {
  console.log('\n=== Test 2: Transfer to Human ===');
  
  const agentToken = await authenticate(TEST_CONFIG.agent1.email, TEST_CONFIG.agent1.password);
  if (!agentToken) {
    console.log('❌ Failed to authenticate agent - skipping transfer test');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${TEST_CONFIG.conversationId}/transfer-to-human`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Successfully transferred conversation to human agent');
      console.log(`   Agent: ${data.agent?.name} (${data.agent?.id})`);
      return true;
    } else {
      console.log(`❌ Transfer to human failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Transfer to human error: ${error.message}`);
    return false;
  }
}

// Test 3: Manual transfer back to AI
async function testTransferToAI() {
  console.log('\n=== Test 3: Transfer back to AI ===');
  
  const agentToken = await authenticate(TEST_CONFIG.agent1.email, TEST_CONFIG.agent1.password);
  if (!agentToken) {
    console.log('❌ Failed to authenticate agent - skipping transfer test');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/${TEST_CONFIG.conversationId}/transfer-to-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Successfully transferred conversation back to AI');
      return true;
    } else {
      console.log(`❌ Transfer to AI failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Transfer to AI error: ${error.message}`);
    return false;
  }
}

// Test 4: Unauthorized access prevention
async function testUnauthorizedAccess() {
  console.log('\n=== Test 4: Unauthorized Access Prevention ===');
  
  // Test without token
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/handoffs`);
    const data = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      console.log('✅ Correctly blocked unauthorized access (no token)');
    } else {
      console.log('❌ Failed to block unauthorized access (no token)');
      return false;
    }
  } catch (error) {
    console.log(`❌ Unauthorized access test error: ${error.message}`);
    return false;
  }

  // Test with invalid token
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    const data = await response.json();
    
    if (response.status === 401 || response.status === 403) {
      console.log('✅ Correctly blocked unauthorized access (invalid token)');
      return true;
    } else {
      console.log('❌ Failed to block unauthorized access (invalid token)');
      return false;
    }
  } catch (error) {
    console.log(`❌ Invalid token test error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('=== Manual Human Handoff System Tests ===');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Conversation ID: ${TEST_CONFIG.conversationId}`);
  
  const results = {
    isolation: await testAgentIsolation(),
    adminVisibility: await testAdminVisibility(),
    transferToHuman: await testTransferToHuman(),
    transferToAI: await testTransferToAI(),
    unauthorized: await testUnauthorizedAccess()
  };
  
  // Summary
  console.log('\n=== Test Results Summary ===');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\nOverall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Manual handoff system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return passed === total;
}

// Instructions
console.log(`
=== Manual Human Handoff System Test ===

This script tests the new manual handoff functionality with agent isolation.

Before running, ensure:
1. Backend server is running on ${API_BASE_URL}
2. Test users exist in the database:
   - 2 agents with role='agent' 
   - 1 admin with role='admin'
3. Set environment variables:
   - TEST_AGENT1_EMAIL
   - TEST_AGENT1_PASSWORD  
   - TEST_AGENT2_EMAIL
   - TEST_AGENT2_PASSWORD
   - TEST_ADMIN_EMAIL
   - TEST_ADMIN_PASSWORD
   - TEST_CONVERSATION_ID
   - API_BASE_URL (optional)

To run: node test-handoff-system.js

Tests include:
- Agent isolation (agents only see their own conversations)
- Admin visibility (admins see all organization conversations)
- Manual transfer to human agent
- Manual transfer back to AI
- Unauthorized access prevention
`);

// Uncomment to run tests
// runAllTests();

module.exports = {
  runAllTests,
  testAgentIsolation,
  testAdminVisibility,
  testTransferToHuman,
  testTransferToAI,
  testUnauthorizedAccess
};