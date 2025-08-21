// Final comprehensive test with proper authentication
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  headless: false,
  slowMo: 100,
  screenshotDir: './test-results-final',
  timeout: 30000
};

const PAGES = [
  { 
    name: 'Analytics', 
    path: '/analytics',
    tests: [
      { name: 'Page Title', selector: 'h2:has-text("Analytics Overview")' },
      { name: 'Monthly Conversations', selector: 'text="Monthly Conversations"' },
      { name: 'Token by Model', selector: 'text="Token Usage by Model"' },
      { name: 'Token by Task', selector: 'text="Token Usage by Task"' },
      { name: 'Total Cost', selector: 'text="Total Cost"' },
      { name: 'Token Consumption', selector: 'text="Token consumption cost"' }
    ]
  },
  { 
    name: 'Conversations', 
    path: '/conversations',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("All Conversations")' },
      { name: 'Table', selector: 'table' },
      { name: 'Avg Cost Header', selector: 'th:has-text("Avg Cost/Msg")' },
      { name: 'Total Cost Header', selector: 'th:has-text("Total Cost")' },
      { name: 'Statistics', selector: 'text="Total Conversations"' },
      { name: 'Token Usage', selector: 'text="Total Tokens Used"' }
    ],
    interactions: async (page) => {
      // Try to expand a conversation
      const rows = await page.$$('tbody tr');
      if (rows.length > 0) {
        const buttons = await page.$$('tbody button[data-testid="expand-conversation"], tbody button:has(svg)');
        if (buttons.length > 0) {
          await buttons[0].click();
          await page.waitForTimeout(1000);
          const messages = await page.$('text="Conversation Messages"');
          return { expandedMessages: !!messages };
        }
      }
      return { expandedMessages: false };
    }
  },
  { 
    name: 'Leads', 
    path: '/leads',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Leads Management")' },
      { name: 'Table', selector: 'table' },
      { name: 'BANT Score Header', selector: 'th:has-text("BANT Score")' },
      { name: 'Statistics', selector: 'text="Total Leads"' },
      { name: 'Qualification Rate', selector: 'text="Qualification Rate"' }
    ],
    interactions: async (page) => {
      // Try to expand BANT details
      const expandButtons = await page.$$('[data-testid="expand-bant"]');
      if (expandButtons.length > 0) {
        await expandButtons[0].click();
        await page.waitForTimeout(1000);
        const bantDetails = await page.$('text="Budget"');
        return { bantExpanded: !!bantDetails };
      }
      return { bantExpanded: false };
    }
  },
  { 
    name: 'Members', 
    path: '/members',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Team Members")' },
      { name: 'Table', selector: 'table' },
      { name: 'Edit Button', selector: 'button:has-text("Edit")' },
      { name: 'Member Statistics', selector: 'text="Total Members"' },
      { name: 'Active Members', selector: 'text="Active Members"' }
    ]
  },
  { 
    name: 'AI Details', 
    path: '/ai-details',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("AI Agents")' },
      { name: 'Agent Stats', selector: 'text="Total AI Agents"' },
      { name: 'BANT Enabled', selector: 'text="BANT Enabled"' },
      { name: 'Edit Button', selector: 'button:has-text("Edit")' },
      { name: 'Tabs', selector: 'button[role="tab"]' }
    ],
    interactions: async (page) => {
      // Try to click BANT Config tab
      const bantTab = await page.$('button:has-text("BANT Config")');
      if (bantTab) {
        await bantTab.click();
        await page.waitForTimeout(1000);
        const weights = await page.$('text="BANT Scoring Weights"');
        const thresholds = await page.$('text="Lead Qualification Thresholds"');
        return { bantConfigVisible: !!(weights || thresholds) };
      }
      return { bantConfigVisible: false };
    }
  },
  { 
    name: 'Issues', 
    path: '/issues',
    tests: [
      { name: 'Page Title', selector: 'h2:has-text("Issues & Features")' },
      { name: 'Issues Section', selector: 'h3:has-text("Open Issues")' },
      { name: 'Features Section', selector: 'h3:has-text("Feature Requests")' },
      { name: 'No Tabs', selector: 'button[role="tab"]', shouldNotExist: true },
      { name: 'Priority Badges', selector: '.bg-red-100, .bg-yellow-100, .bg-blue-100' }
    ]
  }
];

class FinalTestRunner {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }
  
  async setup() {
    console.log('🔧 Setting up test environment...');
    
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(CONFIG.timeout);
    
    // Suppress console errors for cleaner output
    this.page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('404')) {
        console.error('   Browser error:', msg.text().substring(0, 100));
      }
    });
    
    console.log('✅ Environment ready\n');
  }
  
  async setupAuth() {
    console.log('🔐 Setting up authentication...');
    
    // Navigate to base URL
    await this.page.goto(CONFIG.baseUrl);
    
    // Set authentication data
    await this.page.evaluate(() => {
      // Enable test mode to bypass API calls
      localStorage.setItem('test_mode', 'true');
      
      // Set admin credentials
      localStorage.setItem('admin_token', 'test-admin-token-123');
      localStorage.setItem('admin_user', JSON.stringify({
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin'
      }));
      
      // Also set regular auth for compatibility
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-id',
        email: 'user@example.com'
      }));
    });
    
    console.log('✅ Authentication configured with test mode\n');
  }
  
  async testPage(pageConfig) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pageConfig.path}`;
    console.log(`📄 Testing ${pageConfig.name} page`);
    console.log(`   URL: ${url}`);
    
    const result = {
      page: pageConfig.name,
      url,
      tests: [],
      interactions: {},
      screenshot: null,
      success: false,
      loadTime: 0
    };
    
    try {
      const startTime = Date.now();
      
      // Navigate to page
      const response = await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout 
      });
      
      // Wait for content
      await this.page.waitForTimeout(2000);
      
      result.loadTime = Date.now() - startTime;
      console.log(`   ⏱️ Loaded in ${result.loadTime}ms`);
      
      // Check if redirected
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login');
      }
      
      // Run tests
      let passedCount = 0;
      for (const test of pageConfig.tests) {
        try {
          if (test.shouldNotExist) {
            const elements = await this.page.$$(test.selector);
            const passed = elements.length === 0;
            result.tests.push({ 
              name: test.name, 
              passed,
              message: passed ? 'Not found (as expected)' : `Found ${elements.length} elements`
            });
            if (passed) passedCount++;
            console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
          } else {
            const element = await this.page.waitForSelector(test.selector, {
              timeout: 3000,
              state: 'visible'
            });
            const passed = element !== null;
            result.tests.push({ name: test.name, passed });
            if (passed) passedCount++;
            console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
          }
        } catch (error) {
          result.tests.push({ name: test.name, passed: false, error: error.message });
          console.log(`   ❌ ${test.name}`);
        }
      }
      
      // Run interactions if defined
      if (pageConfig.interactions) {
        console.log('   🔧 Testing interactions...');
        result.interactions = await pageConfig.interactions(this.page);
        for (const [key, value] of Object.entries(result.interactions)) {
          console.log(`   ${value ? '✅' : '❌'} ${key}`);
          if (value) passedCount++;
        }
      }
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase()}.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
      console.log(`   📸 Screenshot saved`);
      
      // Calculate success
      const totalTests = result.tests.length + Object.keys(result.interactions).length;
      const successRate = totalTests > 0 ? (passedCount / totalTests) * 100 : 0;
      result.success = successRate >= 70;
      result.successRate = successRate;
      
      console.log(`   📊 Success rate: ${successRate.toFixed(1)}%\n`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      result.error = error.message;
      
      // Error screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase()}-error.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
    }
    
    this.results.push(result);
    return result;
  }
  
  async runTests() {
    console.log('='.repeat(70));
    console.log('🧪 COMPREHENSIVE ORGANIZATION PAGES TEST');
    console.log('='.repeat(70));
    console.log(`Organization: ${CONFIG.organizationId}`);
    console.log('='.repeat(70));
    console.log();
    
    const startTime = Date.now();
    
    // Setup
    await this.setup();
    await this.setupAuth();
    
    // Test each page
    for (const pageConfig of PAGES) {
      await this.testPage(pageConfig);
    }
    
    // Generate summary
    const duration = (Date.now() - startTime) / 1000;
    await this.generateSummary(duration);
    
    // Cleanup
    await this.cleanup();
    
    // Return success status
    const overallSuccess = this.results.every(r => r.success);
    return overallSuccess;
  }
  
  async generateSummary(duration) {
    console.log('='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    const totalPages = this.results.length;
    const successfulPages = this.results.filter(r => r.success).length;
    const allTests = this.results.flatMap(r => r.tests);
    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;
    
    console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
    console.log(`📄 Pages: ${successfulPages}/${totalPages} passed`);
    console.log(`🧪 Tests: ${passedTests}/${totalTests} passed`);
    console.log(`📈 Overall: ${((passedTests/totalTests)*100).toFixed(1)}% success rate`);
    
    console.log('\nPage Results:');
    console.log('-'.repeat(50));
    
    for (const result of this.results) {
      const icon = result.success ? '✅' : '❌';
      const rate = result.successRate || 0;
      console.log(`${icon} ${result.page.padEnd(15)} ${rate.toFixed(1)}% (${result.loadTime}ms)`);
      
      // Show failures
      if (!result.success && result.tests) {
        const failures = result.tests.filter(t => !t.passed);
        failures.slice(0, 3).forEach(t => {
          console.log(`     ❌ ${t.name}`);
        });
        if (failures.length > 3) {
          console.log(`     ... and ${failures.length - 3} more`);
        }
      }
    }
    
    // Save report
    const reportPath = path.join(CONFIG.screenshotDir, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      results: this.results,
      summary: {
        totalPages,
        successfulPages,
        totalTests,
        passedTests,
        overallSuccessRate: ((passedTests/totalTests)*100).toFixed(1)
      }
    }, null, 2));
    
    console.log(`\n📁 Report: ${reportPath}`);
    console.log(`📸 Screenshots: ${CONFIG.screenshotDir}/`);
    
    // Final verdict
    const successRate = (passedTests/totalTests)*100;
    if (successRate >= 90) {
      console.log('\n🎉 EXCELLENT! Test suite passed with flying colors!');
    } else if (successRate >= 70) {
      console.log('\n✅ GOOD! Test suite passed with minor issues.');
    } else if (successRate >= 50) {
      console.log('\n⚠️ PARTIAL PASS - Several issues need attention.');
    } else {
      console.log('\n❌ FAILED - Major issues detected.');
    }
    
    console.log('='.repeat(70));
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const runner = new FinalTestRunner();
  
  try {
    const success = await runner.runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FinalTestRunner };