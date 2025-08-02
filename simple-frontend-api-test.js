const https = require('https');
const http = require('http');
const fs = require('fs');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';

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
  leadId: null
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

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (testData.authToken) {
      options.headers['Authorization'] = `Bearer ${testData.authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: responseData, status: res.statusCode });
          } else {
            resolve({ 
              success: false, 
              error: responseData.message || responseData.error || 'Unknown error',
              status: res.statusCode,
              data: responseData
            });
          }
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response', status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test Results
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(category, test, success, details) {
  const result = { category, test, success, details };
  testResults.tests.push(result);
  
  if (success) {
    console.log(`${colors.green}✅ ${category} - ${test}${colors.reset}`);
    if (details) console.log(`   ${colors.cyan}${details}${colors.reset}`);
    testResults.passed++;
  } else {
    console.log(`${colors.red}❌ ${category} - ${test}${colors.reset}`);
    if (details) console.log(`   ${colors.red}Error: ${details}${colors.reset}`);
    testResults.failed++;
  }
}

// Main test execution
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║           FRONTEND API ENDPOINT TEST SUITE                    ║
║                                                               ║
║  Testing all API endpoints with provided credentials          ║
║  API URL: ${API_BASE_URL.padEnd(51)}║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Test Health Check
    console.log(`\n${colors.blue}=== HEALTH CHECK ===${colors.reset}\n`);
    const healthResult = await makeRequest('GET', '/api/health');
    logTest('System', 'Health Check', healthResult.success, 
      healthResult.success ? 'Backend is healthy' : healthResult.error);

    // 2. Test Authentication
    console.log(`\n${colors.blue}=== AUTHENTICATION ===${colors.reset}\n`);
    const loginResult = await makeRequest('POST', '/api/auth/login', TEST_CREDENTIALS);
    
    if (loginResult.success) {
      testData.authToken = loginResult.data.token;
      testData.userId = loginResult.data.user?.id;
      logTest('Auth', 'Login', true, `User ID: ${testData.userId}`);
    } else {
      logTest('Auth', 'Login', false, loginResult.error);
      console.log(`\n${colors.red}Cannot continue without authentication!${colors.reset}`);
      return;
    }

    // 3. Test Organization
    console.log(`\n${colors.blue}=== ORGANIZATION ===${colors.reset}\n`);
    const orgResult = await makeRequest('GET', '/api/organization');
    logTest('Organization', 'Get Organization', orgResult.success,
      orgResult.success ? orgResult.data.organization?.name : orgResult.error);
    
    if (orgResult.success) {
      testData.organizationId = orgResult.data.organization?.id;
    }

    const membersResult = await makeRequest('GET', '/api/organization/members');
    logTest('Organization', 'Get Members', membersResult.success,
      membersResult.success ? `${membersResult.data.members?.length || 0} members` : membersResult.error);

    // 4. Test Agents
    console.log(`\n${colors.blue}=== AGENTS ===${colors.reset}\n`);
    const agentsResult = await makeRequest('GET', '/api/agents');
    logTest('Agents', 'Get Agents', agentsResult.success,
      agentsResult.success ? `${agentsResult.data.agents?.length || 0} agents` : agentsResult.error);
    
    if (agentsResult.success && agentsResult.data.agents?.length > 0) {
      testData.agentId = agentsResult.data.agents[0].id;
    }

    // 5. Test Conversations
    console.log(`\n${colors.blue}=== CONVERSATIONS ===${colors.reset}\n`);
    const conversationsResult = await makeRequest('GET', '/api/conversations');
    logTest('Conversations', 'Get Conversations', conversationsResult.success,
      conversationsResult.success ? `${conversationsResult.data.conversations?.length || 0} conversations` : conversationsResult.error);

    // Test Chat
    if (testData.agentId) {
      const chatResult = await makeRequest('POST', '/api/chat', {
        message: 'Hello, I need help',
        agentId: testData.agentId,
        source: 'web'
      });
      logTest('Chat', 'Send Message', chatResult.success,
        chatResult.success ? `Conversation ID: ${chatResult.data.conversationId}` : chatResult.error);
      
      if (chatResult.success) {
        testData.conversationId = chatResult.data.conversationId;
      }
    }

    // 6. Test Leads
    console.log(`\n${colors.blue}=== LEADS ===${colors.reset}\n`);
    const leadsResult = await makeRequest('GET', '/api/leads');
    logTest('Leads', 'Get Leads', leadsResult.success,
      leadsResult.success ? `${leadsResult.data.leads?.length || 0} leads` : leadsResult.error);

    // 7. Test Dashboard
    console.log(`\n${colors.blue}=== DASHBOARD ===${colors.reset}\n`);
    const dashboardResult = await makeRequest('GET', '/api/dashboard/summary');
    logTest('Dashboard', 'Get Summary', dashboardResult.success,
      dashboardResult.success ? `Total leads: ${dashboardResult.data.totalLeads || 0}` : dashboardResult.error);

    const activityResult = await makeRequest('GET', '/api/dashboard/activity');
    logTest('Dashboard', 'Get Activity', activityResult.success,
      activityResult.success ? `${activityResult.data.activities?.length || 0} activities` : activityResult.error);

    // 8. Test Settings
    console.log(`\n${colors.blue}=== SETTINGS ===${colors.reset}\n`);
    const profileResult = await makeRequest('GET', '/api/settings/profile');
    logTest('Settings', 'Get Profile', profileResult.success,
      profileResult.success ? `${profileResult.data.name}` : profileResult.error);

    // 9. Test Human-in-Loop
    console.log(`\n${colors.blue}=== HUMAN-IN-LOOP ===${colors.reset}\n`);
    const humanDashboardResult = await makeRequest('GET', '/api/human-agents/dashboard');
    logTest('Human-in-Loop', 'Get Dashboard', 
      humanDashboardResult.success || humanDashboardResult.status === 403,
      humanDashboardResult.success ? 'Dashboard loaded' : 
      humanDashboardResult.status === 403 ? 'Not a human agent (expected)' : humanDashboardResult.error);

    const priorityQueueResult = await makeRequest('GET', '/api/conversations/priority-queue');
    logTest('Human-in-Loop', 'Get Priority Queue', priorityQueueResult.success,
      priorityQueueResult.success ? `${priorityQueueResult.data.conversations?.length || 0} in queue` : priorityQueueResult.error);

    // 10. Test Logout
    console.log(`\n${colors.blue}=== LOGOUT ===${colors.reset}\n`);
    const logoutResult = await makeRequest('POST', '/api/auth/logout');
    logTest('Auth', 'Logout', logoutResult.success,
      logoutResult.success ? 'Logged out' : logoutResult.error);

  } catch (error) {
    console.error(`\n${colors.red}Critical error: ${error.message || error}${colors.reset}`);
  }

  // Print Summary
  console.log(`\n${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                             ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.green}✅ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.cyan}📊 Total: ${testResults.passed + testResults.failed}${colors.reset}`);
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
  console.log(`${colors.yellow}📈 Success Rate: ${successRate}%${colors.reset}`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.passed + testResults.failed,
      successRate: successRate + '%'
    },
    testData: testData,
    results: testResults.tests
  };

  fs.writeFileSync('frontend-test-results.json', JSON.stringify(report, null, 2));
  console.log(`\n${colors.cyan}📄 Detailed report saved to: frontend-test-results.json${colors.reset}`);
}

// Start tests
runTests();