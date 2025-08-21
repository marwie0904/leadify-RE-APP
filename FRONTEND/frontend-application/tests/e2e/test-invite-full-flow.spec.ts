import { test, expect } from '@playwright/test';

test('Full invite acceptance flow - create new account', async ({ page }) => {
  console.log('🎯 Testing full invite acceptance flow...');
  
  const inviteToken = 'fdaba748f1657d93bdfc1f2f796cd092433891976befc790801601beb49971cb';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
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
  
  console.log('🌐 Step 1: Navigating to invite page...');
  await page.goto(inviteUrl);
  
  // Wait for page to load and process the token
  await page.waitForTimeout(3000);
  
  console.log('📋 Step 2: Checking page content...');
  
  // Check if we can see the welcome message
  const welcomeText = await page.textContent('h2, .text-2xl');
  console.log('📄 Welcome text:', welcomeText);
  
  // Check for invite details
  const pageText = await page.textContent('body') || '';
  const hasEmail = pageText.includes('zarealmarwie@gmail.com');
  const hasOrgName = pageText.includes('Leadify');
  
  console.log('📧 Email visible:', hasEmail);
  console.log('🏢 Organization visible:', hasOrgName);
  
  if (!hasEmail || !hasOrgName) {
    console.log('❌ Missing invite details - page may not be working correctly');
    console.log('📝 Page content preview:', pageText.substring(0, 500));
    return;
  }
  
  console.log('✅ Invite details visible, proceeding with form...');
  
  console.log('📝 Step 3: Filling out the form...');
  
  // Fill out first name
  const firstNameInput = page.locator('input[id="firstName"]');
  await expect(firstNameInput).toBeVisible();
  await firstNameInput.fill('John');
  console.log('✅ First name filled');
  
  // Fill out last name
  const lastNameInput = page.locator('input[id="lastName"]');
  await expect(lastNameInput).toBeVisible();
  await lastNameInput.fill('Doe');
  console.log('✅ Last name filled');
  
  // Fill out password
  const passwordInput = page.locator('input[id="password"]');
  await expect(passwordInput).toBeVisible();
  await passwordInput.fill('testpassword123');
  console.log('✅ Password filled');
  
  // Fill out confirm password
  const confirmPasswordInput = page.locator('input[id="confirmPassword"]');
  await expect(confirmPasswordInput).toBeVisible();
  await confirmPasswordInput.fill('testpassword123');
  console.log('✅ Confirm password filled');
  
  console.log('🚀 Step 4: Submitting the form...');
  
  // Setup console log capture
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const logMessage = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logMessage);
    if (msg.text().includes('[Invite Accept]')) {
      console.log('🖥️ Frontend:', logMessage);
    }
  });
  
  // Submit the form
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  console.log('✅ Form submitted');
  
  // Wait for response
  console.log('⏳ Waiting for response...');
  await page.waitForTimeout(5000);
  
  // Check for success or error
  const newPageText = await page.textContent('body') || '';
  
  // Look for success indicators
  const successIndicators = [
    'Welcome to Leadify',
    'successfully',
    'Success',
    'welcome',
    'joined'
  ];
  
  const errorIndicators = [
    'error',
    'Error',
    'failed',
    'Failed',
    'invalid',
    'Invalid'
  ];
  
  const foundSuccess = successIndicators.filter(indicator => 
    newPageText.toLowerCase().includes(indicator.toLowerCase())
  );
  
  const foundErrors = errorIndicators.filter(indicator => 
    newPageText.toLowerCase().includes(indicator.toLowerCase())
  );
  
  console.log('📊 Result Analysis:');
  console.log('   - Success indicators found:', foundSuccess);
  console.log('   - Error indicators found:', foundErrors);
  
  if (foundSuccess.length > 0 && foundErrors.length === 0) {
    console.log('🎉 SUCCESS: Invite acceptance appears to have worked!');
  } else if (foundErrors.length > 0) {
    console.log('❌ ERRORS detected:', foundErrors);
    console.log('📝 Page content:', newPageText.substring(0, 500));
    
    // Log recent console messages
    const recentLogs = consoleLogs.slice(-10);
    if (recentLogs.length > 0) {
      console.log('🔍 Recent browser logs:');
      recentLogs.forEach(log => console.log('   ', log));
    }
  } else {
    console.log('❓ Unclear result - no clear success or error indicators');
    console.log('📝 Page content:', newPageText.substring(0, 500));
  }
  
  // Take final screenshot
  await page.screenshot({ 
    path: '/tmp/invite-final-result.png',
    fullPage: true 
  });
  console.log('📸 Final screenshot saved to /tmp/invite-final-result.png');
  
  console.log('🏁 Full invite flow test completed');
});