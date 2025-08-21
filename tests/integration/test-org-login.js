#!/usr/bin/env node

/**
 * Test Organization Login
 * Tests login for admin@primeresidential.com
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Organization credentials
const ORG_CREDENTIALS = {
  email: 'admin@primeresidential.com',
  password: 'Admin123!'
};

async function testOrganizationLogin() {
  console.log('🔐 Testing Organization Login');
  console.log('=====================================');
  console.log(`Email: ${ORG_CREDENTIALS.email}`);
  console.log(`Time: ${new Date().toLocaleString()}\n`);
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser Error:', msg.text());
    } else if (msg.text().includes('Auth') || msg.text().includes('Login') || msg.text().includes('error')) {
      console.log('📝 Browser Log:', msg.text());
    }
  });
  
  // Log network requests
  page.on('request', request => {
    if (request.url().includes('/api/') || request.url().includes('supabase')) {
      console.log('→ Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('supabase')) {
      console.log(`← Response: ${response.status()} ${response.url()}`);
      if (response.status() >= 400) {
        console.log('  Error Status:', response.statusText());
      }
    }
  });
  
  try {
    // Navigate to auth page
    console.log('\n📍 Navigating to auth page...');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if already on dashboard (might be logged in)
    if (page.url().includes('/dashboard')) {
      console.log('⚠️ Already logged in, logging out first...');
      
      // Try to find and click logout
      const logoutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
      if (await logoutBtn.count() > 0) {
        await logoutBtn.first().click();
        await page.waitForTimeout(2000);
      }
      
      // Navigate back to auth
      await page.goto(`${BASE_URL}/auth`);
      await page.waitForTimeout(2000);
    }
    
    console.log('\n📝 Filling login form...');
    
    // Find and fill email field
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill(ORG_CREDENTIALS.email);
      console.log('  ✓ Email entered');
    } else {
      console.log('  ❌ Email input not found');
    }
    
    // Find and fill password field
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.count() > 0) {
      await passwordInput.fill(ORG_CREDENTIALS.password);
      console.log('  ✓ Password entered');
    } else {
      console.log('  ❌ Password input not found');
    }
    
    // Take screenshot before submit
    await page.screenshot({ path: 'login-before-submit.png' });
    console.log('  📸 Screenshot saved: login-before-submit.png');
    
    console.log('\n🚀 Submitting login...');
    
    // Find and click submit button
    const submitBtn = page.locator('button[type="submit"]:has-text("Sign In")');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      console.log('  ✓ Submit button clicked');
    } else {
      // Try alternative selector
      const altSubmitBtn = page.locator('button:has-text("Sign In")').filter({ hasNot: page.locator('[role="tab"]') });
      if (await altSubmitBtn.count() > 0) {
        await altSubmitBtn.first().click();
        console.log('  ✓ Submit button clicked (alt selector)');
      } else {
        console.log('  ❌ Submit button not found');
      }
    }
    
    // Wait for navigation or error
    console.log('\n⏳ Waiting for response...');
    await page.waitForTimeout(10000); // Wait 10 seconds for login to complete
    
    // Check final URL
    const finalUrl = page.url();
    console.log(`\n📍 Final URL: ${finalUrl}`);
    
    // Take screenshot of result
    await page.screenshot({ path: 'login-result.png' });
    console.log('  📸 Screenshot saved: login-result.png');
    
    // Check if login successful
    if (finalUrl.includes('/dashboard') || finalUrl.includes('/agents')) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('  User is now on:', finalUrl);
      
      // Try to get user info from localStorage
      const userInfo = await page.evaluate(() => {
        return {
          token: localStorage.getItem('sb-kbmsygyawpiqegemzetp-auth-token'),
          user: localStorage.getItem('user'),
          orgId: localStorage.getItem('organizationId')
        };
      });
      
      console.log('\n📊 Session Info:');
      console.log('  Token exists:', !!userInfo.token);
      console.log('  User data exists:', !!userInfo.user);
      console.log('  Organization ID:', userInfo.orgId);
      
    } else if (finalUrl.includes('/auth')) {
      console.log('\n❌ LOGIN FAILED - Still on auth page');
      
      // Check for error messages
      const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').allTextContents();
      if (errorMessages.length > 0) {
        console.log('\n🚨 Error Messages Found:');
        errorMessages.forEach(msg => console.log('  -', msg));
      }
      
      // Get form values to verify they were filled correctly
      const formValues = await page.evaluate(() => {
        const email = document.querySelector('input[type="email"]');
        const password = document.querySelector('input[type="password"]');
        return {
          email: email?.value,
          password: password?.value
        };
      });
      
      console.log('\n📝 Form Values:');
      console.log('  Email:', formValues.email);
      console.log('  Password:', formValues.password ? '[FILLED]' : '[EMPTY]');
      
    } else {
      console.log('\n⚠️ UNEXPECTED RESULT');
      console.log('  Ended up at:', finalUrl);
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    console.log('\n🔚 Test completed');
    await page.waitForTimeout(5000); // Keep browser open for 5 seconds to observe
    await browser.close();
  }
}

// Run the test
testOrganizationLogin().catch(console.error);