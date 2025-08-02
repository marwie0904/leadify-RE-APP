require('dotenv').config({ path: './BACKEND/.env' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials (should be created in Supabase)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  name: 'Test User'
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    console.error(`   Error: ${error?.message || error}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error?.message || error });
  }
}

// Helper function to get auth headers
async function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// Test Suite
async function runAPITests() {
  console.log('=== API VALIDATION TEST SUITE ===\n');
  console.log(`Testing against: ${API_BASE_URL}\n`);

  let authToken = null;
  let userId = null;
  let organizationId = null;
  let agentId = null;
  let conversationId = null;
  let leadId = null;

  try {
    // 1. Test Health Check (no auth required)
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
      logTest('Health Check Endpoint', healthResponse.status === 200);
    } catch (error) {
      logTest('Health Check Endpoint', false, error);
    }

    // 2. Test Authentication Flow
    
    // 2a. Test Signup
    try {
      // Try to delete existing test user first
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === TEST_USER.email)?.id
      );
      
      const signupResponse = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        email: TEST_USER.email,
        password: TEST_USER.password,
        fullName: TEST_USER.name
      });
      logTest('Signup Endpoint', signupResponse.status === 200);
    } catch (error) {
      // User might already exist, that's OK for testing
      if (error.response?.data?.message?.includes('already registered')) {
        logTest('Signup Endpoint', true, 'User already exists (OK for testing)');
      } else {
        logTest('Signup Endpoint', false, error);
      }
    }

    // 2b. Test Login
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      authToken = loginResponse.data.token;
      userId = loginResponse.data.user.id;
      logTest('Login Endpoint', loginResponse.status === 200 && authToken);
    } catch (error) {
      logTest('Login Endpoint', false, error);
      throw new Error('Cannot continue without auth token');
    }

    const headers = await getAuthHeaders(authToken);

    // 2c. Test Logout
    try {
      const logoutResponse = await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { headers });
      logTest('Logout Endpoint', logoutResponse.status === 200);
    } catch (error) {
      logTest('Logout Endpoint', false, error);
    }

    // 3. Test Organization Endpoints
    
    // 3a. Create Organization
    try {
      const createOrgResponse = await axios.post(`${API_BASE_URL}/api/organization`, 
        { name: 'Test Organization' }, 
        { headers }
      );
      organizationId = createOrgResponse.data.organization.id;
      logTest('Create Organization', createOrgResponse.status === 200);
    } catch (error) {
      logTest('Create Organization', false, error);
    }

    // 3b. Get Organization
    try {
      const getOrgResponse = await axios.get(`${API_BASE_URL}/api/organization`, { headers });
      logTest('Get Organization', getOrgResponse.status === 200);
    } catch (error) {
      logTest('Get Organization', false, error);
    }

    // 3c. Get Organization Members
    try {
      const getMembersResponse = await axios.get(`${API_BASE_URL}/api/organization/members`, { headers });
      logTest('Get Organization Members', getMembersResponse.status === 200);
    } catch (error) {
      logTest('Get Organization Members', false, error);
    }

    // 4. Test Agent Endpoints
    
    // 4a. Create Agent (with file upload)
    try {
      const formData = new FormData();
      formData.append('name', 'Test Agent');
      formData.append('tone', 'Professional');
      formData.append('language', 'English');
      formData.append('openingMessage', 'Hello! How can I help you?');
      
      const createAgentResponse = await axios.post(
        `${API_BASE_URL}/api/agents/create`,
        formData,
        {
          headers: {
            ...headers,
            ...formData.getHeaders()
          }
        }
      );
      agentId = createAgentResponse.data.agent?.id;
      logTest('Create Agent', createAgentResponse.status === 200);
    } catch (error) {
      logTest('Create Agent', false, error);
    }

    // 4b. Get Agents
    try {
      const getAgentsResponse = await axios.get(`${API_BASE_URL}/api/agents`, { headers });
      logTest('Get Agents', getAgentsResponse.status === 200);
    } catch (error) {
      logTest('Get Agents', false, error);
    }

    // 5. Test Conversation Endpoints
    
    // 5a. Get Conversations
    try {
      const getConversationsResponse = await axios.get(`${API_BASE_URL}/api/conversations`, { headers });
      logTest('Get Conversations', getConversationsResponse.status === 200);
    } catch (error) {
      logTest('Get Conversations', false, error);
    }

    // 5b. Test Chat (create conversation)
    try {
      const chatResponse = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: 'Hello, I need help',
        agentId: agentId || 'test-agent-id',
        source: 'web'
      }, { headers });
      conversationId = chatResponse.data.conversationId;
      logTest('Chat Endpoint', chatResponse.status === 200);
    } catch (error) {
      logTest('Chat Endpoint', false, error);
    }

    // 5c. Get Conversation Messages
    if (conversationId) {
      try {
        const getMessagesResponse = await axios.get(
          `${API_BASE_URL}/api/conversations/${conversationId}/messages`, 
          { headers }
        );
        logTest('Get Conversation Messages', getMessagesResponse.status === 200);
      } catch (error) {
        logTest('Get Conversation Messages', false, error);
      }
    }

    // 6. Test Lead Endpoints
    
    // 6a. Get Leads
    try {
      const getLeadsResponse = await axios.get(`${API_BASE_URL}/api/leads`, { headers });
      logTest('Get Leads', getLeadsResponse.status === 200);
      if (getLeadsResponse.data.leads && getLeadsResponse.data.leads.length > 0) {
        leadId = getLeadsResponse.data.leads[0].id;
      }
    } catch (error) {
      logTest('Get Leads', false, error);
    }

    // 7. Test Dashboard Endpoints
    
    // 7a. Dashboard Summary
    try {
      const dashboardSummaryResponse = await axios.get(`${API_BASE_URL}/api/dashboard/summary`, { headers });
      logTest('Dashboard Summary', dashboardSummaryResponse.status === 200);
    } catch (error) {
      logTest('Dashboard Summary', false, error);
    }

    // 7b. Dashboard Activity
    try {
      const dashboardActivityResponse = await axios.get(`${API_BASE_URL}/api/dashboard/activity`, { headers });
      logTest('Dashboard Activity', dashboardActivityResponse.status === 200);
    } catch (error) {
      logTest('Dashboard Activity', false, error);
    }

    // 8. Test Settings Endpoints
    
    // 8a. Get Profile
    try {
      const getProfileResponse = await axios.get(`${API_BASE_URL}/api/settings/profile`, { headers });
      logTest('Get Profile', getProfileResponse.status === 200);
    } catch (error) {
      logTest('Get Profile', false, error);
    }

    // 8b. Update Profile
    try {
      const updateProfileResponse = await axios.post(
        `${API_BASE_URL}/api/settings/profile`,
        { name: 'Updated Test User' },
        { headers }
      );
      logTest('Update Profile', updateProfileResponse.status === 200);
    } catch (error) {
      logTest('Update Profile', false, error);
    }

    // 9. Test Human-in-Loop Endpoints
    
    // 9a. Get Human Agent Dashboard
    try {
      const humanDashboardResponse = await axios.get(`${API_BASE_URL}/api/human-agents/dashboard`, { headers });
      logTest('Human Agent Dashboard', humanDashboardResponse.status === 200);
    } catch (error) {
      // This might fail if user is not a human agent, which is OK
      if (error.response?.status === 403) {
        logTest('Human Agent Dashboard', true, 'User is not a human agent (OK)');
      } else {
        logTest('Human Agent Dashboard', false, error);
      }
    }

    // 9b. Get Priority Queue
    try {
      const priorityQueueResponse = await axios.get(`${API_BASE_URL}/api/conversations/priority-queue`, { headers });
      logTest('Priority Queue', priorityQueueResponse.status === 200);
    } catch (error) {
      logTest('Priority Queue', false, error);
    }

  } catch (error) {
    console.error('\n❌ Critical error during testing:', error.message);
  }

  // Print Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n=== FAILED TESTS ===');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`\n❌ ${test}`);
      console.log(`   ${error}`);
    });
  }

  // Return exit code based on results
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
runAPITests().catch(console.error);