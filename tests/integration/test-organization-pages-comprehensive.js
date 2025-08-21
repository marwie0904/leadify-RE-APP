// Comprehensive Playwright tests for all organization detail pages
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  adminEmail: 'test@example.com', // Update with real admin credentials
  adminPassword: 'password123', // Update with real admin password
  headless: false, // Set to true for CI/CD
  slowMo: 500, // Slow down for visibility
  screenshotDir: './test-screenshots'
};

// Pages to test
const PAGES = [
  { name: 'Analytics', path: '/analytics', selectors: {
    monthlyChart: 'text="Monthly Conversations"',
    tokenByModel: 'text="Token Usage by Model"',
    tokenByTask: 'text="Token Usage by Task"',
    totalCost: 'text="Total Cost"'
  }},
  { name: 'Conversations', path: '/conversations', selectors: {
    messageDropdown: 'button:has-text("ChevronDown")',
    avgCostColumn: 'text="Avg Cost/Msg"',
    conversationMessages: 'text="Conversation Messages"',
    totalCost: 'text="Total Cost"'
  }},
  { name: 'Leads', path: '/leads', selectors: {
    bantDropdown: '[data-testid="bant-dropdown"]',
    leadScore: 'text="BANT Score"',
    budgetScore: 'text="Budget"',
    authorityScore: 'text="Authority"'
  }},
  { name: 'Members', path: '/members', selectors: {
    editButton: 'button:has-text("Edit")',
    kickButton: 'button:has-text("Kick")',
    roleSelect: 'text="Change Role"',
    memberStats: 'text="Member Statistics"'
  }},
  { name: 'AI Details', path: '/ai-details', selectors: {
    bantConfig: 'text="BANT Lead Qualification"',
    scoringWeights: 'text="BANT Scoring Weights"',
    thresholds: 'text="Lead Qualification Thresholds"',
    questions: 'text="Budget Questions"'
  }},
  { name: 'Issues', path: '/issues', selectors: {
    issuesSection: 'text="Open Issues"',
    featuresSection: 'text="Feature Requests"',
    noTabs: 'button[role="tab"]', // Should NOT exist
    expandButton: 'button[aria-expanded]'
  }}
];

// Test utilities
class TestRunner {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }
  
  async setup() {
    console.log('🔧 Setting up browser...');
    
    // Create screenshot directory
    await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    this.page = await this.context.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('   Browser error:', msg.text());
      }
    });
    
    console.log('✅ Browser ready');
  }
  
  async login() {
    console.log('🔐 Attempting login...');
    
    try {
      // Navigate to login page
      await this.page.goto(`${CONFIG.baseUrl}/login`);
      await this.page.waitForLoadState('networkidle');
      
      // Try admin login first
      const adminLoginButton = await this.page.$('text="Admin Login"');
      if (adminLoginButton) {
        await adminLoginButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      // Fill credentials
      await this.page.fill('input[type="email"]', CONFIG.adminEmail);
      await this.page.fill('input[type="password"]', CONFIG.adminPassword);
      
      // Submit login
      await this.page.click('button:has-text("Sign in")');
      
      // Wait for redirect
      await this.page.waitForURL('**/dashboard', { timeout: 10000 });
      
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      
      // Try to navigate directly with stored token
      console.log('   Attempting direct navigation...');
      await this.page.evaluate(() => {
        localStorage.setItem('admin_token', 'test-token'); // Use real token if available
      });
      
      return false;
    }
  }
  
  async testPage(pageConfig) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pageConfig.path}`;
    console.log(`\n📄 Testing ${pageConfig.name} page...`);
    console.log(`   URL: ${url}`);
    
    const result = {
      page: pageConfig.name,
      url,
      tests: [],
      screenshot: null,
      success: false
    };
    
    try {
      // Navigate to page
      await this.page.goto(url);
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000); // Wait for data to load
      
      // Check if we're on the correct page
      const currentUrl = this.page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login page');
      }
      
      // Test each selector
      for (const [key, selector] of Object.entries(pageConfig.selectors)) {
        try {
          if (key === 'noTabs' && pageConfig.name === 'Issues') {
            // Special case: ensure tabs don't exist
            const tabs = await this.page.$$(selector);
            if (tabs.length === 0) {
              result.tests.push({ selector: key, found: true, message: 'Tabs correctly removed' });
              console.log(`   ✅ ${key}: Tabs correctly removed`);
            } else {
              result.tests.push({ selector: key, found: false, message: 'Tabs still present' });
              console.log(`   ❌ ${key}: Tabs still present`);
            }
          } else {
            // Normal selector test
            const element = await this.page.waitForSelector(selector, { timeout: 5000 });
            if (element) {
              result.tests.push({ selector: key, found: true });
              console.log(`   ✅ ${key}: Found`);
              
              // Special interactions for certain elements
              if (key === 'messageDropdown' && pageConfig.name === 'Conversations') {
                // Try to expand a conversation
                const buttons = await this.page.$$('button');
                for (const button of buttons) {
                  const text = await button.textContent();
                  if (text && text.includes('►')) { // ChevronRight
                    await button.click();
                    await this.page.waitForTimeout(1000);
                    const messages = await this.page.$('text="Conversation Messages"');
                    if (messages) {
                      console.log('   ✅ Message dropdown works!');
                      result.tests.push({ selector: 'messageExpansion', found: true });
                    }
                    break;
                  }
                }
              }
              
              if (key === 'bantDropdown' && pageConfig.name === 'Leads') {
                // Try to expand BANT details
                const expandButtons = await this.page.$$('[data-testid="expand-bant"]');
                if (expandButtons.length > 0) {
                  await expandButtons[0].click();
                  await this.page.waitForTimeout(1000);
                  const bantDetails = await this.page.$('text="Budget Score"');
                  if (bantDetails) {
                    console.log('   ✅ BANT dropdown works!');
                    result.tests.push({ selector: 'bantExpansion', found: true });
                  }
                }
              }
            }
          }
        } catch (error) {
          result.tests.push({ selector: key, found: false, error: error.message });
          console.log(`   ❌ ${key}: Not found`);
        }
      }
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase()}-page.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
      
      // Check for real data vs placeholders
      const pageText = await this.page.textContent('body');
      const hasRealData = !pageText.includes('Mock') && 
                          !pageText.includes('Placeholder') && 
                          !pageText.includes('Sample Data');
      
      if (hasRealData) {
        console.log('   ✅ Real data detected (no placeholders found)');
        result.tests.push({ selector: 'realData', found: true });
      } else {
        console.log('   ⚠️ Possible placeholder data detected');
        result.tests.push({ selector: 'realData', found: false });
      }
      
      result.success = result.tests.filter(t => t.found).length >= result.tests.length * 0.7;
      
    } catch (error) {
      console.error(`   ❌ Page test failed: ${error.message}`);
      result.error = error.message;
      
      // Take error screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase()}-error.png`);
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshot = screenshotPath;
    }
    
    this.results.push(result);
    return result;
  }
  
  async runAllTests() {
    console.log('=' .repeat(70));
    console.log('🧪 COMPREHENSIVE ORGANIZATION PAGES TEST');
    console.log('=' .repeat(70));
    
    const startTime = Date.now();
    
    // Setup and login
    await this.setup();
    const loginSuccess = await this.login();
    
    if (!loginSuccess) {
      console.log('⚠️ Login failed, but continuing with tests...');
    }
    
    // Test each page
    for (const pageConfig of PAGES) {
      await this.testPage(pageConfig);
      await this.page.waitForTimeout(1000); // Delay between pages
    }
    
    // Generate summary
    const duration = (Date.now() - startTime) / 1000;
    await this.generateSummary(duration);
    
    // Cleanup
    await this.cleanup();
  }
  
  async generateSummary(duration) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.length, 0);
    const passedTests = this.results.reduce((sum, r) => 
      sum + r.tests.filter(t => t.found).length, 0);
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`⏱️ Total duration: ${duration.toFixed(2)} seconds`);
    console.log(`📄 Pages tested: ${this.results.length}/${PAGES.length}`);
    console.log(`✅ Tests passed: ${passedTests}/${totalTests} (${successRate}%)`);
    
    console.log('\nPage Results:');
    console.log('-'.repeat(50));
    
    for (const result of this.results) {
      const pageTests = result.tests.length;
      const pagePassed = result.tests.filter(t => t.found).length;
      const status = result.success ? '✅' : '❌';
      
      console.log(`${status} ${result.page}: ${pagePassed}/${pageTests} tests passed`);
      
      // Show failed tests
      const failed = result.tests.filter(t => !t.found);
      if (failed.length > 0) {
        failed.forEach(test => {
          console.log(`   ❌ ${test.selector}: ${test.error || 'Not found'}`);
        });
      }
    }
    
    // Save summary to file
    const summaryPath = path.join(CONFIG.screenshotDir, 'test-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration,
      results: this.results,
      statistics: {
        totalTests,
        passedTests,
        successRate
      }
    }, null, 2));
    
    console.log(`\n📁 Test summary saved to: ${summaryPath}`);
    console.log(`📸 Screenshots saved to: ${CONFIG.screenshotDir}/`);
    
    if (parseFloat(successRate) >= 70) {
      console.log('\n🎉 Overall test suite PASSED!');
    } else {
      console.log('\n⚠️ Overall test suite FAILED - needs attention');
    }
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
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await runner.cleanup();
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);