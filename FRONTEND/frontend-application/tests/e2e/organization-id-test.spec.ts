import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Organization ID Test', () => {
  test('Test organization ID retrieval and usage', async ({ page }) => {
    console.log('🔍 Testing organization ID retrieval...');
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const message = msg.text();
      if (message.includes('Simple Auth') || message.includes('organization')) {
        logs.push(message);
        console.log(`[Browser] ${message}`);
      }
    });
    
    // Step 1: Login and check organization data in auth context
    console.log('🔐 Step 1: Logging in and checking auth context...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Step 2: Check user data in localStorage
    console.log('💾 Step 2: Checking user data in localStorage...');
    const userData = await page.evaluate(() => {
      const authUser = localStorage.getItem('auth_user');
      return authUser ? JSON.parse(authUser) : null;
    });
    
    console.log('User data from localStorage:', {
      hasUser: !!userData,
      organizationId: userData?.organizationId,
      hasOrganization: userData?.hasOrganization,
      email: userData?.email
    });
    
    // Step 3: Test dashboard page (should use organization ID)
    console.log('📊 Step 3: Testing dashboard with organization data...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    
    // Step 4: Test organization page access
    console.log('🏢 Step 4: Testing organization page access...');
    await page.goto('http://localhost:3000/organization');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('Organization page URL:', currentUrl);
    
    if (currentUrl.includes('/organization-setup')) {
      console.log('❌ User was redirected to organization setup (no organization)');
    } else if (currentUrl.includes('/organization')) {
      console.log('✅ User can access organization page (has organization)');
    } else {
      console.log('❓ Unexpected redirect:', currentUrl);
    }
    
    // Step 5: Test agents page (requires organization ID)
    console.log('🤖 Step 5: Testing agents page with organization data...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForTimeout(2000);
    
    const agentsUrl = page.url();
    console.log('Agents page URL:', agentsUrl);
    
    // Summary
    console.log('\n📋 ORGANIZATION ID TEST SUMMARY:');
    console.log(`User has organization ID: ${userData?.organizationId ? '✅ Yes (' + userData.organizationId + ')' : '❌ No'}`);
    console.log(`User has organization flag: ${userData?.hasOrganization ? '✅ Yes' : '❌ No'}`);
    console.log(`Organization page access: ${currentUrl.includes('/organization-setup') ? '❌ Redirected to setup' : '✅ Accessible'}`);
    console.log(`Agents page access: ${agentsUrl.includes('/agents') ? '✅ Accessible' : '❌ Redirected'}`);
    
    await page.screenshot({ path: '/tmp/organization-id-test.png' });
  });
});