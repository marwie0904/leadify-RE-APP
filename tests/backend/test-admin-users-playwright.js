/**
 * Playwright test for admin users page with stats
 */

const { chromium } = require('playwright');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testAdminUsersPage() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ADMIN USERS PAGE - PLAYWRIGHT TEST                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Filter for our custom logs
    if (text.includes('[AdminUsersAPI]') || text.includes('[UsersPage]')) {
      if (type === 'error') {
        console.log(`${colors.red}Browser Console Error: ${text}${colors.reset}`);
      } else {
        console.log(`${colors.cyan}Browser Console: ${text}${colors.reset}`);
      }
    }
  });

  // Monitor network requests
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/admin/users/stats')) {
      console.log(`\n${colors.yellow}Stats API Request:${colors.reset}`);
      console.log(`  URL: ${url}`);
      console.log(`  Status: ${response.status()}`);
      
      try {
        const data = await response.json();
        console.log(`  Response:`, JSON.stringify(data, null, 2));
      } catch (e) {
        console.log(`  Could not parse response as JSON`);
      }
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log(`${colors.cyan}1. Navigating to auth page...${colors.reset}`);
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Step 2: Login
    console.log(`${colors.cyan}2. Logging in as admin user...${colors.reset}`);
    await page.fill('input[type="email"]', 'marwryyyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log(`${colors.yellow}Did not navigate to dashboard, checking current URL...${colors.reset}`);
    });
    
    console.log(`${colors.green}✅ Successfully logged in${colors.reset}`);
    console.log(`  Current URL: ${page.url()}`);

    // Step 3: Navigate to admin users page
    console.log(`\n${colors.cyan}3. Navigating to admin users page...${colors.reset}`);
    await page.goto('http://localhost:3000/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Wait for stats to load
    await page.waitForTimeout(3000);

    // Step 4: Check the stats values
    console.log(`\n${colors.cyan}4. Reading stats from the page...${colors.reset}`);
    
    // Get stats values
    const totalUsers = await page.locator('text=Total Users').locator('..').locator('div.text-2xl').textContent();
    const activeUsers = await page.locator('text=Active Users').locator('..').locator('div.text-2xl').textContent();
    const inactiveUsers = await page.locator('text=Inactive Users').locator('..').locator('div.text-2xl').textContent();
    const totalOrgs = await page.locator('text=Total Organizations').locator('..').locator('div.text-2xl').textContent();

    console.log(`\n${colors.bright}${colors.blue}Stats Displayed on Page:${colors.reset}`);
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Active Users: ${activeUsers}`);
    console.log(`  Inactive Users: ${inactiveUsers}`);
    console.log(`  Total Organizations: ${totalOrgs}`);

    // Check if values are all zeros
    if (totalUsers === '0' && activeUsers === '0' && inactiveUsers === '0' && totalOrgs === '0') {
      console.log(`\n${colors.red}❌ All stats are showing 0 - there's an issue!${colors.reset}`);
      
      // Check localStorage for auth token
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      const supabaseToken = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        return supabaseKey ? localStorage.getItem(supabaseKey) : null;
      });
      
      console.log(`\n${colors.yellow}Debug Info:${colors.reset}`);
      console.log(`  localStorage auth_token exists: ${!!authToken}`);
      console.log(`  Supabase token exists: ${!!supabaseToken}`);
      
      // Try the test stats page
      console.log(`\n${colors.cyan}5. Testing the debug stats page...${colors.reset}`);
      await page.goto('http://localhost:3000/admin/test-stats');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Check if test page shows stats
      const testPageContent = await page.locator('pre').last().textContent();
      console.log(`\n${colors.yellow}Test Page Logs:${colors.reset}`);
      console.log(testPageContent);
      
    } else {
      console.log(`\n${colors.green}✅ Stats are working correctly!${colors.reset}`);
      console.log(`  Expected: Total Users=3, Active=3, Inactive=0, Organizations=1`);
    }

    // Step 5: Check users table
    console.log(`\n${colors.cyan}6. Checking users table...${colors.reset}`);
    const userRows = await page.locator('table tbody tr').count();
    console.log(`  User rows in table: ${userRows}`);
    
    if (userRows > 0) {
      // Get first user's info
      const firstUserEmail = await page.locator('table tbody tr').first().locator('td').nth(0).locator('div.text-sm').textContent();
      console.log(`  First user email: ${firstUserEmail}`);
    }

    // Keep browser open for manual inspection
    console.log(`\n${colors.yellow}Browser will stay open for 10 seconds for inspection...${colors.reset}`);
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error(`${colors.red}Error during test:${colors.reset}`, error);
  } finally {
    await browser.close();
    console.log(`\n${colors.green}Test completed.${colors.reset}`);
  }
}

// Run the test
testAdminUsersPage().catch(console.error);