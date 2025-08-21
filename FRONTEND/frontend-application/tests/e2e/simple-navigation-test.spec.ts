import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Simple Navigation Test', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    console.log('🔑 Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[placeholder*="email" i]', TEST_CREDENTIALS.email);
    await page.fill('input[placeholder*="password" i]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/dashboard');
    console.log('✅ Login successful');
  });

  test('Direct navigation to pages', async ({ page }) => {
    const pages = [
      { name: 'Dashboard', url: '/dashboard' },
      { name: 'Agents', url: '/agents' },
      { name: 'Leads', url: '/leads' },
      { name: 'Conversations', url: '/conversations' },
      { name: 'Organization', url: '/organization' },
      { name: 'Settings', url: '/settings' },
      { name: 'Analytics', url: '/analytics' }
    ];

    for (const pageInfo of pages) {
      console.log(`🔍 Testing direct navigation to ${pageInfo.name}...`);
      
      // Navigate directly to the page
      await page.goto(`http://localhost:3000${pageInfo.url}`);
      await page.waitForLoadState('networkidle');
      
      // Check if we actually landed on the intended page
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      console.log(`Expected to contain: ${pageInfo.url}`);
      
      if (currentUrl.includes(pageInfo.url)) {
        console.log(`✅ ${pageInfo.name} page accessible via direct URL`);
      } else {
        console.log(`❌ ${pageInfo.name} page redirected to: ${currentUrl}`);
      }
      
      await page.screenshot({ path: `/tmp/${pageInfo.name.toLowerCase()}-direct.png` });
    }
  });

  test('Test sidebar navigation clicks', async ({ page }) => {
    console.log('🧭 Testing sidebar navigation clicks...');
    
    // Test clicking each navigation link
    const navItems = [
      { text: 'Dashboard', expectedUrl: '/dashboard' },
      { text: 'Leads', expectedUrl: '/leads' },
      { text: 'AI Agents', expectedUrl: '/agents' },
      { text: 'Conversations', expectedUrl: '/conversations' },
      { text: 'Organization', expectedUrl: '/organization' }
    ];

    for (const item of navItems) {
      console.log(`🖱️ Clicking on ${item.text}...`);
      
      // Wait for page to be ready
      await page.waitForLoadState('networkidle');
      
      // Find and click the navigation item
      try {
        const navLink = page.locator(`nav a:has-text("${item.text}")`);
        await navLink.click();
        
        // Wait a bit for navigation
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        console.log(`After clicking ${item.text}, URL: ${currentUrl}`);
        
        if (currentUrl.includes(item.expectedUrl)) {
          console.log(`✅ ${item.text} navigation working`);
        } else {
          console.log(`❌ ${item.text} navigation failed - stayed at: ${currentUrl}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not find or click ${item.text} navigation link`);
      }
    }
  });
});