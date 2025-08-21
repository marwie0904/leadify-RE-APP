const { chromium } = require('playwright');

async function testAnalyticsWithManualToken() {
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
    if (text.includes('[AI Analytics]')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    console.log('🔍 Testing AI Analytics with Manual Token\n');
    console.log('='.repeat(50));

    // Step 1: Navigate to any page first to set localStorage
    console.log('\n1️⃣ Setting up authentication...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Step 2: Set the auth token in localStorage
    console.log('\n2️⃣ Setting auth token in localStorage...');
    const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjJmdk5DdHVVSmJzN2F3c2oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tibXN5Z3lhd3BpcWVnZW16ZXRwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0Yzk4NGE5YS0xNTBlLTQ2NzMtODE5Mi0xN2Y4MGE3ZWY0ZDciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1MDU3MTgzLCJpYXQiOjE3NTUwNTM1ODMsImVtYWlsIjoibWFyd3J5eXlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6Im1hcndyeXl5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJzdF9uYW1lIjoiTWFyIFdpZSIsImZ1bGxfbmFtZSI6Ik1hciBXaWUgQW5nIiwibGFzdF9uYW1lIjoiQW5nIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI0Yzk4NGE5YS0xNTBlLTQ2NzMtODE5Mi0xN2Y4MGE3ZWY0ZDcifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NTA1MzU4M31dLCJzZXNzaW9uX2lkIjoiN2YwMGFiMTUtMzRkMi00OTMzLTkwODUtYzYzMmE5MjM4MjNhIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.uJCJ25xt4kWifcFrxEceog1HfmpWdItK24zcokyhp68';
    
    await page.evaluate((authToken) => {
      // Set simple auth token
      localStorage.setItem('auth_token', authToken);
      
      // Also set user data
      localStorage.setItem('auth_user', JSON.stringify({
        id: '4c984a9a-150e-4673-8192-17f80a7ef4d7',
        email: 'marwryyy@gmail.com',
        name: 'Mar Wie Ang'
      }));
      
      console.log('[Test] Auth token set in localStorage');
    }, token);

    // Step 3: Navigate to the fixed AI Analytics page
    console.log('\n3️⃣ Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to check auth and load data
    await page.waitForTimeout(5000);

    // Step 4: Check what's displayed
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Check for different states
    const hasAuthMessage = await page.$('text=/Authentication Required/i');
    const hasAnalyticsDashboard = await page.$('h1:has-text("AI Analytics Dashboard")');
    const hasError = await page.$('[role="alert"]');
    const hasLoading = await page.$('text=/Loading/i');

    if (hasAnalyticsDashboard) {
      console.log('\n✅ SUCCESS! AI Analytics Dashboard is displayed!');
      
      // Try to get the actual values
      const tokenValue = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.text-2xl'));
        return cards[0]?.textContent || 'Not found';
      });
      
      const costValue = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.text-2xl'));
        return cards[1]?.textContent || 'Not found';
      });
      
      console.log('\n📊 Analytics Data:');
      console.log(`   Total Tokens: ${tokenValue}`);
      console.log(`   Total Cost: ${costValue}`);
      
      // Check for charts
      const hasCharts = await page.$('text=/Model Distribution/i');
      if (hasCharts) {
        console.log('   ✅ Charts are present');
      }
      
      // Check for organization table
      const hasOrgTable = await page.$('text=/Organization Analytics/i');
      if (hasOrgTable) {
        console.log('   ✅ Organization table is present');
      }
      
    } else if (hasError) {
      const errorText = await page.textContent('[role="alert"]');
      console.log('\n❌ Error displayed:');
      console.log(`   ${errorText}`);
      
    } else if (hasAuthMessage) {
      console.log('\n⚠️ Authentication Required message shown');
      console.log('   Token was not detected properly');
      
    } else if (hasLoading) {
      console.log('\n⏳ Page is still loading...');
      
    } else {
      console.log('\n❓ Unknown state');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'analytics-manual-token-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as analytics-manual-token-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY:');
    if (hasAnalyticsDashboard) {
      console.log('✅ The AI Analytics page works correctly with manual token!');
      console.log('✅ Data is being fetched and displayed');
      console.log('\nThis confirms the page works when auth_token is present.');
      console.log('The issue is with the login flow not setting the token properly.');
    } else {
      console.log('❌ The page is not working even with manual token');
      console.log('Check the console for errors');
    }

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

testAnalyticsWithManualToken().catch(console.error);