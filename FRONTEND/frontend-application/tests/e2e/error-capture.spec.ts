import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Error Capture Test', () => {
  test('Capture all JavaScript errors and form submission issues', async ({ page }) => {
    console.log('🔍 Testing for JavaScript errors during login...');
    
    const errors = [];
    const consoleMessages = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const message = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(message);
      console.log(`[Browser Console] ${message}`);
    });
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      const errorMessage = `${error.name}: ${error.message}`;
      errors.push(errorMessage);
      console.log(`[JavaScript Error] ${errorMessage}`);
      console.log(`[Stack] ${error.stack}`);
    });
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(3000);
    
    console.log('📋 Page loaded, checking for initial errors...');
    console.log(`Initial errors: ${errors.length}`);
    console.log(`Initial console messages: ${consoleMessages.length}`);
    
    // Check if the form elements exist
    const emailInput = await page.locator('input[placeholder*="email" i]');
    const passwordInput = await page.locator('input[placeholder*="password" i]');
    const signInButton = await page.locator('button:has-text("Sign In")');
    
    console.log('📝 Form elements check:', {
      emailExists: await emailInput.count() > 0,
      passwordExists: await passwordInput.count() > 0,
      buttonExists: await signInButton.count() > 0
    });
    
    // Fill the form
    console.log('✏️ Filling form...');
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);
    
    console.log('📧 Form filled, clicking submit...');
    
    // Try to click the submit button and monitor for errors
    await signInButton.click();
    await page.waitForTimeout(5000);
    
    console.log('📊 Final error summary:');
    console.log(`Total JavaScript errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    console.log(`Total console messages: ${consoleMessages.length}`);
    const relevantMessages = consoleMessages.filter(msg => 
      msg.includes('Auth') || msg.includes('Error') || msg.includes('error')
    );
    if (relevantMessages.length > 0) {
      console.log('Relevant console messages:');
      relevantMessages.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
    }
    
    await page.screenshot({ path: '/tmp/error-capture.png' });
  });
});