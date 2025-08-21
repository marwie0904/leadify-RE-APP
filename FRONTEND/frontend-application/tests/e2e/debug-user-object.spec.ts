import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Debug User Object', () => {
  test('Check what user object looks like in backend', async ({ page }) => {
    console.log('🔍 Starting user object debug test...');
    
    // Step 1: Login
    console.log('🔐 Step 1: Login...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Step 2: Get auth token and test various endpoints
    console.log('🔑 Step 2: Getting auth token...');
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
    
    if (authToken) {
      console.log('✅ Found auth token');
      
      // Test the organization/members endpoint to see what we get
      console.log('🔧 Testing /api/organization/members endpoint...');
      const membersResponse = await page.request.get('http://localhost:3001/api/organization/members', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📤 Members API Response Status:', membersResponse.status());
      const membersBody = await membersResponse.json();
      console.log('📤 Members API Response Body:', membersBody);
      
      // Test the profile endpoint
      console.log('🔧 Testing /api/profile endpoint...');
      const profileResponse = await page.request.get('http://localhost:3001/api/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📤 Profile API Response Status:', profileResponse.status());
      const profileBody = await profileResponse.json();
      console.log('📤 Profile API Response Body:', profileBody);
      
      // Test a simple protected endpoint to see user object
      console.log('🔧 Testing /api/protected endpoint...');
      const protectedResponse = await page.request.get('http://localhost:3001/api/protected', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📤 Protected API Response Status:', protectedResponse.status());
      const protectedBody = await protectedResponse.json();
      console.log('📤 Protected API Response Body:', protectedBody);
      
    } else {
      console.log('❌ No auth token found');
    }
  });
});