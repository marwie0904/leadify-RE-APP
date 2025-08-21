import { test, expect } from '@playwright/test';

test('Debug invite acceptance with detailed logging', async ({ page }) => {
  console.log('🎯 Testing invite acceptance with debug logging...');
  
  // Use the token from the user's screenshot
  const inviteToken = '236fe00468397a3dea3c4cab98924d6176cbed106fa96994ba72cac52bd8b4e2';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
  console.log('🔍 Step 1: Clear browser state...');
  
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
  
  console.log('🔍 Step 2: Navigate to invite page...');
  
  // Navigate to invite page
  await page.goto(inviteUrl);
  await page.waitForTimeout(3000);
  
  // Verify form is visible
  await expect(page.getByText('Welcome to')).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('First Name')).toBeVisible();
  
  console.log('🔍 Step 3: Fill form...');
  
  // Fill the form with test data
  await page.getByLabel('First Name').fill('Debug');
  await page.getByLabel('Last Name').fill('Test');
  await page.getByLabel('Create Password').fill('debugtest123');
  await page.getByLabel('Confirm Password').fill('debugtest123');
  
  console.log('🔍 Step 4: Submit and analyze...');
  
  // Listen for API responses
  let responseDetails: any = null;
  page.on('response', async (response) => {
    if (response.url().includes('/api/auth/invite/accept')) {
      responseDetails = {
        status: response.status(),
        statusText: response.statusText(),
        headers: Object.fromEntries(response.headers()),
        body: await response.text().catch(() => 'Could not read body')
      };
      console.log('📥 Complete response details:', responseDetails);
    }
  });
  
  // Submit form
  await page.getByRole('button', { name: 'Create Account & Join Organization' }).click();
  
  // Wait for response
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ 
    path: '/tmp/invite-debug-final.png',
    fullPage: true 
  });
  
  console.log('📊 Final Results:');
  console.log('   - Response Details:', responseDetails);
  
  if (responseDetails?.status === 200) {
    console.log('✅ SUCCESS: Invite acceptance worked!');
  } else {
    console.log('❌ FAILED: Status', responseDetails?.status);
    console.log('❌ Body:', responseDetails?.body);
  }
});