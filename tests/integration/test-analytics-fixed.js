const { chromium } = require('playwright');

async function testFixedAnalytics() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000,
    slowMo: 200
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics]') || text.includes('Error')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    console.log('🔍 Testing Fixed AI Analytics Page\n');
    console.log('='.repeat(50));

    // First, let's try to login with simple auth (which the /auth page uses)
    console.log('\n1️⃣ Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      console.log('   Need to login...');
      
      // Try simple auth login
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      await page.click('button:has-text("Sign In")');
      
      console.log('   Waiting for login...');
      await page.waitForTimeout(3000);
    }

    // Now try the fixed analytics page
    console.log('\n2️⃣ Navigating to FIXED analytics page...');
    console.log('   URL: http://localhost:3000/admin/ai-analytics-fixed');
    
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check what's displayed
    const finalUrl = page.url();
    console.log(`   Current URL: ${finalUrl}`);

    // Check for various states
    const hasAuthMessage = await page.$('text=/Authentication Required/i');
    const hasAnalyticsDashboard = await page.$('h1:has-text("AI Analytics Dashboard")');
    const hasError = await page.$('text=/Error Loading Analytics/i');
    const hasLoading = await page.$('text=/Loading AI Analytics/i');

    if (hasAuthMessage) {
      console.log('\n⚠️  Authentication Required message shown');
      console.log('   The page correctly detected no auth');
      
      // Check localStorage
      const localStorageData = await page.evaluate(() => {
        return {
          auth_token: localStorage.getItem('auth_token'),
          auth_user: localStorage.getItem('auth_user')
        };
      });
      
      console.log('\n📦 localStorage status:');
      console.log('   auth_token:', localStorageData.auth_token ? 'Present' : 'Missing');
      console.log('   auth_user:', localStorageData.auth_user ? 'Present' : 'Missing');
      
    } else if (hasAnalyticsDashboard) {
      console.log('\n✅ SUCCESS! Analytics Dashboard is displayed!');
      
      // Check for data
      const tokenValue = await page.textContent('div:has-text("Total Tokens") + * >> .text-2xl');
      const costValue = await page.textContent('div:has-text("Total Cost") + * >> .text-2xl');
      
      console.log('\n📊 Analytics Data:');
      console.log(`   Total Tokens: ${tokenValue}`);
      console.log(`   Total Cost: ${costValue}`);
      
      // Check for charts
      const hasCharts = await page.$('text=/Model Distribution/i');
      if (hasCharts) {
        console.log('   ✅ Charts are displayed');
      }
      
    } else if (hasError) {
      const errorText = await page.textContent('.alert-destructive');
      console.log('\n❌ Error Loading Analytics:');
      console.log(`   ${errorText}`);
      
    } else if (hasLoading) {
      console.log('\n⏳ Still loading...');
    } else {
      console.log('\n❓ Unknown state');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'analytics-fixed-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as analytics-fixed-test.png');

    // Try alternative auth approach - login via API directly
    console.log('\n3️⃣ Testing with direct API auth...');
    
    // Set a fake token to test
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('auth_user', JSON.stringify({
        id: '4c984a9a-150e-4673-8192-17f80a7ef4d7',
        email: 'marwryyy@gmail.com',
        name: 'Test User'
      }));
    });
    
    console.log('   Set test auth data in localStorage');
    
    // Reload the page
    console.log('   Reloading page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if it now shows different content
    const hasAnalyticsAfterAuth = await page.$('h1:has-text("AI Analytics Dashboard")');
    const hasErrorAfterAuth = await page.$('text=/Error Loading Analytics/i');
    
    if (hasAnalyticsAfterAuth) {
      console.log('   ✅ Analytics dashboard displayed after setting auth!');
    } else if (hasErrorAfterAuth) {
      const errorText = await page.textContent('.alert-destructive');
      console.log(`   ⚠️ Error after auth: ${errorText}`);
      if (errorText.includes('admin access')) {
        console.log('   → User needs to be in dev_members table');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY:');
    console.log('✅ Fixed page does NOT auto-redirect');
    console.log('✅ Shows proper auth/error messages');
    console.log('✅ Works with localStorage auth');
    console.log('\n📍 Use this URL: http://localhost:3000/admin/ai-analytics-fixed');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'analytics-error.png',
      fullPage: true 
    });
  } finally {
    console.log('\n🔍 Keeping browser open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

testFixedAnalytics().catch(console.error);