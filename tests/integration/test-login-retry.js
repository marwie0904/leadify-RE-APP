#!/usr/bin/env node

/**
 * Test Login with Retry Logic
 * Simulates the error condition from simple-auth-context.tsx
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testLoginWithRetry() {
  console.log('🔐 Testing Login with Retry Logic');
  console.log('=====================================');
  console.log(`Time: ${new Date().toLocaleString()}\n`);
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 300 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Monitor console for the specific error
  let errorOccurred = false;
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Unable to connect to server after multiple attempts')) {
      console.log('🚨 ERROR DETECTED:', text);
      errorOccurred = true;
    } else if (text.includes('All login attempts failed')) {
      console.log('🚨 RETRY FAILURE:', text);
    } else if (text.includes('Login attempt')) {
      console.log('🔄 Retry:', text);
    } else if (text.includes('Login successful')) {
      console.log('✅ Success:', text);
    }
  });
  
  // Monitor network failures
  page.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), request.failure().errorText);
  });
  
  try {
    // Test 1: Normal login
    console.log('\n📍 Test 1: Normal Login');
    console.log('-' .repeat(40));
    
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Clear any existing session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Fill and submit form
    await page.fill('input[type="email"]', 'admin@primeresidential.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for result
    await page.waitForTimeout(5000);
    
    if (page.url().includes('/dashboard')) {
      console.log('✅ Login successful - Dashboard loaded');
    } else if (errorOccurred) {
      console.log('❌ Login failed with connection error');
    } else {
      console.log('⚠️ Login result unclear');
    }
    
    // Test 2: Login with network throttling
    console.log('\n📍 Test 2: Login with Slow Network');
    console.log('-' .repeat(40));
    
    // Logout first
    await page.goto(`${BASE_URL}/auth`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    
    // Enable network throttling
    await context.route('**/*', async route => {
      // Add 2 second delay to all API requests
      if (route.request().url().includes('/api/')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      await route.continue();
    });
    
    errorOccurred = false;
    await page.fill('input[type="email"]', 'admin@primeresidential.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait longer for slow network
    await page.waitForTimeout(15000);
    
    if (page.url().includes('/dashboard')) {
      console.log('✅ Login successful even with slow network');
    } else if (errorOccurred) {
      console.log('❌ Login failed with connection error on slow network');
    } else {
      console.log('⚠️ Login result unclear');
    }
    
    // Test 3: Check retry behavior
    console.log('\n📍 Test 3: Force Network Failure');
    console.log('-' .repeat(40));
    
    // Clear session
    await page.goto(`${BASE_URL}/auth`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Block API requests to force failure
    await context.unroute('**/*');
    await context.route('**/api/auth/login', route => {
      console.log('🚫 Blocking login request to simulate failure');
      route.abort('failed');
    });
    
    errorOccurred = false;
    await page.fill('input[type="email"]', 'admin@primeresidential.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for retries to complete
    await page.waitForTimeout(10000);
    
    if (errorOccurred) {
      console.log('✅ Error message shown correctly when network fails');
    } else {
      console.log('⚠️ No error message shown despite network failure');
    }
    
    // Final status
    console.log('\n📊 Final Results:');
    const finalUrl = page.url();
    const localStorage = await page.evaluate(() => {
      return {
        hasToken: !!localStorage.getItem('token'),
        hasUser: !!localStorage.getItem('user')
      };
    });
    
    console.log('  Current URL:', finalUrl);
    console.log('  Has Token:', localStorage.hasToken);
    console.log('  Has User:', localStorage.hasUser);
    
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  } finally {
    console.log('\n🔚 Test completed');
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Run the test
testLoginWithRetry().catch(console.error);