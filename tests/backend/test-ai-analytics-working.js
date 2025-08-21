/**
 * Working Test for AI Analytics with Proper Auth Flow
 */

const { chromium } = require('playwright');

async function testWorkingAuth() {
  console.log('=======================================');
  console.log('   AI ANALYTICS WORKING AUTH TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[') && text.includes(']')) {
      console.log('Console:', text);
    }
  });

  // Track API responses
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log('API:', response.status(), url.split('/').slice(-2).join('/'));
    }
  });

  try {
    // 1. Start fresh - clear any existing auth
    console.log('1. Starting fresh - navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);
    
    // Clear localStorage to start fresh
    await page.evaluate(() => {
      localStorage.clear();
      console.log('[Browser] Cleared localStorage');
    });
    
    // 2. Navigate to auth page
    console.log('\n2. Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // 3. Perform UI login
    console.log('3. Logging in via UI...');
    
    // Check if we're on the login page
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    
    if (await emailInput.count() > 0) {
      // Fill in credentials
      await emailInput.fill('marwryyy@gmail.com');
      await passwordInput.fill('ayokonga123');
      
      // Find and click the sign in button
      const signInButton = await page.locator('button').filter({ hasText: /sign in/i }).first();
      await signInButton.click();
      
      console.log('   Clicked sign in button, waiting for response...');
      
      // Wait for navigation or API response
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 10000 }),
        page.waitForURL('**/setup/**', { timeout: 10000 }),
        page.waitForResponse(response => 
          response.url().includes('/api/auth/login') && response.ok(), 
          { timeout: 10000 }
        )
      ]).catch(() => {
        console.log('   Login completed, checking result...');
      });
      
      await page.waitForTimeout(2000);
      
      // Check if login was successful by checking localStorage
      const authCheck = await page.evaluate(() => {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('auth_user');
        return {
          hasToken: !!token,
          hasUser: !!user,
          userEmail: user ? JSON.parse(user).email : null
        };
      });
      
      if (authCheck.hasToken && authCheck.hasUser) {
        console.log('✅ Login successful!');
        console.log('   User:', authCheck.userEmail);
      } else {
        console.log('❌ Login may have failed - no tokens in localStorage');
      }
    } else {
      console.log('   Not on login page, may already be logged in');
    }
    
    // 4. Navigate to AI Analytics
    console.log('\n4. Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics');
    
    // 5. Wait for page to load
    console.log('5. Waiting for page to load...');
    
    // Wait for React to finish rendering
    await page.waitForTimeout(3000);
    
    // Check localStorage again
    const storageCheck = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      console.log('[Browser] Token exists:', !!token);
      console.log('[Browser] User exists:', !!user);
      if (user) {
        const userData = JSON.parse(user);
        console.log('[Browser] User email:', userData.email);
        console.log('[Browser] User role:', userData.role);
      }
      return { hasToken: !!token, hasUser: !!user };
    });
    
    console.log('\nLocalStorage check:');
    console.log('  Token:', storageCheck.hasToken ? '✅ Present' : '❌ Missing');
    console.log('  User:', storageCheck.hasUser ? '✅ Present' : '❌ Missing');
    
    // 6. Analyze page content
    console.log('\n6. Analyzing page content...');
    
    const analysis = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      const getElement = (selector) => document.querySelector(selector);
      
      // Check for various states
      const loadingSpinner = getElement('.animate-spin');
      const errorMessage = hasText('Access Denied') || hasText('You need admin privileges');
      const loginRedirect = hasText('Sign In') || hasText('Sign in');
      
      // Check for AI Analytics content
      const hasAIAnalytics = hasText('AI Analytics');
      const hasMetrics = hasText('Total Tokens') || hasText('Total Cost') || hasText('Usage Trends');
      const hasTabs = hasText('Organizations') || hasText('Performance') || hasText('Cost Analysis');
      
      return {
        // Page states
        isLoading: !!loadingSpinner,
        hasError: errorMessage,
        isLoginPage: loginRedirect && !hasAIAnalytics,
        
        // Content checks
        hasAIAnalytics,
        hasMetrics,
        hasTabs,
        
        // Element counts
        cardCount: document.querySelectorAll('[class*="card"]').length,
        tabCount: document.querySelectorAll('[role="tab"]').length,
        chartCount: document.querySelectorAll('svg, canvas').length,
        
        // Page info
        title: document.querySelector('h1')?.textContent || '',
        url: window.location.href
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('=======================================');
    console.log('URL:', analysis.url);
    console.log('Title:', analysis.title || 'Not found');
    console.log('');
    console.log('Page State:');
    console.log('  Loading:', analysis.isLoading ? '⏳ Yes' : '✅ No');
    console.log('  Error:', analysis.hasError ? '❌ Yes' : '✅ No');
    console.log('  Login Page:', analysis.isLoginPage ? '❌ Yes' : '✅ No');
    console.log('');
    console.log('Content:');
    console.log('  AI Analytics:', analysis.hasAIAnalytics ? '✅ Yes' : '❌ No');
    console.log('  Metrics:', analysis.hasMetrics ? '✅ Yes' : '❌ No');
    console.log('  Tabs:', analysis.hasTabs ? '✅ Yes' : '❌ No');
    console.log('');
    console.log('Elements:');
    console.log('  Cards:', analysis.cardCount);
    console.log('  Tabs:', analysis.tabCount);
    console.log('  Charts:', analysis.chartCount);
    
    // 7. If page loaded successfully, check for data
    if (analysis.hasAIAnalytics && !analysis.hasError) {
      console.log('\n7. Checking displayed data...');
      
      const dataInfo = await page.evaluate(() => {
        const getCardValue = (title) => {
          const cards = Array.from(document.querySelectorAll('[class*="card"]'));
          for (const card of cards) {
            if (card.textContent.includes(title)) {
              const values = card.querySelectorAll('[class*="text-2xl"], [class*="text-3xl"], [class*="font-bold"]');
              if (values.length > 0) {
                return values[0].textContent;
              }
            }
          }
          return null;
        };
        
        return {
          totalTokens: getCardValue('Total Tokens'),
          totalCost: getCardValue('Total Cost'),
          avgTokens: getCardValue('Avg Tokens'),
          activeOrgs: getCardValue('Active Organizations')
        };
      });
      
      console.log('\nDisplayed Metrics:');
      console.log('  Total Tokens:', dataInfo.totalTokens || 'Not found');
      console.log('  Total Cost:', dataInfo.totalCost || 'Not found');
      console.log('  Avg Tokens/Conv:', dataInfo.avgTokens || 'Not found');
      console.log('  Active Orgs:', dataInfo.activeOrgs || 'Not found');
    }
    
    // 8. Take screenshot
    await page.screenshot({ path: 'ai-analytics-working-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as ai-analytics-working-test.png');
    
    // 9. Final verdict
    console.log('\n=======================================');
    console.log('            FINAL VERDICT');
    console.log('=======================================');
    
    if (analysis.hasAIAnalytics && analysis.hasMetrics) {
      console.log('✅ SUCCESS: AI Analytics page is working correctly!');
      console.log('   All key elements are displaying properly.');
    } else if (analysis.hasError) {
      console.log('❌ FAILURE: Access denied');
      console.log('   User lacks admin privileges in dev_members table.');
    } else if (analysis.isLoginPage) {
      console.log('❌ FAILURE: Authentication not persisting');
      console.log('   Redirected to login page.');
    } else if (analysis.isLoading) {
      console.log('⏳ TIMEOUT: Page still loading');
      console.log('   Authentication or data fetch may be stuck.');
    } else {
      console.log('⚠️ PARTIAL: Page loaded but missing content');
      console.log('   Some elements are not displaying correctly.');
    }
    
    // 10. Try navigation if successful
    if (analysis.hasAIAnalytics && !analysis.hasError) {
      console.log('\n10. Testing navigation to other admin pages...');
      
      // Try Issues page
      await page.goto('http://localhost:3000/admin/issues');
      await page.waitForTimeout(2000);
      const hasIssues = await page.evaluate(() => document.body.textContent.includes('Issues'));
      console.log('  Issues page:', hasIssues ? '✅ Loaded' : '❌ Failed');
      
      // Try Feature Requests page
      await page.goto('http://localhost:3000/admin/feature-requests');
      await page.waitForTimeout(2000);
      const hasFeatures = await page.evaluate(() => document.body.textContent.includes('Feature Requests'));
      console.log('  Feature Requests page:', hasFeatures ? '✅ Loaded' : '❌ Failed');
      
      // Go back to AI Analytics
      await page.goto('http://localhost:3000/admin/ai-analytics');
      await page.waitForTimeout(2000);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'ai-analytics-error-working.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testWorkingAuth();