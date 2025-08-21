#!/usr/bin/env node

/**
 * Test Admin Login Page with Playwright
 * Tests the admin login functionality with admin@gmail.com
 */

const { chromium } = require('playwright');
require('dotenv').config();

const ADMIN_URL = 'http://localhost:3000/admin'; // Adjust if different
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: 'admin123'
};

async function testAdminLogin() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 TESTING ADMIN LOGIN PAGE');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see what's happening
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  ❌ Browser console error:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('response', response => {
    if (response.url().includes('/api/admin/login')) {
      console.log(`  📡 Admin login response: ${response.status()} ${response.statusText()}`);
    }
  });
  
  try {
    // Step 1: Navigate to admin page
    console.log('\n📍 Navigating to admin page...');
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'admin-login-page.png' });
    console.log('  📸 Screenshot saved: admin-login-page.png');
    
    // Step 2: Check if we're on a login page
    const currentUrl = page.url();
    console.log(`  📍 Current URL: ${currentUrl}`);
    
    // Look for login form elements
    const emailInput = await page.locator('input[type="email"], input[name="email"], input#email').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"], input#password').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      console.log('  ✅ Login form found');
      
      // Step 3: Fill in credentials
      console.log('\n🔑 Entering admin credentials...');
      await emailInput.fill(ADMIN_CREDENTIALS.email);
      console.log(`  📧 Email entered: ${ADMIN_CREDENTIALS.email}`);
      
      await passwordInput.fill(ADMIN_CREDENTIALS.password);
      console.log('  🔒 Password entered');
      
      // Step 4: Submit the form
      console.log('\n📤 Submitting login form...');
      
      // Look for submit button
      const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Submit")').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('  🖱️ Clicked submit button');
      } else {
        // Try pressing Enter
        await passwordInput.press('Enter');
        console.log('  ⌨️ Pressed Enter to submit');
      }
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Step 5: Check result
      const afterLoginUrl = page.url();
      console.log(`\n📍 After login URL: ${afterLoginUrl}`);
      
      // Take screenshot after login attempt
      await page.screenshot({ path: 'admin-after-login.png' });
      console.log('  📸 Screenshot saved: admin-after-login.png');
      
      // Check for error messages
      const errorMessage = await page.locator('text=/error|invalid|denied|unauthorized|not authorized|failed/i').first();
      if (await errorMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
        const errorText = await errorMessage.textContent();
        console.log(`  ❌ Error message found: ${errorText}`);
        
        // Get the full page text to understand the error
        const pageText = await page.locator('body').textContent();
        console.log('\n📄 Page content (first 500 chars):');
        console.log(pageText.substring(0, 500));
      }
      
      // Check if we successfully logged in
      if (afterLoginUrl.includes('/admin/dashboard') || afterLoginUrl.includes('/admin') && !afterLoginUrl.includes('/login')) {
        console.log('  ✅ Successfully logged into admin panel!');
      } else {
        console.log('  ⚠️ Login may have failed or redirected elsewhere');
      }
      
    } else {
      console.log('  ❌ Login form not found on page');
      
      // Get page content to understand what's on the page
      const pageText = await page.locator('body').textContent();
      console.log('\n📄 Page content (first 500 chars):');
      console.log(pageText.substring(0, 500));
    }
    
    // Step 6: Test direct API login
    console.log('\n🔌 Testing direct API login...');
    const axios = require('axios');
    
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password
      });
      
      console.log('  ✅ API login successful!');
      console.log('  📊 Response:', {
        message: response.data.message,
        user: response.data.user ? {
          email: response.data.user.email,
          role: response.data.user.role,
          permissions: response.data.user.permissions
        } : 'No user data'
      });
    } catch (apiError) {
      console.log('  ❌ API login failed:', apiError.response?.data?.message || apiError.message);
      
      if (apiError.response?.status === 401) {
        console.log('  💡 Invalid credentials - password might be incorrect');
      } else if (apiError.response?.status === 403) {
        console.log('  💡 Access denied - user not in dev_members or inactive');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
console.log('🚀 Starting admin login test...');
console.log('  📝 Testing with: admin@gmail.com / admin123');

testAdminLogin()
  .then(() => {
    console.log('\n✨ Test finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });