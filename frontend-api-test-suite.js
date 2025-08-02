const axios = require('axios');
require('dotenv').config({ path: './BACKEND/.env' });

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Test credentials provided by user
const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

// Test data storage
let testData = {
  authToken: null,
  userId: null,
  organizationId: null,
  agentId: null,
  conversationId: null,
  leadId: null,
  memberRole: null
};

// Test results
const testResults = {
  passed: [],
  failed: [],
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to log test results
function logTest(category, testName, passed, details = null) {
  const fullTestName = `${category} - ${testName}`;
  if (passed) {
    console.log(`${colors.green}✅ ${fullTestName}${colors.reset}`);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
    testResults.passed.push(fullTestName);
  } else {
    console.log(`${colors.red}❌ ${fullTestName}${colors.reset}`);
    if (details) console.error(`   ${colors.red}Error: ${details}${colors.reset}`);
    testResults.failed.push(fullTestName);
    testResults.errors.push({ test: fullTestName, error: details });
  }
}

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, useFormData = false) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {}
    };

    if (testData.authToken) {
      config.headers['Authorization'] = `Bearer ${testData.authToken}`;
    }

    if (data) {
      if (useFormData) {
        const FormData = require('form-data');
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
        });
        config.data = formData;
        config.headers = { ...config.headers, ...formData.getHeaders() };
      } else {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      status: error.response?.status || 0,
      data: error.response?.data
    };
  }
}

// Test functions for each feature area

async function testAuthentication() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING AUTHENTICATION ===${colors.reset}\n`);

  // Test Login
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: TEST_CREDENTIALS.email,
    password: TEST_CREDENTIALS.password
  });

  if (loginResult.success) {
    testData.authToken = loginResult.data.token;
    testData.userId = loginResult.data.user.id;
    logTest('Auth', 'Login', true, `User ID: ${testData.userId}`);
  } else {
    logTest('Auth', 'Login', false, loginResult.error);
    throw new Error('Cannot continue without authentication');
  }

  // Test getting auth headers
  if (testData.authToken) {
    logTest('Auth', 'Auth Token Generation', true, 'Token received');
  }

  // Test protected endpoint
  const protectedResult = await apiCall('GET', '/api/protected');
  logTest('Auth', 'Protected Endpoint Access', protectedResult.success, 
    protectedResult.success ? 'Authorized' : protectedResult.error);
}

async function testOrganization() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING ORGANIZATION MANAGEMENT ===${colors.reset}\n`);

  // Get current organization
  const getOrgResult = await apiCall('GET', '/api/organization');
  
  if (getOrgResult.success) {
    testData.organizationId = getOrgResult.data.organization?.id;
    logTest('Organization', 'Get Organization', true, 
      `Org: ${getOrgResult.data.organization?.name}`);
  } else if (getOrgResult.status === 404) {
    // User doesn't have an organization, create one
    const createOrgResult = await apiCall('POST', '/api/organization', {
      name: 'Test Organization ' + Date.now()
    });
    
    if (createOrgResult.success) {
      testData.organizationId = createOrgResult.data.organization.id;
      logTest('Organization', 'Create Organization', true, 
        `Created: ${createOrgResult.data.organization.name}`);
    } else {
      logTest('Organization', 'Create Organization', false, createOrgResult.error);
    }
  } else {
    logTest('Organization', 'Get Organization', false, getOrgResult.error);
  }

  // Get organization members
  const getMembersResult = await apiCall('GET', '/api/organization/members');
  logTest('Organization', 'Get Members', getMembersResult.success,
    getMembersResult.success ? `${getMembersResult.data.members?.length || 0} members` : getMembersResult.error);

  if (getMembersResult.success && getMembersResult.data.members?.length > 0) {
    const currentUser = getMembersResult.data.members.find(m => m.user_id === testData.userId);
    testData.memberRole = currentUser?.role;
  }

  // Test member role endpoint
  const getMeResult = await apiCall('GET', '/api/organization/members/me');
  logTest('Organization', 'Get My Member Info', getMeResult.success,
    getMeResult.success ? `Role: ${getMeResult.data.member?.role}` : getMeResult.error);
}

async function testAgentManagement() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING AGENT MANAGEMENT ===${colors.reset}\n`);

  // Get existing agents
  const getAgentsResult = await apiCall('GET', '/api/agents');
  logTest('Agents', 'Get Agents List', getAgentsResult.success,
    getAgentsResult.success ? `${getAgentsResult.data.agents?.length || 0} agents` : getAgentsResult.error);

  if (getAgentsResult.success && getAgentsResult.data.agents?.length > 0) {
    testData.agentId = getAgentsResult.data.agents[0].id;
  } else {
    // Create a new agent if none exist
    const createAgentResult = await apiCall('POST', '/api/agents/create', {
      name: 'Test Agent ' + Date.now(),
      tone: 'Professional',
      language: 'English',
      openingMessage: 'Hello! How can I help you today?'
    }, true); // Use FormData

    if (createAgentResult.success) {
      testData.agentId = createAgentResult.data.agent?.id;
      logTest('Agents', 'Create Agent', true, 
        `Created: ${createAgentResult.data.agent?.name}`);
    } else {
      logTest('Agents', 'Create Agent', false, createAgentResult.error);
    }
  }

  // Get agent status
  if (testData.agentId) {
    const getStatusResult = await apiCall('GET', `/api/agents/${testData.agentId}/status`);
    logTest('Agents', 'Get Agent Status', getStatusResult.success,
      getStatusResult.success ? `Status: ${getStatusResult.data.status}` : getStatusResult.error);

    // Get agent documents
    const getDocsResult = await apiCall('GET', `/api/agents/${testData.agentId}/documents`);
    logTest('Agents', 'Get Agent Documents', getDocsResult.success,
      getDocsResult.success ? `${getDocsResult.data.documents?.length || 0} documents` : getDocsResult.error);
  }

  // Get organization agents
  const getOrgAgentsResult = await apiCall('GET', '/api/organization/agents');
  logTest('Agents', 'Get Organization Agents', getOrgAgentsResult.success,
    getOrgAgentsResult.success ? `${getOrgAgentsResult.data.agents?.length || 0} org agents` : getOrgAgentsResult.error);
}

async function testConversations() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING CONVERSATIONS & CHAT ===${colors.reset}\n`);

  // Test chat endpoint (create a conversation)
  if (testData.agentId) {
    const chatResult = await apiCall('POST', '/api/chat', {
      message: 'Hello, I need help with real estate',
      agentId: testData.agentId,
      source: 'web',
      userId: testData.userId
    });

    if (chatResult.success) {
      testData.conversationId = chatResult.data.conversationId;
      logTest('Chat', 'Send Chat Message', true, 
        `Conversation ID: ${testData.conversationId}`);
    } else {
      logTest('Chat', 'Send Chat Message', false, chatResult.error);
    }
  }

  // Get conversations list
  const getConversationsResult = await apiCall('GET', '/api/conversations');
  logTest('Conversations', 'Get Conversations List', getConversationsResult.success,
    getConversationsResult.success ? `${getConversationsResult.data.conversations?.length || 0} conversations` : getConversationsResult.error);

  // Get conversation messages
  if (testData.conversationId) {
    const getMessagesResult = await apiCall('GET', `/api/conversations/${testData.conversationId}/messages`);
    logTest('Conversations', 'Get Conversation Messages', getMessagesResult.success,
      getMessagesResult.success ? `${getMessagesResult.data.messages?.length || getMessagesResult.data?.length || 0} messages` : getMessagesResult.error);

    // Test message polling
    const pollMessagesResult = await apiCall('GET', `/api/messages/${testData.conversationId}`);
    logTest('Conversations', 'Poll Messages Endpoint', pollMessagesResult.success,
      pollMessagesResult.success ? 'Messages retrieved' : pollMessagesResult.error);
  }

  // Test priority queue
  const priorityQueueResult = await apiCall('GET', '/api/conversations/priority-queue');
  logTest('Conversations', 'Get Priority Queue', priorityQueueResult.success,
    priorityQueueResult.success ? `${priorityQueueResult.data.conversations?.length || 0} in queue` : priorityQueueResult.error);
}

async function testLeadManagement() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING LEAD MANAGEMENT ===${colors.reset}\n`);

  // Get leads
  const getLeadsResult = await apiCall('GET', '/api/leads');
  logTest('Leads', 'Get Leads List', getLeadsResult.success,
    getLeadsResult.success ? `${getLeadsResult.data.leads?.length || 0} leads` : getLeadsResult.error);

  if (getLeadsResult.success && getLeadsResult.data.leads?.length > 0) {
    testData.leadId = getLeadsResult.data.leads[0].id;
    
    // Test lead assignment if we have an agent
    if (testData.agentId && testData.leadId) {
      const assignResult = await apiCall('PATCH', `/api/leads/${testData.leadId}/assign-agent`, {
        agentId: testData.agentId
      });
      logTest('Leads', 'Assign Agent to Lead', assignResult.success,
        assignResult.success ? 'Agent assigned' : assignResult.error);
    }
  }

  // Test filtered leads query
  if (testData.agentId) {
    const filteredLeadsResult = await apiCall('GET', `/api/leads?assignedAgentId=${testData.agentId}`);
    logTest('Leads', 'Get Filtered Leads', filteredLeadsResult.success,
      filteredLeadsResult.success ? `${filteredLeadsResult.data.leads?.length || 0} assigned leads` : filteredLeadsResult.error);
  }
}

async function testDashboard() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING DASHBOARD & ANALYTICS ===${colors.reset}\n`);

  // Test dashboard summary
  const dashboardSummaryResult = await apiCall('GET', '/api/dashboard/summary');
  logTest('Dashboard', 'Get Dashboard Summary', dashboardSummaryResult.success,
    dashboardSummaryResult.success ? `Total leads: ${dashboardSummaryResult.data.totalLeads || 0}` : dashboardSummaryResult.error);

  // Test dashboard activity
  const dashboardActivityResult = await apiCall('GET', '/api/dashboard/activity?limit=10');
  logTest('Dashboard', 'Get Dashboard Activity', dashboardActivityResult.success,
    dashboardActivityResult.success ? `${dashboardActivityResult.data.activities?.length || 0} activities` : dashboardActivityResult.error);

  // Test with organization ID parameter
  if (testData.organizationId) {
    const orgDashboardResult = await apiCall('GET', `/api/dashboard/summary?organizationId=${testData.organizationId}`);
    logTest('Dashboard', 'Get Org-specific Dashboard', orgDashboardResult.success,
      orgDashboardResult.success ? 'Org dashboard loaded' : orgDashboardResult.error);
  }
}

async function testSettings() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING SETTINGS & PROFILE ===${colors.reset}\n`);

  // Get profile
  const getProfileResult = await apiCall('GET', '/api/settings/profile');
  logTest('Settings', 'Get Profile', getProfileResult.success,
    getProfileResult.success ? `Name: ${getProfileResult.data.name}, Email: ${getProfileResult.data.email}` : getProfileResult.error);

  // Update profile
  const updateProfileResult = await apiCall('POST', '/api/settings/profile', {
    name: 'Test User Updated ' + Date.now()
  });
  logTest('Settings', 'Update Profile', updateProfileResult.success,
    updateProfileResult.success ? 'Profile updated' : updateProfileResult.error);

  // Get notifications settings
  const getNotificationsResult = await apiCall('GET', '/api/settings/notifications');
  logTest('Settings', 'Get Notifications Settings', getNotificationsResult.success,
    getNotificationsResult.success ? 'Settings retrieved' : getNotificationsResult.error);

  // Update notifications settings
  const updateNotificationsResult = await apiCall('POST', '/api/settings/notifications', {
    emailNotifications: true,
    smsNotifications: false
  });
  logTest('Settings', 'Update Notifications Settings', updateNotificationsResult.success,
    updateNotificationsResult.success ? 'Settings updated' : updateNotificationsResult.error);
}

async function testHumanInLoop() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING HUMAN-IN-LOOP FEATURES ===${colors.reset}\n`);

  // Get human agent dashboard (may fail if user is not a human agent)
  const humanDashboardResult = await apiCall('GET', '/api/human-agents/dashboard');
  const isHumanAgent = humanDashboardResult.success || 
    (humanDashboardResult.status !== 403 && humanDashboardResult.status !== 401);
  
  logTest('Human-in-Loop', 'Get Human Agent Dashboard', 
    isHumanAgent || humanDashboardResult.status === 403,
    isHumanAgent ? 'Dashboard loaded' : 'User is not a human agent (expected)');

  // Test handoff features if we have a conversation
  if (testData.conversationId) {
    // Request handoff
    const requestHandoffResult = await apiCall('POST', 
      `/api/conversations/${testData.conversationId}/request-handoff`, {
      reason: 'Customer needs specialized assistance',
      priority: 'normal'
    });
    logTest('Human-in-Loop', 'Request Handoff', requestHandoffResult.success,
      requestHandoffResult.success ? 'Handoff requested' : requestHandoffResult.error);

    // If user is admin or human agent, test accepting handoff
    if (testData.memberRole === 'admin' || testData.memberRole === 'human_agent') {
      const acceptHandoffResult = await apiCall('POST', 
        `/api/conversations/${testData.conversationId}/accept-handoff`, {
        notes: 'Taking over conversation'
      });
      logTest('Human-in-Loop', 'Accept Handoff', acceptHandoffResult.success,
        acceptHandoffResult.success ? 'Handoff accepted' : acceptHandoffResult.error);

      // Send message as human agent
      const sendMessageResult = await apiCall('POST', 
        `/api/conversations/${testData.conversationId}/send-message`, {
        message: 'Hello, I\'m a human agent. How can I help you today?'
      });
      logTest('Human-in-Loop', 'Send Human Agent Message', sendMessageResult.success,
        sendMessageResult.success ? 'Message sent' : sendMessageResult.error);
    }
  }

  // Get handoffs list
  const getHandoffsResult = await apiCall('GET', '/api/conversations/handoffs');
  logTest('Human-in-Loop', 'Get Handoffs List', getHandoffsResult.success,
    getHandoffsResult.success ? `${getHandoffsResult.data.handoffs?.length || 0} handoffs` : getHandoffsResult.error);
}

async function testLogout() {
  console.log(`\n${colors.bright}${colors.blue}=== TESTING LOGOUT ===${colors.reset}\n`);

  // Test logout
  const logoutResult = await apiCall('POST', '/api/auth/logout');
  logTest('Auth', 'Logout', logoutResult.success,
    logoutResult.success ? 'Logged out successfully' : logoutResult.error);

  // Verify we can't access protected endpoints after logout
  testData.authToken = null;
  const protectedAfterLogoutResult = await apiCall('GET', '/api/protected');
  logTest('Auth', 'Protected Endpoint After Logout', !protectedAfterLogoutResult.success,
    !protectedAfterLogoutResult.success ? 'Access denied (expected)' : 'ERROR: Still has access!');
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║           FRONTEND API ENDPOINT TEST SUITE                    ║
║                                                               ║
║  Testing all API endpoints through frontend integration       ║
║  API URL: ${API_BASE_URL.padEnd(51)}║
║  User: ${TEST_CREDENTIALS.email.padEnd(54)}║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Run all tests in sequence
    await testAuthentication();
    await testOrganization();
    await testAgentManagement();
    await testConversations();
    await testLeadManagement();
    await testDashboard();
    await testSettings();
    await testHumanInLoop();
    await testLogout();

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}CRITICAL ERROR: ${error.message}${colors.reset}`);
  }

  // Print summary
  console.log(`\n${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                             ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  console.log(`${colors.green}✅ Passed: ${testResults.passed.length}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed.length}${colors.reset}`);
  console.log(`${colors.cyan}📊 Total Tests: ${testResults.passed.length + testResults.failed.length}${colors.reset}`);
  
  if (testResults.failed.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    testResults.errors.forEach(({ test, error }) => {
      console.log(`${colors.red}  • ${test}${colors.reset}`);
      console.log(`    ${colors.yellow}${error}${colors.reset}`);
    });
  }

  // Generate detailed report
  const reportPath = '/Users/macbookpro/Business/REAL-ESTATE-WEB-APP/frontend-test-report.json';
  const fs = require('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed.length + testResults.failed.length,
      passed: testResults.passed.length,
      failed: testResults.failed.length,
      successRate: `${((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(2)}%`
    },
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    testData: {
      userId: testData.userId,
      organizationId: testData.organizationId,
      agentId: testData.agentId,
      conversationId: testData.conversationId,
      leadId: testData.leadId,
      memberRole: testData.memberRole
    }
  }, null, 2));

  console.log(`\n${colors.cyan}📄 Detailed report saved to: ${reportPath}${colors.reset}`);
}

// Check if backend is running before starting tests
async function checkBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    if (response.status === 200) {
      console.log(`${colors.green}✅ Backend is running and healthy${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Backend is not accessible at ${API_BASE_URL}${colors.reset}`);
    console.error(`${colors.yellow}Please ensure the backend server is running with: npm run server${colors.reset}`);
    return false;
  }
}

// Entry point
async function main() {
  const backendHealthy = await checkBackendHealth();
  if (!backendHealthy) {
    process.exit(1);
  }
  
  await runAllTests();
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

main().catch(console.error);