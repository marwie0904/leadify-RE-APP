const { chromium } = require('playwright');

(async () => {
  console.log('🎯 Final AI Analytics Test\n');
  console.log('==================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging for analytics
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics]') || text.includes('Analytics') || text.includes('Error')) {
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
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   ✅ Login successful!');
    } else {
      console.log('   ✅ Already logged in');
    }

    // Wait for auth to settle
    await page.waitForTimeout(2000);

    // 2. Navigate to the fixed AI Analytics page
    console.log('\n2️⃣ Navigating to AI Analytics page...');
    console.log('   URL: http://localhost:3000/admin/ai-analytics-fixed');
    
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load (give it more time)
    console.log('   Waiting for data to load...');
    await page.waitForTimeout(5000);

    // 3. Check the final state
    const analyticsData = await page.evaluate(() => {
      // Get all text content from metric cards
      const cards = [];
      document.querySelectorAll('.text-2xl.font-bold').forEach(el => {
        const card = el.closest('[class*="Card"]');
        if (card) {
          const title = card.querySelector('.text-sm.font-medium')?.textContent;
          const value = el.textContent;
          const subtitle = card.querySelector('.text-xs.text-muted-foreground')?.textContent;
          if (title) {
            cards.push({ title, value, subtitle });
          }
        }
      });

      // Check for charts
      const hasCharts = !!document.querySelector('[class*="recharts"]');
      
      // Check for error messages
      const errorAlert = document.querySelector('[role="alert"]')?.textContent;
      
      // Check page title
      const pageTitle = document.querySelector('h1')?.textContent;
      
      // Check if it shows auth required
      const authRequired = pageTitle?.includes('Authentication Required');
      
      // Get current URL
      const currentUrl = window.location.href;

      return {
        currentUrl,
        pageTitle,
        cards,
        hasCharts,
        errorAlert,
        authRequired,
        success: cards.length > 0 && !errorAlert && !authRequired
      };
    });

    // 4. Display results
    console.log('\n📊 Analytics Page Status:');
    console.log('   Current URL:', analyticsData.currentUrl);
    console.log('   Page Title:', analyticsData.pageTitle || 'Not found');
    console.log('   Has Error:', analyticsData.errorAlert ? `❌ ${analyticsData.errorAlert}` : '✅ No');
    console.log('   Auth Required:', analyticsData.authRequired ? '❌ Yes' : '✅ No');
    console.log('   Has Charts:', analyticsData.hasCharts ? '✅ Yes' : '❌ No');
    console.log('   Metrics Found:', analyticsData.cards.length);

    if (analyticsData.cards.length > 0) {
      console.log('\n📈 Metrics Displayed:');
      analyticsData.cards.forEach(card => {
        console.log(`   • ${card.title}: ${card.value}`);
        if (card.subtitle) {
          console.log(`     ${card.subtitle}`);
        }
      });
    }

    // 5. Take screenshot
    await page.screenshot({ path: 'ai-analytics-success.png', fullPage: true });
    console.log('\n📸 Screenshot saved as ai-analytics-success.png');

    // 6. Final verdict
    console.log('\n==================================================');
    console.log('🏁 FINAL TEST RESULT:');
    if (analyticsData.success) {
      console.log('✅ SUCCESS! AI Analytics page is working correctly!');
      console.log('   - Authentication: Working');
      console.log('   - Data Loading: Working');
      console.log('   - Metrics Display: Working');
      console.log('   - No Unwanted Redirects: Confirmed');
    } else {
      console.log('❌ FAILED: Issues detected');
      if (analyticsData.authRequired) {
        console.log('   - Authentication not working properly');
      }
      if (analyticsData.errorAlert) {
        console.log('   - Error:', analyticsData.errorAlert);
      }
      if (analyticsData.cards.length === 0) {
        console.log('   - No metrics data displayed');
      }
    }
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    await page.screenshot({ path: 'test-error-final.png' });
  }

  // Keep browser open briefly
  console.log('🔍 Keeping browser open for 5 seconds...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('✅ Test completed!');
})();