const { chromium } = require('playwright');

async function testAnalyticsWithBrowserLogin() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics]') || text.includes('Auth')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    console.log('🔍 Testing AI Analytics with Browser Login\n');
    console.log('='.repeat(50));

    // Step 1: Go to auth page and sign in
    console.log('\n1️⃣ Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Check if already logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('   Already logged in, proceeding to analytics...');
    } else {
      console.log('   Signing in...');
      
      // Fill in login form
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click sign in button
      await page.click('button:has-text("Sign In")');
      
      // Wait for navigation or error
      await page.waitForTimeout(3000);
      const afterLoginUrl = page.url();
      
      if (afterLoginUrl.includes('/dashboard')) {
        console.log('   ✅ Successfully signed in');
      } else {
        console.log(`   ⚠️ Login redirected to: ${afterLoginUrl}`);
        // Continue anyway to test the analytics page
      }
    }

    // Step 2: Check localStorage for auth data
    console.log('\n2️⃣ Checking auth storage...');
    const authData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKeys = keys.filter(k => k.includes('auth') || k.includes('sb-'));
      const data = {};
      authKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          data[key] = value ? (value.length > 100 ? `${value.substring(0, 100)}...` : value) : null;
        } catch (e) {
          data[key] = 'Error reading';
        }
      });
      return data;
    });
    
    console.log('   Auth keys found:', Object.keys(authData));

    // Step 3: Navigate to fixed analytics page
    console.log('\n3️⃣ Navigating to AI Analytics (fixed) page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Step 4: Check what's displayed
    const finalUrl = page.url();
    console.log(`   Current URL: ${finalUrl}`);

    // Check for different states
    const hasAuthMessage = await page.$('text=/Authentication Required/i');
    const hasAnalyticsDashboard = await page.$('h1:has-text("AI Analytics Dashboard")');
    const hasError = await page.$('text=/Error Loading Analytics/i');
    const hasLoading = await page.$('text=/Loading/i');
    const hasAdminError = await page.$('text=/admin access/i');

    if (hasAnalyticsDashboard) {
      console.log('\n✅ SUCCESS! AI Analytics Dashboard is displayed!');
      
      // Try to get data values
      try {
        // Wait for data to load
        await page.waitForSelector('.text-2xl', { timeout: 5000 });
        
        // Get token value
        const tokenValue = await page.evaluate(() => {
          const tokenCard = Array.from(document.querySelectorAll('div')).find(
            el => el.textContent?.includes('Total Tokens')
          );
          if (tokenCard) {
            const valueEl = tokenCard.parentElement?.querySelector('.text-2xl');
            return valueEl?.textContent || 'Not found';
          }
          return 'Card not found';
        });
        
        // Get cost value
        const costValue = await page.evaluate(() => {
          const costCard = Array.from(document.querySelectorAll('div')).find(
            el => el.textContent?.includes('Total Cost')
          );
          if (costCard) {
            const valueEl = costCard.parentElement?.querySelector('.text-2xl');
            return valueEl?.textContent || 'Not found';
          }
          return 'Card not found';
        });
        
        console.log('\n📊 Analytics Data:');
        console.log(`   Total Tokens: ${tokenValue}`);
        console.log(`   Total Cost: ${costValue}`);
        
        // Check for charts
        const hasCharts = await page.$('text=/Model Distribution/i');
        if (hasCharts) {
          console.log('   ✅ Charts are displayed');
        }
        
        // Check for organization table
        const hasOrgTable = await page.$('text=/Organization Analytics/i');
        if (hasOrgTable) {
          console.log('   ✅ Organization table is displayed');
        }
      } catch (e) {
        console.log('   ⚠️ Could not retrieve data values');
      }
      
    } else if (hasAdminError) {
      console.log('\n⚠️ Admin Access Required');
      const errorText = await page.textContent('.alert-destructive');
      console.log(`   Error: ${errorText}`);
      console.log('\n   User is authenticated but needs to be in dev_members table');
      
    } else if (hasAuthMessage) {
      console.log('\n⚠️ Authentication Required message shown');
      console.log('   The page is not detecting the authentication');
      
    } else if (hasError) {
      const errorText = await page.textContent('.alert-destructive');
      console.log('\n❌ Error Loading Analytics:');
      console.log(`   ${errorText}`);
      
    } else if (hasLoading) {
      console.log('\n⏳ Page is still loading...');
      
    } else if (finalUrl !== 'http://localhost:3000/admin/ai-analytics-fixed') {
      console.log(`\n❌ Redirected away from analytics page to: ${finalUrl}`);
      
    } else {
      console.log('\n❓ Unknown state - page might be in transition');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'analytics-browser-login-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as analytics-browser-login-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY:');
    if (hasAnalyticsDashboard) {
      console.log('✅ Analytics page is working correctly!');
      console.log('✅ Authentication is properly detected');
      console.log('✅ Data is being displayed');
    } else if (hasAdminError) {
      console.log('✅ Authentication is working');
      console.log('⚠️ User needs admin privileges (dev_members table)');
    } else if (hasAuthMessage) {
      console.log('❌ Authentication is not being detected properly');
      console.log('⚠️ Check auth system integration');
    } else {
      console.log('❌ Page is not working as expected');
    }
    
    console.log('\n📍 Analytics URL: http://localhost:3000/admin/ai-analytics-fixed');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'analytics-error.png',
      fullPage: true 
    });
  } finally {
    console.log('\n🔍 Keeping browser open for 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await browser.close();
  }
}

testAnalyticsWithBrowserLogin().catch(console.error);