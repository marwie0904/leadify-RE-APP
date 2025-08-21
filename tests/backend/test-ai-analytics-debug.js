// Comprehensive AI Analytics debugging with Playwright
const { chromium } = require('playwright');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// User credentials
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

async function debugAIAnalytics() {
  console.log('\n' + '='.repeat(70));
  console.log(colors.bright + 'AI ANALYTICS COMPREHENSIVE DEBUG TEST' + colors.reset);
  console.log('='.repeat(70) + '\n');
  
  let browser;
  const errors = [];
  const networkErrors = [];
  const apiResponses = {};
  
  try {
    // Launch browser in headed mode for debugging
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 100,
      devtools: true
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        errors.push({
          type: 'console',
          text: text,
          location: msg.location()
        });
        log(`Console Error: ${text}`, 'error');
      } else if (msg.type() === 'warning') {
        log(`Console Warning: ${msg.text()}`, 'warning');
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push({
        type: 'page',
        text: error.message,
        stack: error.stack
      });
      log(`Page Error: ${error.message}`, 'error');
    });
    
    // Capture network requests and responses
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/admin/ai-analytics')) {
        log(`API Request: ${request.method()} ${url}`, 'network');
        
        // Log headers
        const headers = request.headers();
        if (headers.authorization) {
          log(`  Auth Header: ${headers.authorization.substring(0, 50)}...`, 'info');
        } else {
          log(`  No Auth Header!`, 'error');
        }
      }
    });
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/admin/ai-analytics')) {
        const status = response.status();
        const statusText = response.statusText();
        
        apiResponses[url] = {
          status,
          statusText,
          headers: response.headers()
        };
        
        if (status >= 400) {
          networkErrors.push({
            url,
            status,
            statusText
          });
          log(`API Response Error: ${status} ${statusText} - ${url}`, 'error');
          
          // Try to get response body for error details
          response.text().then(body => {
            try {
              const json = JSON.parse(body);
              log(`  Error Details: ${JSON.stringify(json, null, 2)}`, 'error');
            } catch {
              log(`  Error Body: ${body}`, 'error');
            }
          }).catch(() => {});
        } else {
          log(`API Response OK: ${status} - ${url}`, 'success');
        }
      }
    });
    
    // Step 1: Navigate to frontend
    log(`Navigating to ${FRONTEND_URL}`, 'test');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Step 2: Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      const session = localStorage.getItem('supabase.auth.token');
      return session !== null;
    });
    
    if (!isLoggedIn) {
      log('Not logged in - proceeding to login', 'info');
      
      // Navigate to auth page (not login)
      await page.goto(`${FRONTEND_URL}/auth`, { waitUntil: 'networkidle' });
      
      // Make sure we're on the signin tab
      const signinTab = await page.locator('button[role="tab"]:has-text("Sign In")').first();
      if (await signinTab.isVisible()) {
        await signinTab.click();
        await page.waitForTimeout(500);
      }
      
      // Wait for login form
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      log(`Logging in as ${TEST_EMAIL}`, 'test');
      
      // Fill in credentials
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      
      // Take screenshot before login
      await page.screenshot({ path: 'ai-analytics-before-login.png' });
      
      // Click sign in button
      await page.click('button:has-text("Sign In")');
      
      // Wait for navigation after login
      await page.waitForTimeout(5000);
      
      // Check current URL
      const currentUrl = page.url();
      log(`Current URL after login: ${currentUrl}`, 'info');
      
      // Verify login succeeded
      const loginSuccess = await page.evaluate(() => {
        return localStorage.getItem('supabase.auth.token') !== null;
      });
      
      if (loginSuccess || currentUrl.includes('/dashboard') || currentUrl.includes('/organization-setup')) {
        log('Login successful', 'success');
      } else {
        log('Login may have failed - continuing anyway', 'warning');
        
        // Check for error messages
        const errorText = await page.locator('.text-destructive, .text-red-500, [role="alert"]').allTextContents();
        if (errorText.length > 0) {
          log('Login errors: ' + errorText.join(', '), 'error');
        }
      }
    } else {
      log('Already logged in', 'success');
    }
    
    // Step 3: Get auth token from localStorage
    const authData = await page.evaluate(() => {
      const token = localStorage.getItem('supabase.auth.token');
      const session = localStorage.getItem('supabase.auth.session');
      return { 
        hasToken: token !== null,
        hasSession: session !== null,
        tokenPreview: token ? token.substring(0, 50) : null
      };
    });
    
    log(`Auth Status: Token=${authData.hasToken}, Session=${authData.hasSession}`, 'info');
    
    // Step 4: Navigate to AI Analytics page
    log('Navigating to AI Analytics page', 'test');
    await page.goto(`${FRONTEND_URL}/admin/ai-analytics`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Take screenshot of AI Analytics page
    await page.screenshot({ 
      path: 'ai-analytics-page.png',
      fullPage: true 
    });
    log('Screenshot saved: ai-analytics-page.png', 'info');
    
    // Step 5: Check for error elements on the page
    const pageErrors = await page.evaluate(() => {
      const errorElements = [];
      
      // Look for error messages
      const selectors = [
        '.error', '[class*="error"]', '[class*="Error"]',
        '.alert-danger', '[role="alert"]',
        'div:has-text("401")', 'div:has-text("403")',
        'div:has-text("Unauthorized")', 'div:has-text("forbidden")'
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.textContent && el.textContent.trim()) {
              errorElements.push({
                selector,
                text: el.textContent.trim().substring(0, 200)
              });
            }
          });
        } catch {}
      });
      
      return errorElements;
    });
    
    if (pageErrors.length > 0) {
      log('Errors found on page:', 'error');
      pageErrors.forEach(err => {
        console.log(`  ${err.selector}: ${err.text}`);
      });
    }
    
    // Step 6: Check if data loaded
    const hasData = await page.evaluate(() => {
      const charts = document.querySelectorAll('canvas, svg[class*="chart"], [class*="Chart"]');
      const tables = document.querySelectorAll('table, [class*="table"]');
      const stats = document.querySelectorAll('[class*="stat"], [class*="metric"]');
      
      return {
        charts: charts.length,
        tables: tables.length,
        stats: stats.length,
        hasContent: charts.length > 0 || tables.length > 0 || stats.length > 0
      };
    });
    
    log(`Page Content: Charts=${hasData.charts}, Tables=${hasData.tables}, Stats=${hasData.stats}`, 'info');
    
    if (!hasData.hasContent) {
      log('No data visualizations found on page', 'warning');
    } else {
      log('Data visualizations present', 'success');
    }
    
    // Step 7: Try to manually call an API endpoint with auth
    log('\nTesting API directly from browser context', 'test');
    
    const apiTest = await page.evaluate(async () => {
      try {
        // Get the Supabase session
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) {
          return { error: 'No auth token in localStorage' };
        }
        
        const session = JSON.parse(sessionStr);
        const token = session.currentSession?.access_token || session.access_token;
        
        if (!token) {
          return { error: 'No access token in session' };
        }
        
        // Call the API
        const response = await fetch('http://localhost:3001/api/admin/ai-analytics/summary', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        return {
          status: response.status,
          statusText: response.statusText,
          data: data,
          tokenUsed: token.substring(0, 50) + '...'
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    log(`Direct API Test Result:`, 'info');
    console.log(JSON.stringify(apiTest, null, 2));
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(colors.bright + 'DIAGNOSTIC SUMMARY' + colors.reset);
    console.log('='.repeat(70));
    
    if (errors.length > 0) {
      console.log(colors.red + `\n❌ Console/Page Errors: ${errors.length}` + colors.reset);
      errors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.type} error:`);
        console.log(`   ${err.text}`);
        if (err.location) {
          console.log(`   Location: ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    }
    
    if (networkErrors.length > 0) {
      console.log(colors.red + `\n❌ Network Errors: ${networkErrors.length}` + colors.reset);
      networkErrors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.status} ${err.statusText}`);
        console.log(`   URL: ${err.url}`);
      });
    }
    
    if (errors.length === 0 && networkErrors.length === 0) {
      console.log(colors.green + '\n✅ No errors detected!' + colors.reset);
    }
    
    console.log('\n' + colors.bright + 'RECOMMENDED FIXES:' + colors.reset);
    
    // Analyze and suggest fixes
    const has401 = networkErrors.some(e => e.status === 401);
    const has403 = networkErrors.some(e => e.status === 403);
    
    if (has401) {
      console.log('1. Authentication issue detected (401)');
      console.log('   - Check if token is being sent correctly');
      console.log('   - Verify token is not expired');
      console.log('   - Check backend requireAuth middleware');
    }
    
    if (has403) {
      console.log('2. Authorization issue detected (403)');
      console.log('   - User lacks admin role');
      console.log('   - Check dev_members and organization_members tables');
    }
    
    console.log('\n' + '='.repeat(70));
    
    // Keep browser open for 10 seconds for manual inspection
    log('\nKeeping browser open for inspection (10 seconds)...', 'info');
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

// Run the debug test
debugAIAnalytics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});