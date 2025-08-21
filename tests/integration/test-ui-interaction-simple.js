#!/usr/bin/env node

/**
 * Simple UI Interaction Test
 * Tests login and basic UI interaction with admin account
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testUIInteraction() {
  console.log('🚀 Starting Simple UI Interaction Test...\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down to see interactions
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to admin login
    console.log('1. Navigating to admin login page...');
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'admin-login-page.png' });
    console.log('   📸 Screenshot: admin-login-page.png');
    
    // Step 2: Fill login form
    console.log('\n2. Filling login credentials...');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: admin123');
    
    await page.fill('input[type="email"]', 'admin@gmail.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Step 3: Submit login
    console.log('\n3. Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    // Check where we are
    const currentUrl = page.url();
    console.log('\n4. Current URL after login:', currentUrl);
    
    if (currentUrl.includes('/admin')) {
      console.log('   ✅ Successfully logged in to admin panel!');
      
      // Take screenshot of admin dashboard
      await page.screenshot({ path: 'admin-dashboard.png' });
      console.log('   📸 Screenshot: admin-dashboard.png');
      
      // Step 5: Navigate to different admin pages
      console.log('\n5. Testing admin navigation...');
      
      // Test Issues page
      console.log('   a. Navigating to Issues...');
      await page.goto(`${BASE_URL}/admin/issues`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-issues.png' });
      console.log('      📸 Screenshot: admin-issues.png');
      
      // Check for "New Issue" button
      const newIssueButton = await page.locator('button:has-text("New Issue"), button:has-text("Create Issue"), button:has-text("Add Issue")').first();
      if (await newIssueButton.isVisible()) {
        console.log('      ✅ Found "New Issue" button');
        await newIssueButton.click();
        await page.waitForTimeout(2000);
        
        // Check if form opened
        const formVisible = await page.locator('form, [role="dialog"], .modal').isVisible();
        if (formVisible) {
          console.log('      ✅ Issue form opened successfully');
          
          // Close the form
          const closeButton = await page.locator('button[aria-label*="close"], button:has-text("Cancel"), button:has-text("Close")').first();
          if (await closeButton.isVisible()) {
            await closeButton.click();
            console.log('      ✅ Form closed');
          }
        }
      } else {
        console.log('      ⚠️ "New Issue" button not found');
      }
      
      // Test Feature Requests page
      console.log('\n   b. Navigating to Feature Requests...');
      await page.goto(`${BASE_URL}/admin/feature-requests`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-feature-requests.png' });
      console.log('      📸 Screenshot: admin-feature-requests.png');
      
      // Check for "New Feature Request" button
      const newFeatureButton = await page.locator('button:has-text("New Feature"), button:has-text("Create Feature"), button:has-text("Add Feature")').first();
      if (await newFeatureButton.isVisible()) {
        console.log('      ✅ Found "New Feature Request" button');
      } else {
        console.log('      ⚠️ "New Feature Request" button not found');
      }
      
      // Test Organizations page
      console.log('\n   c. Navigating to Organizations...');
      await page.goto(`${BASE_URL}/admin/organizations`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-organizations.png' });
      console.log('      📸 Screenshot: admin-organizations.png');
      
      // Test Users page
      console.log('\n   d. Navigating to Users...');
      await page.goto(`${BASE_URL}/admin/users`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-users.png' });
      console.log('      📸 Screenshot: admin-users.png');
      
      // Test AI Analytics page
      console.log('\n   e. Navigating to AI Analytics...');
      await page.goto(`${BASE_URL}/admin/ai-analytics`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-ai-analytics.png' });
      console.log('      📸 Screenshot: admin-ai-analytics.png');
      
      // Test Leadify Team page
      console.log('\n   f. Navigating to Leadify Team...');
      await page.goto(`${BASE_URL}/admin/leadify-team`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-leadify-team.png' });
      console.log('      📸 Screenshot: admin-leadify-team.png');
      
    } else if (currentUrl.includes('/auth')) {
      console.log('   ❌ Still on auth page - login may have failed');
      
      // Check for error message
      const errorMessage = await page.locator('text=/error|invalid|failed/i').first();
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log('   Error message:', errorText);
      }
    } else {
      console.log('   ⚠️ Unexpected redirect to:', currentUrl);
    }
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-error.png' });
    console.log('Error screenshot saved as test-error.png');
  } finally {
    console.log('\n📊 Test Summary:');
    console.log('=====================================');
    console.log('Screenshots saved:');
    console.log('  - admin-login-page.png');
    console.log('  - admin-dashboard.png');
    console.log('  - admin-issues.png');
    console.log('  - admin-feature-requests.png');
    console.log('  - admin-organizations.png');
    console.log('  - admin-users.png');
    console.log('  - admin-ai-analytics.png');
    console.log('  - admin-leadify-team.png');
    console.log('\nBrowser will remain open for 10 seconds for inspection...');
    
    await page.waitForTimeout(10000);
    await browser.close();
    console.log('\n✨ Test completed!');
  }
}

// Run the test
testUIInteraction().catch(console.error);