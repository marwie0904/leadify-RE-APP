import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Correct Login Test', () => {
  test('Test login with correct submit button', async ({ page }) => {
    console.log('🔍 Testing login with correct submit button...');
    
    // Capture console logs
    page.on('console', msg => {
      if (msg.text().includes('Auth') || msg.text().includes('Simple Auth')) {
        console.log(`[Browser] ${msg.text()}`);
      }
    });
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(3000);
    
    // Fill the form
    console.log('📝 Filling login form...');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    
    // Click the SUBMIT button specifically (not the tab button)
    console.log('🎯 Clicking the submit button (not the tab)...');
    await page.click('button[type="submit"]:has-text("Sign In")');
    
    // Wait for potential redirect
    await page.waitForTimeout(5000);
    
    // Check final state
    const currentUrl = page.url();
    console.log('🏁 Final URL:', currentUrl);
    
    // Check localStorage
    const authState = await page.evaluate(() => ({
      token: localStorage.getItem('auth_token'),
      user: localStorage.getItem('auth_user')
    }));
    
    console.log('💾 Auth state:', {
      hasToken: !!authState.token,
      hasUser: !!authState.user,
      userEmail: authState.user ? JSON.parse(authState.user).email : null
    });
    
    // Check if redirected to dashboard
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Login successful - redirected to dashboard!');
      
      // Check dashboard content
      const dashboardTitle = await page.isVisible('h2:has-text("Dashboard")');
      console.log('📊 Dashboard title visible:', dashboardTitle);
      
    } else {
      console.log('❌ Login failed - still on auth page');
    }
    
    await page.screenshot({ path: '/tmp/correct-login-test.png' });
  });
});