/**
 * Test user statistics from browser context
 * This simulates what the frontend is doing
 */

const { chromium } = require('playwright');

async function testStatsInBrowser() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:3000/login');
  
  // Login with admin credentials
  console.log('2. Logging in as admin...');
  await page.fill('input[type="email"]', 'marwryyy@gmail.com');
  await page.fill('input[type="password"]', 'abcd');
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('3. Successfully logged in');

  // Navigate to admin users page
  console.log('4. Navigating to admin users page...');
  await page.goto('http://localhost:3000/admin/users');
  
  // Wait for the page to load
  await page.waitForTimeout(3000);

  // Check network requests for the stats API
  console.log('5. Monitoring network requests...');
  
  page.on('response', async response => {
    if (response.url().includes('/api/admin/users/stats')) {
      console.log(`Stats API Response Status: ${response.status()}`);
      if (response.ok()) {
        const data = await response.json();
        console.log('Stats API Response:', JSON.stringify(data, null, 2));
      }
    }
  });

  // Refresh the page to trigger the API call again
  console.log('6. Refreshing page to trigger API call...');
  await page.reload();
  await page.waitForTimeout(3000);

  // Get the stats values from the page
  console.log('7. Reading stats from the page...');
  const totalUsers = await page.textContent('text=Total Users >> .. >> div.text-2xl');
  const activeUsers = await page.textContent('text=Active Users >> .. >> div.text-2xl');
  const inactiveUsers = await page.textContent('text=Inactive Users >> .. >> div.text-2xl');
  const totalOrgs = await page.textContent('text=Total Organizations >> .. >> div.text-2xl');

  console.log('\n--- Stats displayed on page ---');
  console.log(`Total Users: ${totalUsers}`);
  console.log(`Active Users: ${activeUsers}`);
  console.log(`Inactive Users: ${inactiveUsers}`);
  console.log(`Total Organizations: ${totalOrgs}`);

  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });

  // Keep browser open for inspection
  console.log('\n8. Browser will stay open for 10 seconds for inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
}

testStatsInBrowser().catch(console.error);