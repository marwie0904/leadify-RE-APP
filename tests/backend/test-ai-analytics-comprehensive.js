/**
 * Comprehensive Test for AI Analytics Page Authentication
 */

const { chromium } = require('playwright');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function comprehensiveTest() {
  console.log('=======================================');
  console.log('   COMPREHENSIVE AI ANALYTICS TEST');
  console.log('=======================================\n');

  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[useAdminAuth]') || text.includes('[AI Analytics')) {
      console.log('Console:', text);
    }
  });

  // Track network activity
  page.on('response', response => {
    if (response.url().includes('/api/admin/')) {
      console.log('API Response:', response.status(), response.url().split('/').pop());
    }
  });

  try {
    // 1. First navigate to the app to initialize
    console.log('1. Navigating to app root...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(1000);

    // 2. Login via Supabase
    console.log('\n2. Logging in via Supabase...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful');
    console.log('   User:', authData.user.email);
    console.log('   Session:', authData.session ? 'Valid' : 'Invalid');

    // 3. Set auth session in browser localStorage
    console.log('\n3. Setting auth session in browser...');
    await page.evaluate((session) => {
      // Set in multiple possible keys for compatibility
      const keys = [
        'sb-kbmsygyawpiqegemzetp-auth-token',
        `sb-${window.location.hostname.split('.')[0]}-auth-token`,
        'supabase.auth.token'
      ];
      
      keys.forEach(key => {
        localStorage.setItem(key, JSON.stringify({
          currentSession: session,
          expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
        }));
      });
      
      // Also try setting it directly in the Supabase client if available
      if (window.supabase) {
        window.supabase.auth.setSession(session);
      }
      
      console.log('[Browser] Session set in localStorage');
    }, authData.session);

    // 4. Navigate to AI Analytics page
    console.log('\n4. Navigating to AI Analytics page...');
    await page.goto('http://localhost:3000/admin/ai-analytics', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 5. Wait for auth state to stabilize
    console.log('\n5. Waiting for authentication to complete...');
    
    // Wait for either success or error state
    await page.waitForFunction(
      () => {
        const logs = window.consoleLogs || [];
        return logs.some(log => 
          log.includes('Admin access confirmed') || 
          log.includes('Admin access granted') ||
          log.includes('User lacks admin privileges')
        );
      },
      { timeout: 10000 }
    ).catch(() => {
      console.log('⚠️ Timeout waiting for auth confirmation');
    });
    
    await page.waitForTimeout(2000); // Additional wait for React rendering

    // 6. Check page content
    console.log('\n6. Checking page content...');
    
    const pageContent = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent || 'Not found',
        url: window.location.href,
        hasAIAnalytics: document.body.textContent.includes('AI Analytics'),
        hasTotalTokens: document.body.textContent.includes('Total Tokens'),
        hasTotalCost: document.body.textContent.includes('Total Cost'),
        hasUsageTrends: document.body.textContent.includes('Usage Trends'),
        hasOrganizations: document.body.textContent.includes('Organizations'),
        hasAccessDenied: document.body.textContent.includes('Access Denied'),
        hasSignIn: document.body.textContent.includes('Sign In'),
        bodyText: document.body.textContent.substring(0, 200) // First 200 chars
      };
    });
    
    console.log('\nPage Analysis:');
    console.log('- URL:', pageContent.url);
    console.log('- Title:', pageContent.title);
    console.log('- Has "AI Analytics":', pageContent.hasAIAnalytics ? '✅' : '❌');
    console.log('- Has "Total Tokens":', pageContent.hasTotalTokens ? '✅' : '❌');
    console.log('- Has "Total Cost":', pageContent.hasTotalCost ? '✅' : '❌');
    console.log('- Has "Usage Trends":', pageContent.hasUsageTrends ? '✅' : '❌');
    console.log('- Has "Access Denied":', pageContent.hasAccessDenied ? '⚠️' : '✅ No');
    console.log('- Has "Sign In":', pageContent.hasSignIn ? '⚠️' : '✅ No');
    console.log('- Body preview:', pageContent.bodyText);
    
    // 7. Check for specific elements
    console.log('\n7. Checking for specific elements...');
    
    const elements = await page.evaluate(() => {
      return {
        cards: document.querySelectorAll('.card, [class*="card"]').length,
        charts: document.querySelectorAll('svg, canvas').length,
        tables: document.querySelectorAll('table').length,
        buttons: document.querySelectorAll('button').length,
        loadingSpinners: document.querySelectorAll('.animate-spin').length
      };
    });
    
    console.log('Elements found:');
    console.log('- Cards:', elements.cards);
    console.log('- Charts:', elements.charts);
    console.log('- Tables:', elements.tables);
    console.log('- Buttons:', elements.buttons);
    console.log('- Loading spinners:', elements.loadingSpinners);
    
    // 8. Take screenshot
    await page.screenshot({ path: 'ai-analytics-comprehensive-test.png', fullPage: true });
    console.log('\n✅ Screenshot saved as ai-analytics-comprehensive-test.png');
    
    // 9. Final verdict
    console.log('\n=======================================');
    console.log('            TEST RESULTS');
    console.log('=======================================');
    
    if (pageContent.hasAIAnalytics && pageContent.hasTotalTokens) {
      console.log('✅ SUCCESS: AI Analytics page is working correctly!');
    } else if (pageContent.hasAccessDenied) {
      console.log('❌ FAILURE: Access denied - authentication not working');
    } else if (pageContent.hasSignIn) {
      console.log('❌ FAILURE: Redirected to sign in - session not persisting');
    } else {
      console.log('⚠️ PARTIAL: Page loaded but content not displaying correctly');
    }
    
    // 10. Show relevant console logs
    console.log('\n=======================================');
    console.log('         KEY CONSOLE LOGS');
    console.log('=======================================');
    const relevantLogs = consoleLogs.filter(log => 
      log.includes('Admin') || 
      log.includes('auth') || 
      log.includes('session') ||
      log.includes('API')
    ).slice(-10);
    
    relevantLogs.forEach(log => console.log(log));

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    await page.screenshot({ path: 'ai-analytics-error-comprehensive.png' });
    console.log('Error screenshot saved');
  } finally {
    console.log('\nKeeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

// Run the test
comprehensiveTest();