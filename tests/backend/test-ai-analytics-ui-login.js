/**
 * Test AI Analytics with UI Login
 */

const { chromium } = require('playwright');

async function testWithUILogin() {
  console.log('=======================================');
  console.log('   AI ANALYTICS TEST WITH UI LOGIN');
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
    if (text.includes('[useAdminAuth]') || text.includes('[AI Analytics') || text.includes('Admin')) {
      console.log('Console:', text);
    }
  });

  // Track API responses
  page.on('response', response => {
    if (response.url().includes('/api/admin/')) {
      console.log('API:', response.status(), response.url().split('/').slice(-2).join('/'));
    }
  });

  try {
    // 1. Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // 2. Check if already logged in
    const isLoginPage = await page.locator('input[type="email"]').count() > 0;
    
    if (isLoginPage) {
      console.log('2. Logging in through UI...');
      
      // Fill in email
      await page.fill('input[type="email"]', 'marwryyy@gmail.com');
      
      // Fill in password
      await page.fill('input[type="password"]', 'ayokonga123');
      
      // Click sign in button
      await page.click('button:has-text("Sign In"), button:has-text("Sign in"), button:has-text("Login")');
      
      // Wait for navigation
      await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
        console.log('Did not redirect to dashboard');
      });
      
      console.log('✅ Login successful');
    } else {
      console.log('2. Already logged in, continuing...');
    }
    
    // 3. Wait a moment for session to establish
    await page.waitForTimeout(2000);
    
    // 4. Navigate to AI Analytics
    console.log('\n3. Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics');
    
    // 5. Wait for content to load
    console.log('4. Waiting for page to load...');
    
    // Wait for either content or error
    await Promise.race([
      page.waitForSelector('text="AI Analytics"', { timeout: 10000 }),
      page.waitForSelector('text="Access Denied"', { timeout: 10000 }),
      page.waitForSelector('text="Total Tokens"', { timeout: 10000 })
    ]).catch(() => {
      console.log('Timeout waiting for content');
    });
    
    await page.waitForTimeout(3000); // Additional wait for React
    
    // 6. Check page content
    console.log('\n5. Analyzing page content...');
    
    const analysis = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.textContent || '';
      const hasText = (text) => document.body.textContent.includes(text);
      
      return {
        title: getText('h1'),
        hasAIAnalytics: hasText('AI Analytics'),
        hasTotalTokens: hasText('Total Tokens'),
        hasTotalCost: hasText('Total Cost'),
        hasUsageTrends: hasText('Usage Trends'),
        hasOrganizations: hasText('Organizations'),
        hasPerformance: hasText('Performance'),
        hasAccessDenied: hasText('Access Denied'),
        hasLoading: document.querySelector('.animate-spin') !== null,
        cardCount: document.querySelectorAll('[class*="card"]').length,
        buttonCount: document.querySelectorAll('button').length
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('----------------------------------------');
    console.log('Title:', analysis.title || 'Not found');
    console.log('');
    console.log('Content Checks:');
    console.log('  AI Analytics:', analysis.hasAIAnalytics ? '✅ Yes' : '❌ No');
    console.log('  Total Tokens:', analysis.hasTotalTokens ? '✅ Yes' : '❌ No');
    console.log('  Total Cost:', analysis.hasTotalCost ? '✅ Yes' : '❌ No');
    console.log('  Usage Trends:', analysis.hasUsageTrends ? '✅ Yes' : '❌ No');
    console.log('  Organizations:', analysis.hasOrganizations ? '✅ Yes' : '❌ No');
    console.log('  Performance:', analysis.hasPerformance ? '✅ Yes' : '❌ No');
    console.log('');
    console.log('Status:');
    console.log('  Access Denied:', analysis.hasAccessDenied ? '❌ Yes' : '✅ No');
    console.log('  Loading:', analysis.hasLoading ? '⏳ Yes' : '✅ No');
    console.log('');
    console.log('Elements:');
    console.log('  Cards:', analysis.cardCount);
    console.log('  Buttons:', analysis.buttonCount);
    
    // 7. Take screenshot
    await page.screenshot({ path: 'ai-analytics-ui-login-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as ai-analytics-ui-login-test.png');
    
    // 8. Final verdict
    console.log('\n=======================================');
    console.log('            FINAL VERDICT');
    console.log('=======================================');
    
    if (analysis.hasAIAnalytics && analysis.hasTotalTokens && analysis.hasTotalCost) {
      console.log('✅ SUCCESS: AI Analytics page is working correctly!');
      console.log('   The page displays all expected content.');
    } else if (analysis.hasAccessDenied) {
      console.log('❌ FAILURE: Access denied');
      console.log('   User does not have admin privileges.');
    } else if (analysis.hasLoading) {
      console.log('⏳ LOADING: Page is still loading');
      console.log('   The authentication may still be in progress.');
    } else {
      console.log('⚠️ PARTIAL: Page loaded but missing content');
      console.log('   Some elements may not be rendering correctly.');
    }
    
    // 9. Try clicking on tabs if page loaded
    if (analysis.hasAIAnalytics) {
      console.log('\n6. Testing tab navigation...');
      
      const tabs = ['Organizations', 'Performance', 'Cost Analysis'];
      for (const tab of tabs) {
        const tabElement = await page.locator(`text="${tab}"`).first();
        if (await tabElement.count() > 0) {
          await tabElement.click();
          await page.waitForTimeout(1000);
          console.log(`✅ Clicked ${tab} tab`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'ai-analytics-error-ui.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testWithUILogin();