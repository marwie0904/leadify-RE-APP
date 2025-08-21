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
    if (text.includes('[AI Analytics]')) {
      console.log(`[Browser] ${text}`);
    }
  });

  try {
    console.log('🔍 Testing Fixed AI Analytics Page\n');
    console.log('='.repeat(50));

    // Step 1: First sign in using Supabase
    console.log('\n1️⃣ Signing in with Supabase...');
    
    // Use the direct Supabase test to login
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: './FRONTEND/financial-dashboard-2/.env.local' });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });
    
    if (error) {
      console.error('   ❌ Supabase login failed:', error.message);
      return;
    }
    
    console.log('   ✅ Supabase login successful');
    console.log('   User ID:', data.user.id);
    console.log('   Token present:', !!data.session.access_token);

    // Step 2: Navigate to the fixed analytics page
    console.log('\n2️⃣ Navigating to fixed analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-fixed', {
      waitUntil: 'networkidle'
    });
    
    // Step 3: Check authentication status on page
    console.log('\n3️⃣ Checking page authentication...');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Check what's displayed
    if (currentUrl.includes('/ai-analytics-fixed')) {
      console.log('   ✅ Stayed on analytics page');
      
      // Check for auth message
      const authRequired = await page.$('text=/Authentication Required/i');
      if (authRequired) {
        console.log('   ⚠️ Page shows "Authentication Required"');
        console.log('   This means the page doesn\'t detect the Supabase session');
        
        // Try to inject the session into localStorage
        console.log('\n4️⃣ Injecting Supabase session into browser...');
        
        await page.evaluate((sessionData) => {
          // Store Supabase auth in localStorage format
          const key = `sb-${sessionData.url.split('//')[1].split('.')[0]}-auth-token`;
          localStorage.setItem(key, JSON.stringify({
            access_token: sessionData.access_token,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: sessionData.refresh_token,
            user: sessionData.user
          }));
        }, {
          url: supabaseUrl,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: data.user
        });
        
        console.log('   ✅ Session injected, refreshing page...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
      }
      
      // Check for dashboard content
      const hasTitle = await page.$('h1:has-text("AI Analytics Dashboard")');
      const hasError = await page.$('text=/Admin access required/i');
      const hasLoading = await page.$('text=/Loading/i');
      
      if (hasTitle) {
        console.log('   ✅ AI Analytics Dashboard is displayed!');
        
        // Check for data
        const tokenCard = await page.$('text=/Total Tokens/i');
        if (tokenCard) {
          // Get the token value
          const tokenElement = await page.$('div:has-text("Total Tokens") >> .. >> .text-2xl');
          if (tokenElement) {
            const tokenValue = await tokenElement.textContent();
            console.log(`   📊 Total Tokens: ${tokenValue}`);
          }
        }
        
        const costCard = await page.$('text=/Total Cost/i');
        if (costCard) {
          const costElement = await page.$('div:has-text("Total Cost") >> .. >> .text-2xl');
          if (costElement) {
            const costValue = await costElement.textContent();
            console.log(`   💰 Total Cost: ${costValue}`);
          }
        }
        
        console.log('\n✅ SUCCESS! Analytics page is working properly!');
      } else if (hasError) {
        const errorText = await page.textContent('[role="alert"]');
        console.log(`   ❌ Admin access error: ${errorText}`);
        console.log('\n   You are authenticated but need admin privileges.');
        console.log('   Ensure you\'re in the dev_members table.');
      } else if (hasLoading) {
        console.log('   ⏳ Page is still loading...');
      } else {
        console.log('   ❓ Unknown state - taking screenshot');
      }
    } else {
      console.log(`   ❌ Redirected to: ${currentUrl}`);
    }

    // Take screenshot
    await page.screenshot({ 
      path: 'fixed-analytics-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as fixed-analytics-test.png');

    console.log('\n' + '='.repeat(50));
    console.log('📍 Access the fixed page at:');
    console.log('   http://localhost:3000/admin/ai-analytics-fixed');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ 
      path: 'fixed-analytics-error.png',
      fullPage: true 
    });
  } finally {
    console.log('\n🔍 Keeping browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

testFixedAnalytics().catch(console.error);