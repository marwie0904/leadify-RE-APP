import { test, expect } from '@playwright/test';

test('Debug invite URL with logged out user', async ({ page }) => {
  console.log('🎯 Testing invite URL while logged out...');
  
  const inviteToken = 'fdaba748f1657d93bdfc1f2f796cd092433891976befc790801601beb49971cb';
  const inviteUrl = `http://localhost:3000/auth/invite?token=${inviteToken}`;
  
  console.log('🔒 Step 1: Ensuring user is logged out...');
  
  // Clear all storage to ensure no existing auth
  await page.context().clearCookies();
  
  // Navigate to a simple page first to access storage
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.log('Storage clearing not available');
    }
  });
  
  console.log('✅ User storage cleared');
  
  // First verify the backend verification endpoint is working
  console.log('🔍 Step 2: Testing backend verification endpoint...');
  
  const verifyResponse = await page.request.get(`http://localhost:3001/api/auth/invite/verify?token=${inviteToken}`);
  console.log('📤 Backend response status:', verifyResponse.status());
  
  if (verifyResponse.ok()) {
    const verifyData = await verifyResponse.json();
    console.log('✅ Backend verification successful:', verifyData);
  } else {
    const errorData = await verifyResponse.json().catch(() => ({}));
    console.log('❌ Backend verification failed:', errorData);
  }
  
  console.log('🌐 Step 3: Visiting invite page in browser...');
  
  // Setup console log capture
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const logMessage = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logMessage);
    console.log('🖥️ Browser console:', logMessage);
  });
  
  // Setup network error capture
  const networkErrors: string[] = [];
  page.on('response', response => {
    if (!response.ok()) {
      const error = `${response.status()} ${response.url()}`;
      networkErrors.push(error);
      console.log('🌐 Network error:', error);
    }
  });
  
  // Navigate to the invite page
  await page.goto(inviteUrl);
  
  // Wait for page to load and process
  await page.waitForTimeout(5000);
  
  console.log('📄 Step 4: Analyzing page content...');
  
  // Get page title and content
  const title = await page.title();
  console.log('📋 Page title:', title);
  
  // Check for specific error messages
  const pageText = await page.textContent('body') || '';
  
  // Look for common error indicators
  const errorIndicators = [
    'Invalid Invitation',
    'EXCEPTION',
    'Failed to verify',
    'Error',
    'error',
    'Something went wrong',
    'Not found',
    '404',
    '500'
  ];
  
  const foundErrors = errorIndicators.filter(indicator => 
    pageText.toLowerCase().includes(indicator.toLowerCase())
  );
  
  if (foundErrors.length > 0) {
    console.log('❌ Found error indicators on page:', foundErrors);
    console.log('📝 Page content preview:', pageText.substring(0, 500));
  } else {
    console.log('✅ No obvious errors found on page');
  }
  
  // Check for form elements (should show signup form if working)
  const emailInput = await page.locator('input[type="email"]').count();
  const passwordInput = await page.locator('input[type="password"]').count();
  const nameInput = await page.locator('input[name*="name"], input[placeholder*="name"]').count();
  const submitButton = await page.locator('button[type="submit"], button:has-text("Accept"), button:has-text("Join")').count();
  
  console.log('🔍 Form elements found:');
  console.log('   - Email inputs:', emailInput);
  console.log('   - Password inputs:', passwordInput);
  console.log('   - Name inputs:', nameInput);
  console.log('   - Submit buttons:', submitButton);
  
  if (emailInput > 0 && passwordInput > 0 && submitButton > 0) {
    console.log('✅ Invite form appears to be present');
  } else {
    console.log('❌ Invite form elements missing - page may not be working correctly');
  }
  
  // Check for specific invite details
  const hasEmail = pageText.includes('zarealmarwie@gmail.com');
  const hasOrgName = pageText.includes('Leadify') || pageText.includes('Organization');
  
  console.log('📧 Invite details visibility:');
  console.log('   - Email visible:', hasEmail);
  console.log('   - Organization visible:', hasOrgName);
  
  // Take a screenshot for debugging
  await page.screenshot({ 
    path: '/tmp/invite-page-debug.png',
    fullPage: true 
  });
  console.log('📸 Screenshot saved to /tmp/invite-page-debug.png');
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log('   - Console logs count:', consoleLogs.length);
  console.log('   - Network errors count:', networkErrors.length);
  console.log('   - Error indicators found:', foundErrors.length);
  console.log('   - Form elements working:', emailInput > 0 && passwordInput > 0);
  
  if (consoleLogs.length > 0) {
    console.log('🔍 Recent console logs:', consoleLogs.slice(-5));
  }
  
  if (networkErrors.length > 0) {
    console.log('🌐 Network errors:', networkErrors);
  }
  
  console.log('🏁 Invite URL debug test completed');
});