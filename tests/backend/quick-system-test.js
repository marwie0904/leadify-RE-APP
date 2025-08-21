/**
 * Quick System Test - Immediate Issue Detection
 * 
 * This script performs basic API and frontend testing to identify immediate issues.
 */

const { chromium } = require('playwright');
const axios = require('axios');

const CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  FRONTEND_BASE_URL: 'http://localhost:3000',
  TEST_TIMEOUT: 10000
};

const TEST_USER = {
  email: 'admin@testrealestateai.com',
  password: 'AdminTest123!'
};

class QuickSystemTester {
  constructor() {
    this.results = {
      apiTests: [],
      frontendTests: [],
      errors: [],
      warnings: [],
      issues: []
    };
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Starting Quick System Test...\n');
    
    try {
      this.browser = await chromium.launch({ headless: false });
      this.page = await this.browser.newPage();
      
      // Setup console monitoring
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.results.errors.push({
            type: 'Console Error',
            message: msg.text(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      this.page.on('pageerror', error => {
        this.results.errors.push({
          type: 'Page Error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      console.log('✅ Browser initialized');
    } catch (error) {
      console.error('❌ Browser initialization failed:', error.message);
      this.results.issues.push('Browser initialization failed');
    }
  }

  async testAPIHealth() {
    console.log('🔍 Testing API Health...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/api/health`, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ API Health Check: PASS');
        this.results.apiTests.push({
          endpoint: '/api/health',
          status: 'PASS',
          responseTime: response.headers['x-response-time'] || 'N/A'
        });
      }
    } catch (error) {
      console.log('❌ API Health Check: FAIL -', error.message);
      this.results.apiTests.push({
        endpoint: '/api/health',
        status: 'FAIL',
        error: error.message
      });
      this.results.issues.push('API health check failed');
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Testing Core API Endpoints...');
    
    const endpoints = [
      { path: '/api/agents', method: 'GET', requiresAuth: false },
      { path: '/api/conversations', method: 'GET', requiresAuth: false },
      { path: '/api/leads', method: 'GET', requiresAuth: false }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${CONFIG.API_BASE_URL}${endpoint.path}`, { 
          timeout: 5000,
          validateStatus: () => true // Accept any status code
        });
        const responseTime = Date.now() - startTime;
        
        if (response.status < 500) {
          console.log(`✅ ${endpoint.path}: ${response.status} (${responseTime}ms)`);
          this.results.apiTests.push({
            endpoint: endpoint.path,
            status: 'ACCESSIBLE',
            statusCode: response.status,
            responseTime: `${responseTime}ms`
          });
        } else {
          console.log(`⚠️  ${endpoint.path}: ${response.status} - Server Error`);
          this.results.apiTests.push({
            endpoint: endpoint.path,
            status: 'SERVER_ERROR',
            statusCode: response.status
          });
          this.results.warnings.push(`${endpoint.path} returning server error`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.path}: ${error.message}`);
        this.results.apiTests.push({
          endpoint: endpoint.path,
          status: 'FAIL',
          error: error.message
        });
        this.results.issues.push(`${endpoint.path} - ${error.message}`);
      }
    }
  }

  async testFrontendPages() {
    console.log('\n🖥️  Testing Frontend Pages...');
    
    if (!this.page) {
      console.log('❌ No browser available for frontend testing');
      return;
    }
    
    const pages = [
      { path: '/', name: 'Home Page' },
      { path: '/login', name: 'Login Page' },
      { path: '/dashboard', name: 'Dashboard' }
    ];
    
    for (const page of pages) {
      try {
        const startTime = Date.now();
        await this.page.goto(`${CONFIG.FRONTEND_BASE_URL}${page.path}`, { 
          timeout: CONFIG.TEST_TIMEOUT,
          waitUntil: 'domcontentloaded'
        });
        const loadTime = Date.now() - startTime;
        
        // Check if page loaded successfully
        const title = await this.page.title();
        const hasContent = await this.page.locator('body').textContent() !== '';
        
        if (hasContent) {
          console.log(`✅ ${page.name}: Loaded (${loadTime}ms) - Title: "${title}"`);
          this.results.frontendTests.push({
            page: page.name,
            path: page.path,
            status: 'LOADED',
            loadTime: `${loadTime}ms`,
            title: title
          });
        } else {
          console.log(`⚠️  ${page.name}: Empty content`);
          this.results.frontendTests.push({
            page: page.name,
            path: page.path,
            status: 'EMPTY',
            loadTime: `${loadTime}ms`
          });
          this.results.warnings.push(`${page.name} has empty content`);
        }
        
      } catch (error) {
        console.log(`❌ ${page.name}: ${error.message}`);
        this.results.frontendTests.push({
          page: page.name,
          path: page.path,
          status: 'FAIL',
          error: error.message
        });
        this.results.issues.push(`${page.name} - ${error.message}`);
      }
    }
  }

  async testLoginFlow() {
    console.log('\n🔐 Testing Login Flow...');
    
    if (!this.page) {
      console.log('❌ No browser available for login testing');
      return;
    }
    
    try {
      // Navigate to login page
      await this.page.goto(`${CONFIG.FRONTEND_BASE_URL}/login`);
      await this.page.waitForLoadState('domcontentloaded');
      
      // Check for login form elements
      const emailField = this.page.locator('input[type="email"], input[name="email"]').first();
      const passwordField = this.page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
      
      const emailExists = await emailField.isVisible();
      const passwordExists = await passwordField.isVisible();
      const submitExists = await submitButton.isVisible();
      
      if (emailExists && passwordExists && submitExists) {
        console.log('✅ Login Form: All elements present');
        
        // Try to fill and submit (but don't wait for success to avoid blocking)
        try {
          await emailField.fill(TEST_USER.email);
          await passwordField.fill(TEST_USER.password);
          console.log('✅ Login Form: Fields can be filled');
          
          this.results.frontendTests.push({
            test: 'Login Form',
            status: 'FUNCTIONAL',
            details: 'Form elements present and fillable'
          });
        } catch (fillError) {
          console.log('⚠️  Login Form: Cannot fill fields -', fillError.message);
          this.results.frontendTests.push({
            test: 'Login Form',
            status: 'PARTIAL',
            details: 'Form elements present but not fillable'
          });
        }
      } else {
        console.log('❌ Login Form: Missing elements');
        console.log(`   Email field: ${emailExists ? '✅' : '❌'}`);
        console.log(`   Password field: ${passwordExists ? '✅' : '❌'}`);
        console.log(`   Submit button: ${submitExists ? '✅' : '❌'}`);
        
        this.results.frontendTests.push({
          test: 'Login Form',
          status: 'INCOMPLETE',
          details: 'Missing required form elements'
        });
        this.results.issues.push('Login form incomplete');
      }
      
    } catch (error) {
      console.log('❌ Login Flow Test Failed:', error.message);
      this.results.frontendTests.push({
        test: 'Login Flow',
        status: 'FAIL',
        error: error.message
      });
      this.results.issues.push(`Login flow - ${error.message}`);
    }
  }

  async testConsoleErrors() {
    console.log('\n📊 Checking for Console Errors...');
    
    if (this.results.errors.length > 0) {
      console.log(`❌ Found ${this.results.errors.length} console errors:`);
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type}: ${error.message.substring(0, 80)}...`);
      });
    } else {
      console.log('✅ No console errors detected');
    }
  }

  generateReport() {
    console.log('\n📋 QUICK SYSTEM TEST RESULTS');
    console.log('=' .repeat(50));
    
    const apiPassed = this.results.apiTests.filter(t => t.status === 'PASS' || t.status === 'ACCESSIBLE').length;
    const frontendPassed = this.results.frontendTests.filter(t => t.status === 'LOADED' || t.status === 'FUNCTIONAL').length;
    
    console.log(`📊 API Tests: ${apiPassed}/${this.results.apiTests.length} passed`);
    console.log(`🖥️  Frontend Tests: ${frontendPassed}/${this.results.frontendTests.length} passed`);
    console.log(`❌ Total Issues: ${this.results.issues.length}`);
    console.log(`⚠️  Total Warnings: ${this.results.warnings.length}`);
    console.log(`🐛 Console Errors: ${this.results.errors.length}`);
    
    if (this.results.issues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      this.results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n' + '=' .repeat(50));
    
    if (this.results.issues.length === 0) {
      console.log('🎉 OVERALL STATUS: SYSTEM APPEARS HEALTHY');
    } else if (this.results.issues.length <= 2) {
      console.log('⚠️  OVERALL STATUS: MINOR ISSUES DETECTED');
    } else {
      console.log('🚨 OVERALL STATUS: SIGNIFICANT ISSUES DETECTED');
    }
    
    return {
      summary: {
        apiTests: this.results.apiTests.length,
        apiPassed: apiPassed,
        frontendTests: this.results.frontendTests.length,
        frontendPassed: frontendPassed,
        totalIssues: this.results.issues.length,
        totalWarnings: this.results.warnings.length,
        consoleErrors: this.results.errors.length
      },
      details: this.results
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.init();
      await this.testAPIHealth();
      await this.testAPIEndpoints();
      await this.testFrontendPages();
      await this.testLoginFlow();
      await this.testConsoleErrors();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      return null;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the quick test
async function runQuickTest() {
  const tester = new QuickSystemTester();
  const results = await tester.runAllTests();
  
  if (results) {
    // Save results to file
    const fs = require('fs');
    const resultsPath = `./quick-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);
  }
}

if (require.main === module) {
  runQuickTest();
}

module.exports = { QuickSystemTester };