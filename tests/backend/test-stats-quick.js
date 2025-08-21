/**
 * Quick Playwright test for admin users stats
 */

const { chromium } = require('playwright');

async function quickTest() {
  const browser = await chromium.launch({ 
    headless: true,
    timeout: 30000
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[AdminUsersAPI]') || text.includes('[UsersPage]') || text.includes('Error')) {
        logs.push(text);
      }
    });

    // Capture API responses
    let statsResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/admin/users/stats')) {
        statsResponse = {
          status: response.status(),
          data: await response.json().catch(() => null)
        };
      }
    });

    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'test-admin@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait a bit for login to complete
    await page.waitForTimeout(2000);
    
    console.log('2. Going to admin users page...');
    await page.goto('http://localhost:3000/admin/users');
    
    // Wait for stats to load
    await page.waitForTimeout(3000);
    
    console.log('3. Reading stats...');
    const stats = {};
    
    try {
      // Try to get stats values using more flexible selectors
      const statsCards = await page.locator('.text-2xl.font-bold').all();
      if (statsCards.length >= 4) {
        stats.totalUsers = await statsCards[0].textContent();
        stats.activeUsers = await statsCards[1].textContent();
        stats.inactiveUsers = await statsCards[2].textContent();
        stats.totalOrgs = await statsCards[3].textContent();
      }
    } catch (e) {
      console.log('Could not read stats from page:', e.message);
    }
    
    console.log('\n=== RESULTS ===');
    console.log('Stats on page:', stats);
    console.log('API Response:', statsResponse);
    console.log('\nConsole Logs:');
    logs.forEach(log => console.log('  ', log));
    
    // Check auth tokens
    const tokens = await page.evaluate(() => {
      const authToken = localStorage.getItem('auth_token');
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      return {
        hasAuthToken: !!authToken,
        hasSupabaseToken: !!supabaseKey,
        supabaseKey: supabaseKey
      };
    });
    
    console.log('\nAuth Tokens:', tokens);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'admin-users-page.png', fullPage: true });
    console.log('\nScreenshot saved as admin-users-page.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest();