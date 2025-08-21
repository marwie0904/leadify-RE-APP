#!/usr/bin/env node

/**
 * Admin Panel Data Submission Test
 * Tests actual data submission through admin UI forms
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

const TEST_DATA = {
  issue: {
    title: 'Test Issue - Chat Widget Not Loading',
    description: 'The chat widget fails to load on mobile browsers. Users report blank space where widget should appear. This is a critical issue affecting mobile users.',
    priority: 'high',
    category: 'bug',
    status: 'open'
  },
  featureRequest: {
    title: 'Test Feature - Voice Chat Integration',
    description: 'Add voice chat capability to AI agents for improved accessibility. This would allow users to interact through voice commands and receive audio responses.',
    priority: 'medium',
    category: 'enhancement',
    status: 'pending'
  }
};

async function loginAsAdmin(page) {
  console.log('🔐 Logging in as admin...');
  
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.fill('input[type="email"]', 'admin@gmail.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  if (currentUrl.includes('/admin')) {
    console.log('   ✅ Login successful\n');
    return true;
  }
  console.log('   ❌ Login failed\n');
  return false;
}

async function submitIssue(page) {
  console.log('📝 Submitting Issue through Admin UI...');
  console.log('=====================================');
  
  try {
    // Navigate to issues page
    console.log('1. Navigating to Issues page...');
    await page.goto(`${BASE_URL}/admin/issues`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for any button that might create a new issue
    console.log('2. Looking for create/add button...');
    
    // First, let's see what buttons are available
    const buttons = await page.locator('button').all();
    console.log(`   Found ${buttons.length} buttons on page`);
    
    for (const button of buttons) {
      const text = await button.textContent().catch(() => '');
      const ariaLabel = await button.getAttribute('aria-label').catch(() => '');
      if (text || ariaLabel) {
        console.log(`   - Button: "${text.trim()}" (aria: "${ariaLabel}")`);
      }
    }
    
    // Try to find a button with a plus icon or create/add text
    const createButtons = [
      page.locator('button').filter({ hasText: /add|create|new|report/i }),
      page.locator('button[aria-label*="add"]'),
      page.locator('button[aria-label*="create"]'),
      page.locator('button[aria-label*="new"]'),
      page.locator('button').filter({ has: page.locator('svg') }) // Buttons with icons
    ];
    
    let buttonClicked = false;
    for (const buttonLocator of createButtons) {
      const button = buttonLocator.first();
      if (await button.isVisible()) {
        const buttonText = await button.textContent().catch(() => '');
        console.log(`3. Clicking button: "${buttonText.trim() || 'Icon button'}"...`);
        await button.click();
        buttonClicked = true;
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    if (!buttonClicked) {
      // Try clicking the first visible button
      const firstButton = await page.locator('button').first();
      if (await firstButton.isVisible()) {
        console.log('3. Clicking first available button...');
        await firstButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Check if a form appeared
    const formSelectors = [
      'form',
      '[role="dialog"]',
      '.modal',
      'div[class*="modal"]',
      'div[class*="dialog"]'
    ];
    
    let formFound = false;
    for (const selector of formSelectors) {
      if (await page.locator(selector).isVisible()) {
        console.log(`4. Form detected: ${selector}`);
        formFound = true;
        break;
      }
    }
    
    if (formFound) {
      console.log('5. Filling issue form...');
      
      // Try to fill form fields
      const inputs = await page.locator('input, textarea').all();
      console.log(`   Found ${inputs.length} input fields`);
      
      // Fill first input (likely title)
      if (inputs[0]) {
        await inputs[0].fill(TEST_DATA.issue.title);
        console.log('   ✅ Title filled');
      }
      
      // Fill second input (likely description)
      if (inputs[1]) {
        await inputs[1].fill(TEST_DATA.issue.description);
        console.log('   ✅ Description filled');
      }
      
      // Try to submit
      const submitButtons = [
        page.locator('button[type="submit"]'),
        page.locator('button').filter({ hasText: /submit|save|create|add/i })
      ];
      
      for (const submitButton of submitButtons) {
        if (await submitButton.first().isVisible()) {
          console.log('6. Submitting form...');
          await submitButton.first().click();
          await page.waitForTimeout(3000);
          console.log('   ✅ Form submitted');
          break;
        }
      }
    } else {
      console.log('   ⚠️ No form detected - may need different approach');
    }
    
    // Take screenshot of result
    await page.screenshot({ path: 'issue-submission-result.png' });
    console.log('   📸 Screenshot: issue-submission-result.png\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

async function submitFeatureRequest(page) {
  console.log('💡 Submitting Feature Request through Admin UI...');
  console.log('=====================================');
  
  try {
    // Navigate to feature requests page
    console.log('1. Navigating to Feature Requests page...');
    await page.goto(`${BASE_URL}/admin/feature-requests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Similar approach for feature requests
    console.log('2. Looking for create/add button...');
    
    const buttons = await page.locator('button').all();
    console.log(`   Found ${buttons.length} buttons on page`);
    
    // Try to click any button that might open a form
    const createButtons = [
      page.locator('button').filter({ hasText: /add|create|new|request|feature/i }),
      page.locator('button[aria-label*="add"]'),
      page.locator('button[aria-label*="create"]'),
      page.locator('button').filter({ has: page.locator('svg') })
    ];
    
    for (const buttonLocator of createButtons) {
      const button = buttonLocator.first();
      if (await button.isVisible()) {
        const buttonText = await button.textContent().catch(() => '');
        console.log(`3. Clicking button: "${buttonText.trim() || 'Icon button'}"...`);
        await button.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Check if form appeared
    const formVisible = await page.locator('form, [role="dialog"], .modal').isVisible();
    
    if (formVisible) {
      console.log('4. Form detected');
      console.log('5. Filling feature request form...');
      
      // Fill form fields
      const inputs = await page.locator('input, textarea').all();
      
      if (inputs[0]) {
        await inputs[0].fill(TEST_DATA.featureRequest.title);
        console.log('   ✅ Title filled');
      }
      
      if (inputs[1]) {
        await inputs[1].fill(TEST_DATA.featureRequest.description);
        console.log('   ✅ Description filled');
      }
      
      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")').first();
      if (await submitButton.isVisible()) {
        console.log('6. Submitting form...');
        await submitButton.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Form submitted');
      }
    } else {
      console.log('   ⚠️ No form detected');
    }
    
    await page.screenshot({ path: 'feature-request-submission-result.png' });
    console.log('   📸 Screenshot: feature-request-submission-result.png\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

async function verifySubmissions(page) {
  console.log('🔍 Verifying Submissions...');
  console.log('=====================================');
  
  // Check issues page for submitted issue
  console.log('1. Checking Issues page...');
  await page.goto(`${BASE_URL}/admin/issues`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const issueFound = await page.locator(`text="${TEST_DATA.issue.title}"`).isVisible();
  if (issueFound) {
    console.log('   ✅ Test issue found in list!');
  } else {
    console.log('   ⚠️ Test issue not found in list');
  }
  
  // Check feature requests page
  console.log('\n2. Checking Feature Requests page...');
  await page.goto(`${BASE_URL}/admin/feature-requests`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const featureFound = await page.locator(`text="${TEST_DATA.featureRequest.title}"`).isVisible();
  if (featureFound) {
    console.log('   ✅ Test feature request found in list!');
  } else {
    console.log('   ⚠️ Test feature request not found in list');
  }
  
  return { issueFound, featureFound };
}

async function runTest() {
  console.log('🚀 Admin Panel Data Submission Test');
  console.log('=====================================\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Login
    const loginSuccess = await loginAsAdmin(page);
    if (!loginSuccess) {
      throw new Error('Login failed');
    }
    
    // Submit issue
    await submitIssue(page);
    
    // Submit feature request
    await submitFeatureRequest(page);
    
    // Verify submissions
    const results = await verifySubmissions(page);
    
    // Final report
    console.log('\n📊 TEST RESULTS');
    console.log('=====================================');
    console.log('Admin Login: ✅');
    console.log(`Issue Submission: ${results.issueFound ? '✅' : '❌'}`);
    console.log(`Feature Request Submission: ${results.featureFound ? '✅' : '❌'}`);
    
    if (results.issueFound && results.featureFound) {
      console.log('\n🎉 TEST PASSED! Data successfully submitted through UI');
    } else if (results.issueFound || results.featureFound) {
      console.log('\n⚠️ TEST PARTIALLY PASSED');
    } else {
      console.log('\n❌ TEST FAILED - Data not submitted through UI');
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\nBrowser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('✨ Test completed!');
  }
}

// Run the test
runTest().catch(console.error);