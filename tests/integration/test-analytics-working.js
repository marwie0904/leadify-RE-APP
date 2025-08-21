const { chromium } = require('playwright');

(async () => {
  console.log('✅ FINAL AI Analytics Verification\n');
  console.log('==================================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3000/auth');
    
    if (!page.url().includes('/dashboard')) {
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }
    console.log('   ✅ Authenticated');

    // 2. Navigate to analytics
    console.log('\n2️⃣ Opening AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    
    // Wait for data to load
    console.log('   Waiting for data...');
    await page.waitForLoadState('networkidle');
    
    // Wait for either the metrics or an error
    await Promise.race([
      page.waitForSelector('text=/Total Tokens/i', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('[role="alert"]', { timeout: 10000 }).catch(() => null),
    ]);
    
    await page.waitForTimeout(2000); // Extra wait for rendering

    // 3. Check what's displayed - use more specific selectors
    const pageData = await page.evaluate(() => {
      const result = {
        url: window.location.href,
        title: document.querySelector('h1')?.textContent || 'No title',
        metrics: {},
        hasCharts: false,
        error: null
      };

      // Look for error alerts
      const errorAlert = document.querySelector('[role="alert"]');
      if (errorAlert) {
        result.error = errorAlert.textContent;
      }

      // Look for metric cards - they have specific structure
      const cards = document.querySelectorAll('[class*="card" i]');
      cards.forEach(card => {
        const titleEl = card.querySelector('[class*="text-sm"][class*="font-medium"]');
        const valueEl = card.querySelector('[class*="text-2xl"][class*="font-bold"]');
        
        if (titleEl && valueEl) {
          const title = titleEl.textContent.trim();
          const value = valueEl.textContent.trim();
          result.metrics[title] = value;
        }
      });

      // Check for charts (Recharts elements)
      result.hasCharts = !!document.querySelector('.recharts-wrapper');

      return result;
    });

    // 4. Display results
    console.log('\n📊 PAGE DATA:');
    console.log('   URL:', pageData.url);
    console.log('   Title:', pageData.title);
    
    if (pageData.error) {
      console.log('   ❌ Error:', pageData.error);
    }
    
    const metricCount = Object.keys(pageData.metrics).length;
    console.log('\n📈 METRICS FOUND:', metricCount);
    
    if (metricCount > 0) {
      console.log('   Displaying values:');
      for (const [key, value] of Object.entries(pageData.metrics)) {
        console.log(`   • ${key}: ${value}`);
      }
    }
    
    console.log('\n📉 Charts:', pageData.hasCharts ? '✅ Present' : '❌ Not found');

    // 5. Take screenshot
    await page.screenshot({ path: 'ai-analytics-final-state.png', fullPage: true });
    console.log('\n📸 Screenshot: ai-analytics-final-state.png');

    // 6. Final verdict
    console.log('\n==================================================');
    console.log('🏁 RESULT:');
    
    if (metricCount > 0 && !pageData.error) {
      console.log('✅ SUCCESS! AI Analytics is working!');
      console.log(`   - ${metricCount} metrics displayed`);
      console.log('   - No errors detected');
      console.log('   - URL: http://localhost:3000/admin/ai-analytics-fixed');
    } else if (pageData.error) {
      console.log('❌ ERROR:', pageData.error);
    } else {
      console.log('⚠️  WARNING: Page loaded but no metrics found');
      console.log('   This might be a rendering issue');
    }
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);
  await browser.close();
})();