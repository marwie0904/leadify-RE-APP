// Comprehensive test of admin dashboard after login
const { chromium } = require('playwright');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const TEST_EMAIL = 'marwryyy@gmail.com';
const TEST_PASSWORD = 'ayokonga123';

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`,
    network: `${colors.magenta}🌐`
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
}

const adminPages = [
  { name: 'Dashboard', path: '/admin', expectedContent: ['Urgent Bug Reports', 'Token Usage', 'Support Requests'] },
  { name: 'Leadify Team', path: '/admin/team', expectedContent: ['Team Members', 'Role', 'Status'] },
  { name: 'Users', path: '/admin/users', expectedContent: ['User Management', 'Email', 'Organization'] },
  { name: 'Organizations', path: '/admin/organizations', expectedContent: ['Organizations', 'Members', 'Created'] },
  { name: 'AI Analytics', path: '/admin/ai-analytics', expectedContent: ['Token Usage', 'Cost Analysis', 'Model Distribution'] },
  { name: 'Issues', path: '/admin/issues', expectedContent: ['Issue Dashboard', 'Priority', 'Status'] },
  { name: 'Feature Requests', path: '/admin/feature-requests', expectedContent: ['Feature Requests', 'Priority', 'Votes'] }
];

async function testAdminDashboard() {
  console.log('\n' + '='.repeat(70));
  console.log(colors.bright + 'COMPREHENSIVE ADMIN DASHBOARD TEST' + colors.reset);
  console.log('='.repeat(70) + '\n');
  
  let browser;
  const issues = [];
  const apiCalls = [];
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon')) {
          log(`Console Error: ${text}`, 'error');
          issues.push({ type: 'console_error', message: text });
        }
      }
    });
    
    // Monitor API calls
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        const headers = request.headers();
        const hasAuth = !!headers.authorization;
        const endpoint = url.replace(API_URL, '').replace(FRONTEND_URL, '');
        apiCalls.push({
          endpoint,
          method: request.method(),
          hasAuth,
          authType: headers.authorization ? (headers.authorization.includes('Bearer') ? 'Bearer' : 'Other') : 'None'
        });
      }
    });
    
    // Monitor API responses
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        const endpoint = url.replace(API_URL, '').replace(FRONTEND_URL, '');
        
        if (status >= 400) {
          log(`API Error: ${status} - ${endpoint}`, 'error');
          issues.push({ type: 'api_error', endpoint, status });
        } else {
          log(`API Success: ${status} - ${endpoint}`, 'network');
        }
      }
    });
    
    // Step 1: Clear session and login
    log('Clearing session and navigating to admin login...', 'test');
    await page.goto(FRONTEND_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    
    log('Logging in as admin...', 'test');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Check if login was successful
    const currentUrl = page.url();
    if (!currentUrl.includes('/admin') || currentUrl.includes('/admin/login')) {
      log('Login failed or did not redirect properly', 'error');
      issues.push({ type: 'login_failure', url: currentUrl });
      throw new Error('Admin login failed');
    }
    
    log('Login successful!', 'success');
    
    // Step 2: Check user profile display
    log('\nChecking user profile display...', 'test');
    const profileData = await page.evaluate(() => {
      const adminUser = localStorage.getItem('admin_user');
      const adminToken = localStorage.getItem('admin_token');
      
      // Check profile in sidebar
      const profileName = document.querySelector('.text-sm.font-medium.text-gray-900')?.textContent;
      const profileRole = document.querySelector('.text-xs.text-gray-500')?.textContent;
      
      return {
        hasAdminUser: !!adminUser,
        hasAdminToken: !!adminToken,
        adminUser: adminUser ? JSON.parse(adminUser) : null,
        displayedName: profileName,
        displayedRole: profileRole
      };
    });
    
    log(`Admin Token: ${profileData.hasAdminToken ? '✅' : '❌'}`, profileData.hasAdminToken ? 'success' : 'error');
    log(`Admin User Data: ${profileData.hasAdminUser ? '✅' : '❌'}`, profileData.hasAdminUser ? 'success' : 'error');
    
    if (profileData.adminUser) {
      log(`Stored Email: ${profileData.adminUser.email}`, 'info');
      log(`Stored Name: ${profileData.adminUser.name}`, 'info');
      log(`Stored Role: ${profileData.adminUser.role}`, 'info');
    }
    
    log(`Displayed Name: ${profileData.displayedName || 'NOT SHOWN'}`, profileData.displayedName ? 'info' : 'error');
    log(`Displayed Role: ${profileData.displayedRole || 'NOT SHOWN'}`, profileData.displayedRole ? 'info' : 'error');
    
    if (!profileData.displayedName || profileData.displayedName === 'Admin') {
      issues.push({ type: 'profile_display', issue: 'Name not displayed correctly' });
    }
    
    // Step 3: Test each admin page
    log('\n' + '='.repeat(50), 'info');
    log('Testing Admin Pages', 'test');
    log('='.repeat(50) + '\n', 'info');
    
    for (const pageInfo of adminPages) {
      log(`\nTesting ${pageInfo.name} (${pageInfo.path})...`, 'test');
      
      try {
        await page.goto(`${FRONTEND_URL}${pageInfo.path}`);
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        
        // Check if we were redirected
        if (finalUrl.includes('/auth')) {
          log(`❌ Redirected to /auth instead of staying on ${pageInfo.path}`, 'error');
          issues.push({ type: 'unauthorized_redirect', page: pageInfo.name, redirectedTo: '/auth' });
          continue;
        }
        
        if (!finalUrl.includes(pageInfo.path)) {
          log(`⚠️ Unexpected redirect to ${finalUrl}`, 'warning');
          issues.push({ type: 'unexpected_redirect', page: pageInfo.name, redirectedTo: finalUrl });
        }
        
        // Check for expected content
        const pageContent = await page.evaluate((expectedContent) => {
          const bodyText = document.body.innerText;
          const found = [];
          const missing = [];
          
          expectedContent.forEach(text => {
            if (bodyText.includes(text)) {
              found.push(text);
            } else {
              missing.push(text);
            }
          });
          
          // Check for placeholder data indicators
          const hasPlaceholder = bodyText.includes('Loading...') || 
                                bodyText.includes('No data') ||
                                bodyText.includes('...') ||
                                document.querySelectorAll('.animate-pulse').length > 0;
          
          // Check for error messages
          const errorElements = document.querySelectorAll('[role="alert"], .text-destructive, .text-red-500');
          const errors = Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
          
          return { found, missing, hasPlaceholder, errors };
        }, pageInfo.expectedContent);
        
        if (pageContent.found.length > 0) {
          log(`✅ Found content: ${pageContent.found.join(', ')}`, 'success');
        }
        
        if (pageContent.missing.length > 0) {
          log(`❌ Missing content: ${pageContent.missing.join(', ')}`, 'error');
          issues.push({ type: 'missing_content', page: pageInfo.name, missing: pageContent.missing });
        }
        
        if (pageContent.hasPlaceholder) {
          log(`⚠️ Page shows placeholder/loading data`, 'warning');
          issues.push({ type: 'placeholder_data', page: pageInfo.name });
        }
        
        if (pageContent.errors.length > 0) {
          log(`❌ Page errors: ${pageContent.errors.join(', ')}`, 'error');
          issues.push({ type: 'page_errors', page: pageInfo.name, errors: pageContent.errors });
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `admin-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
        
      } catch (error) {
        log(`❌ Error testing ${pageInfo.name}: ${error.message}`, 'error');
        issues.push({ type: 'test_error', page: pageInfo.name, error: error.message });
      }
    }
    
    // Step 4: Analyze API calls
    log('\n' + '='.repeat(50), 'info');
    log('API Call Analysis', 'test');
    log('='.repeat(50) + '\n', 'info');
    
    const authIssues = apiCalls.filter(call => !call.hasAuth && call.endpoint.includes('/admin'));
    const authSuccess = apiCalls.filter(call => call.hasAuth && call.endpoint.includes('/admin'));
    
    log(`Total API calls: ${apiCalls.length}`, 'info');
    log(`Calls with auth: ${authSuccess.length}`, authSuccess.length > 0 ? 'success' : 'warning');
    log(`Calls without auth: ${authIssues.length}`, authIssues.length > 0 ? 'error' : 'success');
    
    if (authIssues.length > 0) {
      log('\nAPI calls missing authentication:', 'error');
      authIssues.forEach(call => {
        log(`  ${call.method} ${call.endpoint}`, 'error');
      });
      issues.push({ type: 'missing_auth', count: authIssues.length });
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(colors.bright + 'TEST SUMMARY' + colors.reset);
    console.log('='.repeat(70));
    
    if (issues.length === 0) {
      log('\n✅ All tests passed! Admin dashboard is working correctly.', 'success');
    } else {
      log(`\n❌ Found ${issues.length} issues:`, 'error');
      
      // Group issues by type
      const groupedIssues = {};
      issues.forEach(issue => {
        if (!groupedIssues[issue.type]) {
          groupedIssues[issue.type] = [];
        }
        groupedIssues[issue.type].push(issue);
      });
      
      Object.entries(groupedIssues).forEach(([type, items]) => {
        console.log(`\n${colors.yellow}${type.toUpperCase().replace(/_/g, ' ')}:${colors.reset}`);
        items.forEach(item => {
          console.log(`  - ${JSON.stringify(item, null, 2)}`);
        });
      });
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    // Keep browser open for inspection
    log('Browser will remain open for 10 seconds for inspection...', 'info');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    log(`Test failed: ${error.message}`, 'error');
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAdminDashboard().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});