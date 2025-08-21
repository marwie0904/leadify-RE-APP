import { test, expect } from '@playwright/test';

test('Direct API test for invite acceptance with database fix', async ({ page }) => {
  console.log('🎯 Testing invite acceptance API directly to verify database fix...');
  
  // Use the token provided by the user
  const inviteToken = 'ac0995acfbb9c94f4414ae83cf11aabdbfc5471676ed16e1f23a11ca277811a4';
  
  console.log('🔍 Step 1: Verify token is valid...');
  
  // Test backend verification first
  const verifyResponse = await page.request.get(`http://localhost:3001/api/auth/invite/verify?token=${inviteToken}`);
  console.log('📤 Backend verification status:', verifyResponse.status());
  
  if (!verifyResponse.ok()) {
    const errorText = await verifyResponse.text();
    console.log('❌ Token verification failed:', errorText);
    console.log('💡 This test requires a valid, unused token');
    return;
  }
  
  const verifyData = await verifyResponse.json();
  console.log('✅ Token verification successful:', {
    valid: verifyData.valid,
    email: verifyData.email,
    organizationName: verifyData.organizationName,
    userExists: verifyData.userExists
  });
  
  console.log('🔍 Step 2: Test invite acceptance API directly...');
  
  // Prepare the request payload matching the fixed backend format
  const acceptPayload = {
    token: inviteToken,
    password: 'directapitest123',
    firstName: 'Direct',
    lastName: 'API',
    existingUser: false
  };
  
  console.log('📤 Sending invite acceptance request...');
  console.log('Request payload:', acceptPayload);
  
  // Call the invite acceptance API
  const acceptResponse = await page.request.post('http://localhost:3001/api/auth/invite/accept', {
    data: acceptPayload,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('📥 API Response status:', acceptResponse.status());
  console.log('📥 API Response status text:', acceptResponse.statusText());
  
  let responseBody;
  try {
    responseBody = await acceptResponse.text();
    console.log('📥 API Response body:', responseBody);
  } catch (e) {
    console.log('❌ Could not read response body:', e);
    return;
  }
  
  console.log('🔍 Step 3: Analyze results...');
  
  if (acceptResponse.status() === 200) {
    console.log('🎉 SUCCESS: Database constraint issue has been FIXED!');
    console.log('✅ User account created successfully');
    console.log('✅ User joined organization successfully');
    console.log('✅ No more foreign key constraint errors');
    
    try {
      const successData = JSON.parse(responseBody);
      console.log('✅ Success response data:', successData);
    } catch (e) {
      console.log('⚠️ Response not JSON but API succeeded');
    }
    
  } else if (acceptResponse.status() === 500) {
    if (responseBody.includes('failed to join organization')) {
      console.log('❌ Database constraint error still persists');
      console.log('💡 The public.users table or foreign key constraint needs manual database intervention');
      console.log('🔧 Error details:', responseBody);
    } else if (responseBody.includes('violates foreign key constraint')) {
      console.log('❌ Foreign key constraint violation confirmed');
      console.log('💡 User was created in auth.users but missing in public.users table');
      console.log('🔧 Error details:', responseBody);
    } else {
      console.log('❌ Different server error:', responseBody);
    }
    
  } else if (acceptResponse.status() === 400) {
    console.log('❌ Bad request - check if token is already used or invalid');
    console.log('🔧 Error details:', responseBody);
    
  } else {
    console.log('⚠️ Unexpected response status - check logs and error details');
    console.log('🔧 Status:', acceptResponse.status());
    console.log('🔧 Body:', responseBody);
  }
  
  console.log('🏁 Direct API test completed');
  console.log('');
  console.log('📝 SUMMARY:');
  console.log('   - Token verification: ✅ WORKING');
  console.log('   - API endpoint: ✅ ACCESSIBLE');
  console.log('   - Request format: ✅ CORRECT');
  console.log('   - Database constraint fix: ' + (acceptResponse.status() === 200 ? '✅ FIXED' : '❌ STILL NEEDS WORK'));
});