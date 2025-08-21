/**
 * Test Issues Page with Authentication
 */

const { chromium } = require('playwright');

async function testIssuesPage() {
  console.log('=======================================');
  console.log('   ISSUES PAGE TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: false 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[') || text.includes('Issues') || text.includes('Error')) {
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
    // 1. Navigate to auth page and login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);
    
    // Fill login form
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    
    // Submit form and wait for login
    const [loginResponse] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/login'),
        { timeout: 30000 }
      ),
      page.locator('button[type="submit"]:has-text("Sign In")').first().click()
    ]);
    
    if (loginResponse.ok()) {
      console.log('✅ Login successful');
      await page.waitForTimeout(3000);
    } else {
      console.log('❌ Login failed');
      return;
    }
    
    // 2. Navigate to Issues page
    console.log('\n2. Navigating to Issues page...');
    await page.goto('http://localhost:3000/admin/issues');
    await page.waitForTimeout(3000);
    
    // 3. Check authentication state
    const authState = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      return {
        hasToken: !!token,
        hasUser: !!user,
        userEmail: user ? JSON.parse(user).email : null
      };
    });
    
    console.log('\n3. Authentication state:');
    console.log('   Token:', authState.hasToken ? '✅ Present' : '❌ Missing');
    console.log('   User:', authState.hasUser ? `✅ ${authState.userEmail}` : '❌ Missing');
    
    // 4. Analyze page content
    console.log('\n4. Analyzing Issues page content...');
    
    const pageAnalysis = await page.evaluate(() => {
      const hasText = (text) => document.body.textContent.includes(text);
      
      return {
        url: window.location.href,
        title: document.querySelector('h1')?.textContent || '',
        
        // Check for Issues page content
        hasIssuesTitle: hasText('Issue Dashboard') || hasText('Issues'),
        hasStatusFilter: hasText('Status') || hasText('All Statuses'),
        hasSeverityFilter: hasText('Severity') || hasText('All Severities'),
        hasTypeFilter: hasText('Type') || hasText('All Types'),
        hasTable: document.querySelector('table') !== null,
        hasNoDataMessage: hasText('No issues found') || hasText('No data'),
        
        // Check for error states
        hasAccessDenied: hasText('Access Denied'),
        hasAuthError: hasText('Sign In') || hasText('Sign in'),
        hasLoading: document.querySelector('.animate-spin') !== null,
        
        // Count elements
        tableRows: document.querySelectorAll('tbody tr').length,
        filterButtons: document.querySelectorAll('button[role="combobox"]').length,
        buttons: document.querySelectorAll('button').length
      };
    });
    
    console.log('\n📊 Page Analysis:');
    console.log('=======================================');
    console.log('URL:', pageAnalysis.url);
    console.log('Title:', pageAnalysis.title || 'Not found');
    console.log('');
    console.log('✅ Expected Content:');
    console.log('  Issues Title:', pageAnalysis.hasIssuesTitle ? '✅' : '❌');
    console.log('  Status Filter:', pageAnalysis.hasStatusFilter ? '✅' : '❌');
    console.log('  Severity Filter:', pageAnalysis.hasSeverityFilter ? '✅' : '❌');
    console.log('  Type Filter:', pageAnalysis.hasTypeFilter ? '✅' : '❌');
    console.log('  Table:', pageAnalysis.hasTable ? '✅' : '❌');
    console.log('  No Data Message:', pageAnalysis.hasNoDataMessage ? '📝' : '—');
    console.log('');
    console.log('❌ Error States:');
    console.log('  Access Denied:', pageAnalysis.hasAccessDenied ? '❌' : '✅ No');
    console.log('  Auth Page:', pageAnalysis.hasAuthError ? '❌' : '✅ No');
    console.log('  Loading:', pageAnalysis.hasLoading ? '⏳' : '✅ No');
    console.log('');
    console.log('📊 Elements:');
    console.log('  Table Rows:', pageAnalysis.tableRows);
    console.log('  Filter Buttons:', pageAnalysis.filterButtons);
    console.log('  Total Buttons:', pageAnalysis.buttons);
    
    // 5. Take screenshot
    await page.screenshot({ path: 'issues-page-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved as issues-page-test.png');
    
    // 6. Final verdict
    console.log('\n=======================================');
    console.log('            FINAL VERDICT');
    console.log('=======================================');
    
    const successCount = [
      pageAnalysis.hasIssuesTitle,
      pageAnalysis.hasStatusFilter,
      pageAnalysis.hasSeverityFilter,
      pageAnalysis.hasTypeFilter
    ].filter(Boolean).length;
    
    if (successCount >= 3) {
      console.log('✅ SUCCESS: Issues page is working!');
      console.log(`   ${successCount}/4 key elements found.`);
      if (pageAnalysis.tableRows === 0 && pageAnalysis.hasNoDataMessage) {
        console.log('   Note: No issues in database (expected).');
      }
    } else if (pageAnalysis.hasAccessDenied) {
      console.log('❌ FAILURE: Access denied');
    } else if (pageAnalysis.hasAuthError) {
      console.log('❌ FAILURE: Authentication not persisting');
    } else {
      console.log('⚠️ PARTIAL: Page loaded but missing content');
      console.log(`   Only ${successCount}/4 key elements found.`);
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'issues-error.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\n📝 Test complete. Browser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testIssuesPage();