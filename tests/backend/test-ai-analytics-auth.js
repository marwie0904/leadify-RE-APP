// Comprehensive test for AI Analytics authentication and endpoints
const { chromium } = require('playwright');
const axios = require('axios');

const API_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_EMAIL = 'marwryyy@gmail.com';
const TEST_PASSWORD = 'your-password-here'; // You need to set this

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`
  };
  
  console.log(`${prefix[type] || prefix.info} ${message}${colors.reset}`);
}

async function testDirectAPI() {
  log('Testing Direct API Access (without authentication)', 'test');
  
  const endpoints = [
    '/api/admin/ai-analytics/summary',
    '/api/admin/ai-analytics/conversations',
    '/api/admin/ai-analytics/operations',
    '/api/admin/ai-analytics/peak-times',
    '/api/admin/ai-analytics/organizations',
    '/api/admin/ai-analytics/daily?startDate=2024-01-01&endDate=2024-12-31'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, {
        timeout: 5000
      });
      
      log(`${endpoint}: Accessible without auth (SECURITY ISSUE!)`, 'error');
      results.push({ endpoint, status: response.status, auth: 'none' });
    } catch (error) {
      if (error.response?.status === 401) {
        log(`${endpoint}: Requires authentication (correct)`, 'success');
        results.push({ endpoint, status: 401, auth: 'required' });
      } else if (error.response?.status === 403) {
        log(`${endpoint}: Requires admin role (authenticated but not admin)`, 'warning');
        results.push({ endpoint, status: 403, auth: 'needs_admin' });
      } else {
        log(`${endpoint}: Error - ${error.message}`, 'error');
        results.push({ endpoint, status: error.response?.status || 'error', auth: 'error' });
      }
    }
  }
  
  return results;
}

async function testWithSupabaseAuth() {
  log('Testing with Supabase Authentication', 'test');
  
  // First, we need to get a Supabase session token
  // This would normally come from the frontend after login
  
  try {
    // Try to get token using Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pwyyfwhdqdtuynyuvhco.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3eXlmd2hkcWR0dXlueXV2aGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyMzE4MzAsImV4cCI6MjA0NzgwNzgzMH0.KRos-3fRRXLV8ASn1v8CuYJcW-0IH_BKMXyStMDcaI4';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Note: You need to set the actual password for testing
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email: TEST_EMAIL,
    //   password: TEST_PASSWORD
    // });
    
    // if (error) {
    //   log(`Cannot sign in: ${error.message}`, 'error');
    //   log('Please set TEST_PASSWORD in the test script', 'warning');
    //   return [];
    // }
    
    // const token = data.session?.access_token;
    
    log('Supabase authentication test skipped (password needed)', 'warning');
    log('To enable: Set TEST_PASSWORD in test script', 'info');
    
  } catch (error) {
    log(`Supabase auth error: ${error.message}`, 'error');
  }
  
  return [];
}

async function testWithPlaywright() {
  log('Testing with Playwright Browser Automation', 'test');
  
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 500 // Slow down for visibility
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('[Browser Console Error]', msg.text());
      }
    });
    
    // Enable request/response logging
    page.on('response', response => {
      if (response.url().includes('/api/admin/ai-analytics')) {
        log(`API Response: ${response.url()} - Status: ${response.status()}`, 
            response.status() === 200 ? 'success' : 'error');
      }
    });
    
    // Navigate to frontend
    log(`Navigating to ${FRONTEND_URL}`, 'info');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    
    // Check if already logged in
    const isLoggedIn = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') !== null;
    });
    
    if (!isLoggedIn) {
      log('Not logged in - navigating to login page', 'info');
      
      // Navigate to login if exists
      const loginLinkExists = await page.locator('a[href*="login"]').count() > 0;
      if (loginLinkExists) {
        await page.click('a[href*="login"]');
        await page.waitForLoadState('networkidle');
        
        log('Login page loaded - manual login required', 'warning');
        log('Please log in manually with admin credentials', 'info');
        
        // Wait for user to log in manually (timeout after 60 seconds)
        await page.waitForFunction(
          () => localStorage.getItem('supabase.auth.token') !== null,
          { timeout: 60000 }
        ).catch(() => {
          log('Login timeout - continuing without authentication', 'warning');
        });
      }
    } else {
      log('Already logged in', 'success');
    }
    
    // Navigate to AI Analytics page
    log('Navigating to AI Analytics page', 'info');
    
    // Try different possible routes
    const routes = [
      '/admin/ai-analytics',
      '/ai-analytics', 
      '/analytics/ai',
      '/dashboard/ai-analytics'
    ];
    
    let aiAnalyticsFound = false;
    
    for (const route of routes) {
      try {
        await page.goto(`${FRONTEND_URL}${route}`, { 
          waitUntil: 'networkidle',
          timeout: 10000 
        });
        
        // Check if we got a 404 or redirect
        const pageTitle = await page.title();
        const url = page.url();
        
        if (!url.includes('404') && !pageTitle.toLowerCase().includes('not found')) {
          log(`AI Analytics page found at ${route}`, 'success');
          aiAnalyticsFound = true;
          
          // Wait for API calls to complete
          await page.waitForTimeout(3000);
          
          // Check for error messages on the page
          const errors = await page.locator('.error, [class*="error"], [class*="Error"]').allTextContents();
          if (errors.length > 0) {
            log('Errors found on page:', 'error');
            errors.forEach(err => console.log(`  - ${err}`));
          }
          
          // Check for data on the page
          const hasData = await page.locator('[class*="chart"], [class*="Chart"], canvas').count() > 0;
          if (hasData) {
            log('Charts/data visualization found on page', 'success');
          } else {
            log('No charts/data found on page', 'warning');
          }
          
          // Take screenshot
          await page.screenshot({ 
            path: 'ai-analytics-test-screenshot.png',
            fullPage: true 
          });
          log('Screenshot saved: ai-analytics-test-screenshot.png', 'info');
          
          break;
        }
      } catch (error) {
        // Route doesn't exist, try next
        continue;
      }
    }
    
    if (!aiAnalyticsFound) {
      log('AI Analytics page not found at any standard route', 'error');
      log('Please check the frontend routing configuration', 'info');
    }
    
  } catch (error) {
    log(`Playwright test error: ${error.message}`, 'error');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log(colors.bright + 'AI ANALYTICS AUTHENTICATION & ACCESS TEST' + colors.reset);
  console.log('='.repeat(70) + '\n');
  
  // Test 1: Direct API Access
  console.log(colors.bright + '\n--- Test 1: Direct API Access ---' + colors.reset);
  const apiResults = await testDirectAPI();
  
  // Test 2: Supabase Auth
  console.log(colors.bright + '\n--- Test 2: Supabase Authentication ---' + colors.reset);
  await testWithSupabaseAuth();
  
  // Test 3: Playwright Browser Test
  console.log(colors.bright + '\n--- Test 3: Browser Automation Test ---' + colors.reset);
  await testWithPlaywright();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(colors.bright + 'TEST SUMMARY' + colors.reset);
  console.log('='.repeat(70));
  
  const authRequired = apiResults.filter(r => r.status === 401).length;
  const adminRequired = apiResults.filter(r => r.status === 403).length;
  const accessible = apiResults.filter(r => r.status === 200).length;
  
  console.log(`\n📊 API Endpoint Results:`);
  console.log(`  - Requires Authentication: ${authRequired}/${apiResults.length}`);
  console.log(`  - Requires Admin Role: ${adminRequired}/${apiResults.length}`);
  console.log(`  - Publicly Accessible: ${accessible}/${apiResults.length}`);
  
  if (authRequired === apiResults.length) {
    log('\nAll endpoints properly require authentication', 'success');
  } else if (accessible > 0) {
    log('\nSECURITY ISSUE: Some endpoints are publicly accessible', 'error');
  }
  
  console.log('\n' + colors.bright + 'RECOMMENDED ACTIONS:' + colors.reset);
  console.log('1. Run the SQL script to grant admin access:');
  console.log('   ' + colors.cyan + 'setup-admin-access.sql' + colors.reset);
  console.log('\n2. Ensure the user has one of these roles:');
  console.log('   - In dev_members table: developer, admin, or super_admin');
  console.log('   - In organization_members table: admin');
  console.log('\n3. Verify authentication token is being sent in requests');
  console.log('\n4. Check backend logs for detailed authentication info');
  
  console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});