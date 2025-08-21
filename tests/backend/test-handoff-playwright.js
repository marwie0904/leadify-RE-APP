#!/usr/bin/env node

const playwright = require('playwright');

async function testHandoffInFrontend() {
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Starting handoff test in frontend...\n');

    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check if already logged in or need to login
    const isLoginPage = await page.locator('text="Sign in"').isVisible().catch(() => false);
    
    if (isLoginPage) {
      console.log('🔐 Logging in...');
      
      // Fill in login credentials
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click sign in button
      await page.click('button:has-text("Sign in")');
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Logged in successfully');
    } else {
      console.log('✅ Already logged in');
    }

    // Navigate to conversations
    console.log('\n📬 Navigating to conversations...');
    await page.click('text="Conversations"');
    await page.waitForURL('**/conversations');
    await page.waitForLoadState('networkidle');
    
    // Wait for conversations to load
    await page.waitForSelector('.conversation-item, [data-conversation-id], text="John Pork"', { timeout: 10000 });
    console.log('✅ Conversations page loaded');

    // Find and click on John Pork conversation
    console.log('\n🔍 Looking for John Pork conversation...');
    
    // Try multiple selectors to find John Pork
    const johnPorkSelectors = [
      'text="John Pork"',
      'text=/john.*pork/i',
      ':has-text("John Pork")',
      'div:has-text("John Pork")'
    ];
    
    let conversationFound = false;
    for (const selector of johnPorkSelectors) {
      const element = await page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        console.log('✅ Found John Pork conversation');
        await element.click();
        conversationFound = true;
        break;
      }
    }
    
    if (!conversationFound) {
      throw new Error('Could not find John Pork conversation');
    }

    // Wait for conversation to load
    await page.waitForTimeout(2000);
    
    // Look for the Handoff button
    console.log('\n🔍 Looking for Handoff button...');
    
    const handoffButton = await page.locator('button:has-text("Handoff")').first();
    if (!await handoffButton.isVisible()) {
      throw new Error('Handoff button not found');
    }
    
    console.log('✅ Found Handoff button');
    
    // Click the Handoff button
    console.log('\n🖱️ Clicking Handoff button...');
    await handoffButton.click();
    
    // Wait for dialog to appear
    await page.waitForSelector('text="Request Human Agent"', { timeout: 5000 });
    console.log('✅ Handoff dialog opened');
    
    // Select priority (High)
    console.log('\n📝 Filling handoff form...');
    await page.click('[role="combobox"]');
    await page.click('text="High - Urgent assistance needed"');
    
    // Add reason
    await page.fill('textarea[placeholder*="describe why you need human assistance"]', 'Testing handoff functionality with Playwright');
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'handoff-dialog.png' });
    console.log('📸 Screenshot saved: handoff-dialog.png');
    
    // Click Request Human Agent button
    console.log('\n🚀 Submitting handoff request...');
    await page.click('button:has-text("Request Human Agent")');
    
    // Wait for success message
    try {
      // Wait for either success toast or success message in dialog
      await Promise.race([
        page.waitForSelector('text=/Assigned to|Human agent requested|Request Submitted/i', { timeout: 10000 }),
        page.waitForSelector('[role="status"]:has-text("Human agent")', { timeout: 10000 })
      ]);
      
      console.log('✅ Handoff request successful!');
      
      // Take screenshot of success
      await page.screenshot({ path: 'handoff-success.png' });
      console.log('📸 Screenshot saved: handoff-success.png');
      
      // Wait a bit to see the result
      await page.waitForTimeout(3000);
      
    } catch (error) {
      // Check for error message
      const errorVisible = await page.locator('text=/Failed|Error/i').isVisible().catch(() => false);
      if (errorVisible) {
        const errorText = await page.locator('[role="alert"], text=/Failed|Error/i').first().textContent();
        console.error('❌ Handoff failed:', errorText);
        
        // Take screenshot of error
        await page.screenshot({ path: 'handoff-error.png' });
        console.log('📸 Error screenshot saved: handoff-error.png');
      } else {
        console.error('❌ Handoff request timed out or failed');
      }
      throw error;
    }
    
    console.log('\n✨ Handoff test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ path: 'test-error.png' });
    console.log('📸 Error screenshot saved: test-error.png');
    
    throw error;
  } finally {
    // Keep browser open for 5 seconds to see the result
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);
    
    await browser.close();
    console.log('🔚 Browser closed');
  }
}

// Run the test
if (require.main === module) {
  testHandoffInFrontend()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testHandoffInFrontend };