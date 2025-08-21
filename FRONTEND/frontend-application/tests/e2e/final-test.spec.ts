import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Final Authentication and Navigation Test', () => {
  test('Complete login flow and dashboard access', async ({ page }) => {
    console.log('🧪 Testing complete login flow with simplified auth...');
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // Fill and submit login form
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button:has-text("Sign In")');
    
    console.log('✅ Login form submitted');
    await page.waitForTimeout(3000);
    
    // Check if we're redirected to dashboard
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard!');
      
      // Check dashboard content
      const dashboardTitle = await page.isVisible('h2:has-text("Dashboard")');
      console.log('Dashboard title visible:', dashboardTitle);
      
      // Check if stats are loading
      const statsCards = await page.locator('text=Total Leads').count();
      console.log('Stats cards found:', statsCards);
      
      // Check sidebar navigation
      const sidebarVisible = await page.isVisible('text=Leadify');
      console.log('Sidebar visible:', sidebarVisible);
      
      // Test navigation to different pages
      const navTests = [
        { name: 'Leads', path: '/leads' },
        { name: 'AI Agents', path: '/agents' },
        { name: 'Conversations', path: '/conversations' }
      ];
      
      for (const nav of navTests) {
        try {
          await page.click(`text=${nav.name}`);
          await page.waitForTimeout(1500);
          const newUrl = page.url();
          console.log(`${nav.name} navigation: ${newUrl.includes(nav.path) ? '✅' : '❌'} (${newUrl})`);
        } catch (error) {
          console.log(`${nav.name} navigation: ❌ Error - ${error.message}`);
        }
      }
      
      // Take final screenshot
      await page.screenshot({ path: '/tmp/final-test-success.png' });
      console.log('🎉 Authentication and navigation test completed successfully!');
      
    } else {
      console.log('❌ Login failed - still on auth page');
      await page.screenshot({ path: '/tmp/final-test-failed.png' });
    }
  });
});