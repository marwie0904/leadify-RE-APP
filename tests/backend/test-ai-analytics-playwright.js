const { chromium } = require('playwright');

async function testAIAnalytics() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    console.log('🚀 Starting AI Analytics Test...\n');

    // Step 1: Navigate to auth page
    console.log('1. Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');

    // Check if already logged in by looking for redirect
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Already logged in, redirected to dashboard');
    } else {
      // Step 2: Sign in
      console.log('2. Signing in...');
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click sign in button
      await page.click('button:has-text("Sign In")');
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   ✅ Successfully signed in');
    }

    // Step 3: Navigate to standalone AI Analytics page
    console.log('3. Navigating to AI Analytics standalone page...');
    await page.goto('http://localhost:3000/admin/ai-analytics-standalone');
    await page.waitForLoadState('networkidle');

    // Step 4: Wait for analytics to load
    console.log('4. Waiting for analytics data to load...');
    
    // Wait for the main heading
    await page.waitForSelector('h1:has-text("AI Analytics Dashboard")', { timeout: 10000 });
    console.log('   ✅ Page loaded successfully');

    // Check for error messages
    const errorElement = await page.$('.alert-destructive');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log('   ⚠️  Error displayed:', errorText);
      
      if (errorText.includes('admin access')) {
        console.log('\n❌ User needs admin access. Add to dev_members table.');
      }
    } else {
      // Step 5: Verify analytics data is displayed
      console.log('5. Verifying analytics data...');
      
      // Check for summary cards
      const totalTokensCard = await page.waitForSelector('text=/Total Tokens/i', { timeout: 5000 });
      if (totalTokensCard) {
        console.log('   ✅ Total Tokens card found');
        
        // Get the token value
        const tokenValue = await page.textContent('div:has-text("Total Tokens") + * >> .text-2xl');
        console.log(`   📊 Total Tokens: ${tokenValue}`);
      }

      const totalCostCard = await page.waitForSelector('text=/Total Cost/i', { timeout: 5000 });
      if (totalCostCard) {
        console.log('   ✅ Total Cost card found');
        
        // Get the cost value
        const costValue = await page.textContent('div:has-text("Total Cost") + * >> .text-2xl');
        console.log(`   💰 Total Cost: ${costValue}`);
      }

      // Check for charts
      const chartsExist = await page.$('text=/Model Distribution/i');
      if (chartsExist) {
        console.log('   ✅ Charts are displayed');
      }

      // Check for refresh button
      const refreshButton = await page.$('button:has-text("Refresh")');
      if (refreshButton) {
        console.log('   ✅ Refresh button available');
      }

      // Check for export button
      const exportButton = await page.$('button:has-text("Export")');
      if (exportButton) {
        console.log('   ✅ Export button available');
      }

      console.log('\n✅ AI Analytics page is working properly!');
      console.log('📍 Access it at: http://localhost:3000/admin/ai-analytics-standalone');
    }

    // Take a screenshot
    await page.screenshot({ 
      path: 'ai-analytics-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as ai-analytics-screenshot.png');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'ai-analytics-error.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as ai-analytics-error.png');
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
    console.log('✅ Test complete');
  }
}

testAIAnalytics().catch(console.error);