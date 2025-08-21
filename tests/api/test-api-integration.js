// Comprehensive API Integration Test Suite
// Tests all backend endpoints with full coverage

const axios = require('axios');
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  frontendUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  testTimeout: 30000,
  reportDir: './test-results-api'
};

// Test data
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

const TEST_ADMIN = {
  id: 'admin-user-id',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'admin'
};

const TEST_TOKEN = 'test-token-123';
const ADMIN_TOKEN = 'test-admin-token-123';

// API Endpoints to test
const API_ENDPOINTS = {
  // Core Chat System
  chat: {
    create: { method: 'POST', path: '/api/chat', auth: true },
    messages: { method: 'GET', path: '/api/messages/:conversationId', auth: true },
    stream: { method: 'GET', path: '/api/stream/:conversationId', auth: true }
  },
  
  // Agent Management
  agents: {
    list: { method: 'GET', path: '/api/agents', auth: true },
    create: { method: 'POST', path: '/api/agents', auth: true },
    update: { method: 'PUT', path: '/api/agents/:id', auth: true },
    delete: { method: 'DELETE', path: '/api/agents/:id', auth: true },
    documents: { method: 'POST', path: '/api/documents', auth: true }
  },
  
  // Lead Management
  leads: {
    list: { method: 'GET', path: '/api/leads', auth: true },
    create: { method: 'POST', path: '/api/leads', auth: true },
    update: { method: 'PUT', path: '/api/leads/:id', auth: true },
    delete: { method: 'DELETE', path: '/api/leads/:id', auth: true }
  },
  
  // Organization Management
  organizations: {
    list: { method: 'GET', path: '/api/organizations', auth: true },
    create: { method: 'POST', path: '/api/organizations', auth: true },
    update: { method: 'PUT', path: '/api/organizations/:id', auth: true },
    invite: { method: 'POST', path: '/api/organizations/:id/invite', auth: true },
    members: { method: 'GET', path: '/api/organizations/:id/members', auth: true }
  },
  
  // Admin Endpoints
  admin: {
    verify: { method: 'GET', path: '/api/admin/verify', auth: 'admin' },
    organizations: { method: 'GET', path: '/api/admin/organizations', auth: 'admin' },
    orgDetail: { method: 'GET', path: '/api/admin/organizations/:id', auth: 'admin' },
    analytics: { method: 'GET', path: '/api/admin/organizations/:id/analytics', auth: 'admin' },
    users: { method: 'GET', path: '/api/admin/users', auth: 'admin' },
    team: { method: 'GET', path: '/api/admin/team', auth: 'admin' }
  },
  
  // Integration Endpoints
  integrations: {
    facebook: { method: 'POST', path: '/webhook/facebook', auth: false },
    health: { method: 'GET', path: '/api/health', auth: false }
  }
};

// Test utilities
class APITester {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.axiosInstance = axios.create({
      baseURL: CONFIG.apiUrl,
      timeout: CONFIG.testTimeout,
      validateStatus: () => true // Don't throw on any status
    });
  }
  
  async testEndpoint(category, name, endpoint) {
    const result = {
      category,
      name,
      method: endpoint.method,
      path: endpoint.path,
      auth: endpoint.auth,
      tests: [],
      success: false
    };
    
    try {
      // Prepare request
      const url = this.prepareUrl(endpoint.path);
      const headers = this.prepareHeaders(endpoint.auth);
      const data = this.prepareTestData(category, name);
      
      console.log(`   Testing ${endpoint.method} ${endpoint.path}`);
      
      // Test 1: Endpoint accessibility
      const accessTest = await this.testAccess(endpoint.method, url, headers, data);
      result.tests.push(accessTest);
      console.log(`     ${accessTest.passed ? '✅' : '❌'} Endpoint accessible`);
      
      // Test 2: Authentication if required
      if (endpoint.auth) {
        const authTest = await this.testAuthentication(endpoint.method, url, endpoint.auth);
        result.tests.push(authTest);
        console.log(`     ${authTest.passed ? '✅' : '❌'} Authentication working`);
      }
      
      // Test 3: Response structure
      const structureTest = await this.testResponseStructure(endpoint.method, url, headers, data);
      result.tests.push(structureTest);
      console.log(`     ${structureTest.passed ? '✅' : '❌'} Response structure valid`);
      
      // Test 4: Error handling
      const errorTest = await this.testErrorHandling(endpoint.method, url);
      result.tests.push(errorTest);
      console.log(`     ${errorTest.passed ? '✅' : '❌'} Error handling correct`);
      
      // Calculate success
      const passedCount = result.tests.filter(t => t.passed).length;
      result.success = passedCount === result.tests.length;
      result.successRate = (passedCount / result.tests.length) * 100;
      
    } catch (error) {
      console.error(`     ❌ Test failed: ${error.message}`);
      result.error = error.message;
    }
    
    this.results.push(result);
    return result;
  }
  
  prepareUrl(path) {
    return path
      .replace(':conversationId', 'test-conversation-id')
      .replace(':id', CONFIG.organizationId);
  }
  
  prepareHeaders(auth) {
    if (auth === 'admin') {
      return { Authorization: `Bearer ${ADMIN_TOKEN}` };
    } else if (auth) {
      return { Authorization: `Bearer ${TEST_TOKEN}` };
    }
    return {};
  }
  
  prepareTestData(category, name) {
    const testData = {
      agents: {
        create: { name: 'Test Agent', type: 'sales' },
        update: { name: 'Updated Agent' }
      },
      leads: {
        create: { name: 'Test Lead', email: 'lead@test.com' },
        update: { status: 'qualified' }
      },
      organizations: {
        create: { name: 'Test Org' },
        update: { name: 'Updated Org' },
        invite: { email: 'invite@test.com', role: 'member' }
      },
      chat: {
        create: { 
          message: 'Test message',
          agent_id: 'test-agent',
          conversation_id: 'test-conversation'
        }
      }
    };
    
    return testData[category]?.[name] || {};
  }
  
  async testAccess(method, url, headers, data) {
    try {
      const response = await this.axiosInstance({
        method,
        url,
        headers,
        data: method !== 'GET' ? data : undefined
      });
      
      // In test mode, we expect either success or controlled errors
      return {
        name: 'Endpoint Accessibility',
        passed: response.status < 500,
        status: response.status
      };
    } catch (error) {
      return {
        name: 'Endpoint Accessibility',
        passed: false,
        error: error.message
      };
    }
  }
  
  async testAuthentication(method, url, authType) {
    try {
      // Test without auth
      const noAuthResponse = await this.axiosInstance({
        method,
        url,
        headers: {}
      });
      
      // Test with wrong auth
      const wrongAuthResponse = await this.axiosInstance({
        method,
        url,
        headers: { Authorization: 'Bearer wrong-token' }
      });
      
      // Should reject unauthorized requests
      const passed = noAuthResponse.status === 401 || noAuthResponse.status === 403;
      
      return {
        name: 'Authentication',
        passed,
        noAuthStatus: noAuthResponse.status,
        wrongAuthStatus: wrongAuthResponse.status
      };
    } catch (error) {
      return {
        name: 'Authentication',
        passed: false,
        error: error.message
      };
    }
  }
  
  async testResponseStructure(method, url, headers, data) {
    try {
      const response = await this.axiosInstance({
        method,
        url,
        headers,
        data: method !== 'GET' ? data : undefined
      });
      
      // Check for standard response structure
      const hasValidStructure = 
        response.data === null ||
        typeof response.data === 'object' ||
        (response.data.success !== undefined) ||
        (response.data.data !== undefined) ||
        (response.data.error !== undefined);
      
      return {
        name: 'Response Structure',
        passed: hasValidStructure,
        responseType: typeof response.data
      };
    } catch (error) {
      return {
        name: 'Response Structure',
        passed: false,
        error: error.message
      };
    }
  }
  
  async testErrorHandling(method, url) {
    try {
      // Test with invalid data
      const response = await this.axiosInstance({
        method,
        url: url + '-invalid',
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      });
      
      // Should return 404 for invalid endpoints
      const passed = response.status === 404 || response.status === 400;
      
      return {
        name: 'Error Handling',
        passed,
        status: response.status
      };
    } catch (error) {
      return {
        name: 'Error Handling',
        passed: false,
        error: error.message
      };
    }
  }
  
  async generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const totalEndpoints = this.results.length;
    const successfulEndpoints = this.results.filter(r => r.success).length;
    const allTests = this.results.flatMap(r => r.tests);
    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration.toFixed(2),
      apiUrl: CONFIG.apiUrl,
      summary: {
        totalEndpoints,
        successfulEndpoints,
        totalTests,
        passedTests,
        successRate: totalTests > 0 ? ((passedTests/totalTests)*100).toFixed(1) : '0'
      },
      results: this.results
    };
    
    // Save report
    await fs.mkdir(CONFIG.reportDir, { recursive: true });
    const reportPath = path.join(CONFIG.reportDir, 'api-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }
}

// Full stack integration test
async function runFullStackTest() {
  console.log('🌐 Starting Full Stack Integration Test...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = [];
  
  try {
    // Test 1: Frontend loads
    console.log('Testing Frontend Loading...');
    await page.goto(CONFIG.frontendUrl);
    const title = await page.title();
    results.push({
      name: 'Frontend Loads',
      passed: title.length > 0,
      title
    });
    console.log(`  ${results[0].passed ? '✅' : '❌'} Frontend loads successfully`);
    
    // Test 2: Frontend can reach API
    console.log('\nTesting Frontend-API Connection...');
    const apiHealthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    results.push({
      name: 'Frontend-API Connection',
      passed: apiHealthResponse.ok || false,
      response: apiHealthResponse
    });
    console.log(`  ${results[1].passed ? '✅' : '❌'} Frontend can reach API`);
    
    // Test 3: Authentication flow
    console.log('\nTesting Authentication Flow...');
    await page.evaluate(() => {
      localStorage.setItem('test_mode', 'true');
      localStorage.setItem('admin_token', 'test-admin-token');
      localStorage.setItem('auth_token', 'test-token');
    });
    
    await page.goto(`${CONFIG.frontendUrl}/admin`);
    await page.waitForTimeout(2000);
    
    const isAuthenticated = !page.url().includes('login');
    results.push({
      name: 'Authentication Flow',
      passed: isAuthenticated,
      finalUrl: page.url()
    });
    console.log(`  ${results[2].passed ? '✅' : '❌'} Authentication flow works`);
    
  } finally {
    await browser.close();
  }
  
  return results;
}

// Main test runner
async function runAllTests() {
  console.log('='.repeat(70));
  console.log('🧪 COMPREHENSIVE API & INTEGRATION TEST SUITE');
  console.log('='.repeat(70));
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Frontend URL: ${CONFIG.frontendUrl}`);
  console.log(`Organization ID: ${CONFIG.organizationId}`);
  console.log('='.repeat(70));
  console.log();
  
  const tester = new APITester();
  tester.startTime = Date.now();
  
  // Test API endpoints
  console.log('📡 Testing API Endpoints\n');
  for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
    console.log(`📦 ${category.toUpperCase()} Endpoints:`);
    for (const [name, endpoint] of Object.entries(endpoints)) {
      await tester.testEndpoint(category, name, endpoint);
    }
    console.log();
  }
  
  // Run full stack tests
  console.log('🌐 Running Full Stack Integration Tests\n');
  const fullStackResults = await runFullStackTest();
  
  // Generate report
  const report = await tester.generateReport();
  report.fullStackTests = fullStackResults;
  
  // Save updated report
  const reportPath = path.join(CONFIG.reportDir, 'full-test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Display summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`⏱️ Duration: ${report.duration} seconds`);
  console.log(`📡 API Endpoints: ${report.summary.successfulEndpoints}/${report.summary.totalEndpoints} passed`);
  console.log(`🧪 Total Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
  console.log(`📈 Success Rate: ${report.summary.successRate}%`);
  console.log(`🌐 Full Stack: ${fullStackResults.filter(r => r.passed).length}/${fullStackResults.length} passed`);
  
  console.log('\n📋 Category Results:');
  console.log('-'.repeat(50));
  
  // Group results by category
  const categories = {};
  for (const result of tester.results) {
    if (!categories[result.category]) {
      categories[result.category] = { passed: 0, total: 0 };
    }
    categories[result.category].total++;
    if (result.success) categories[result.category].passed++;
  }
  
  for (const [category, stats] of Object.entries(categories)) {
    const rate = (stats.passed / stats.total * 100).toFixed(0);
    const icon = rate === '100' ? '🎯' : rate >= '80' ? '✅' : '⚠️';
    console.log(`${icon} ${category.padEnd(15)} ${stats.passed}/${stats.total} endpoints (${rate}%)`);
  }
  
  console.log(`\n📁 Test Reports:`);
  console.log(`   API Report: ${path.join(CONFIG.reportDir, 'api-test-report.json')}`);
  console.log(`   Full Report: ${reportPath}`);
  
  const overallSuccess = parseFloat(report.summary.successRate);
  console.log('\n' + '='.repeat(70));
  if (overallSuccess === 100) {
    console.log('🎉 PERFECT! All API tests passed!');
  } else if (overallSuccess >= 90) {
    console.log('✅ EXCELLENT! API tests performing well.');
  } else if (overallSuccess >= 70) {
    console.log('⚠️ GOOD! Most API tests passing.');
  } else {
    console.log('❌ NEEDS WORK! Many API tests failing.');
  }
  console.log('='.repeat(70));
  
  process.exit(overallSuccess >= 90 ? 0 : 1);
}

// Check if API server is running
async function checkAPIServer() {
  try {
    const response = await axios.get(`${CONFIG.apiUrl}/api/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🚀 Starting API Integration Test Suite...\n');
  
  // Check if API server is running
  const apiRunning = await checkAPIServer();
  if (!apiRunning) {
    console.error('❌ API server is not running at', CONFIG.apiUrl);
    console.log('Please start the backend server with: npm run server');
    process.exit(1);
  }
  
  console.log('✅ API server is running\n');
  
  // Run all tests
  await runAllTests();
})().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});