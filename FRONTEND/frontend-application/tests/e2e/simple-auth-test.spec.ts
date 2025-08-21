import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Simple Auth Test', () => {
  test('Test login with console logging', async ({ page }) => {
    console.log('🔍 Testing login with detailed logging...');
    
    // Capture all console logs
    page.on('console', msg => {
      console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
    });
    
    // Capture errors
    page.on('pageerror', error => {
      console.log(`[Browser Error] ${error.message}`);
    });
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(3000);
    
    console.log('📝 Filling login form...');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    
    console.log('🔐 Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait longer to see all logs
    await page.waitForTimeout(8000);
    
    // Check final state
    const currentUrl = page.url();
    console.log('🎯 Final URL:', currentUrl);
    
    // Check localStorage
    const authState = await page.evaluate(() => ({
      token: localStorage.getItem('auth_token'),
      user: localStorage.getItem('auth_user')
    }));
    
    console.log('💾 localStorage state:', {
      hasToken: !!authState.token,
      hasUser: !!authState.user
    });
    
    await page.screenshot({ path: '/tmp/simple-auth-test.png' });
  });
});