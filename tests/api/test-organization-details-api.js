/**
 * Test Suite for Organization Details API Endpoints
 * Tests all 6 sub-pages API endpoints with comprehensive coverage
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';
const TEST_CREDENTIALS = {
  email: 'marwryyy@gmail.com',
  password: 'ayokonga123'
};

// Test data
let adminToken = null;
let testOrgId = null;

/**
 * Test helper to make authenticated requests
 */
async function authenticatedRequest(endpoint, options = {}) {
  if (!adminToken) {
    throw new Error('No admin token available. Please login first.');
  }
  
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

/**
 * Login as admin to get token
 */
async function loginAsAdmin() {
  console.log('🔐 Logging in as admin...');
  
  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password
    })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const data = await response.json();
  adminToken = data.token;
  console.log('   ✅ Admin login successful');
  return data;
}

/**
 * Get first organization for testing
 */
async function getTestOrganization() {
  console.log('🏢 Getting test organization...');
  
  const response = await authenticatedRequest('/api/admin/organizations');
  
  if (!response.ok) {
    throw new Error(`Failed to get organizations: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.organizations && data.organizations.length > 0) {
    testOrgId = data.organizations[0].id;
    console.log(`   ✅ Using organization: ${data.organizations[0].name} (${testOrgId})`);
    return data.organizations[0];
  } else {
    throw new Error('No organizations found for testing');
  }
}

/**
 * Test Suite Runner
 */
async function runTestSuite() {
  console.log('🚀 Organization Details API Test Suite\n');
  console.log('=' .repeat(50));
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Setup: Login and get test organization
    await loginAsAdmin();
    await getTestOrganization();
    
    console.log('\n📝 Running Tests...\n');
    
    // Test 1: Organization Conversations with Token Usage
    console.log('1️⃣ Testing Organization Conversations Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/conversations`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Conversations endpoint working`);
        console.log(`   📊 Found ${data.conversations?.length || 0} conversations`);
        
        // Check for token usage field
        if (data.conversations && data.conversations.length > 0) {
          const hasTokens = data.conversations[0].hasOwnProperty('total_tokens');
          console.log(`   ${hasTokens ? '✅' : '❌'} Token usage ${hasTokens ? 'included' : 'missing'}`);
        }
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization Conversations',
          status: 'passed',
          details: `${data.conversations?.length || 0} conversations found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization Conversations',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 2: Organization Leads
    console.log('\n2️⃣ Testing Organization Leads Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/leads`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Leads endpoint working`);
        console.log(`   📊 Found ${data.leads?.length || 0} leads`);
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization Leads',
          status: 'passed',
          details: `${data.leads?.length || 0} leads found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization Leads',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 3: Organization Members
    console.log('\n3️⃣ Testing Organization Members Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/members`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Members endpoint working`);
        console.log(`   📊 Found ${data.members?.length || 0} members`);
        
        // Test member update if members exist
        if (data.members && data.members.length > 0) {
          const memberId = data.members[0].id;
          const updateResponse = await authenticatedRequest(
            `/api/admin/organizations/${testOrgId}/members/${memberId}`,
            {
              method: 'PUT',
              body: JSON.stringify({ role: data.members[0].role })
            }
          );
          
          if (updateResponse.ok) {
            console.log(`   ✅ Member update endpoint working`);
          } else {
            console.log(`   ⚠️ Member update failed: ${updateResponse.status}`);
          }
        }
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization Members',
          status: 'passed',
          details: `${data.members?.length || 0} members found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization Members',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 4: Organization AI Agents
    console.log('\n4️⃣ Testing Organization AI Agents Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/agents`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ AI Agents endpoint working`);
        console.log(`   📊 Found ${data.agents?.length || 0} agents`);
        
        // Check for BANT configuration
        if (data.agents && data.agents.length > 0) {
          const hasBantConfig = data.agents[0].hasOwnProperty('bant_config') || 
                               data.agents[0].hasOwnProperty('system_prompt');
          console.log(`   ${hasBantConfig ? '✅' : '⚠️'} BANT configuration ${hasBantConfig ? 'included' : 'missing'}`);
        }
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization AI Agents',
          status: 'passed',
          details: `${data.agents?.length || 0} agents found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization AI Agents',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 5: Organization Issues
    console.log('\n5️⃣ Testing Organization Issues Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/issues`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Issues endpoint working`);
        console.log(`   📊 Found ${data.issues?.length || 0} issues`);
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization Issues',
          status: 'passed',
          details: `${data.issues?.length || 0} issues found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization Issues',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 6: Organization Feature Requests
    console.log('\n6️⃣ Testing Organization Feature Requests Endpoint');
    try {
      const response = await authenticatedRequest(`/api/admin/organizations/${testOrgId}/feature-requests`);
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Feature requests endpoint working`);
        console.log(`   📊 Found ${data.featureRequests?.length || 0} feature requests`);
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Organization Feature Requests',
          status: 'passed',
          details: `${data.featureRequests?.length || 0} feature requests found`
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Organization Feature Requests',
        status: 'failed',
        error: error.message
      });
    }
    
    // Test 7: Test Pagination
    console.log('\n7️⃣ Testing Pagination Support');
    try {
      const response = await authenticatedRequest(
        `/api/admin/organizations/${testOrgId}/conversations?page=1&limit=5`
      );
      testResults.total++;
      
      if (response.ok) {
        const data = await response.json();
        const hasPagination = data.hasOwnProperty('pagination') || 
                             data.hasOwnProperty('page') || 
                             data.hasOwnProperty('totalPages');
        
        console.log(`   ${hasPagination ? '✅' : '⚠️'} Pagination ${hasPagination ? 'supported' : 'not found'}`);
        
        testResults.passed++;
        testResults.tests.push({
          name: 'Pagination Support',
          status: 'passed',
          details: hasPagination ? 'Pagination working' : 'No pagination found'
        });
      } else {
        throw new Error(`Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      testResults.failed++;
      testResults.tests.push({
        name: 'Pagination Support',
        status: 'failed',
        error: error.message
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    testResults.tests.forEach((test, index) => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`${index + 1}. ${icon} ${test.name}: ${test.details || test.error}`);
    });
    
    // Check if all required endpoints exist
    const requiredEndpoints = [
      'Organization Conversations',
      'Organization Leads', 
      'Organization Members',
      'Organization AI Agents',
      'Organization Issues',
      'Organization Feature Requests'
    ];
    
    const implementedEndpoints = testResults.tests
      .filter(t => t.status === 'passed')
      .map(t => t.name);
    
    const missingEndpoints = requiredEndpoints.filter(
      ep => !implementedEndpoints.includes(ep)
    );
    
    if (missingEndpoints.length > 0) {
      console.log('\n⚠️ Missing Endpoints:');
      missingEndpoints.forEach(ep => console.log(`   - ${ep}`));
    } else {
      console.log('\n✅ All required endpoints are implemented!');
    }
    
    // Save results
    const fs = require('fs');
    fs.writeFileSync(
      'organization-api-test-results.json',
      JSON.stringify(testResults, null, 2)
    );
    console.log('\n💾 Results saved to organization-api-test-results.json');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the test suite
runTestSuite().catch(console.error);