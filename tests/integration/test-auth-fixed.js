#!/usr/bin/env node

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Test different accounts
const TEST_ACCOUNTS = [
  { email: 'admin@primeresidential.com', password: 'TestPassword123!' },
  { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD }
];

async function testAuthFixed() {
  console.log('🔐 FIXED AUTH TEST');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  for (const account of TEST_ACCOUNTS) {
    if (!account.email || !account.password) continue;
    
    console.log(`\nTesting with: ${account.email}`);
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // Clear storage to ensure clean slate
      storageState: undefined
    });
    
    // Clear any existing auth data
    await context.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to auth page
      console.log('📍 Navigating to auth page...');
      await page.goto(`${BASE_URL}/auth`);
      
      // Wait for the auth check to complete
      console.log('  ⏳ Waiting for auth check to complete...');
      
      // Wait for either the login form or redirect
      const result = await Promise.race([
        // Wait for login form elements
        page.waitForSelector('input[type="email"]', { timeout: 10000 }).then(() => 'form'),
        // Wait for redirect away from auth
        page.waitForFunction(() => !window.location.pathname.includes('/auth'), { timeout: 10000 }).then(() => 'redirect'),
        // Wait for "Checking authentication..." to disappear
        page.waitForFunction(() => {
          const text = document.body.innerText;
          return !text.includes('Checking authentication') && !text.includes('Loading');
        }, { timeout: 10000 }).then(() => 'loaded')
      ]).catch(() => 'timeout');
      
      console.log(`  Result: ${result}`);
      
      // Take screenshot
      await page.screenshot({ path: `auth-fixed-${Date.now()}.png` });
      
      const currentUrl = page.url();
      console.log(`  Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/organization')) {
        console.log('  ✅ Already authenticated, redirected successfully');
        await context.close();
        continue;
      }
      
      // If we're still on auth page, wait a bit more for form to render
      if (currentUrl.includes('/auth')) {
        console.log('  📝 Still on auth page, waiting for form...');
        
        // Additional wait for client-side rendering
        await page.waitForTimeout(3000);
        
        // Try to find the Sign In tab
        const signInTab = await page.locator('text="Sign In"').first();
        if (await signInTab.isVisible().catch(() => false)) {
          console.log('  ✅ Found Sign In tab');
          await signInTab.click();
          await page.waitForTimeout(1000);
        }
        
        // Look for email input
        const emailInput = await page.locator('input[type="email"]').first();
        const emailVisible = await emailInput.isVisible().catch(() => false);
        console.log(`  Email input visible: ${emailVisible}`);
        
        if (emailVisible) {
          // Look for password input
          const passwordInput = await page.locator('input[type="password"]').first();
          const passwordVisible = await passwordInput.isVisible().catch(() => false);
          console.log(`  Password input visible: ${passwordVisible}`);
          
          if (passwordVisible) {
            console.log('\n🔐 Attempting login...');
            
            // Fill credentials
            await emailInput.fill(account.email);
            await passwordInput.fill(account.password);
            console.log('  ✅ Filled credentials');
            
            // Take screenshot before submit
            await page.screenshot({ path: `auth-fixed-filled-${Date.now()}.png` });
            
            // Find and click submit button
            const submitButton = await page.locator('button:has-text("Sign In"), button:has-text("Sign in")').first();
            if (await submitButton.isVisible()) {
              await submitButton.click();
              console.log('  ✅ Clicked submit button');
            } else {
              await passwordInput.press('Enter');
              console.log('  ✅ Pressed Enter to submit');
            }
            
            // Wait for navigation or error
            await page.waitForTimeout(5000);
            
            const newUrl = page.url();
            console.log(`  After login URL: ${newUrl}`);
            
            if (!newUrl.includes('/auth')) {
              console.log('  ✅ Login successful!');
              await page.screenshot({ path: `auth-fixed-success-${Date.now()}.png` });
              
              // Navigate to agents page
              console.log('\n🤖 Testing navigation to agents...');
              await page.goto(`${BASE_URL}/agents`);
              await page.waitForLoadState('networkidle');
              await page.waitForTimeout(3000);
              
              const agentsUrl = page.url();
              if (agentsUrl.includes('/agents')) {
                console.log('  ✅ Successfully navigated to agents page');
                
                // Check page content
                const pageText = await page.locator('body').innerText();
                if (pageText.includes('ResidentialBot')) console.log('    ✅ Found ResidentialBot');
                if (pageText.includes('CommercialAssist')) console.log('    ✅ Found CommercialAssist');
                if (pageText.includes('Chat')) console.log('    ✅ Found Chat functionality');
                
                await page.screenshot({ path: `auth-fixed-agents-${Date.now()}.png` });
                
                // Success - this account works!
                console.log(`\n✅ SUCCESS with account: ${account.email}`);
                await context.close();
                await browser.close();
                return true;
              }
            } else {
              console.log('  ❌ Login failed - still on auth page');
              
              // Check for error messages
              const errorText = await page.locator('text=/error|invalid|incorrect/i').first();
              if (await errorText.isVisible().catch(() => false)) {
                const error = await errorText.textContent();
                console.log(`  Error: ${error}`);
              }
            }
          }
        } else {
          console.log('  ❌ Login form not found after waiting');
          
          // Debug: Check what's on the page
          const bodyText = await page.locator('body').innerText();
          if (bodyText.includes('Checking authentication')) {
            console.log('  ⚠️  Still showing "Checking authentication"');
          }
          if (bodyText.includes('Redirecting')) {
            console.log('  ⚠️  Showing "Redirecting" message');
          }
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  console.log('\n' + '=' .repeat(60));
  console.log('Test complete. Check screenshots: auth-fixed-*.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  testAuthFixed()
    .then(() => {
      console.log('\n✅ Test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}