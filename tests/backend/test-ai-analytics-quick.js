/**
 * Quick Test for AI Analytics Page
 */

const { chromium } = require('playwright');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function quickTest() {
  console.log('Testing AI Analytics page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Analytics')) {
      console.log('Console:', text);
    }
  });

  try {
    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('Login failed:', authError.message);
      return;
    }

    // 2. Set auth in browser
    await page.goto('http://localhost:3000');
    await page.evaluate((session) => {
      const authKey = `sb-kbmsygyawpiqegemzetp-auth-token`;
      localStorage.setItem(authKey, JSON.stringify(session));
    }, authData.session);

    // 3. Navigate to AI Analytics
    await page.goto('http://localhost:3000/admin/ai-analytics', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    await page.waitForTimeout(2000);

    // 4. Check content
    const pageTitle = await page.textContent('h1').catch(() => 'Not found');
    const hasAIAnalytics = await page.locator('text="AI Analytics"').count();
    const hasTotalTokens = await page.locator('text="Total Tokens"').count();
    const hasTotalCost = await page.locator('text="Total Cost"').count();
    const hasUsageTrends = await page.locator('text="Usage Trends"').count();
    
    console.log('Results:');
    console.log('- Page Title:', pageTitle);
    console.log('- Has "AI Analytics":', hasAIAnalytics > 0 ? '✅ Yes' : '❌ No');
    console.log('- Has "Total Tokens":', hasTotalTokens > 0 ? '✅ Yes' : '❌ No');
    console.log('- Has "Total Cost":', hasTotalCost > 0 ? '✅ Yes' : '❌ No');
    console.log('- Has "Usage Trends":', hasUsageTrends > 0 ? '✅ Yes' : '❌ No');
    
    // Take screenshot
    await page.screenshot({ path: 'ai-analytics-fixed.png', fullPage: true });
    console.log('\nScreenshot saved as ai-analytics-fixed.png');
    
    if (hasAIAnalytics > 0 && hasTotalTokens > 0) {
      console.log('\n✅ AI Analytics page is working correctly!');
    } else {
      console.log('\n❌ AI Analytics page still has issues');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickTest();