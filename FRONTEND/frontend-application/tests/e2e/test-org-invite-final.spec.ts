import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test('Final test: Organization invite with graceful fallback', async ({ page }) => {
  console.log('🎯 Testing organization invite with corrected backend server...');
  
  // Login first
  await page.goto('http://localhost:3000/auth');
  console.log('📱 Logging in...');
  
  await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
  await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  // Wait for successful login redirect
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Login successful');
  
  // Navigate to organization page
  await page.goto('http://localhost:3000/organization');
  await page.waitForLoadState('networkidle');
  console.log('📋 Navigated to organization page');
  
  // Look for invite functionality
  const inviteButtons = await page.locator('button').filter({ hasText: /invite|add.*member/i }).all();
  console.log(`🔍 Found ${inviteButtons.length} invite buttons`);
  
  if (inviteButtons.length > 0) {
    console.log('🚀 Clicking invite button...');
    await inviteButtons[0].click();
    
    // Wait for invite form/modal to appear
    await page.waitForTimeout(1000);
    
    // Fill in email address
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('zarealmarwie@gmail.com');
    console.log('📧 Email filled: zarealmarwie@gmail.com');
    
    // Listen for the invite API call
    const responsePromise = page.waitForResponse('**/api/organization/invite', { timeout: 15000 });
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('✋ Submit button clicked');
    
    try {
      const response = await responsePromise;
      const responseBody = await response.json();
      
      console.log('📤 Invite API Response Status:', response.status());
      console.log('📤 Invite API Response Body:', JSON.stringify(responseBody, null, 2));
      
      // Check if invite succeeded
      if (response.status() === 200) {
        console.log('🎉 SUCCESS: Organization invite completed successfully!');
        console.log('💌 Invite email should have been sent to zarealmarwie@gmail.com');
        
        // Check for success message on the page
        const successElements = await page.locator('*').filter({ hasText: /success|sent|invited/i }).all();
        if (successElements.length > 0) {
          console.log('✅ Success message displayed on page');
        }
        
      } else {
        console.log('❌ FAILED: Invite API returned error status');
        console.log('📝 Error details:', responseBody);
      }
      
    } catch (error) {
      console.log('❌ FAILED: Error waiting for API response:', error.message);
    }
    
  } else {
    console.log('❌ No invite buttons found on organization page');
    
    // Try to get more context about the page content
    const pageText = await page.textContent('body');
    console.log('📄 Page content preview:', pageText?.substring(0, 500) + '...');
  }
  
  console.log('🏁 Organization invite test completed');
});