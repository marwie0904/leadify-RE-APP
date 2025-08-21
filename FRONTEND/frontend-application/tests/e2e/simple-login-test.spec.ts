import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Simple Login Test', () => {
  test('Login with simplified auth and check dashboard', async ({ page }) => {
    console.log('Testing login with simplified auth...');
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // Take screenshot of auth page
    await page.screenshot({ path: '/tmp/auth-page.png' });
    
    // Fill login form
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    console.log('Login form submitted, waiting for response...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Take screenshot to see what happened
    await page.screenshot({ path: '/tmp/after-login.png', fullPage: true });
    
    // Check if we're on dashboard or still on auth
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard!');
      
      // Check if dashboard content is visible
      const dashboardTitle = await page.locator('h2:has-text("Dashboard")').isVisible();
      console.log('Dashboard title visible:', dashboardTitle);
      
      // Check if sidebar is visible
      const sidebarVisible = await page.locator('text=Leadify').isVisible();
      console.log('Sidebar visible:', sidebarVisible);
      
      // Check if stats cards are visible
      const statsVisible = await page.locator('text=Total Leads').isVisible();
      console.log('Stats cards visible:', statsVisible);
      
    } else if (currentUrl.includes('/auth')) {
      console.log('❌ Still on auth page - login may have failed');
      
      // Check for error messages
      const pageText = await page.textContent('body');
      console.log('Page contains error?', pageText?.includes('error') || pageText?.includes('Error'));
      
    } else {
      console.log('? Redirected to unexpected page:', currentUrl);
    }
    
    // Check console for any errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
  });
  
  test('Test navigation after login', async ({ page }) => {
    console.log('Testing navigation after simplified login...');
    
    // Login first
    await page.goto('http://localhost:3000/auth');
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(5000);
    
    // If we're on dashboard, test navigation
    if (page.url().includes('/dashboard')) {
      console.log('On dashboard, testing navigation...');
      
      // Test clicking on different nav items
      const navItems = ['Leads', 'AI Agents', 'Conversations', 'Organization'];
      
      for (const item of navItems) {
        try {
          console.log(`Clicking on: ${item}`);
          await page.click(`text=${item}`);
          await page.waitForTimeout(2000);
          
          const newUrl = page.url();
          console.log(`After clicking ${item}, URL: ${newUrl}`);
          
          // Take screenshot
          await page.screenshot({ path: `/tmp/nav-${item.toLowerCase().replace(' ', '-')}.png` });
          
        } catch (error) {
          console.log(`Failed to click ${item}:`, error.message);
        }
      }
    } else {
      console.log('Not on dashboard, cannot test navigation');
    }
  });
});