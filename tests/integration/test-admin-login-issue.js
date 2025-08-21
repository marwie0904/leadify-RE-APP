#!/usr/bin/env node

/**
 * Diagnose Admin Login Issue with Playwright
 * Tests backend connectivity and login flow
 */

const { chromium } = require('playwright');
const axios = require('axios');
require('dotenv').config();

async function testBackendConnectivity() {
  console.log('\n🔍 Testing Backend Connectivity...\n');
  
  // Test 1: Health check
  try {
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Backend health check:', healthResponse.data);
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
  
  // Test 2: Check if backend accepts requests
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@test.com',
      password: 'test'
    }, {
      validateStatus: () => true // Accept any status
    });
    console.log('✅ Backend accepts POST requests. Status:', response.status);
  } catch (error) {
    console.error('❌ Backend not accepting requests:', error.message);
    return false;
  }
  
  return true;
}

async function testAdminLogin() {
  console.log('\n🧪 Testing Admin Login with Playwright\n');
  console.log('=' .repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Browser Console Error:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('requestfailed', request => {
    console.log('❌ Request failed:', request.url(), request.failure().errorText);
  });
  
  try {
    // Step 1: Navigate to admin login
    console.log('📍 Step 1: Navigating to admin login...');
    await page.goto('http://localhost:3000/admin/login');
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded correctly
    const pageTitle = await page.title();
    console.log('   Page title:', pageTitle);
    
    // Check for error messages on the page
    const errorElement = await page.locator('text=/cannot connect|server error|failed/i').first();
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log('❌ Error message on page:', errorText);
    }
    
    // Step 2: Fill login form
    console.log('\n📍 Step 2: Filling login form...');
    await page.fill('input[name="email"]', 'admin@primeresidential.com');
    await page.fill('input[name="password"]', 'Admin123!');
    console.log('   ✅ Credentials entered');
    
    // Step 3: Intercept network requests during login
    console.log('\n📍 Step 3: Attempting login...');
    
    // Set up request interception
    const loginRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('supabase')) {
        loginRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Set up response interception
    const loginResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('supabase')) {
        loginResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    try {
      await Promise.race([
        page.waitForURL('**/admin/dashboard', { timeout: 10000 }),
        page.waitForSelector('text=/error|failed|cannot connect/i', { timeout: 10000 })
      ]);
    } catch (e) {
      console.log('   ⏱️ Login attempt timed out or showed error');
    }
    
    // Step 4: Analyze results
    console.log('\n📊 Analysis Results:');
    console.log('=' .repeat(50));
    
    // Check current URL
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error, .alert, [class*="error"]').all();
    for (const error of errorMessages) {
      const text = await error.textContent();
      if (text) {
        console.log('❌ Error found on page:', text.trim());
      }
    }
    
    // Analyze network requests
    console.log('\n📡 Network Requests Made:');
    loginRequests.forEach(req => {
      console.log(`   ${req.method} ${req.url}`);
    });
    
    console.log('\n📡 Network Responses:');
    loginResponses.forEach(res => {
      console.log(`   ${res.status} ${res.statusText} - ${res.url}`);
    });
    
    // Check localStorage for auth tokens
    const localStorage = await page.evaluate(() => {
      return {
        supabaseToken: window.localStorage.getItem('sb-kbmsygyawpiqegemzetp-auth-token'),
        adminToken: window.localStorage.getItem('admin_token'),
        testMode: window.localStorage.getItem('test_mode')
      };
    });
    
    console.log('\n🗄️ LocalStorage Status:');
    console.log('   Supabase Token:', localStorage.supabaseToken ? 'Present' : 'Missing');
    console.log('   Admin Token:', localStorage.adminToken ? 'Present' : 'Missing');
    console.log('   Test Mode:', localStorage.testMode || 'Not set');
    
    // Step 5: Test direct API call from browser
    console.log('\n📍 Step 5: Testing direct API call from browser...');
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health');
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (apiTest.success) {
      console.log('   ✅ Browser can reach backend API. Status:', apiTest.status);
    } else {
      console.log('   ❌ Browser cannot reach backend API:', apiTest.error);
    }
    
    // Step 6: Check Supabase connection
    console.log('\n📍 Step 6: Testing Supabase connection...');
    const supabaseTest = await page.evaluate(async () => {
      try {
        const response = await fetch('https://kbmsygyawpiqegemzetp.supabase.co/auth/v1/health');
        return { success: true, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (supabaseTest.success) {
      console.log('   ✅ Supabase is reachable. Status:', supabaseTest.status);
    } else {
      console.log('   ❌ Cannot reach Supabase:', supabaseTest.error);
    }
    
    // Final diagnosis
    console.log('\n' + '=' .repeat(50));
    console.log('🔍 DIAGNOSIS:');
    console.log('=' .repeat(50));
    
    if (currentUrl.includes('dashboard')) {
      console.log('✅ Login successful! User reached dashboard.');
    } else {
      console.log('❌ Login failed. User still on:', currentUrl);
      
      // Provide specific diagnosis
      if (!apiTest.success) {
        console.log('\n🔴 ISSUE: Frontend cannot reach backend API');
        console.log('   SOLUTION: Check CORS settings and ensure backend is running');
      }
      
      if (!localStorage.supabaseToken) {
        console.log('\n🔴 ISSUE: Supabase authentication failed');
        console.log('   SOLUTION: Check Supabase credentials and user exists');
      }
      
      if (loginResponses.some(r => r.status === 404)) {
        console.log('\n🔴 ISSUE: API endpoints not found (404)');
        console.log('   SOLUTION: Check API route definitions in backend');
      }
      
      if (loginResponses.some(r => r.status === 500)) {
        console.log('\n🔴 ISSUE: Backend server errors (500)');
        console.log('   SOLUTION: Check backend logs for errors');
      }
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'admin-login-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as admin-login-test.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'admin-login-error.png',
      fullPage: true 
    });
  } finally {
    console.log('\n🔍 Test complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to close...');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
  }
}

async function main() {
  // First test backend connectivity
  const backendOk = await testBackendConnectivity();
  
  if (!backendOk) {
    console.log('\n❌ Backend is not running or not accessible!');
    console.log('Please ensure the backend is running on port 3001');
    process.exit(1);
  }
  
  // Then test admin login
  await testAdminLogin();
}

// Run the tests
main().catch(console.error);