import { test, expect } from '@playwright/test';

test('Final invite acceptance test with form submission', async ({ page }) => {
  console.log('🎯 Testing complete invite acceptance flow...');
  
  // Use the token from the user's screenshot
  const inviteToken = '236fe00468397a3dea3c4cab98924d6176cbed106fa96994ba72cac52bd8b4e2';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
  console.log('🔍 Step 1: Clear browser state and ensure logged out...');
  
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
  
  console.log('🔍 Step 2: Test backend verification first...');
  
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
  
  console.log('🌐 Step 3: Test frontend page loading...');
  
  // Navigate to invite page
  console.log('📍 Navigating to:', inviteUrl);
  await page.goto(inviteUrl);
  
  // Wait for page to load and check for JavaScript errors
  await page.waitForTimeout(3000);
  
  // Monitor console errors
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Check if form is visible
  await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('zarealmarwie@gmail.com')).toBeVisible();
  await expect(page.getByLabel('First Name')).toBeVisible();
  await expect(page.getByLabel('Last Name')).toBeVisible();
  await expect(page.getByLabel('Create Password')).toBeVisible();
  
  console.log('✅ Form is visible and ready for testing');
  
  console.log('🔍 Step 4: Fill out the form...');
  
  // Fill the form with test data
  await page.getByLabel('First Name').fill('Test');
  await page.getByLabel('Last Name').fill('User');
  await page.getByLabel('Create Password').fill('testpassword123');
  await page.getByLabel('Confirm Password').fill('testpassword123');
  
  // Take screenshot before submission
  await page.screenshot({ 
    path: '/tmp/invite-form-filled.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved to /tmp/invite-form-filled.png');
  
  console.log('🔍 Step 5: Submit the form and check response...');
  
  // Listen for the API request
  let requestPayload: any = null;
  let responseStatus: number | null = null;
  let responseData: any = null;
  
  page.on('request', (request) => {
    if (request.url().includes('/api/auth/invite/accept')) {
      console.log('📤 Intercepted invite accept request:', request.url());
      requestPayload = request.postDataJSON();
      console.log('📤 Request payload:', {
        ...requestPayload,
        password: requestPayload?.password ? '[HIDDEN]' : undefined,
        confirmPassword: requestPayload?.confirmPassword ? '[HIDDEN]' : undefined
      });
    }
  });
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/invite/accept')) {
      responseStatus = response.status();
      console.log('📥 Response status:', responseStatus);
      try {
        responseData = await response.json();
        console.log('📥 Response data:', responseData);
      } catch (e) {
        console.log('📥 Could not parse response as JSON');
      }
    }
  });
  
  // Submit the form
  await page.getByRole('button', { name: 'Create Account & Join Organization' }).click();
  
  // Wait for the request to complete
  await page.waitForTimeout(5000);
  
  // Take screenshot after submission
  await page.screenshot({ 
    path: '/tmp/invite-form-submitted.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved to /tmp/invite-form-submitted.png');
  
  console.log('🔍 Step 6: Analyze results...');
  
  console.log('📊 Test Results:');
  console.log('   - JavaScript Errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);
  console.log('   - Request Payload Structure:', requestPayload ? 'Captured' : 'Not captured');
  console.log('   - Response Status:', responseStatus || 'Not captured');
  console.log('   - Response Structure:', responseData ? 'Captured' : 'Not captured');
  
  if (responseStatus === 200) {
    console.log('✅ SUCCESS: Invite acceptance worked correctly!');
    // Check for success message
    await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 5000 });
  } else if (responseStatus === 400) {
    console.log('❌ ERROR: Still getting 400 error - backend validation issue');
    console.log('❌ Response:', responseData);
  } else {
    console.log('⚠️ UNKNOWN: Unexpected response status or no response captured');
  }
  
  console.log('🏁 Final invite acceptance test completed');
});