// Playwright test with proper test mode setup
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  headless: false,
  slowMo: 100,
  screenshotDir: './test-results-mock',
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
      { name: 'Total Cost', selector: 'text="Total Cost"' }
    ]
  },
  { 
    name: 'Conversations', 
    path: '/conversations',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("All Conversations")' },
      { name: 'Table', selector: 'table' },
      { name: 'Total Conversations', selector: 'text="Total Conversations"' }
    ]
  },
  { 
    name: 'Leads', 
    path: '/leads',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Leads Management")' },
      { name: 'Table', selector: 'table' },
      { name: 'Total Leads', selector: 'text="Total Leads"' }
    ]
  },
  { 
    name: 'Members', 
    path: '/members',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Team Members")' },
      { name: 'Table', selector: 'table' },
      { name: 'Total Members', selector: 'text="Total Members"' }
    ]
  },
  { 
    name: 'AI Details', 
    path: '/ai-details',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("AI Agents")' },
      { name: 'Total AI Agents', selector: 'text="Total AI Agents"' },
      { name: 'BANT Enabled', selector: 'text="BANT Enabled"' }
    ]
  },
  { 
    name: 'Issues', 
    path: '/issues',
    tests: [
      { name: 'Page Title', selector: 'h2:has-text("Issues & Features")' },
      { name: 'Open Issues', selector: 'h3:has-text("Open Issues")' },
      { name: 'Feature Requests', selector: 'h3:has-text("Feature Requests")' }
    ]
  }
];

async function runTests() {
  console.log('='.repeat(70));
  console.log('🧪 MOCK DATA PLAYWRIGHT TESTS');
  console.log('='.repeat(70));
  
  await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);
  
  // First, navigate to base URL to set up localStorage
  console.log('🔐 Setting up test mode authentication...');
  await page.goto(CONFIG.baseUrl);
  
  // Inject test mode and authentication directly
  await page.evaluate(() => {
    // Enable test mode FIRST
    localStorage.setItem('test_mode', 'true');
    
    // Set admin authentication
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
    
    console.log('Test mode enabled:', localStorage.getItem('test_mode'));
    console.log('Admin token set:', localStorage.getItem('admin_token'));
  });
  
  console.log('✅ Test mode and authentication configured\n');
  
  const results = [];
  
  // Test each page
  for (const pageConfig of PAGES) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pageConfig.path}`;
    console.log(`📄 Testing ${pageConfig.name} page`);
    console.log(`   URL: ${url}`);
    
    const result = {
      page: pageConfig.name,
      url,
      tests: [],
      success: false
    };
    
    try {
      const startTime = Date.now();
      
      // Navigate to page
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout 
      });
      
      // Wait for React to render
      await page.waitForTimeout(3000);
      
      const loadTime = Date.now() - startTime;
      console.log(`   ⏱️ Loaded in ${loadTime}ms`);
      
      // Check if redirected
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login page');
      }
      
      // Run tests
      let passedCount = 0;
      for (const test of pageConfig.tests) {
        try {
          const element = await page.waitForSelector(test.selector, {
            timeout: 5000,
            state: 'visible'
          });
          const passed = element !== null;
          result.tests.push({ name: test.name, passed });
          if (passed) passedCount++;
          console.log(`   ${passed ? '✅' : '❌'} ${test.name}`);
        } catch (error) {
          result.tests.push({ name: test.name, passed: false, error: error.message });
          console.log(`   ❌ ${test.name}`);
        }
      }
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase().replace(' ', '-')}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   📸 Screenshot saved`);
      
      // Calculate success
      const successRate = pageConfig.tests.length > 0 
        ? (passedCount / pageConfig.tests.length) * 100 
        : 0;
      result.success = successRate >= 70;
      result.successRate = successRate;
      
      console.log(`   📊 Success rate: ${successRate.toFixed(1)}%\n`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      result.error = error.message;
      
      // Error screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase().replace(' ', '-')}-error.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    
    results.push(result);
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const totalPages = results.length;
  const successfulPages = results.filter(r => r.success).length;
  const allTests = results.flatMap(r => r.tests);
  const passedTests = allTests.filter(t => t.passed).length;
  const totalTests = allTests.length;
  
  console.log(`📄 Pages: ${successfulPages}/${totalPages} passed`);
  console.log(`🧪 Tests: ${passedTests}/${totalTests} passed`);
  console.log(`📈 Overall: ${((passedTests/totalTests)*100).toFixed(1)}% success rate`);
  
  console.log('\nPage Results:');
  for (const result of results) {
    const icon = result.success ? '✅' : '❌';
    const rate = result.successRate || 0;
    console.log(`${icon} ${result.page}: ${rate.toFixed(1)}%`);
  }
  
  // Save report
  const reportPath = path.join(CONFIG.screenshotDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
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
    console.log('\n🎉 EXCELLENT! Tests passed with flying colors!');
  } else if (successRate >= 70) {
    console.log('\n✅ GOOD! Tests passed with minor issues.');
  } else if (successRate >= 50) {
    console.log('\n⚠️ PARTIAL PASS - Several issues need attention.');
  } else {
    console.log('\n❌ FAILED - Major issues detected.');
  }
  
  console.log('='.repeat(70));
  
  await browser.close();
  
  process.exit(successfulPages === totalPages ? 0 : 1);
}

// Run tests
runTests().catch(console.error);