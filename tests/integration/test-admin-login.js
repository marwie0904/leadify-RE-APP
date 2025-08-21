// Test the new admin login flow
const { chromium } = require('playwright');

const FRONTEND_URL = 'http://localhost:3000';
const TEST_EMAIL = 'marwryyy@gmail.com';
const TEST_PASSWORD = 'ayokonga123';

async function testAdminLogin() {
  console.log('\n====================================');
  console.log('TESTING ADMIN LOGIN FLOW');
  console.log('====================================\n');
  
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Admin')) {
        console.log(`  LOG: ${text}`);
      }
    });
    
    // Monitor network
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/admin/')) {
        console.log(`📡 Admin API Response: ${response.status()} - ${url.split('/').pop()}`);
      }
    });
    
    console.log('1. Clearing any existing session...');
    await page.goto(FRONTEND_URL);
    await page.evaluate(() => {
      // Clear all auth data
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    });
    
    console.log('2. Navigating to admin login page...');
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'admin-login-page.png' });
    console.log('   Screenshot saved: admin-login-page.png');
    
    console.log('3. Filling admin login form...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log('4. Submitting admin login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check where we ended up
    const currentUrl = page.url();
    console.log(`5. Current URL: ${currentUrl}`);
    
    // Check for admin token in localStorage
    const authData = await page.evaluate(() => {
      const adminToken = localStorage.getItem('admin_token');
      const adminUser = localStorage.getItem('admin_user');
      return {
        hasAdminToken: adminToken !== null,
        hasAdminUser: adminUser !== null,
        adminUser: adminUser ? JSON.parse(adminUser) : null
      };
    });
    
    console.log(`\n📌 Admin Auth Status:`);
    console.log(`   Admin Token: ${authData.hasAdminToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Admin User: ${authData.hasAdminUser ? '✅ Present' : '❌ Missing'}`);
    if (authData.adminUser) {
      console.log(`   Email: ${authData.adminUser.email}`);
      console.log(`   Role: ${authData.adminUser.role}`);
      console.log(`   Name: ${authData.adminUser.name}`);
    }
    
    if (currentUrl.includes('/admin') && !currentUrl.includes('/admin/login')) {
      console.log('\n✅ Admin login successful - redirected to admin dashboard!');
      
      // Take screenshot of admin dashboard
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'admin-dashboard.png', fullPage: true });
      console.log('   Screenshot saved: admin-dashboard.png');
      
      // Test accessing AI Analytics
      console.log('\n6. Testing AI Analytics access...');
      await page.goto(`${FRONTEND_URL}/admin/ai-analytics`);
      await page.waitForTimeout(3000);
      
      const hasContent = await page.evaluate(() => {
        const hasCharts = document.querySelectorAll('canvas, svg[class*="chart"]').length > 0;
        const hasErrors = document.querySelectorAll('[class*="error"], [role="alert"]').length > 0;
        return { hasCharts, hasErrors };
      });
      
      console.log(`   AI Analytics: ${hasContent.hasCharts ? '✅ Content loaded' : '❌ No content'}`);
      console.log(`   Errors: ${hasContent.hasErrors ? '❌ Found errors' : '✅ No errors'}`);
      
      await page.screenshot({ path: 'admin-ai-analytics.png', fullPage: true });
      console.log('   Screenshot saved: admin-ai-analytics.png');
      
    } else {
      console.log('\n❌ Admin login failed or did not redirect properly');
      
      // Check for error messages
      const errorText = await page.locator('[role="alert"], .text-destructive').allTextContents();
      if (errorText.length > 0) {
        console.log('   Error messages:', errorText);
      }
    }
    
    // Test logout
    console.log('\n7. Testing logout...');
    const logoutButton = await page.locator('button[title="Sign out"]').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      const loggedOutUrl = page.url();
      if (loggedOutUrl.includes('/admin/login')) {
        console.log('   ✅ Logout successful - redirected to admin login');
      } else {
        console.log('   ❌ Logout did not redirect properly');
      }
    }
    
    console.log('\n====================================');
    console.log('TEST COMPLETE');
    console.log('====================================\n');
    
    // Keep browser open for inspection
    console.log('Browser will remain open for 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testAdminLogin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});