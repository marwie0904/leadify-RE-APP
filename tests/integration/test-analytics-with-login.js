const { chromium } = require('playwright');

(async () => {
  console.log('🔐 Testing AI Analytics with proper login\n');
  console.log('==================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics]') || text.includes('[Simple Auth]')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    // 1. Login first
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    if (!page.url().includes('/dashboard')) {
      // Fill in login form
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click login button
      await page.click('button[type="submit"]');
      console.log('   Logging in...');
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   ✅ Login successful!');
    } else {
      console.log('   ✅ Already logged in');
    }

    // Wait a bit for auth to settle
    await page.waitForTimeout(2000);

    // 2. Get the auth token
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
    console.log('\n📦 Auth Token:', authToken ? authToken.substring(0, 30) + '...' : '❌ Missing');

    // 3. Navigate to the AI Analytics page
    console.log('\n2️⃣ Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('   Page loaded, waiting for data...');
    
    // Wait up to 5 seconds for either data or error to appear
    await Promise.race([
      page.waitForSelector('text=/Total Tokens/', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => null),
      page.waitForTimeout(5000)
    ]);

    // 4. Check what's displayed
    const pageState = await page.evaluate(() => {
      // Check for auth required message
      const authRequired = document.querySelector('h1')?.textContent?.includes('Authentication Required');
      
      // Check for error alert
      const errorAlert = document.querySelector('[role="alert"]')?.textContent;
      
      // Check for loading state
      const isLoading = document.querySelector('text=/Loading AI Analytics/')?.textContent;
      
      // Check for data (look for the metric cards)
      const metricsCards = Array.from(document.querySelectorAll('.text-2xl.font-bold')).map(el => {
        const parent = el.closest('[class*="Card"]');
        const title = parent?.querySelector('.text-sm.font-medium')?.textContent;
        return { title, value: el.textContent };
      });
      
      // Check the page title
      const pageTitle = document.querySelector('h1')?.textContent;
      
      // Check current URL
      const currentUrl = window.location.href;
      
      return {
        currentUrl,
        pageTitle,
        authRequired,
        errorAlert,
        isLoading,
        metricsCards,
        hasData: metricsCards.length > 0
      };
    });

    console.log('\n📊 Page State:');
    console.log('   URL:', pageState.currentUrl);
    console.log('   Title:', pageState.pageTitle);
    console.log('   Auth Required:', pageState.authRequired ? '⚠️ Yes' : '✅ No');
    console.log('   Error:', pageState.errorAlert || '✅ None');
    console.log('   Loading:', pageState.isLoading || 'No');
    console.log('   Has Data:', pageState.hasData ? '✅ Yes' : '❌ No');
    
    if (pageState.metricsCards.length > 0) {
      console.log('\n📈 Metrics Displayed:');
      pageState.metricsCards.forEach(card => {
        console.log(`   ${card.title}: ${card.value}`);
      });
    }

    // 5. Take a screenshot
    await page.screenshot({ path: 'analytics-final-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as analytics-final-test.png');

    // 6. Test result summary
    console.log('\n==================================================');
    console.log('TEST SUMMARY:');
    if (pageState.hasData) {
      console.log('✅ SUCCESS: Analytics data is displayed!');
    } else if (pageState.authRequired) {
      console.log('⚠️  AUTH ISSUE: Page shows authentication required');
    } else if (pageState.errorAlert) {
      console.log('❌ ERROR:', pageState.errorAlert);
    } else {
      console.log('⚠️  UNKNOWN STATE: No data displayed');
    }
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  }

  // Keep browser open for manual inspection
  console.log('🔍 Keeping browser open for 10 seconds for inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
})();