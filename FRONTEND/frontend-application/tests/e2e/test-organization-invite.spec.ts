import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Organization Invite Testing', () => {
  test('Debug organization invite error', async ({ page }) => {
    console.log('🔍 Starting organization invite debug test...');
    
    // Step 1: Login
    console.log('🔐 Step 1: Login...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Step 2: Navigate to organization page
    console.log('🏢 Step 2: Navigate to organization page...');
    await page.goto('http://localhost:3000/organization');
    await page.waitForTimeout(2000);
    
    // Step 3: Try to invite a member - look for invite button
    console.log('👥 Step 3: Looking for invite member functionality...');
    
    // Look for any button that might be the invite button
    const inviteButtons = await page.locator('button').filter({ hasText: /invite|add.*member/i }).all();
    console.log(`Found ${inviteButtons.length} potential invite buttons`);
    
    if (inviteButtons.length > 0) {
      // Click the first invite button
      await inviteButtons[0].click();
      await page.waitForTimeout(1000);
      
      // Look for modal or form
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        console.log('✅ Invite modal opened');
        
        // Fill in the invite form
        await page.fill('input[type="email"]', 'zarealmarwie@gmail.com');
        await page.selectOption('select', 'member'); // or whatever role selector
        
        // Submit the form and capture network requests
        const responsePromise = page.waitForResponse('**/api/organization/invite');
        await page.click('button[type="submit"]');
        
        try {
          const response = await responsePromise;
          const responseBody = await response.json();
          console.log('📤 Invite API Response Status:', response.status());
          console.log('📤 Invite API Response Body:', responseBody);
          
          if (!response.ok()) {
            console.error('❌ Invite failed with error:', responseBody);
          } else {
            console.log('✅ Invite succeeded:', responseBody);
          }
        } catch (error) {
          console.error('❌ Failed to capture invite response:', error);
        }
      } else {
        console.log('❌ No invite modal found');
      }
    } else {
      console.log('❌ No invite button found on organization page');
      
      // Take a screenshot to see what's on the page
      await page.screenshot({ path: '/tmp/organization-page-debug.png' });
      console.log('📸 Screenshot saved to /tmp/organization-page-debug.png');
      
      // Print page content for debugging
      const pageContent = await page.content();
      console.log('📄 Page HTML (first 1000 chars):', pageContent.substring(0, 1000));
    }
    
    // Step 4: Also test the backend API directly
    console.log('🔧 Step 4: Testing backend API directly...');
    
    // Get the auth token from localStorage
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
    
    if (authToken) {
      console.log('🔑 Found auth token, testing API directly...');
      
      const response = await page.request.post('http://localhost:3001/api/organization/invite', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: 'zarealmarwie@gmail.com',
          role: 'member'
        }
      });
      
      console.log('🔗 Direct API Response Status:', response.status());
      const responseBody = await response.json();
      console.log('🔗 Direct API Response Body:', responseBody);
    } else {
      console.log('❌ No auth token found');
    }
    
    await page.screenshot({ path: '/tmp/invite-test-final.png' });
  });
});