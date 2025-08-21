import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Auth Debug Test', () => {
  test('Debug authentication state and console logs', async ({ page }) => {
    console.log('🔍 Debugging authentication state...');
    
    // Listen to console logs
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Simple Auth')) {
        console.log(`[Browser Console] ${msg.text()}`);
      }
    });
    
    // Listen to errors
    page.on('pageerror', error => {
      console.log(`[Browser Error] ${error.message}`);
    });
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    console.log('📍 On auth page, filling credentials...');
    
    // Fill and submit form
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    
    console.log('🚀 Submitting login form...');
    await page.click('button:has-text("Sign In")');
    
    // Wait and check what happens
    await page.waitForTimeout(5000);
    
    // Check localStorage to see if auth data was saved
    const authData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('auth_token'),
        user: localStorage.getItem('auth_user'),
        url: window.location.href
      };
    });
    
    console.log('📊 Auth state after login:', {
      hasToken: !!authData.token,
      hasUser: !!authData.user,
      currentUrl: authData.url,
      userEmail: authData.user ? JSON.parse(authData.user).email : null
    });
    
    // Check if redirect happened
    const finalUrl = page.url();
    console.log('🎯 Final URL:', finalUrl);
    
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Redirect to dashboard successful!');
    } else if (finalUrl.includes('/auth')) {
      console.log('❌ Still on auth page - checking why...');
      
      // Check if there are any visible error messages
      const errorMessages = await page.locator('.text-red, .text-destructive, [class*="error"]').allTextContents();
      console.log('Error messages on page:', errorMessages);
      
      // Check auth page state
      const pageState = await page.evaluate(() => {
        // Try to access the React component state
        return {
          bodyText: document.body.textContent?.includes('Welcome to Leadify'),
          hasForm: !!document.querySelector('form'),
          hasSignInButton: !!document.querySelector('button:contains("Sign In")')
        };
      });
      console.log('Auth page state:', pageState);
      
    } else {
      console.log('🤔 Redirected to unexpected page:', finalUrl);
    }
    
    await page.screenshot({ path: '/tmp/auth-debug.png', fullPage: true });
  });
});