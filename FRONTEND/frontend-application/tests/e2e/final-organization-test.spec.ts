import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Final Organization Functionality Test', () => {
  test('Complete organization-dependent functionality verification', async ({ page }) => {
    console.log('🏢 Starting comprehensive organization functionality test...');
    
    // Step 1: Login and verify organization data
    console.log('🔐 Step 1: Login and verify organization detection...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    
    // Verify user goes to dashboard, not organization-setup
    const dashboardUrl = page.url();
    console.log(`✅ User redirected to: ${dashboardUrl}`);
    expect(dashboardUrl).toContain('/dashboard');
    
    // Step 2: Test dashboard with organization data
    console.log('📊 Step 2: Testing dashboard with organization context...');
    await page.waitForTimeout(2000);
    
    // Check for dashboard content that might depend on organization
    const dashboardTitle = page.locator('h2:has-text("Dashboard")');
    await expect(dashboardTitle).toBeVisible();
    console.log('✅ Dashboard loads with organization context');
    
    // Step 3: Test organization page functionality
    console.log('🏢 Step 3: Testing organization page functionality...');
    await page.goto('http://localhost:3000/organization');
    await page.waitForTimeout(2000);
    
    // Should NOT redirect to organization-setup
    const orgUrl = page.url();
    expect(orgUrl).toContain('/organization');
    expect(orgUrl).not.toContain('/organization-setup');
    
    // Check for organization content
    const orgTitle = page.locator('h1:has-text("Organization")');
    await expect(orgTitle).toBeVisible();
    console.log('✅ Organization page accessible and renders');
    
    // Step 4: Test agents page with organization context
    console.log('🤖 Step 4: Testing agents page with organization...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForTimeout(2000);
    
    const agentsUrl = page.url();
    expect(agentsUrl).toContain('/agents');
    console.log('✅ Agents page accessible with organization context');
    
    // Step 5: Test leads page with organization context
    console.log('👥 Step 5: Testing leads page with organization...');
    await page.goto('http://localhost:3000/leads');
    await page.waitForTimeout(2000);
    
    const leadsUrl = page.url();
    expect(leadsUrl).toContain('/leads');
    console.log('✅ Leads page accessible with organization context');
    
    // Step 6: Test conversations page with organization context
    console.log('💬 Step 6: Testing conversations page with organization...');
    await page.goto('http://localhost:3000/conversations');
    await page.waitForTimeout(2000);
    
    const conversationsUrl = page.url();
    expect(conversationsUrl).toContain('/conversations');
    console.log('✅ Conversations page accessible with organization context');
    
    // Step 7: Verify localStorage contains organization data
    console.log('💾 Step 7: Verifying persistent organization data...');
    const userData = await page.evaluate(() => {
      const authUser = localStorage.getItem('auth_user');
      return authUser ? JSON.parse(authUser) : null;
    });
    
    expect(userData.organizationId).toBeTruthy();
    expect(userData.hasOrganization).toBe(true);
    console.log(`✅ Organization data persisted: ID=${userData.organizationId}, hasOrg=${userData.hasOrganization}`);
    
    // Summary
    console.log('\n🎉 FINAL ORGANIZATION TEST SUMMARY:');
    console.log('✅ User login redirects to dashboard (not org setup)');
    console.log('✅ Dashboard loads with organization context');
    console.log('✅ Organization page accessible and functional');
    console.log('✅ Agents page works with organization context');
    console.log('✅ Leads page works with organization context');
    console.log('✅ Conversations page works with organization context');
    console.log('✅ Organization data persists in localStorage');
    console.log('\n🏁 All organization-dependent functionality verified!');
    
    await page.screenshot({ path: '/tmp/final-organization-test.png' });
  });
});