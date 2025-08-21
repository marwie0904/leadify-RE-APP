// Final comprehensive Playwright test with correct selectors
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  headless: false,
  slowMo: 100,
  screenshotDir: './test-results-final-v2',
  timeout: 30000
};

const PAGES = [
  { 
    name: 'Analytics', 
    path: '/analytics',
    tests: [
      { name: 'Page Loaded', selector: '.bg-white' },
      { name: 'Overview Section', selector: 'h2:has-text("Analytics Overview")' },
      { name: 'Monthly Chart', selector: 'text="Monthly Conversations"' },
      { name: 'Token Model Chart', selector: 'text="Token Usage by Model"' },
      { name: 'Token Task Chart', selector: 'text="Token Usage by Task"' },
      { name: 'Cost Display', selector: 'text="Total Cost"' }
    ]
  },
  { 
    name: 'Conversations', 
    path: '/conversations',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("All Conversations"), h2:has-text("Conversations")' },
      { name: 'Table', selector: 'table' },
      { name: 'Statistics', selector: 'text="Total Conversations"' },
      { name: 'Token Usage', selector: 'text="Total Tokens Used"' },
      { name: 'Cost Info', selector: 'text="Total Cost Estimate", text="Average Cost"' }
    ]
  },
  { 
    name: 'Leads', 
    path: '/leads',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Leads Management"), h3:has-text("All Leads")' },
      { name: 'Table', selector: 'table' },
      { name: 'Statistics', selector: 'text="Total Leads"' },
      { name: 'Qualification Rate', selector: 'text="Qualification Rate", text="Qualified Leads"' },
      { name: 'Score Display', selector: 'text="Average Score", text="BANT"' }
    ]
  },
  { 
    name: 'Members', 
    path: '/members',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("Team Members"), h3:has-text("Organization Members")' },
      { name: 'Table', selector: 'table' },
      { name: 'Statistics', selector: 'text="Total Members", text="total_members"' },
      { name: 'Active Count', selector: 'text="Active Members", text="Active Today"' },
      { name: 'Edit Controls', selector: 'button:has-text("Edit"), button:has-text("Save")' }
    ]
  },
  { 
    name: 'AI Details', 
    path: '/ai-details',
    tests: [
      { name: 'Page Title', selector: 'h3:has-text("AI Agents"), h2:has-text("AI"), text="Agent"' },
      { name: 'Statistics', selector: 'text="Total AI Agents", text="Active Agents", text="agents"' },
      { name: 'BANT Info', selector: 'text="BANT Enabled", text="BANT", text="bant"' },
      { name: 'Agent Cards', selector: '.border.rounded-lg' },
      { name: 'Tab Controls', selector: 'button[role="tab"], button:has-text("General"), button:has-text("BANT")' }
    ]
  },
  { 
    name: 'Issues', 
    path: '/issues',
    tests: [
      { name: 'Page Header', selector: 'h2:has-text("Issues & Features"), h2:has-text("Issues"), h3:has-text("Issues")' },
      { name: 'Issues Section', selector: 'h3:has-text("Open Issues"), text="issue", text="Issue"' },
      { name: 'Features Section', selector: 'h3:has-text("Feature Requests"), text="feature", text="Feature"' },
      { name: 'Issue Cards', selector: '.border.rounded-lg' },
      { name: 'Priority Badges', selector: '.bg-red-100, .bg-yellow-100, .bg-blue-100, text="High", text="Medium", text="Low"' }
    ]
  }
];

async function runTests() {
  console.log('='.repeat(70));
  console.log('🧪 FINAL COMPREHENSIVE PLAYWRIGHT TEST');
  console.log('='.repeat(70));
  console.log(`Organization: ${CONFIG.organizationId}`);
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log('='.repeat(70));
  console.log();
  
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
  
  // Suppress console errors for cleaner output
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('401')) {
      console.error('   Browser error:', msg.text().substring(0, 100));
    }
  });
  
  // Setup authentication and test mode
  console.log('🔐 Setting up test mode authentication...');
  await page.goto(CONFIG.baseUrl);
  
  await page.evaluate(() => {
    // Enable test mode
    localStorage.setItem('test_mode', 'true');
    
    // Set admin credentials
    localStorage.setItem('admin_token', 'test-admin-token-123');
    localStorage.setItem('admin_user', JSON.stringify({
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin'
    }));
    
    // Also set regular auth
    localStorage.setItem('auth_token', 'test-token-123');
    localStorage.setItem('user', JSON.stringify({
      id: 'user-id',
      email: 'user@example.com'
    }));
  });
  
  console.log('✅ Test mode and authentication configured\n');
  
  const results = [];
  const startTime = Date.now();
  
  // Test each page
  for (const pageConfig of PAGES) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pageConfig.path}`;
    console.log(`📄 Testing ${pageConfig.name} page`);
    console.log(`   URL: ${url}`);
    
    const result = {
      page: pageConfig.name,
      url,
      tests: [],
      success: false,
      loadTime: 0
    };
    
    try {
      const pageStartTime = Date.now();
      
      // Navigate to page
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.timeout 
      });
      
      // Wait for React to render
      await page.waitForTimeout(3000);
      
      result.loadTime = Date.now() - pageStartTime;
      console.log(`   ⏱️ Loaded in ${result.loadTime}ms`);
      
      // Check if redirected
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login page');
      }
      
      // Run tests
      let passedCount = 0;
      for (const test of pageConfig.tests) {
        try {
          // Try multiple selectors if provided
          const selectors = test.selector.split(', ');
          let found = false;
          
          for (const selector of selectors) {
            try {
              const element = await page.waitForSelector(selector.trim(), {
                timeout: 2000,
                state: 'visible'
              });
              if (element) {
                found = true;
                break;
              }
            } catch {
              // Try next selector
            }
          }
          
          result.tests.push({ name: test.name, passed: found });
          if (found) passedCount++;
          console.log(`   ${found ? '✅' : '❌'} ${test.name}`);
        } catch (error) {
          result.tests.push({ name: test.name, passed: false });
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
      
      console.log(`   📊 Success rate: ${successRate.toFixed(1)}%`);
      console.log();
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      result.error = error.message;
      
      // Error screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageConfig.name.toLowerCase().replace(' ', '-')}-error.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
    
    results.push(result);
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  // Generate summary
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const totalPages = results.length;
  const successfulPages = results.filter(r => r.success).length;
  const allTests = results.flatMap(r => r.tests);
  const passedTests = allTests.filter(t => t.passed).length;
  const totalTests = allTests.length;
  
  console.log(`⏱️ Duration: ${duration.toFixed(2)}s`);
  console.log(`📄 Pages: ${successfulPages}/${totalPages} passed`);
  console.log(`🧪 Tests: ${passedTests}/${totalTests} passed`);
  console.log(`📈 Overall: ${totalTests > 0 ? ((passedTests/totalTests)*100).toFixed(1) : 0}% success rate`);
  
  console.log('\nPage Results:');
  console.log('-'.repeat(50));
  
  for (const result of results) {
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
    organizationId: CONFIG.organizationId,
    results,
    summary: {
      totalPages,
      successfulPages,
      totalTests,
      passedTests,
      overallSuccessRate: totalTests > 0 ? ((passedTests/totalTests)*100).toFixed(1) : '0'
    }
  }, null, 2));
  
  console.log(`\n📁 Report: ${reportPath}`);
  console.log(`📸 Screenshots: ${CONFIG.screenshotDir}/`);
  
  // Final verdict
  const successRate = totalTests > 0 ? (passedTests/totalTests)*100 : 0;
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
  
  await browser.close();
  
  process.exit(successfulPages === totalPages ? 0 : 1);
}

// Run tests
runTests().catch(console.error);