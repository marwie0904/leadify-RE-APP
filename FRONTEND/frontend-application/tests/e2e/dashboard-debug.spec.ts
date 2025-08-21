import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Dashboard Debug Test', () => {
  test('Debug Dashboard Loading Issues', async ({ page }) => {
    let consoleErrors = [];
    let networkErrors = [];
    
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`Console error: ${msg.text()}`);
      }
      if (msg.type() === 'log') {
        console.log(`Console log: ${msg.text()}`);
      }
    });
    
    // Collect network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
        console.log(`Network error: ${response.status()} ${response.url()}`);
      }
    });

    console.log('=== STEP 1: Go to auth page ===');
    await page.goto('/auth');
    await page.waitForTimeout(2000);

    console.log('=== STEP 2: Fill credentials and login ===');
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    console.log('=== STEP 3: Wait for navigation ===');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      console.log('=== STEP 4: Successfully on dashboard page ===');
      
      // Check page title
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Check for loading states
      const loadingElements = await page.locator('.animate-pulse').count();
      console.log(`Loading skeleton elements: ${loadingElements}`);
      
      // Check for actual content
      const statsCards = await page.locator('[data-testid*="stat"], .dashboard-stat, h2:has-text("Dashboard")').count();
      console.log(`Stats/content elements: ${statsCards}`);
      
      // Check if dashboard title is visible
      const dashboardTitle = page.getByRole('heading', { name: 'Dashboard' });
      const titleVisible = await dashboardTitle.isVisible();
      console.log(`Dashboard title visible: ${titleVisible}`);
      
      // Check for refresh button
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      const refreshVisible = await refreshButton.count();
      console.log(`Refresh button count: ${refreshVisible}`);
      
      // Check for error states
      const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').count();
      console.log(`Error messages: ${errorMessages}`);
      
      if (errorMessages > 0) {
        const errorText = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').first().textContent();
        console.log(`Error message text: ${errorText}`);
      }
      
      // Try clicking refresh if available
      if (refreshVisible > 0) {
        console.log('=== STEP 5: Clicking refresh button ===');
        await refreshButton.first().click();
        await page.waitForTimeout(3000);
        
        const newLoadingElements = await page.locator('.animate-pulse').count();
        console.log(`Loading elements after refresh: ${newLoadingElements}`);
      }
      
    } else {
      console.log('❌ Not on dashboard page - login may have failed');
    }

    console.log('=== FINAL SUMMARY ===');
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    
    if (consoleErrors.length > 0) {
      console.log('Console errors found:');
      consoleErrors.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('Network errors found:');
      networkErrors.forEach((error, i) => console.log(`  ${i+1}. ${error}`));
    }
  });
});