const { chromium } = require('playwright');

(async () => {
  console.log('🔐 Getting valid auth token from actual login\n');
  console.log('==================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log(`[Browser] ${msg.text()}`);
    }
  });

  try {
    // 1. Navigate to auth page and login
    console.log('1️⃣ Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Check if already logged in
    if (page.url().includes('/dashboard')) {
      console.log('   Already logged in, redirected to dashboard');
      
      // Get the auth token from localStorage
      const authData = await page.evaluate(() => {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        
        // Also check for Supabase auth
        const storageKeys = Object.keys(localStorage);
        const supabaseKey = storageKeys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        let supabaseData = null;
        if (supabaseKey) {
          try {
            supabaseData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
          } catch (e) {}
        }
        
        return { token, user, supabaseData };
      });
      
      console.log('\n📦 Auth Data Retrieved:');
      console.log('   Simple Auth Token:', authData.token ? '✅ Present' : '❌ Missing');
      console.log('   User Data:', authData.user ? '✅ Present' : '❌ Missing');
      console.log('   Supabase Token:', authData.supabaseData?.access_token ? '✅ Present' : '❌ Missing');
      
      if (authData.token) {
        console.log('\n✅ Token:', authData.token.substring(0, 50) + '...');
      }
      
      // 2. Now navigate to the analytics page
      console.log('\n2️⃣ Navigating to AI Analytics page...');
      await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any API calls
      await page.waitForTimeout(3000);
      
      // Check what's displayed
      const pageContent = await page.evaluate(() => {
        const heading = document.querySelector('h1')?.textContent;
        const errorAlert = document.querySelector('[role="alert"]')?.textContent;
        const totalTokens = document.querySelector('div:has(> div:contains("Total Tokens")) + div > div')?.textContent;
        const totalCost = document.querySelector('div:has(> div:contains("Total Cost")) + div > div')?.textContent;
        
        return { heading, errorAlert, totalTokens, totalCost };
      });
      
      console.log('\n📊 Page Content:');
      console.log('   Heading:', pageContent.heading || 'Not found');
      console.log('   Error:', pageContent.errorAlert || 'None');
      console.log('   Total Tokens:', pageContent.totalTokens || 'Not displayed');
      console.log('   Total Cost:', pageContent.totalCost || 'Not displayed');
      
      // Take screenshot
      await page.screenshot({ path: 'analytics-with-auth.png' });
      console.log('\n📸 Screenshot saved as analytics-with-auth.png');
      
    } else {
      console.log('   Need to login...');
      
      // Fill in login form
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click login button
      await page.click('button[type="submit"]');
      console.log('   Login submitted, waiting for redirect...');
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   ✅ Logged in successfully!');
      
      // Get auth data after login
      const authData = await page.evaluate(() => {
        return {
          token: localStorage.getItem('auth_token'),
          user: localStorage.getItem('auth_user')
        };
      });
      
      console.log('\n📦 Auth Token:', authData.token ? authData.token.substring(0, 50) + '...' : 'Missing');
      
      // Navigate to analytics
      console.log('\n3️⃣ Navigating to AI Analytics page...');
      await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Check content
      const pageContent = await page.evaluate(() => {
        const heading = document.querySelector('h1')?.textContent;
        const errorAlert = document.querySelector('[role="alert"]')?.textContent;
        const cards = Array.from(document.querySelectorAll('.text-2xl.font-bold')).map(el => el.textContent);
        
        return { heading, errorAlert, cards };
      });
      
      console.log('\n📊 Page Content:');
      console.log('   Heading:', pageContent.heading || 'Not found');
      console.log('   Error:', pageContent.errorAlert || 'None');
      console.log('   Metric Cards:', pageContent.cards.length > 0 ? pageContent.cards.join(', ') : 'Not displayed');
      
      await page.screenshot({ path: 'analytics-after-login.png' });
      console.log('\n📸 Screenshot saved as analytics-after-login.png');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  }

  // Keep browser open for inspection
  console.log('\n🔍 Keeping browser open for 15 seconds...');
  await page.waitForTimeout(15000);
  
  await browser.close();
})();