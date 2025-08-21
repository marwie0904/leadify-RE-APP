/**
 * API-Focused System Test
 * Tests core backend functionality without browser dependencies
 */

const axios = require('axios');

const CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  TIMEOUT: 5000
};

class APIFocusedTester {
  constructor() {
    this.results = {
      endpoints: [],
      authentication: [],
      errors: [],
      issues: []
    };
  }

  async testCoreEndpoints() {
    console.log('🔌 Testing Core API Endpoints...\n');
    
    const endpoints = [
      // Health and basic endpoints
      { path: '/api/health', method: 'GET', expectedStatus: 200, description: 'Health check' },
      
      // Authentication endpoints
      { path: '/api/auth/login', method: 'POST', expectedStatus: 400, description: 'Login (no data)' },
      { path: '/api/auth/register', method: 'POST', expectedStatus: 400, description: 'Register (no data)' },
      
      // Protected endpoints (should return 401)
      { path: '/api/agents', method: 'GET', expectedStatus: 401, description: 'Get agents (unauthorized)' },
      { path: '/api/conversations', method: 'GET', expectedStatus: 401, description: 'Get conversations (unauthorized)' },
      { path: '/api/leads', method: 'GET', expectedStatus: 401, description: 'Get leads (unauthorized)' },
      { path: '/api/dashboard/overview', method: 'GET', expectedStatus: 401, description: 'Dashboard overview (unauthorized)' },
      { path: '/api/notifications', method: 'GET', expectedStatus: 401, description: 'Get notifications (unauthorized)' },
      
      // Chat endpoint
      { path: '/api/chat', method: 'POST', expectedStatus: 400, description: 'Chat (no data)' },
      
      // Facebook webhook
      { path: '/webhook/facebook', method: 'GET', expectedStatus: 400, description: 'Facebook webhook verification' },
    ];
    
    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
  }

  async testEndpoint(endpoint) {
    try {
      const startTime = Date.now();
      
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(`${CONFIG.API_BASE_URL}${endpoint.path}`, {
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true // Accept any status
        });
      } else if (endpoint.method === 'POST') {
        response = await axios.post(`${CONFIG.API_BASE_URL}${endpoint.path}`, {}, {
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true
        });
      }
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      const isExpected = status === endpoint.expectedStatus;
      const statusIcon = isExpected ? '✅' : (status < 500 ? '⚠️' : '❌');
      
      console.log(`${statusIcon} ${endpoint.method} ${endpoint.path}`);
      console.log(`   Status: ${status} (expected: ${endpoint.expectedStatus}) | ${responseTime}ms`);
      console.log(`   ${endpoint.description}`);
      
      this.results.endpoints.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: status,
        expectedStatus: endpoint.expectedStatus,
        responseTime: responseTime,
        success: isExpected,
        description: endpoint.description
      });
      
      if (!isExpected) {
        if (status >= 500) {
          this.results.errors.push(`${endpoint.path} returning server error (${status})`);
        } else {
          console.log(`   ⚠️  Unexpected status code (got ${status}, expected ${endpoint.expectedStatus})`);
        }
      }
      
      // Check response content for common issues
      if (response.data) {
        const responseText = JSON.stringify(response.data);
        
        // Check for stack traces (security issue)
        if (responseText.includes('stack') || responseText.includes('at ') || responseText.includes('.js:')) {
          this.results.issues.push(`${endpoint.path} exposes stack trace information`);
        }
        
        // Check for sensitive information
        const sensitivePatterns = ['password', 'secret', 'key', 'token'];
        for (const pattern of sensitivePatterns) {
          if (responseText.toLowerCase().includes(pattern) && !responseText.includes('password_reset')) {
            this.results.issues.push(`${endpoint.path} may expose sensitive information: ${pattern}`);
          }
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   ${endpoint.description}`);
      console.log('');
      
      this.results.endpoints.push({
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'ERROR',
        error: error.message,
        success: false,
        description: endpoint.description
      });
      
      this.results.errors.push(`${endpoint.path} - ${error.message}`);
    }
  }

  async testAuthenticationFlow() {
    console.log('🔐 Testing Authentication Flow...\n');
    
    // Test login with invalid credentials
    try {
      const response = await axios.post(`${CONFIG.API_BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, {
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true
      });
      
      if (response.status === 401 || response.status === 400) {
        console.log('✅ Login with invalid credentials correctly rejected');
        this.results.authentication.push({
          test: 'Invalid login',
          status: 'SECURE',
          details: `Returns ${response.status} as expected`
        });
      } else if (response.status === 200) {
        console.log('🚨 Security Issue: Login succeeded with invalid credentials!');
        this.results.authentication.push({
          test: 'Invalid login',
          status: 'VULNERABLE',
          details: 'Login succeeded with invalid credentials'
        });
        this.results.issues.push('Authentication bypass possible');
      } else {
        console.log(`⚠️  Unexpected login response: ${response.status}`);
        this.results.authentication.push({
          test: 'Invalid login',
          status: 'UNCLEAR',
          details: `Unexpected status: ${response.status}`
        });
      }
      
    } catch (error) {
      console.log(`❌ Login test failed: ${error.message}`);
      this.results.authentication.push({
        test: 'Invalid login',
        status: 'ERROR',
        error: error.message
      });
    }
    
    // Test registration with invalid data
    try {
      const response = await axios.post(`${CONFIG.API_BASE_URL}/api/auth/register`, {
        email: 'invalid-email',
        password: '123'
      }, {
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true
      });
      
      if (response.status === 400 || response.status === 422) {
        console.log('✅ Registration with invalid data correctly rejected');
        this.results.authentication.push({
          test: 'Invalid registration',
          status: 'SECURE',
          details: `Returns ${response.status} as expected`
        });
      } else {
        console.log(`⚠️  Registration validation unclear: ${response.status}`);
        this.results.authentication.push({
          test: 'Invalid registration',
          status: 'UNCLEAR',
          details: `Status: ${response.status}`
        });
      }
      
    } catch (error) {
      console.log(`❌ Registration test failed: ${error.message}`);
      this.results.authentication.push({
        test: 'Invalid registration',
        status: 'ERROR',
        error: error.message
      });
    }
    
    console.log('');
  }

  async testRateLimiting() {
    console.log('🚀 Testing Rate Limiting...\n');
    
    try {
      const requests = [];
      const startTime = Date.now();
      
      // Send 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${CONFIG.API_BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'wrongpassword'
          }, {
            timeout: CONFIG.TIMEOUT,
            validateStatus: () => true
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      const rateLimited = responses.some(r => r.status === 429);
      const successCount = responses.filter(r => r.status < 400).length;
      
      if (rateLimited) {
        console.log('✅ Rate limiting detected - system is protected');
        this.results.authentication.push({
          test: 'Rate limiting',
          status: 'PROTECTED',
          details: `Rate limiting active after rapid requests`
        });
      } else if (successCount === 0) {
        console.log('✅ All rapid requests rejected (good security)');
        this.results.authentication.push({
          test: 'Rate limiting',
          status: 'SECURE',
          details: `All ${requests.length} requests properly rejected`
        });
      } else {
        console.log(`⚠️  No rate limiting detected - ${requests.length} requests in ${totalTime}ms`);
        this.results.authentication.push({
          test: 'Rate limiting',
          status: 'UNPROTECTED',
          details: `No rate limiting detected for ${requests.length} requests`
        });
      }
      
    } catch (error) {
      console.log(`❌ Rate limiting test failed: ${error.message}`);
      this.results.authentication.push({
        test: 'Rate limiting',
        status: 'ERROR',
        error: error.message
      });
    }
    
    console.log('');
  }

  generateReport() {
    console.log('📋 API SYSTEM TEST RESULTS');
    console.log('=' .repeat(50));
    
    const totalEndpoints = this.results.endpoints.length;
    const successfulEndpoints = this.results.endpoints.filter(e => e.success).length;
    const errorEndpoints = this.results.endpoints.filter(e => e.status === 'ERROR').length;
    
    console.log(`🔌 API Endpoints: ${successfulEndpoints}/${totalEndpoints} behaving as expected`);
    console.log(`🔐 Authentication Tests: ${this.results.authentication.length} completed`);
    console.log(`❌ Errors: ${this.results.errors.length}`);
    console.log(`🚨 Security Issues: ${this.results.issues.length}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS DETECTED:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (this.results.issues.length > 0) {
      console.log('\n🚨 SECURITY/QUALITY ISSUES:');
      this.results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n🔐 AUTHENTICATION STATUS:');
    this.results.authentication.forEach((auth, index) => {
      const statusIcon = auth.status === 'SECURE' || auth.status === 'PROTECTED' ? '✅' : 
                        auth.status === 'VULNERABLE' ? '🚨' : '⚠️';
      console.log(`   ${statusIcon} ${auth.test}: ${auth.status}`);
    });
    
    console.log('\n' + '=' .repeat(50));
    
    const criticalIssues = this.results.issues.length + this.results.errors.length;
    if (criticalIssues === 0) {
      console.log('🎉 OVERALL STATUS: API SYSTEM HEALTHY');
    } else if (criticalIssues <= 2) {
      console.log('⚠️  OVERALL STATUS: MINOR API ISSUES');
    } else {
      console.log('🚨 OVERALL STATUS: SIGNIFICANT API ISSUES');
    }
    
    return {
      summary: {
        totalEndpoints,
        successfulEndpoints,
        errorEndpoints,
        authTests: this.results.authentication.length,
        errors: this.results.errors.length,
        securityIssues: this.results.issues.length
      },
      details: this.results
    };
  }

  async runAllTests() {
    console.log('🚀 Starting API-Focused System Test...\n');
    
    try {
      await this.testCoreEndpoints();
      await this.testAuthenticationFlow();
      await this.testRateLimiting();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return null;
    }
  }
}

// Run the API test
async function runAPITest() {
  const tester = new APIFocusedTester();
  const results = await tester.runAllTests();
  
  if (results) {
    // Save results
    const fs = require('fs');
    const resultsPath = `./api-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);
  }
}

if (require.main === module) {
  runAPITest();
}

module.exports = { APIFocusedTester };