/**
 * Admin Features Integration Test
 * Run with: node scripts/test-admin-features.js
 * 
 * This script tests the complete admin dashboard flow
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to log test results
function logTest(name, success, message = '') {
  if (success) {
    console.log(`✅ ${name}`);
    testResults.passed.push(name);
  } else {
    console.log(`❌ ${name}: ${message}`);
    testResults.failed.push({ name, error: message });
  }
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  testResults.warnings.push(message);
}

// Test 1: Check if admin user exists
async function testAdminUserExists() {
  try {
    const { data: admins, error } = await supabase
      .from('dev_members')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (error) throw error;
    
    if (!admins || admins.length === 0) {
      logWarning('No admin users found in dev_members table');
      return null;
    }

    logTest('Admin user exists in dev_members', true);
    return admins[0];
  } catch (error) {
    logTest('Admin user exists in dev_members', false, error.message);
    return null;
  }
}

// Test 2: Test admin authentication endpoint
async function testAdminAuth(adminUser) {
  if (!adminUser) {
    logWarning('Skipping admin auth test - no admin user');
    return null;
  }

  try {
    // Get auth token for admin user
    const { data: authUser } = await supabase.auth.admin.getUserById(adminUser.user_id);
    
    if (!authUser) {
      logWarning('Cannot get auth token for admin user');
      return null;
    }

    // Create a mock JWT token (in production, this would come from login)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: adminUser.user_id, email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    const response = await fetch(`${API_URL}/api/admin/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Admin authentication endpoint', true);
      return token;
    } else {
      logTest('Admin authentication endpoint', false, data.error || 'Authentication failed');
      return null;
    }
  } catch (error) {
    logTest('Admin authentication endpoint', false, error.message);
    return null;
  }
}

// Test 3: Test dashboard stats endpoint
async function testDashboardStats(token) {
  if (!token) {
    logWarning('Skipping dashboard stats test - no auth token');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Dashboard stats endpoint', true);
      
      // Validate data structure
      const expectedFields = ['urgentBugs', 'supportRequests', 'tokenUsage', 'avgTokenPerOrg', 'systemHealth'];
      const hasAllFields = expectedFields.every(field => data.data.hasOwnProperty(field));
      
      logTest('Dashboard stats data structure', hasAllFields, 
        hasAllFields ? '' : 'Missing expected fields');
    } else {
      logTest('Dashboard stats endpoint', false, data.error || 'Failed to fetch stats');
    }
  } catch (error) {
    logTest('Dashboard stats endpoint', false, error.message);
  }
}

// Test 4: Test issue reporting endpoint
async function testIssueReporting(token) {
  try {
    const issueData = {
      subject: 'Test Issue from Admin Test Script',
      description: 'This is a test issue created by the admin features test script',
      organizationId: null, // Will be set if we have an org
      posthogSessionId: 'test-session-123',
      browserInfo: {
        userAgent: 'Test Script',
        platform: 'Node.js',
        language: 'en-US'
      }
    };

    // Get first organization if exists
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (orgs && orgs.length > 0) {
      issueData.organizationId = orgs[0].id;
    }

    const response = await fetch(`${API_URL}/api/issues/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Issue reporting endpoint', true);
      
      // Check AI classification
      if (data.data.aiClassification) {
        logTest('AI issue classification', true);
      } else {
        logTest('AI issue classification', false, 'No AI classification returned');
      }
      
      return data.data.id;
    } else {
      logTest('Issue reporting endpoint', false, data.error || 'Failed to create issue');
    }
  } catch (error) {
    logTest('Issue reporting endpoint', false, error.message);
  }
  return null;
}

// Test 5: Test support ticket creation
async function testSupportTicket(token) {
  try {
    const ticketData = {
      subject: 'Test Support Request',
      initialMessage: 'This is a test support ticket from the admin test script',
      category: 'general'
    };

    const response = await fetch(`${API_URL}/api/support/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ticketData)
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      logTest('Support ticket creation', true);
      return data.data.ticketId;
    } else {
      logTest('Support ticket creation', false, data.error || 'Failed to create ticket');
    }
  } catch (error) {
    logTest('Support ticket creation', false, error.message);
  }
  return null;
}

// Test 6: Test SSE streaming for support chat
async function testSSEStreaming(ticketId) {
  if (!ticketId) {
    logWarning('Skipping SSE test - no ticket ID');
    return;
  }

  return new Promise((resolve) => {
    try {
      const EventSource = require('eventsource');
      const eventSource = new EventSource(`${API_URL}/api/support/stream/${ticketId}`);
      
      let received = false;
      
      eventSource.onopen = () => {
        logTest('SSE connection established', true);
      };
      
      eventSource.onmessage = (event) => {
        received = true;
        logTest('SSE message received', true);
        eventSource.close();
        resolve();
      };
      
      eventSource.onerror = (error) => {
        logTest('SSE streaming', false, error.message || 'Connection error');
        eventSource.close();
        resolve();
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!received) {
          logWarning('SSE test timeout - no messages received in 5 seconds');
        }
        eventSource.close();
        resolve();
      }, 5000);
    } catch (error) {
      logTest('SSE streaming setup', false, error.message);
      resolve();
    }
  });
}

// Test 7: Check data aggregation
async function testDataAggregation() {
  try {
    // Check if we have data in various tables
    const tables = ['issues', 'support_tickets', 'ai_token_usage'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        logTest(`${table} table accessible`, false, error.message);
      } else {
        logTest(`${table} table accessible`, true);
        if (count > 0) {
          console.log(`   Found ${count} records in ${table}`);
        } else {
          logWarning(`   No data in ${table} table - run seed script`);
        }
      }
    }
  } catch (error) {
    logTest('Data aggregation check', false, error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Admin Dashboard Feature Tests\n');
  console.log('================================\n');
  
  // Run tests in sequence
  const adminUser = await testAdminUserExists();
  const token = await testAdminAuth(adminUser);
  
  if (token) {
    await testDashboardStats(token);
    const issueId = await testIssueReporting(token);
    const ticketId = await testSupportTicket(token);
    await testSSEStreaming(ticketId);
  }
  
  await testDataAggregation();
  
  // Print summary
  console.log('\n================================');
  console.log('📊 Test Summary\n');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\nFailed Tests:');
    testResults.failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\nWarnings:');
    testResults.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }
  
  console.log('\n================================\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (response.ok) {
      console.log(`✅ Backend server is running at ${API_URL}\n`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Backend server is not running at ${API_URL}`);
    console.log('   Start it with: npm run server\n');
    return false;
  }
}

// Run the tests
(async () => {
  const serverRunning = await checkServerRunning();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();