// Enhanced Playwright tests with better authentication and selectors
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  headless: false,
  slowMo: 200,
  screenshotDir: './test-results',
  timeout: 30000
};

// Pages to test with enhanced selectors
const PAGES = [
  { 
    name: 'Analytics', 
    path: '/analytics',
    tests: [
      { name: 'Monthly Chart', selector: 'h3:has-text("Monthly Conversations")' },
      { name: 'Token by Model', selector: 'h3:has-text("Token Usage by Model")' },
      { name: 'Token by Task', selector: 'h3:has-text("Token Usage by Task")' },
      { name: 'Total Cost Card', selector: 'text="Token consumption cost"' },
      { name: 'Total Conversations', selector: 'text="Overall conversations"' }
    ]
  },
  { 
    name: 'Conversations', 
    path: '/conversations',
    tests: [
      { name: 'Conversations Table', selector: 'table' },
      { name: 'Average Cost Column', selector: 'th:has-text("Avg Cost/Msg")' },
      { name: 'Total Cost Column', selector: 'th:has-text("Total Cost")' },
      { name: 'Expand Button', selector: 'button:has(svg)' },
      { name: 'Statistics Cards', selector: 'text="Total Conversations"' }
    ]
  },
  { 
    name: 'Leads', 
    path: '/leads',
    tests: [
      { name: 'Leads Table', selector: 'table' },
      { name: 'BANT Score', selector: 'text="BANT Score"' },
      { name: 'Lead Status', selector: 'text="qualified"' },
      { name: 'Qualification Badge', selector: '.bg-green-100, .bg-yellow-100, .bg-red-100' }
    ]
  },
  { 
    name: 'Members', 
    path: '/members',
    tests: [
      { name: 'Members Table', selector: 'table' },
      { name: 'Edit Button', selector: 'button:has-text("Edit")' },
      { name: 'Role Badge', selector: 'text="Admin", text="Member", text="Viewer"' },
      { name: 'Member Email', selector: 'td >> text=/@/' }
    ]
  },
  { 
    name: 'AI Details', 
    path: '/ai-details',
    tests: [
      { name: 'Agent List', selector: 'text="AI Agents"' },
      { name: 'BANT Config Tab', selector: 'button:has-text("BANT Config")' },
      { name: 'Scoring Weights', selector: 'text="BANT Scoring Weights"' },
      { name: 'Thresholds Section', selector: 'text="Lead Qualification Thresholds"' },
      { name: 'Edit Button', selector: 'button:has-text("Edit")' }
    ]
  },
  { 
    name: 'Issues', 
    path: '/issues',
    tests: [
      { name: 'Issues Section', selector: 'h3:has-text("Open Issues")' },
      { name: 'Features Section', selector: 'h3:has-text("Feature Requests")' },
      { name: 'No Tabs', selector: 'button[role="tab"]', shouldNotExist: true },
      { name: 'Issue Cards', selector: '.border.rounded-lg' },
      { name: 'Priority Badge', selector: 'text="High", text="Medium", text="Low"' }
    ]
  }
];

class EnhancedTestRunner {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
    this.authenticated = false;
  }
  
  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Create directories
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });
    
    // Create context with viewport and permissions
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      permissions: ['clipboard-read', 'clipboard-write'],
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });
    
    this.page = await this.context.newPage();
    
    // Set default timeout
    this.page.setDefaultTimeout(CONFIG.timeout);
    
    // Log console messages
    this.page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.error('   ⚠️ Browser error:', msg.text());
      }
    });
    
    // Log network failures
    this.page.on('requestfailed', request => {
      console.error('   ❌ Request failed:', request.url());
    });
    
    console.log('✅ Test environment ready');
  }
  
  async setupAuthentication() {
    console.log('🔐 Setting up authentication...');
    
    try {
      // Navigate to the organization page directly
      const orgUrl = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}`;
      await this.page.goto(orgUrl, { waitUntil: 'domcontentloaded' });
      
      // Check if we're redirected to login
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
        console.log('   📝 Login required - setting up admin session...');
        
        // Try direct authentication bypass for testing
        await this.page.evaluate(() => {
          // Set admin token in localStorage
          localStorage.setItem('admin_token', 'test-admin-token');
          localStorage.setItem('user_role', 'admin');
          localStorage.setItem('authenticated', 'true');
        });
        
        // Navigate again after setting auth
        await this.page.goto(orgUrl, { waitUntil: 'networkidle' });
        
        // Check if still on login page
        const newUrl = this.page.url();
        if (newUrl.includes('login')) {
          console.log('   ⚠️ Direct auth bypass failed, using alternative method...');
          this.authenticated = false;
        } else {
          console.log('   ✅ Authentication successful');
          this.authenticated = true;
        }
      } else {
        console.log('   ✅ Already authenticated');
        this.authenticated = true;
      }
      
    } catch (error) {
      console.error('   ❌ Authentication setup failed:', error.message);
      this.authenticated = false;
    }
    
    return this.authenticated;
  }
  
  async testPage(pageConfig) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pageConfig.path}`;
    console.log(`\n📄 Testing ${pageConfig.name} page...`);
    console.log(`   URL: ${url}`);
    
    const result = {
      page: pageConfig.name,
      url,
      timestamp: new Date().toISOString(),
      tests: [],
      screenshots: [],
      success: false,
      loadTime: 0
    };
    
    try {
      const startTime = Date.now();
      
      // Navigate to page
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: CONFIG.timeout 
      });
      
      result.loadTime = Date.now() - startTime;
      
      // Check response status
      if (response && response.status() !== 200) {
        console.log(`   ⚠️ Page returned status ${response.status()}`);
      }
      
      // Wait for content to load
      await this.page.waitForTimeout(2000);
      
      // Check if redirected to login
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login page');
      }
      
      console.log(`   ⏱️ Page loaded in ${result.loadTime}ms`);
      
      // Run tests for this page
      for (const test of pageConfig.tests) {
        const testResult = await this.runTest(test);
        result.tests.push(testResult);
        
        if (testResult.success) {
          console.log(`   ✅ ${test.name}`);
        } else {
          console.log(`   ❌ ${test.name}: ${testResult.error || 'Not found'}`);
        }
      }
      
      // Take full page screenshot
      const screenshotName = `${pageConfig.name.toLowerCase()}-full.png`;
      const screenshotPath = path.join(CONFIG.screenshotDir, screenshotName);
      await this.page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      result.screenshots.push(screenshotPath);
      console.log(`   📸 Screenshot: ${screenshotName}`);
      
      // Special interactions for specific pages
      if (pageConfig.name === 'Conversations') {
        await this.testConversationsInteractions();
      } else if (pageConfig.name === 'AI Details') {
        await this.testAIDetailsInteractions();
      }
      
      // Calculate success rate
      const passedTests = result.tests.filter(t => t.success).length;
      const totalTests = result.tests.length;
      result.successRate = (passedTests / totalTests) * 100;
      result.success = result.successRate >= 70;
      
      console.log(`   📊 Success rate: ${result.successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
      
    } catch (error) {
      console.error(`   ❌ Page test failed: ${error.message}`);
      result.error = error.message;
      
      // Take error screenshot
      const screenshotName = `${pageConfig.name.toLowerCase()}-error.png`;
      const screenshotPath = path.join(CONFIG.screenshotDir, screenshotName);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshots.push(screenshotPath);
    }
    
    this.results.push(result);
    return result;
  }
  
  async runTest(test) {
    const result = {
      name: test.name,
      selector: test.selector,
      success: false,
      error: null
    };
    
    try {
      if (test.shouldNotExist) {
        // Test that element should NOT exist
        const elements = await this.page.$$(test.selector);
        result.success = elements.length === 0;
        if (!result.success) {
          result.error = `Found ${elements.length} elements that should not exist`;
        }
      } else {
        // Test that element SHOULD exist
        const element = await this.page.waitForSelector(test.selector, {
          timeout: 5000,
          state: 'visible'
        });
        result.success = element !== null;
      }
    } catch (error) {
      result.error = error.message;
      result.success = false;
    }
    
    return result;
  }
  
  async testConversationsInteractions() {
    console.log('   🔧 Testing Conversations interactions...');
    
    try {
      // Find and click first expand button
      const expandButtons = await this.page.$$('button:has(svg)');
      if (expandButtons.length > 0) {
        // Find a button that likely expands conversations
        for (const button of expandButtons) {
          const isExpander = await button.evaluate(el => {
            return el.querySelector('svg') && 
                   (el.innerHTML.includes('ChevronRight') || 
                    el.innerHTML.includes('chevron'));
          });
          
          if (isExpander) {
            await button.click();
            await this.page.waitForTimeout(1000);
            
            // Check if messages appeared
            const messages = await this.page.$('text="Conversation Messages"');
            if (messages) {
              console.log('   ✅ Message expansion works');
              
              // Take screenshot of expanded conversation
              const screenshotPath = path.join(CONFIG.screenshotDir, 'conversation-expanded.png');
              await this.page.screenshot({ path: screenshotPath });
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error('   ⚠️ Interaction test failed:', error.message);
    }
  }
  
  async testAIDetailsInteractions() {
    console.log('   🔧 Testing AI Details interactions...');
    
    try {
      // Click BANT Config tab
      const bantTab = await this.page.$('button:has-text("BANT Config")');
      if (bantTab) {
        await bantTab.click();
        await this.page.waitForTimeout(1000);
        console.log('   ✅ BANT Config tab clicked');
        
        // Check if BANT content is visible
        const bantContent = await this.page.$('text="BANT Scoring Weights"');
        if (bantContent) {
          console.log('   ✅ BANT configuration visible');
        }
      }
      
      // Click Edit button
      const editButton = await this.page.$('button:has-text("Edit")');
      if (editButton) {
        await editButton.click();
        await this.page.waitForTimeout(1000);
        console.log('   ✅ Edit mode activated');
        
        // Take screenshot of edit mode
        const screenshotPath = path.join(CONFIG.screenshotDir, 'ai-details-edit-mode.png');
        await this.page.screenshot({ path: screenshotPath });
      }
    } catch (error) {
      console.error('   ⚠️ Interaction test failed:', error.message);
    }
  }
  
  async runAllTests() {
    console.log('='.repeat(70));
    console.log('🧪 ENHANCED ORGANIZATION PAGES TEST SUITE');
    console.log('='.repeat(70));
    console.log(`Organization: ${CONFIG.organizationId}`);
    console.log(`Base URL: ${CONFIG.baseUrl}`);
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    
    // Setup
    await this.setup();
    
    // Setup authentication
    const authSuccess = await this.setupAuthentication();
    if (!authSuccess) {
      console.log('⚠️ Authentication not fully successful, but continuing tests...');
    }
    
    // Test each page
    for (const pageConfig of PAGES) {
      await this.testPage(pageConfig);
      await this.page.waitForTimeout(1000); // Brief pause between pages
    }
    
    // Generate report
    const duration = (Date.now() - startTime) / 1000;
    await this.generateReport(duration);
    
    // Cleanup
    await this.cleanup();
  }
  
  async generateReport(duration) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(70));
    
    const totalPages = this.results.length;
    const successfulPages = this.results.filter(r => r.success).length;
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.length, 0);
    const passedTests = this.results.reduce((sum, r) => 
      sum + r.tests.filter(t => t.success).length, 0);
    const overallSuccess = (passedTests / totalTests) * 100;
    
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📄 Pages tested: ${totalPages}`);
    console.log(`✅ Successful pages: ${successfulPages}/${totalPages}`);
    console.log(`🧪 Total tests: ${totalTests}`);
    console.log(`✅ Passed tests: ${passedTests}/${totalTests}`);
    console.log(`📈 Overall success rate: ${overallSuccess.toFixed(1)}%`);
    
    console.log('\n📋 Page-by-Page Results:');
    console.log('-'.repeat(50));
    
    for (const result of this.results) {
      const icon = result.success ? '✅' : '❌';
      const rate = result.successRate || 0;
      console.log(`${icon} ${result.page}: ${rate.toFixed(1)}% (Load: ${result.loadTime}ms)`);
      
      // Show failed tests
      const failedTests = result.tests.filter(t => !t.success);
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`   ❌ ${test.name}`);
        });
      }
    }
    
    // Save detailed report
    const reportPath = path.join(CONFIG.screenshotDir, 'test-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      organizationId: CONFIG.organizationId,
      results: this.results,
      summary: {
        totalPages,
        successfulPages,
        totalTests,
        passedTests,
        overallSuccess
      }
    }, null, 2));
    
    console.log(`\n📁 Detailed report: ${reportPath}`);
    console.log(`📸 Screenshots: ${CONFIG.screenshotDir}/`);
    
    // Final verdict
    if (overallSuccess >= 80) {
      console.log('\n🎉 TEST SUITE PASSED! Great job!');
    } else if (overallSuccess >= 60) {
      console.log('\n⚠️ TEST SUITE PARTIALLY PASSED - Some issues need attention');
    } else {
      console.log('\n❌ TEST SUITE FAILED - Significant issues detected');
    }
    
    console.log('='.repeat(70));
  }
  
  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
    console.log('✅ Cleanup complete');
  }
}

// Main execution
async function main() {
  const runner = new EnhancedTestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(runner.results.every(r => r.success) ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await runner.cleanup();
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { EnhancedTestRunner, CONFIG };