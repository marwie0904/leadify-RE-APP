#!/usr/bin/env node

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testSimpleLogin() {
  console.log('🔐 SIMPLE LOGIN TEST');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Test with admin@primeresidential.com
    const account = {
      email: 'admin@primeresidential.com',
      password: 'TestPassword123!'
    };
    
    console.log(`\nTesting login for: ${account.email}`);
    
    // Navigate to auth page
    console.log('📍 Going to auth page...');
    await page.goto(`${BASE_URL}/auth`);
    console.log('  Waiting for page to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Extra wait for client-side rendering
    
    // Take screenshot to see what's on the page
    await page.screenshot({ path: 'simple-login-01-auth-page.png', fullPage: true });
    console.log('  ✅ Screenshot saved: simple-login-01-auth-page.png');
    
    // Check URL
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);
    
    // Check page content
    const pageText = await page.locator('body').innerText();
    console.log('\n📝 Page content analysis:');
    
    if (pageText.includes('Sign')) console.log('  ✅ Found "Sign" text');
    if (pageText.includes('Login')) console.log('  ✅ Found "Login" text');
    if (pageText.includes('Email')) console.log('  ✅ Found "Email" text');
    if (pageText.includes('Password')) console.log('  ✅ Found "Password" text');
    
    // Count all input elements
    const allInputs = await page.locator('input').count();
    console.log(`  Found ${allInputs} input elements total`);
    
    // Try to find tabs
    console.log('\n🔍 Looking for tabs...');
    const tabs = await page.locator('[role="tab"], button:has-text("Sign")').all();
    console.log(`  Found ${tabs.length} tab elements`);
    
    for (const tab of tabs) {
      const text = await tab.innerText().catch(() => '');
      if (text) {
        console.log(`    - Tab: "${text}"`);
        
        // Click Sign In tab if found
        if (text.toLowerCase().includes('sign in')) {
          await tab.click();
          console.log('    ✅ Clicked Sign In tab');
          await page.waitForTimeout(2000);
          break;
        }
      }
    }
    
    // Look for email input with multiple strategies
    console.log('\n🔍 Looking for email input...');
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input:below(:text("Email"))'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        const input = await page.locator(selector).first();
        if (await input.isVisible()) {
          emailInput = input;
          console.log(`  ✅ Found email input with: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    // Look for password input
    console.log('\n🔍 Looking for password input...');
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="Password" i]',
      'input:below(:text("Password"))'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        const input = await page.locator(selector).first();
        if (await input.isVisible()) {
          passwordInput = input;
          console.log(`  ✅ Found password input with: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    // If we found both inputs, try to login
    if (emailInput && passwordInput) {
      console.log('\n🔐 Attempting login...');
      
      await emailInput.clear();
      await emailInput.fill(account.email);
      console.log('  ✅ Filled email');
      
      await passwordInput.clear();
      await passwordInput.fill(account.password);
      console.log('  ✅ Filled password');
      
      // Take screenshot before submitting
      await page.screenshot({ path: 'simple-login-02-filled-form.png' });
      console.log('  ✅ Screenshot saved: simple-login-02-filled-form.png');
      
      // Find submit button
      const submitSelectors = [
        'button:has-text("Sign in")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'button:has-text("Log in")',
        'button[type="submit"]',
        'input[type="submit"]'
      ];
      
      let submitted = false;
      for (const selector of submitSelectors) {
        const button = await page.locator(selector).first();
        if (await button.isVisible()) {
          console.log(`  ✅ Found submit button: ${selector}`);
          await button.click();
          submitted = true;
          break;
        }
      }
      
      if (!submitted) {
        console.log('  ⚠️  No submit button found, pressing Enter');
        await passwordInput.press('Enter');
      }
      
      console.log('  ⏳ Waiting for navigation...');
      await page.waitForTimeout(7000);
      
      const newUrl = page.url();
      console.log(`\n📍 After login URL: ${newUrl}`);
      
      if (!newUrl.includes('/auth')) {
        console.log('  ✅ Successfully logged in!');
        await page.screenshot({ path: 'simple-login-03-after-login.png', fullPage: true });
        
        // Check what's on the page
        const loggedInText = await page.locator('body').innerText();
        if (loggedInText.includes('Dashboard')) console.log('    ✅ Found Dashboard');
        if (loggedInText.includes('Agents')) console.log('    ✅ Found Agents');
        if (loggedInText.includes('Conversations')) console.log('    ✅ Found Conversations');
        if (loggedInText.includes('ResidentialBot')) console.log('    ✅ Found ResidentialBot');
      } else {
        console.log('  ❌ Still on auth page - login may have failed');
        
        // Check for error messages
        const errorText = await page.locator('text=/error|invalid|incorrect/i').first();
        if (await errorText.isVisible()) {
          const error = await errorText.textContent();
          console.log(`  Error message: ${error}`);
        }
      }
      
    } else {
      console.log('\n❌ Could not find login form inputs');
      console.log('  Email input found:', !!emailInput);
      console.log('  Password input found:', !!passwordInput);
      
      // Try to understand why
      console.log('\n📊 Page structure analysis:');
      const forms = await page.locator('form').count();
      console.log(`  Forms on page: ${forms}`);
      
      const buttons = await page.locator('button').count();
      console.log(`  Buttons on page: ${buttons}`);
      
      // List all visible inputs
      const visibleInputs = await page.locator('input:visible').all();
      console.log(`  Visible inputs: ${visibleInputs.length}`);
      for (let i = 0; i < Math.min(5, visibleInputs.length); i++) {
        const type = await visibleInputs[i].getAttribute('type');
        const placeholder = await visibleInputs[i].getAttribute('placeholder');
        console.log(`    - Input ${i + 1}: type="${type}", placeholder="${placeholder}"`);
      }
    }
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Test complete. Check screenshots: simple-login-*.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  testSimpleLogin()
    .then(() => {
      console.log('\n✅ Test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}