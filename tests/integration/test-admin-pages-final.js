/**
 * Final Comprehensive Test for All Admin Pages
 */

const { chromium } = require('playwright');

async function finalAdminPagesTest() {
  console.log('=======================================');
  console.log('   FINAL ADMIN PAGES TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Results tracking
  const results = {
    login: false,
    aiAnalytics: false,
    issues: false,
    featureRequests: false,
    navigation: false
  };

  // Track console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // 1. Login
    console.log('1. AUTHENTICATION TEST');
    console.log('-----------------------');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // Fill and submit login form
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    
    const [loginResponse] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login'),
        { timeout: 30000 }
      ),
      page.locator('button[type="submit"]:has-text("Sign In")').first().click()
    ]);
    
    if (loginResponse.ok()) {
      console.log('✅ Login successful');
      results.login = true;
      await page.waitForTimeout(3000);
    } else {
      console.log('❌ Login failed');
      return results;
    }
    
    // Verify authentication
    const authState = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      return {
        hasToken: !!token,
        hasUser: !!user,
        userEmail: user ? JSON.parse(user).email : null
      };
    });
    console.log('   Token:', authState.hasToken ? '✅' : '❌');
    console.log('   User:', authState.userEmail || '❌');
    
    // 2. Test AI Analytics Page
    console.log('\n2. AI ANALYTICS PAGE TEST');
    console.log('--------------------------');
    await page.goto('http://localhost:3000/admin/ai-analytics');
    await page.waitForTimeout(3000);
    
    const aiAnalyticsContent = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      return {
        title: hasText('AI Analytics'),
        metrics: hasText('Total Tokens') || hasText('Total Cost'),
        tabs: hasText('Organizations') || hasText('Performance'),
        error: hasText('Access Denied')
      };
    });
    
    if (aiAnalyticsContent.title && aiAnalyticsContent.metrics && !aiAnalyticsContent.error) {
      console.log('✅ AI Analytics page working');
      results.aiAnalytics = true;
    } else {
      console.log('❌ AI Analytics page issues');
    }
    console.log('   Title:', aiAnalyticsContent.title ? '✅' : '❌');
    console.log('   Metrics:', aiAnalyticsContent.metrics ? '✅' : '❌');
    console.log('   Tabs:', aiAnalyticsContent.tabs ? '✅' : '❌');
    
    await page.screenshot({ path: 'final-test-ai-analytics.png' });
    
    // 3. Test Issues Page
    console.log('\n3. ISSUES PAGE TEST');
    console.log('--------------------');
    await page.goto('http://localhost:3000/admin/issues');
    await page.waitForTimeout(3000);
    
    const issuesContent = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      return {
        title: hasText('Issue') || hasText('Bug'),
        filters: hasText('Status') || hasText('Severity'),
        error: hasText('Access Denied')
      };
    });
    
    if ((issuesContent.title || issuesContent.filters) && !issuesContent.error) {
      console.log('✅ Issues page working');
      results.issues = true;
    } else {
      console.log('❌ Issues page issues');
    }
    console.log('   Title:', issuesContent.title ? '✅' : '❌');
    console.log('   Filters:', issuesContent.filters ? '✅' : '❌');
    
    await page.screenshot({ path: 'final-test-issues.png' });
    
    // 4. Test Feature Requests Page
    console.log('\n4. FEATURE REQUESTS PAGE TEST');
    console.log('-------------------------------');
    await page.goto('http://localhost:3000/admin/feature-requests');
    await page.waitForTimeout(3000);
    
    const featureContent = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      return {
        title: hasText('Feature Request'),
        filters: hasText('Status') || hasText('Priority'),
        cards: document.querySelectorAll('[class*="card"]').length > 0,
        error: hasText('Access Denied')
      };
    });
    
    if ((featureContent.title || featureContent.filters) && !featureContent.error) {
      console.log('✅ Feature Requests page working');
      results.featureRequests = true;
    } else {
      console.log('❌ Feature Requests page issues');
    }
    console.log('   Title:', featureContent.title ? '✅' : '❌');
    console.log('   Filters:', featureContent.filters ? '✅' : '❌');
    console.log('   Cards:', featureContent.cards ? '✅' : '❌');
    
    await page.screenshot({ path: 'final-test-feature-requests.png' });
    
    // 5. Test Navigation Between Pages
    console.log('\n5. NAVIGATION TEST');
    console.log('-------------------');
    
    // Quick navigation test
    await page.goto('http://localhost:3000/admin/ai-analytics');
    await page.waitForTimeout(1000);
    let url = page.url();
    const nav1 = url.includes('/admin/ai-analytics');
    
    await page.goto('http://localhost:3000/admin/issues');
    await page.waitForTimeout(1000);
    url = page.url();
    const nav2 = url.includes('/admin/issues');
    
    await page.goto('http://localhost:3000/admin/feature-requests');
    await page.waitForTimeout(1000);
    url = page.url();
    const nav3 = url.includes('/admin/feature-requests');
    
    if (nav1 && nav2 && nav3) {
      console.log('✅ Navigation working');
      results.navigation = true;
    } else {
      console.log('❌ Navigation issues');
    }
    
    // 6. Check for JavaScript errors
    console.log('\n6. ERROR CHECK');
    console.log('---------------');
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log(`❌ ${errors.length} JavaScript errors found:`);
      errors.slice(0, 5).forEach(err => console.log('   -', err.substring(0, 100)));
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'final-test-error.png' });
  } finally {
    // Final Results Summary
    console.log('\n=======================================');
    console.log('          FINAL TEST RESULTS');
    console.log('=======================================');
    
    const passedTests = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    const allPassed = passedTests === totalTests;
    
    console.log('\nIndividual Results:');
    console.log('  Login:            ', results.login ? '✅ PASS' : '❌ FAIL');
    console.log('  AI Analytics:     ', results.aiAnalytics ? '✅ PASS' : '❌ FAIL');
    console.log('  Issues:           ', results.issues ? '✅ PASS' : '❌ FAIL');
    console.log('  Feature Requests: ', results.featureRequests ? '✅ PASS' : '❌ FAIL');
    console.log('  Navigation:       ', results.navigation ? '✅ PASS' : '❌ FAIL');
    
    console.log('\n----------------------------------------');
    console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
    console.log('----------------------------------------');
    
    if (allPassed) {
      console.log('\n🎉 SUCCESS: All admin pages are working correctly!');
      console.log('   Authentication persistence issue is FIXED.');
      console.log('   All pages are accessible and displaying content.');
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS: Some issues remain');
      console.log(`   ${totalTests - passedTests} test(s) failed.`);
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - final-test-ai-analytics.png');
    console.log('   - final-test-issues.png');
    console.log('   - final-test-feature-requests.png');
    
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
    
    return results;
  }
}

// Run the test
finalAdminPagesTest().then(results => {
  process.exit(Object.values(results).every(r => r) ? 0 : 1);
});