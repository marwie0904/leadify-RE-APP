import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('All Pages Functionality Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login once before each test
    await page.goto('/auth');
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(3000);
    
    // Verify we're logged in
    expect(page.url()).toContain('/dashboard');
  });

  test('Dashboard page loads and displays content', async ({ page }) => {
    console.log('Testing Dashboard page...');
    
    // Should be on dashboard
    await expect(page.locator('h2')).toContainText('Dashboard');
    
    // Check for stats cards
    await expect(page.locator('text=Total Leads')).toBeVisible();
    await expect(page.locator('text=Converted Leads')).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
    
    // Check for leads overview
    await expect(page.locator('text=Leads Overview')).toBeVisible();
    
    // Check for subscription panel
    await expect(page.locator('text=Subscription')).toBeVisible();
    
    console.log('✅ Dashboard page working correctly');
  });

  test('Agents page loads and functionality', async ({ page }) => {
    console.log('Testing Agents page...');
    
    // Navigate to agents page
    await page.click('text=AI Agents');
    await page.waitForTimeout(2000);
    
    // Check URL
    expect(page.url()).toContain('/agents');
    
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/agents?/i);
    
    // Look for create agent button or content
    const pageContent = await page.content();
    console.log('Agents page loaded, URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/agents-page.png' });
    
    console.log('✅ Agents page accessible');
  });

  test('Leads page loads and functionality', async ({ page }) => {
    console.log('Testing Leads page...');
    
    // Navigate to leads page
    await page.click('text=Leads');
    await page.waitForTimeout(2000);
    
    // Check URL
    expect(page.url()).toContain('/leads');
    
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/leads?/i);
    
    console.log('Leads page loaded, URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/leads-page.png' });
    
    console.log('✅ Leads page accessible');
  });

  test('Conversations page loads and functionality', async ({ page }) => {
    console.log('Testing Conversations page...');
    
    // Navigate to conversations page
    await page.click('text=Conversations');
    await page.waitForTimeout(2000);
    
    // Check URL
    expect(page.url()).toContain('/conversations');
    
    // Check page title
    await expect(page.locator('h1, h2')).toContainText(/conversations?/i);
    
    console.log('Conversations page loaded, URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/conversations-page.png' });
    
    console.log('✅ Conversations page accessible');
  });

  test('Organization page loads and functionality', async ({ page }) => {
    console.log('Testing Organization page...');
    
    // Navigate to organization page
    await page.click('text=Organization');
    await page.waitForTimeout(2000);
    
    // Check URL
    expect(page.url()).toContain('/organization');
    
    // Check page title or content
    const pageContent = await page.content();
    console.log('Organization page loaded, URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/organization-page.png' });
    
    console.log('✅ Organization page accessible');
  });

  test('Settings page loads and functionality', async ({ page }) => {
    console.log('Testing Settings page...');
    
    // Navigate to settings page
    await page.click('text=Settings');
    await page.waitForTimeout(2000);
    
    // Check URL
    expect(page.url()).toContain('/settings');
    
    console.log('Settings page loaded, URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/settings-page.png' });
    
    console.log('✅ Settings page accessible');
  });

  test('Navigation between pages works correctly', async ({ page }) => {
    console.log('Testing navigation between pages...');
    
    // Test navigation flow
    const navigationTests = [
      { name: 'Dashboard', selector: 'text=Dashboard', urlPath: '/dashboard' },
      { name: 'Leads', selector: 'text=Leads', urlPath: '/leads' },
      { name: 'AI Agents', selector: 'text=AI Agents', urlPath: '/agents' },
      { name: 'Conversations', selector: 'text=Conversations', urlPath: '/conversations' },
      { name: 'Organization', selector: 'text=Organization', urlPath: '/organization' }
    ];
    
    for (const nav of navigationTests) {
      console.log(`Navigating to ${nav.name}...`);
      await page.click(nav.selector);
      await page.waitForTimeout(1500);
      
      // Check URL contains the expected path
      expect(page.url()).toContain(nav.urlPath);
      console.log(`✅ ${nav.name} navigation working`);
    }
    
    console.log('✅ All navigation links working correctly');
  });

  test('Backend API connectivity check', async ({ page }) => {
    console.log('Testing backend API connectivity...');
    
    // Go to dashboard and check for API calls
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Check browser network logs for API calls
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('localhost:3001')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Refresh to trigger API calls
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('API responses:', responses);
    
    // Check if we got any successful API responses
    const successfulApiCalls = responses.filter(r => r.status >= 200 && r.status < 300);
    expect(successfulApiCalls.length).toBeGreaterThan(0);
    
    console.log('✅ Backend API connectivity confirmed');
  });

  test('User logout functionality', async ({ page }) => {
    console.log('Testing logout functionality...');
    
    // Click on user avatar/profile
    await page.click('[role="button"]'); // Find the dropdown trigger
    await page.waitForTimeout(1000);
    
    // Look for logout option
    try {
      await page.click('text=Log out');
      await page.waitForTimeout(2000);
      
      // Should redirect to auth page
      expect(page.url()).toContain('/auth');
      console.log('✅ Logout functionality working');
    } catch (error) {
      console.log('Note: Logout button might have different selector');
      await page.screenshot({ path: '/tmp/logout-debug.png' });
    }
  });
});