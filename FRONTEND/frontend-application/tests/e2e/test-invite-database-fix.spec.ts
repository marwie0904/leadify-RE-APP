import { test, expect } from '@playwright/test';

test('Debug and fix database constraint issue with new token', async ({ page }) => {
  console.log('🎯 Testing invite with new token and database fix...');
  
  // Use the new token provided by the user
  const inviteToken = 'ac0995acfbb9c94f4414ae83cf11aabdbfc5471676ed16e1f23a11ca277811a4';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
  console.log('🔍 Step 1: Check backend verification...');
  
  // First test backend verification
  const verifyResponse = await page.request.get(`http://localhost:3001/api/auth/invite/verify?token=${inviteToken}`);
  console.log('📤 Backend verification status:', verifyResponse.status());
  
  if (!verifyResponse.ok()) {
    console.log('❌ Token is invalid/expired. Backend says:', await verifyResponse.text());
    console.log('⚠️ Need to get a fresh token from the organization admin');
    return;
  }
  
  const verifyData = await verifyResponse.json();
  console.log('✅ Backend verification successful:', verifyData);
  
  console.log('🔍 Step 2: Test frontend page...');
  
  // Clear browser state
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
  await page.goto(inviteUrl);
  await page.waitForTimeout(3000);
  
  // Check if form is visible or if there's an error
  const pageContent = await page.textContent('body') || '';
  
  if (pageContent.includes('Invalid Invitation') || pageContent.includes('Invalid or expired invitation link')) {
    console.log('❌ Frontend also shows token as invalid');
    console.log('💡 This means the token has expired or been used');
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: '/tmp/invite-token-invalid.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved showing invalid token state');
    return;
  }
  
  // If form is visible, test the submission
  if (pageContent.includes('Welcome to') && pageContent.includes('First Name')) {
    console.log('✅ Form is visible, testing submission...');
    
    // Fill the form
    await page.getByLabel('First Name').fill('Database');
    await page.getByLabel('Last Name').fill('Fix');
    await page.getByLabel('Create Password').fill('dbfixtest123');
    await page.getByLabel('Confirm Password').fill('dbfixtest123');
    
    console.log('🔍 Step 3: Monitor the database constraint error...');
    
    // Listen for the specific API response
    let apiResponse: any = null;
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth/invite/accept')) {
        apiResponse = {
          status: response.status(),
          statusText: response.statusText(),
          body: await response.text().catch(() => 'Could not read body')
        };
        console.log('📥 API Response:', apiResponse);
      }
    });
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account & Join Organization' }).click();
    await page.waitForTimeout(5000);
    
    // Take screenshot of result
    await page.screenshot({ 
      path: '/tmp/invite-database-error.png',
      fullPage: true 
    });
    
    console.log('📊 Results:');
    if (apiResponse?.status === 500 && apiResponse?.body?.includes('failed to join organization')) {
      console.log('✅ Confirmed: Database constraint issue reproduced');
      console.log('💡 User account is created but organization membership fails');
      console.log('🔧 Root cause: Missing record in public.users table');
    } else if (apiResponse?.status === 200) {
      console.log('🎉 SUCCESS: Database issue has been fixed!');
    } else {
      console.log('⚠️ Unexpected response:', apiResponse);
    }
  } else {
    console.log('❌ Unexpected page state');
    await page.screenshot({ 
      path: '/tmp/invite-unexpected-state.png',
      fullPage: true 
    });
  }
  
  console.log('🏁 Database constraint debugging completed');
});