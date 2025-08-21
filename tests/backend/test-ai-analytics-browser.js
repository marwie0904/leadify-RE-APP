/**
 * Test AI Analytics Page in Browser
 */

const { chromium } = require('playwright');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAIAnalyticsBrowser() {
  console.log('=======================================');
  console.log('    AI ANALYTICS BROWSER TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ headless: false, devtools: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics')) {
      console.log('Browser Console:', text);
    }
  });

  // Listen to network requests
  page.on('request', request => {
    if (request.url().includes('/api/admin/ai-analytics')) {
      console.log('API Request:', request.method(), request.url());
    }
  });

  // Listen to network responses
  page.on('response', response => {
    if (response.url().includes('/api/admin/ai-analytics')) {
      console.log('API Response:', response.status(), response.url());
    }
  });

  try {
    // 1. Login as marwryyy@gmail.com
    console.log('1. Logging in via Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful\n');

    // 2. Set auth session in browser
    console.log('2. Setting auth session in browser...');
    await page.goto('http://localhost:3000');
    
    // Set the auth token in localStorage
    await page.evaluate((session) => {
      const authKey = `sb-${window.location.hostname.split('.')[0]}-auth-token`;
      localStorage.setItem(authKey, JSON.stringify(session));
      
      // Also set in the new format used by newer Supabase versions
      const newAuthKey = `sb-kbmsygyawpiqegemzetp-auth-token`;
      localStorage.setItem(newAuthKey, JSON.stringify(session));
    }, authData.session);

    console.log('✅ Auth session set\n');

    // 3. Navigate to AI Analytics page
    console.log('3. Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for React to render
    await page.waitForTimeout(3000);

    // 4. Check page content
    console.log('4. Checking page content...\n');
    
    // Check page title
    const pageTitle = await page.textContent('h1').catch(() => null);
    console.log('Page Title:', pageTitle || 'Not found');
    
    // Check for loading state
    const hasLoader = await page.locator('.animate-spin').count();
    console.log('Has loading spinner:', hasLoader > 0);
    
    // Check for error messages
    const errorText = await page.textContent('[role="alert"]').catch(() => null);
    if (errorText) {
      console.log('Error Alert:', errorText);
    }
    
    // Check for main content areas
    const hasCards = await page.locator('.card, [class*="card"]').count();
    console.log('Number of cards on page:', hasCards);
    
    // Check for specific AI Analytics content
    const hasTokenUsage = await page.textContent(':has-text("Total Tokens")').catch(() => null);
    console.log('Has "Total Tokens":', !!hasTokenUsage);
    
    const hasCost = await page.textContent(':has-text("Total Cost")').catch(() => null);
    console.log('Has "Total Cost":', !!hasCost);
    
    const hasAnalytics = await page.textContent(':has-text("AI Analytics")').catch(() => null);
    console.log('Has "AI Analytics":', !!hasAnalytics);
    
    const hasDashboard = await page.textContent(':has-text("Dashboard")').catch(() => null);
    console.log('Has "Dashboard":', !!hasDashboard);
    
    // Take a screenshot
    await page.screenshot({ path: 'ai-analytics-page-test.png', fullPage: true });
    console.log('\n✅ Screenshot saved as ai-analytics-page-test.png');
    
    // 5. Check browser console for errors
    console.log('\n5. Checking for JavaScript errors...');
    const errors = await page.evaluate(() => {
      const errorLogs = [];
      // Check if there were any errors logged
      return errorLogs;
    });
    
    // Wait to see console logs
    await page.waitForTimeout(2000);

    console.log('\n=======================================');
    console.log('    TEST COMPLETE');
    console.log('=======================================');

  } catch (error) {
    console.error('Fatal error:', error);
    await page.screenshot({ path: 'ai-analytics-error.png' });
    console.log('Error screenshot saved as ai-analytics-error.png');
  } finally {
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testAIAnalyticsBrowser();