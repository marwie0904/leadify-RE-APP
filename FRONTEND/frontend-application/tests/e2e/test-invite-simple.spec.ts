import { test, expect } from '@playwright/test';

test('Simple invite test with latest token', async ({ page }) => {
  console.log('🎯 Testing invite with latest token...');
  
  // Use the most recent token from backend logs
  const inviteToken = 'bf1535e0613559ab99462ff442a0a99b11704a9eba84b5538c81f7d96dd8f7f8';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
  console.log('🔍 Step 1: Test backend verification first...');
  
  // Test backend directly first
  const verifyResponse = await page.request.get(`http://localhost:3001/api/auth/invite/verify?token=${inviteToken}`);
  console.log('📤 Backend verification status:', verifyResponse.status());
  
  if (verifyResponse.ok()) {
    const verifyData = await verifyResponse.json();
    console.log('✅ Backend verification:', verifyData);
  } else {
    console.log('❌ Backend verification failed');
    const errorData = await verifyResponse.json().catch(() => ({}));
    console.log('❌ Error data:', errorData);
    return;
  }
  
  console.log('🌐 Step 2: Test frontend page...');
  
  // Clear any existing auth
  await page.context().clearCookies();
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.log('Storage clearing not available');
    }
  });
  
  // Navigate to invite page
  console.log('📍 Navigating to:', inviteUrl);
  await page.goto(inviteUrl);
  
  // Wait for page to load
  await page.waitForTimeout(3000);
  
  // Check page status
  const pageText = await page.textContent('body') || '';
  const hasEmail = pageText.includes('zarealmarwie@gmail.com');
  const hasOrgName = pageText.includes('Leadify');
  const hasForm = pageText.includes('First Name') || pageText.includes('Password');
  
  console.log('📊 Page Analysis:');
  console.log('   - Email visible:', hasEmail);
  console.log('   - Organization visible:', hasOrgName);
  console.log('   - Form visible:', hasForm);
  
  if (!hasForm) {
    console.log('❌ Form not visible, checking for errors...');
    const hasError = pageText.includes('Invalid') || pageText.includes('error') || pageText.includes('Error');
    console.log('   - Error detected:', hasError);
    if (hasError) {
      console.log('📝 Page content sample:', pageText.substring(0, 300));
    }
  } else {
    console.log('✅ Form is visible and ready for testing');
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: '/tmp/invite-simple-test.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved to /tmp/invite-simple-test.png');
  
  console.log('🏁 Simple invite test completed');
});