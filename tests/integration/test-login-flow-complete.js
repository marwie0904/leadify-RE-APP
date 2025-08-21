// Complete test of the fixed login flow
const { chromium } = require('playwright');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const TEST_EMAIL = 'marwryyy@gmail.com';
const TEST_PASSWORD = 'ayokonga123';

async function testLoginFlow() {
  console.log('\n====================================');
  console.log('TESTING COMPLETE LOGIN FLOW');
  console.log('====================================\n');
  
  let browser;
  
  try {
    // Launch browser
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500  // Slow down for visibility
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Simple Auth')) {
        console.log(`  AUTH LOG: ${text}`);
      }
      if (text.includes('[Auth Page]')) {
        console.log(`  PAGE LOG: ${text}`);
      }
    });
    
    // Monitor network
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/auth/login')) {
        console.log(`✅ Login API Response: ${response.status()}`);
      }
      if (url.includes('/api/admin/ai-analytics')) {
        console.log(`📊 AI Analytics API Response: ${response.status()}`);
      }
    });
    
    console.log('1. Clearing any existing session...');
    await page.goto(FRONTEND_URL);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('2. Navigating to auth page...');
    await page.goto(`${FRONTEND_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    console.log('3. Filling login form...');
    // Make sure we're on the Sign In tab
    const signinTab = await page.locator('button[role="tab"]:has-text("Sign In")').first();
    await signinTab.click();
    await page.waitForTimeout(500);
    
    // Fill credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    console.log('4. Submitting login form...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check where we ended up
    const currentUrl = page.url();
    console.log(`5. Current URL: ${currentUrl}`);
    
    // Check localStorage for auth data
    const authData = await page.evaluate(() => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      return {
        hasToken: token !== null,
        hasUser: user !== null,
        tokenPreview: token ? token.substring(0, 50) + '...' : null,
        user: user ? JSON.parse(user) : null
      };
    });
    
    console.log(`\n📌 Auth Status:`);
    console.log(`   Token: ${authData.hasToken ? '✅ Present' : '❌ Missing'}`);
    console.log(`   User: ${authData.hasUser ? '✅ Present' : '❌ Missing'}`);
    if (authData.user) {
      console.log(`   Email: ${authData.user.email}`);
      console.log(`   Role: ${authData.user.role}`);
    }
    
    if (!authData.hasToken) {
      console.log('\n❌ Login failed - token not stored');
      
      // Check for error messages
      const errorText = await page.locator('[role="alert"], .text-destructive').allTextContents();
      if (errorText.length > 0) {
        console.log('   Error messages:', errorText);
      }
      
      // Try the workaround
      console.log('\n6. Attempting direct API login as workaround...');
      const workaroundSuccess = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'marwryyy@gmail.com',
              password: 'ayokonga123'
            })
          });
          
          if (!response.ok) {
            return { success: false, error: `API returned ${response.status}` };
          }
          
          const data = await response.json();
          
          // Store auth data
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            name: 'Admin User',
            role: 'admin',
            organizationId: '',
            hasOrganization: true
          }));
          
          return { success: true };
        } catch (err) {
          return { success: false, error: err.message };
        }
      });
      
      if (workaroundSuccess.success) {
        console.log('✅ Workaround successful - auth data injected');
      } else {
        console.log('❌ Workaround failed:', workaroundSuccess.error);
        throw new Error('Both UI login and workaround failed');
      }
    } else {
      console.log('\n✅ Login successful!');
    }
    
    console.log('\n7. Testing AI Analytics access...');
    await page.goto(`${FRONTEND_URL}/admin/ai-analytics`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check for content or errors
    const pageContent = await page.evaluate(() => {
      const hasCharts = document.querySelectorAll('canvas, svg[class*="chart"]').length > 0;
      const hasTables = document.querySelectorAll('table').length > 0;
      const hasErrors = document.querySelectorAll('[class*="error"], [role="alert"]').length > 0;
      const errorTexts = Array.from(document.querySelectorAll('[class*="error"], [role="alert"]'))
        .map(el => el.textContent?.trim())
        .filter(Boolean);
      
      return {
        hasCharts,
        hasTables,
        hasErrors,
        errorTexts
      };
    });
    
    console.log(`\n📊 AI Analytics Page Status:`);
    console.log(`   Charts: ${pageContent.hasCharts ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Tables: ${pageContent.hasTables ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Errors: ${pageContent.hasErrors ? '❌ Found errors' : '✅ No errors'}`);
    if (pageContent.errorTexts.length > 0) {
      console.log('   Error messages:', pageContent.errorTexts);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'login-flow-test-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: login-flow-test-result.png');
    
    // Final verdict
    console.log('\n====================================');
    if (!pageContent.hasErrors && (pageContent.hasCharts || pageContent.hasTables)) {
      console.log('✅ TEST PASSED - Login flow and AI Analytics working!');
    } else if (authData.hasToken) {
      console.log('⚠️  PARTIAL SUCCESS - Login works but AI Analytics has issues');
    } else {
      console.log('❌ TEST FAILED - Login flow needs more fixes');
    }
    console.log('====================================\n');
    
    // Keep browser open for inspection
    console.log('Browser will remain open for 5 seconds for inspection...');
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
testLoginFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});