const { chromium } = require('playwright');

async function testAnalyticsAuthFlow() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000,
    slowMo: 500 // Slow down to see what's happening
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error') {
      console.log(`[Browser Console] ${msg.text()}`);
    }
  });

  // Track all navigations
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`[Navigation] -> ${frame.url()}`);
    }
  });

  try {
    console.log('🔍 Testing AI Analytics Auth Flow\n');
    console.log('='.repeat(50));

    // Step 1: Navigate to site first, then clear storage
    console.log('\n1️⃣ Navigating to site and clearing storage...');
    await page.goto('http://localhost:3000');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    console.log('   ✅ Storage cleared');

    // Step 2: Try to access analytics page directly (should redirect)
    console.log('\n2️⃣ Attempting to access analytics page without auth...');
    console.log('   URL: http://localhost:3000/admin/ai-analytics-standalone');
    
    await page.goto('http://localhost:3000/admin/ai-analytics-standalone', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(2000);
    const urlAfterFirstAttempt = page.url();
    console.log(`   Current URL: ${urlAfterFirstAttempt}`);
    
    if (urlAfterFirstAttempt.includes('/auth')) {
      console.log('   ⚠️ Redirected to auth page (expected behavior)');
    } else if (urlAfterFirstAttempt.includes('/dashboard')) {
      console.log('   ❌ Redirected to dashboard (unexpected)');
    } else if (urlAfterFirstAttempt.includes('/ai-analytics-standalone')) {
      console.log('   ❓ Stayed on analytics page (checking for content)');
      const hasError = await page.$('text=/admin access/i');
      if (hasError) {
        console.log('   ✅ Shows admin access error (expected)');
      }
    }

    // Step 3: Sign in with Supabase
    console.log('\n3️⃣ Signing in with Supabase auth...');
    
    // Go to auth page
    await page.goto('http://localhost:3000/auth', {
      waitUntil: 'networkidle'
    });
    
    // Fill in credentials
    console.log('   Entering credentials...');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    
    // Click sign in
    console.log('   Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation
    console.log('   Waiting for post-login navigation...');
    await page.waitForTimeout(5000);
    
    const urlAfterLogin = page.url();
    console.log(`   Current URL after login: ${urlAfterLogin}`);
    
    // Step 4: Check localStorage and sessionStorage
    console.log('\n4️⃣ Checking stored auth data...');
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    
    console.log('   localStorage keys:', Object.keys(localStorage));
    
    // Check for Supabase auth
    const hasSupabaseAuth = Object.keys(localStorage).some(key => 
      key.includes('supabase') || key.includes('auth')
    );
    console.log(`   Has Supabase auth data: ${hasSupabaseAuth}`);

    // Step 5: Try to access analytics page when logged in
    console.log('\n5️⃣ Accessing analytics page while logged in...');
    
    await page.goto('http://localhost:3000/admin/ai-analytics-standalone', {
      waitUntil: 'networkidle'
    });
    
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    console.log(`   Final URL: ${finalUrl}`);
    
    // Check what's on the page
    if (finalUrl.includes('/ai-analytics-standalone')) {
      console.log('   ✅ Stayed on analytics page');
      
      // Check for content
      const hasTitle = await page.$('h1:has-text("AI Analytics Dashboard")');
      const hasError = await page.$('.alert-destructive');
      const hasLoading = await page.$('text=/Loading/i');
      
      if (hasTitle) {
        console.log('   ✅ Analytics dashboard is displayed!');
        
        // Check for data
        const tokenCard = await page.$('text=/Total Tokens/i');
        if (tokenCard) {
          const tokenValue = await page.textContent('.text-2xl');
          console.log(`   📊 Data is loaded: ${tokenValue}`);
        }
      } else if (hasError) {
        const errorText = await hasError.textContent();
        console.log(`   ❌ Error displayed: ${errorText}`);
      } else if (hasLoading) {
        console.log('   ⏳ Still loading...');
      } else {
        console.log('   ❓ Unknown state');
      }
    } else if (finalUrl.includes('/dashboard')) {
      console.log('   ❌ Redirected to dashboard instead of analytics');
    } else if (finalUrl.includes('/auth')) {
      console.log('   ❌ Redirected back to auth page');
    }

    // Step 6: Check network requests
    console.log('\n6️⃣ Monitoring API calls...');
    
    // Set up request interception
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/admin/ai-analytics')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/admin/ai-analytics')) {
        console.log(`   API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Refresh the page to capture API calls
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    if (apiCalls.length > 0) {
      console.log(`   Made ${apiCalls.length} API calls`);
      apiCalls.forEach(call => {
        console.log(`   - ${call.method} ${call.url}`);
        console.log(`     Has Auth: ${call.headers.authorization ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   ❌ No API calls made (likely redirected before attempting)');
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'analytics-auth-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as analytics-auth-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY:');
    if (finalUrl.includes('/ai-analytics-standalone') && await page.$('h1:has-text("AI Analytics Dashboard")')) {
      console.log('✅ Analytics page is accessible and working!');
    } else {
      console.log('❌ Analytics page has redirect issues');
      console.log('Current URL:', finalUrl);
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

testAnalyticsAuthFlow().catch(console.error);