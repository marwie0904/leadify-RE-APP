/**
 * Final Test for AI Analytics with Correct Auth System
 */

const { chromium } = require('playwright');
const axios = require('axios');

async function finalTest() {
  console.log('=======================================');
  console.log('   FINAL AI ANALYTICS TEST');
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
    // 1. First get auth token via API login
    console.log('1. Getting auth token via API...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (loginResponse.data.success) {
      console.log('✅ API login successful');
      const token = loginResponse.data.token;
      const user = loginResponse.data.user;
      
      // 2. Navigate to the app first
      console.log('\n2. Navigating to app...');
      await page.goto('http://localhost:3000');
      await page.waitForTimeout(1000);
      
      // 3. Set the auth data in localStorage (matching SimpleAuthProvider)
      console.log('3. Setting auth data in localStorage...');
      await page.evaluate(({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        console.log('[Browser] Auth data set in localStorage');
      }, { token, user });
      
      // 4. Navigate to AI Analytics
      console.log('\n4. Navigating to AI Analytics page...');
      await page.goto('http://localhost:3000/admin/ai-analytics');
      
      // 5. Wait for content to load
      console.log('5. Waiting for page to load...');
      
      // Wait for either content or error
      await Promise.race([
        page.waitForSelector('text="AI Analytics"', { timeout: 10000 }),
        page.waitForSelector('text="Total Tokens"', { timeout: 10000 }),
        page.waitForSelector('text="Access Denied"', { timeout: 10000 })
      ]).catch(() => {
        console.log('Timeout waiting for specific content');
      });
      
      await page.waitForTimeout(3000); // Additional wait for React
      
      // 6. Check page content
      console.log('\n6. Analyzing page content...');
      
      const analysis = await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent || '';
        const hasText = (text) => document.body.textContent.includes(text);
        
        return {
          title: getText('h1'),
          hasAIAnalytics: hasText('AI Analytics'),
          hasTotalTokens: hasText('Total Tokens'),
          hasTotalCost: hasText('Total Cost'),
          hasUsageTrends: hasText('Usage Trends'),
          hasOrganizations: hasText('Active Organizations'),
          hasPerformance: hasText('Performance'),
          hasCostAnalysis: hasText('Cost Analysis'),
          hasAccessDenied: hasText('Access Denied'),
          hasSignIn: hasText('Sign In'),
          hasLoading: document.querySelector('.animate-spin') !== null,
          cardCount: document.querySelectorAll('[class*="card"]').length,
          tabCount: document.querySelectorAll('[role="tab"]').length
        };
      });
      
      console.log('\n📊 Page Analysis:');
      console.log('=======================================');
      console.log('Title:', analysis.title || 'Not found');
      console.log('');
      console.log('✅ Expected Content:');
      console.log('  AI Analytics:', analysis.hasAIAnalytics ? '✅' : '❌');
      console.log('  Total Tokens:', analysis.hasTotalTokens ? '✅' : '❌');
      console.log('  Total Cost:', analysis.hasTotalCost ? '✅' : '❌');
      console.log('  Usage Trends:', analysis.hasUsageTrends ? '✅' : '❌');
      console.log('  Organizations:', analysis.hasOrganizations ? '✅' : '❌');
      console.log('  Performance:', analysis.hasPerformance ? '✅' : '❌');
      console.log('  Cost Analysis:', analysis.hasCostAnalysis ? '✅' : '❌');
      console.log('');
      console.log('❌ Error States:');
      console.log('  Access Denied:', analysis.hasAccessDenied ? '❌' : '✅ No');
      console.log('  Sign In Page:', analysis.hasSignIn ? '❌' : '✅ No');
      console.log('  Loading:', analysis.hasLoading ? '⏳' : '✅ No');
      console.log('');
      console.log('📊 UI Elements:');
      console.log('  Cards:', analysis.cardCount);
      console.log('  Tabs:', analysis.tabCount);
      
      // 7. Get token usage data if page loaded
      if (analysis.hasAIAnalytics) {
        console.log('\n7. Checking displayed data...');
        const dataInfo = await page.evaluate(() => {
          const getCardValue = (title) => {
            const cards = Array.from(document.querySelectorAll('[class*="card"]'));
            for (const card of cards) {
              if (card.textContent.includes(title)) {
                const valueElement = card.querySelector('[class*="text-2xl"], [class*="font-bold"]');
                if (valueElement) return valueElement.textContent;
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
      await page.screenshot({ path: 'ai-analytics-final-test.png', fullPage: true });
      console.log('\n📸 Screenshot saved as ai-analytics-final-test.png');
      
      // 9. Final verdict
      console.log('\n=======================================');
      console.log('            FINAL VERDICT');
      console.log('=======================================');
      
      const successCount = [
        analysis.hasAIAnalytics,
        analysis.hasTotalTokens,
        analysis.hasTotalCost,
        analysis.hasUsageTrends
      ].filter(Boolean).length;
      
      if (successCount >= 3) {
        console.log('✅ SUCCESS: AI Analytics page is working correctly!');
        console.log(`   ${successCount}/4 key elements are displaying.`);
      } else if (analysis.hasAccessDenied) {
        console.log('❌ FAILURE: Access denied');
        console.log('   User does not have admin privileges in dev_members table.');
      } else if (analysis.hasSignIn) {
        console.log('❌ FAILURE: Authentication not working');
        console.log('   Redirected to sign in page.');
      } else if (analysis.hasLoading) {
        console.log('⏳ LOADING: Page is still loading');
        console.log('   Authentication may still be in progress.');
      } else {
        console.log('⚠️ PARTIAL: Page loaded but missing content');
        console.log(`   Only ${successCount}/4 key elements are displaying.`);
      }
      
    } else {
      console.error('❌ API login failed:', loginResponse.data.error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'ai-analytics-error-final.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
finalTest();