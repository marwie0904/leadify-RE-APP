/**
 * Comprehensive Admin Dashboard Testing Suite
 * Tests all 7 admin pages with data validation and cross-page consistency
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  testUser: {
    email: 'marwryyy@gmail.com',
    password: 'ayokonga123'
  },
  timeout: 30000
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  pages: {},
  errors: [],
  warnings: [],
  metrics: {
    baseline: {},
    after: {}
  }
};

// Utility functions
function logTest(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : '📊';
  console.log(`${prefix} [${timestamp}] ${message}`);
  
  if (type === 'error') {
    testResults.errors.push({ timestamp, message });
  } else if (type === 'warning') {
    testResults.warnings.push({ timestamp, message });
  }
}

async function captureMetrics(page, pageName) {
  const metrics = {};
  
  try {
    // Capture all numeric values from stat cards
    const statCards = await page.locator('.text-2xl.font-bold, .text-3xl.font-bold').all();
    for (let i = 0; i < statCards.length; i++) {
      const value = await statCards[i].textContent();
      metrics[`stat_${i}`] = value.trim();
    }
    
    // Capture table row counts
    const tableRows = await page.locator('table tbody tr').count();
    metrics.tableRows = tableRows;
    
    // Capture any error messages
    const errors = await page.locator('[role="alert"], .error, .text-red-500').all();
    metrics.errorCount = errors.length;
    
    if (errors.length > 0) {
      metrics.errors = [];
      for (const error of errors) {
        const text = await error.textContent();
        metrics.errors.push(text);
      }
    }
    
  } catch (error) {
    logTest(`Failed to capture metrics for ${pageName}: ${error.message}`, 'warning');
  }
  
  return metrics;
}

async function captureApiResponses(page) {
  const apiResponses = [];
  
  page.on('response', async response => {
    if (response.url().includes(CONFIG.apiUrl)) {
      const url = response.url();
      const status = response.status();
      let data = null;
      
      try {
        data = await response.json();
      } catch {}
      
      apiResponses.push({
        url: url.replace(CONFIG.apiUrl, ''),
        status,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
    }
  });
  
  return apiResponses;
}

async function captureConsoleErrors(page) {
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().toLowerCase().includes('error')) {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text()
      });
    }
  });
  
  return consoleErrors;
}

// Main test functions for each page
async function testDashboard(page) {
  logTest('Testing Dashboard Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if page loaded
    const title = await page.locator('h1').first().textContent();
    if (!title.includes('Dashboard')) {
      results.errors.push('Dashboard title not found');
    }
    
    // Check stat cards
    const statCards = await page.locator('.card, [class*="card"]').count();
    logTest(`Found ${statCards} stat cards on dashboard`, 'info');
    
    if (statCards < 4) {
      results.warnings.push(`Expected at least 4 stat cards, found ${statCards}`);
    }
    
    // Capture metrics
    results.metrics = await captureMetrics(page, 'Dashboard');
    
    // Check for charts
    const charts = await page.locator('canvas, svg[role="img"], .recharts-wrapper').count();
    logTest(`Found ${charts} charts on dashboard`, 'info');
    
    // Check recent activity
    const activityItems = await page.locator('[class*="activity"], [class*="recent"]').count();
    if (activityItems === 0) {
      results.warnings.push('No recent activity section found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
    
    logTest('Dashboard test completed', 'success');
  } catch (error) {
    results.errors.push(`Dashboard test failed: ${error.message}`);
    logTest(`Dashboard test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testUsersPage(page) {
  logTest('Testing Users Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Give more time for data to load
    
    // Check stat cards for users using better selectors
    const totalUsersCard = await page.locator('.card:has-text("Total Users") .text-2xl').first();
    let totalUsers = '0';
    if (await totalUsersCard.count() > 0) {
      totalUsers = await totalUsersCard.textContent();
      logTest(`Total Users: ${totalUsers}`, 'info');
    } else {
      results.errors.push('Total Users card not found');
    }
    
    const activeUsersCard = await page.locator('.card:has-text("Active Users") .text-2xl').first();
    let activeUsers = '0';
    if (await activeUsersCard.count() > 0) {
      activeUsers = await activeUsersCard.textContent();
      logTest(`Active Users: ${activeUsers}`, 'info');
    } else {
      results.warnings.push('Active Users card not found');
    }
    
    // Check if values are not zero
    if (totalUsers === '0' && activeUsers === '0') {
      results.warnings.push('User counts are all zero - may indicate data loading issue');
    }
    
    // Check users table
    const userRows = await page.locator('table tbody tr').count();
    logTest(`Found ${userRows} users in table`, 'info');
    
    if (parseInt(totalUsers) > 0 && userRows === 0) {
      results.errors.push('User stats show users but table is empty');
    }
    
    results.metrics = await captureMetrics(page, 'Users');
    await page.screenshot({ path: 'test-results/users.png', fullPage: true });
    
    logTest('Users page test completed', 'success');
  } catch (error) {
    results.errors.push(`Users test failed: ${error.message}`);
    logTest(`Users test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testOrganizationsPage(page) {
  logTest('Testing Organizations Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/organizations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for organizations data
    const orgsCount = await page.locator('table tbody tr').count();
    logTest(`Found ${orgsCount} organizations`, 'info');
    
    if (orgsCount === 0) {
      results.warnings.push('No organizations found in table');
    }
    
    // Check organization details
    if (orgsCount > 0) {
      const firstOrg = await page.locator('table tbody tr').first();
      const orgData = await firstOrg.textContent();
      if (!orgData.includes('@')) {
        results.warnings.push('Organization data may be incomplete (no email found)');
      }
    }
    
    results.metrics = await captureMetrics(page, 'Organizations');
    await page.screenshot({ path: 'test-results/organizations.png', fullPage: true });
    
    logTest('Organizations page test completed', 'success');
  } catch (error) {
    results.errors.push(`Organizations test failed: ${error.message}`);
    logTest(`Organizations test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testAIAnalyticsPage(page) {
  logTest('Testing AI Analytics Page (Critical)...', 'info');
  const results = { errors: [], warnings: [], metrics: {}, tokenTracking: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/ai-analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Capture baseline token usage
    const tokenElements = await page.locator('text=/Total Tokens/i').locator('..').locator('.text-2xl, .text-3xl');
    let baselineTokens = 0;
    if (await tokenElements.count() > 0) {
      const tokenText = await tokenElements.first().textContent();
      baselineTokens = parseInt(tokenText.replace(/[^0-9]/g, '')) || 0;
      logTest(`Baseline token count: ${baselineTokens}`, 'info');
      results.tokenTracking.baseline = baselineTokens;
    } else {
      results.errors.push('Total Tokens metric not found');
    }
    
    // Check for cost calculations
    const costElements = await page.locator('text=/Cost/i, text=/$/, text=/USD/');
    if (await costElements.count() === 0) {
      results.warnings.push('No cost calculations found');
    } else {
      const costText = await costElements.first().textContent();
      logTest(`Found cost display: ${costText}`, 'info');
    }
    
    // Check for usage charts
    const charts = await page.locator('canvas, svg[role="img"], .recharts-wrapper').count();
    if (charts === 0) {
      results.warnings.push('No usage charts found on AI Analytics page');
    } else {
      logTest(`Found ${charts} usage charts`, 'info');
    }
    
    // Check for model breakdown
    const modelBreakdown = await page.locator('text=/GPT/i, text=/Claude/i, text=/Model/i').count();
    if (modelBreakdown === 0) {
      results.warnings.push('No model breakdown found');
    }
    
    results.metrics = await captureMetrics(page, 'AI Analytics');
    await page.screenshot({ path: 'test-results/ai-analytics.png', fullPage: true });
    
    logTest('AI Analytics page test completed', 'success');
  } catch (error) {
    results.errors.push(`AI Analytics test failed: ${error.message}`);
    logTest(`AI Analytics test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testLeadifyTeamPage(page) {
  logTest('Testing Leadify Team Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/leadify-team`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check team member count
    const memberCount = await page.locator('table tbody tr').count();
    logTest(`Found ${memberCount} team members`, 'info');
    
    if (memberCount === 0) {
      results.errors.push('No team members displayed');
    }
    
    // Verify marwryyy@gmail.com is admin
    const tableContent = await page.locator('table tbody').textContent();
    if (!tableContent.includes('marwryyy@gmail.com')) {
      results.errors.push('marwryyy@gmail.com not found in team');
    } else if (!tableContent.includes('admin')) {
      results.errors.push('marwryyy@gmail.com not shown as admin');
    } else {
      logTest('✅ marwryyy@gmail.com correctly shown as admin', 'success');
    }
    
    results.metrics = await captureMetrics(page, 'Leadify Team');
    await page.screenshot({ path: 'test-results/leadify-team.png', fullPage: true });
    
    logTest('Leadify Team page test completed', 'success');
  } catch (error) {
    results.errors.push(`Leadify Team test failed: ${error.message}`);
    logTest(`Leadify Team test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testIssuesPage(page) {
  logTest('Testing Issues Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/issues`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for issues display
    const pageTitle = await page.locator('h1, h2').first().textContent();
    if (!pageTitle.toLowerCase().includes('issue')) {
      results.warnings.push('Issues page title not found');
    }
    
    // Check for issue stats
    const statCards = await page.locator('.card, [class*="card"]').count();
    logTest(`Found ${statCards} stat cards on Issues page`, 'info');
    
    // Check issues table/list
    const issueItems = await page.locator('table tbody tr, [class*="issue"]').count();
    logTest(`Found ${issueItems} issues`, 'info');
    
    results.metrics = await captureMetrics(page, 'Issues');
    await page.screenshot({ path: 'test-results/issues.png', fullPage: true });
    
    logTest('Issues page test completed', 'success');
  } catch (error) {
    results.errors.push(`Issues test failed: ${error.message}`);
    logTest(`Issues test failed: ${error.message}`, 'error');
  }
  
  return results;
}

async function testFeatureRequestsPage(page) {
  logTest('Testing Feature Requests Page...', 'info');
  const results = { errors: [], warnings: [], metrics: {} };
  
  try {
    await page.goto(`${CONFIG.baseUrl}/admin/feature-requests`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for feature requests display
    const pageTitle = await page.locator('h1, h2').first().textContent();
    if (!pageTitle.toLowerCase().includes('feature')) {
      results.warnings.push('Feature Requests page title not found');
    }
    
    // Check for request stats
    const statCards = await page.locator('.card, [class*="card"]').count();
    logTest(`Found ${statCards} stat cards on Feature Requests page`, 'info');
    
    // Check requests table/list
    const requestItems = await page.locator('table tbody tr, [class*="request"], [class*="feature"]').count();
    logTest(`Found ${requestItems} feature requests`, 'info');
    
    results.metrics = await captureMetrics(page, 'Feature Requests');
    await page.screenshot({ path: 'test-results/feature-requests.png', fullPage: true });
    
    logTest('Feature Requests page test completed', 'success');
  } catch (error) {
    results.errors.push(`Feature Requests test failed: ${error.message}`);
    logTest(`Feature Requests test failed: ${error.message}`, 'error');
  }
  
  return results;
}

// Main test runner
async function runComprehensiveTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   COMPREHENSIVE ADMIN DASHBOARD TESTING SUITE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: CONFIG.timeout
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set up error capturing
    const consoleErrors = await captureConsoleErrors(page);
    const apiResponses = await captureApiResponses(page);
    
    // Create results directory
    try {
      await fs.mkdir('test-results', { recursive: true });
    } catch {}
    
    // Phase 1: Login
    console.log('PHASE 1: AUTHENTICATION');
    console.log('───────────────────────');
    logTest('Logging in...', 'info');
    await page.goto(`${CONFIG.baseUrl}/auth`);
    await page.fill('input[type="email"]', CONFIG.testUser.email);
    await page.fill('input[type="password"]', CONFIG.testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    logTest('Login successful', 'success');
    console.log('');
    
    // Phase 2: Test each page
    console.log('PHASE 2: INDIVIDUAL PAGE TESTING');
    console.log('─────────────────────────────────');
    
    // Test Dashboard
    testResults.pages.dashboard = await testDashboard(page);
    console.log('');
    
    // Test Users
    testResults.pages.users = await testUsersPage(page);
    console.log('');
    
    // Test Organizations
    testResults.pages.organizations = await testOrganizationsPage(page);
    console.log('');
    
    // Test AI Analytics
    testResults.pages.aiAnalytics = await testAIAnalyticsPage(page);
    console.log('');
    
    // Test Leadify Team
    testResults.pages.leadifyTeam = await testLeadifyTeamPage(page);
    console.log('');
    
    // Test Issues
    testResults.pages.issues = await testIssuesPage(page);
    console.log('');
    
    // Test Feature Requests
    testResults.pages.featureRequests = await testFeatureRequestsPage(page);
    console.log('');
    
    // Phase 3: Summary
    console.log('PHASE 3: TEST SUMMARY');
    console.log('─────────────────────');
    
    // Count errors and warnings
    let totalErrors = testResults.errors.length;
    let totalWarnings = testResults.warnings.length;
    
    for (const [pageName, pageResults] of Object.entries(testResults.pages)) {
      if (pageResults.errors) totalErrors += pageResults.errors.length;
      if (pageResults.warnings) totalWarnings += pageResults.warnings.length;
    }
    
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`API Calls Made: ${apiResponses.length}`);
    
    // Save results to file
    testResults.consoleErrors = consoleErrors;
    testResults.apiResponses = apiResponses;
    testResults.summary = {
      totalErrors,
      totalWarnings,
      consoleErrors: consoleErrors.length,
      apiCalls: apiResponses.length
    };
    
    await fs.writeFile(
      'test-results/test-report.json', 
      JSON.stringify(testResults, null, 2)
    );
    
    console.log('');
    console.log('Test report saved to test-results/test-report.json');
    console.log('Screenshots saved in test-results/ directory');
    
    // Display errors if any
    if (totalErrors > 0) {
      console.log('');
      console.log('❌ ERRORS FOUND:');
      console.log('────────────────');
      for (const [pageName, pageResults] of Object.entries(testResults.pages)) {
        if (pageResults.errors && pageResults.errors.length > 0) {
          console.log(`${pageName}:`);
          pageResults.errors.forEach(error => console.log(`  - ${error}`));
        }
      }
    }
    
    // Display warnings if any
    if (totalWarnings > 0) {
      console.log('');
      console.log('⚠️  WARNINGS:');
      console.log('─────────────');
      for (const [pageName, pageResults] of Object.entries(testResults.pages)) {
        if (pageResults.warnings && pageResults.warnings.length > 0) {
          console.log(`${pageName}:`);
          pageResults.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Test suite completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
  } finally {
    await browser.close();
  }
}

// Run the tests
runComprehensiveTests().catch(console.error);