import { test, expect } from '@playwright/test';

test('Complete organization invite flow test', async ({ page }) => {
  console.log('🎯 Testing complete organization invite flow...');
  
  // Test the invite verification endpoint directly
  console.log('🔍 Step 1: Testing invite verification endpoint...');
  
  const verifyResponse = await page.request.get('http://localhost:3001/api/auth/invite/verify?token=197e4eac3754b9ca3b9152480433498e5dd406d645a680a7df30aa7d26bf39a8');
  
  expect(verifyResponse.ok()).toBeTruthy();
  const verifyData = await verifyResponse.json();
  
  console.log('✅ Verification Response:', verifyData);
  
  // Check that invite is valid
  expect(verifyData.valid).toBe(true);
  expect(verifyData.email).toBe('zarealmarwie@gmail.com');
  expect(verifyData.organizationName).toBe('Leadify');
  
  console.log('🎉 SUCCESS: Invite verification endpoint is working correctly!');
  console.log('📋 Invite Details:');
  console.log('   - Email:', verifyData.email);
  console.log('   - Organization:', verifyData.organizationName);
  console.log('   - Valid:', verifyData.valid);
  
  // Test the frontend invite page
  console.log('🌐 Step 2: Testing frontend invite page...');
  
  await page.goto('http://localhost:3000/auth/invite?token=197e4eac3754b9ca3b9152480433498e5dd406d645a680a7df30aa7d26bf39a8');
  
  // Wait for the page to load and process the token
  await page.waitForTimeout(3000);
  
  // Check if the page shows validation success instead of error
  const pageContent = await page.textContent('body');
  console.log('📄 Page content preview:', pageContent?.substring(0, 300) + '...');
  
  // Look for error indicators
  const hasError = pageContent?.includes('Invalid Invitation') || 
                   pageContent?.includes('Failed to verify') ||
                   pageContent?.includes('EXCEPTION');
  
  if (hasError) {
    console.log('❌ Frontend still showing error despite working backend');
    
    // Check browser console for any errors
    const logs = await page.evaluate(() => {
      return (window as any).__consoleLogs || [];
    });
    console.log('🔍 Browser console logs:', logs);
  } else {
    console.log('✅ Frontend appears to be working correctly now');
  }
  
  console.log('🏁 Organization invite flow test completed');
});