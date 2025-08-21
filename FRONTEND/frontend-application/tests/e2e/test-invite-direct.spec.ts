import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test('Direct API test: Organization invite with graceful fallback', async ({ page }) => {
  console.log('🎯 Testing organization invite API directly...');
  
  // Step 1: Login to get token
  console.log('📱 Logging in to get authentication token...');
  const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
    data: {
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password
    }
  });
  
  expect(loginResponse.ok()).toBeTruthy();
  const loginData = await loginResponse.json();
  console.log('✅ Login successful, user ID:', loginData.user?.id);
  
  const token = loginData.session?.access_token;
  expect(token).toBeTruthy();
  console.log('🔑 Got authentication token');
  
  // Step 2: Test organization invite API directly
  console.log('🚀 Testing organization invite API...');
  
  const inviteResponse = await page.request.post('http://localhost:3001/api/organization/invite', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      email: 'zarealmarwie@gmail.com'
    }
  });
  
  const inviteData = await inviteResponse.json();
  
  console.log('📤 Invite API Response Status:', inviteResponse.status());
  console.log('📤 Invite API Response Body:', JSON.stringify(inviteData, null, 2));
  
  // Check if invite succeeded
  if (inviteResponse.status() === 200) {
    console.log('🎉 SUCCESS: Organization invite completed successfully!');
    console.log('💌 Invite email should have been sent to zarealmarwie@gmail.com');
    
    // Verify response contains expected success fields
    expect(inviteData.message).toContain('sent');
    
  } else if (inviteResponse.status() === 500) {
    console.log('❌ FAILED: Invite API returned 500 error');
    console.log('📝 Error details:', inviteData);
    
    // Check if this is the specific organization access error we're fixing
    if (inviteData.message?.includes('Failed to get organization details')) {
      console.log('🔍 This is the organization table access issue we are fixing');
      console.log('🚨 Backend still has the old code with failing org query - restart needed?');
    }
    
    throw new Error(`Invite API failed: ${inviteData.message}`);
    
  } else {
    console.log('❌ FAILED: Unexpected response status');
    throw new Error(`Unexpected status: ${inviteResponse.status()}`);
  }
  
  console.log('🏁 Direct organization invite API test completed successfully');
});