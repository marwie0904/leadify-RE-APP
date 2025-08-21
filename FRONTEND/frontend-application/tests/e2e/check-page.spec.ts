import { test, expect } from '@playwright/test';

test.describe('Page Check', () => {
  test('Check what is actually on auth page', async ({ page }) => {
    console.log('Going to auth page...');
    
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(3000);
    
    console.log('Current URL:', page.url());
    
    // Take full screenshot
    await page.screenshot({ path: '/tmp/auth-page-check.png', fullPage: true });
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Get all text content
    const pageText = await page.textContent('body');
    console.log('Page contains text (first 500 chars):', pageText?.substring(0, 500));
    
    // Check for specific elements
    const emailInput = await page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email"]').count();
    console.log('Email input count:', emailInput);
    
    const passwordInput = await page.locator('input[type="password"], input[placeholder*="password" i], input[placeholder*="Password"]').count();
    console.log('Password input count:', passwordInput);
    
    // Check for any loading spinners
    const loadingSpinner = await page.locator('.animate-spin, [class*="loading"], [class*="spinner"]').count();
    console.log('Loading spinner count:', loadingSpinner);
    
    // Check for any error messages
    const errorElements = await page.locator('[class*="error"], .text-red, .text-destructive').count();
    console.log('Error element count:', errorElements);
    
    // List all input elements
    const allInputs = await page.locator('input').all();
    console.log('All input elements:');
    for (let i = 0; i < allInputs.length; i++) {
      try {
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const type = await allInputs[i].getAttribute('type');
        const id = await allInputs[i].getAttribute('id');
        console.log(`  Input ${i}: type="${type}", placeholder="${placeholder}", id="${id}"`);
      } catch (error) {
        console.log(`  Input ${i}: Could not get attributes`);
      }
    }
  });
});