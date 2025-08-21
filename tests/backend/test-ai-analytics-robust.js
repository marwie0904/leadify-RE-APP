/**
 * Robust Test for AI Analytics with Proper Wait Conditions
 */

const { chromium } = require('playwright');

async function robustTest() {
  console.log('=======================================');
  console.log('   ROBUST AI ANALYTICS TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[') || text.includes('✅') || text.includes('❌')) {
      console.log('Console:', text);
    }
  });

  // Track network activity
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/auth/login')) {
      console.log('Login API Response:', response.status());
    }
    if (url.includes('/api/admin/')) {
      console.log('Admin API:', response.status(), url.split('/').slice(-2).join('/'));
    }
  });

  try {
    // 1. Clear everything and navigate to auth
    console.log('1. Starting fresh - navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      console.log('[Browser] Cleared all storage');
    });
    
    // Reload to ensure clean state
    await page.reload();
    await page.waitForTimeout(2000);
    
    // 2. Fill in login form
    console.log('\n2. Filling login form...');
    
    // Wait for the sign in tab to be visible
    const signInTab = await page.locator('button[role="tab"]:has-text("Sign In")');
    if (await signInTab.getAttribute('data-state') !== 'active') {
      await signInTab.click();
      await page.waitForTimeout(500);
    }
    
    // Fill email
    const emailInput = await page.locator('input[type="email"]').first();
    await emailInput.click();
    await emailInput.fill('marwryyy@gmail.com');
    console.log('   Email entered');
    
    // Fill password
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('ayokonga123');
    console.log('   Password entered');
    
    // 3. Submit login form
    console.log('\n3. Submitting login form...');
    
    // Find and click the sign in button
    const signInButton = await page.locator('button[type="submit"]:has-text("Sign In")').first();
    
    // Wait for the login API response
    const [loginResponse] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login'),
        { timeout: 30000 }
      ),
      signInButton.click()
    ]);
    
    console.log('   Login API responded:', loginResponse.status());
    
    if (loginResponse.ok()) {
      console.log('✅ Login API successful');
      
      // Wait for navigation or storage update
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 5000 }),
        page.waitForURL('**/organization-setup', { timeout: 5000 }),
        page.waitForFunction(() => {
          return localStorage.getItem('auth_token') !== null;
        }, { timeout: 5000 })
      ]).catch(() => {
        console.log('   Checking authentication state...');
      });
      
      // Give React time to update
      await page.waitForTimeout(2000);
      
      // Check localStorage
      const authState = await page.evaluate(() => {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        return {
          hasToken: !!token,
          tokenLength: token ? token.length : 0,
          hasUser: !!user,
          userEmail: user ? JSON.parse(user).email : null,
          currentUrl: window.location.href
        };
      });
      
      console.log('\n4. Authentication state:');
      console.log('   Token:', authState.hasToken ? `✅ Present (${authState.tokenLength} chars)` : '❌ Missing');
      console.log('   User:', authState.hasUser ? `✅ ${authState.userEmail}` : '❌ Missing');
      console.log('   Current URL:', authState.currentUrl);
      
      // If we're still on auth page but have tokens, manually navigate
      if (authState.hasToken && authState.currentUrl.includes('/auth')) {
        console.log('\n5. Manually navigating to AI Analytics...');
        await page.goto('http://localhost:3000/admin/ai-analytics');
      } else if (!authState.currentUrl.includes('/admin/')) {
        console.log('\n5. Navigating to AI Analytics from:', authState.currentUrl);
        await page.goto('http://localhost:3000/admin/ai-analytics');
      }
    } else {
      console.log('❌ Login API failed');
      const errorBody = await loginResponse.text();
      console.log('   Error:', errorBody);
      return;
    }
    
    // 6. Wait for AI Analytics page to load
    console.log('\n6. Waiting for AI Analytics page...');
    await page.waitForTimeout(3000);
    
    // Check localStorage again
    const finalAuthState = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      console.log('[Browser] Final token check:', !!token);
      console.log('[Browser] Final user check:', !!user);
      return { hasToken: !!token, hasUser: !!user };
    });
    
    console.log('\n7. Final localStorage state:');
    console.log('   Token:', finalAuthState.hasToken ? '✅ Present' : '❌ Missing');
    console.log('   User:', finalAuthState.hasUser ? '✅ Present' : '❌ Missing');
    
    // 8. Analyze page content
    console.log('\n8. Analyzing page content...');
    
    const pageAnalysis = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      
      return {
        url: window.location.href,
        title: document.querySelector('h1')?.textContent || '',
        
        // Check for AI Analytics content
        hasAIAnalytics: hasText('AI Analytics'),
        hasTotalTokens: hasText('Total Tokens'),
        hasTotalCost: hasText('Total Cost'),
        hasUsageTrends: hasText('Usage Trends'),
        hasOrganizations: hasText('Organizations'),
        
        // Check for error states
        hasAccessDenied: hasText('Access Denied'),
        hasAuthError: hasText('Sign In') || hasText('Sign in'),
        hasLoading: document.querySelector('.animate-spin') !== null,
        
        // Count elements
        cardCount: document.querySelectorAll('[class*="card"]').length,
        tabCount: document.querySelectorAll('[role="tab"]').length
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('=======================================');
    console.log('URL:', pageAnalysis.url);
    console.log('Title:', pageAnalysis.title || 'Not found');
    console.log('');
    console.log('✅ Expected Content:');
    console.log('  AI Analytics:', pageAnalysis.hasAIAnalytics ? '✅' : '❌');
    console.log('  Total Tokens:', pageAnalysis.hasTotalTokens ? '✅' : '❌');
    console.log('  Total Cost:', pageAnalysis.hasTotalCost ? '✅' : '❌');
    console.log('  Usage Trends:', pageAnalysis.hasUsageTrends ? '✅' : '❌');
    console.log('  Organizations:', pageAnalysis.hasOrganizations ? '✅' : '❌');
    console.log('');
    console.log('❌ Error States:');
    console.log('  Access Denied:', pageAnalysis.hasAccessDenied ? '❌' : '✅ No');
    console.log('  Auth Page:', pageAnalysis.hasAuthError ? '❌' : '✅ No');
    console.log('  Loading:', pageAnalysis.hasLoading ? '⏳' : '✅ No');
    console.log('');
    console.log('📊 Elements:');
    console.log('  Cards:', pageAnalysis.cardCount);
    console.log('  Tabs:', pageAnalysis.tabCount);
    
    // 9. Take screenshot
    await page.screenshot({ path: 'ai-analytics-robust-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as ai-analytics-robust-test.png');
    
    // 10. Final verdict
    console.log('\n=======================================');
    console.log('            FINAL VERDICT');
    console.log('=======================================');
    
    const successCount = [
      pageAnalysis.hasAIAnalytics,
      pageAnalysis.hasTotalTokens,
      pageAnalysis.hasTotalCost,
      pageAnalysis.hasUsageTrends
    ].filter(Boolean).length;
    
    if (successCount >= 3) {
      console.log('✅ SUCCESS: AI Analytics page is working!');
      console.log(`   ${successCount}/4 key elements are displaying.`);
    } else if (pageAnalysis.hasAccessDenied) {
      console.log('❌ FAILURE: Access denied');
      console.log('   User lacks admin privileges.');
    } else if (pageAnalysis.hasAuthError) {
      console.log('❌ FAILURE: Authentication not persisting');
      console.log('   Redirected to auth page.');
    } else if (pageAnalysis.hasLoading) {
      console.log('⏳ TIMEOUT: Page still loading');
      console.log('   Check console logs for errors.');
    } else {
      console.log('⚠️ PARTIAL: Page loaded but missing content');
      console.log(`   Only ${successCount}/4 key elements found.`);
    }
    
    // 11. Show relevant console logs
    if (successCount < 3) {
      console.log('\n📝 Recent Console Logs:');
      const relevantLogs = consoleLogs
        .filter(log => 
          log.includes('Admin') || 
          log.includes('auth') || 
          log.includes('Error') ||
          log.includes('failed')
        )
        .slice(-10);
      relevantLogs.forEach(log => console.log('  ', log));
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'ai-analytics-error-robust.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
robustTest();