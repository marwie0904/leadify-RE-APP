/**
 * Fixed AI Analytics Test - No localStorage access issues
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  testUser: {
    email: 'marwryyy@gmail.com',
    password: 'ayokonga123'
  },
  timeout: 60000
};

async function testAIAnalytics() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   AI ANALYTICS PAGE TEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: CONFIG.timeout
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser error]:`, msg.text());
      }
    });
    
    // Capture API responses
    const apiResponses = [];
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/admin/ai-analytics')) {
        const status = response.status();
        let data = null;
        try {
          data = await response.json();
        } catch {}
        
        apiResponses.push({
          url: url.replace(CONFIG.apiUrl, ''),
          status,
          data
        });
        
        console.log(`📡 API Call: ${url.replace(CONFIG.apiUrl, '')} - Status: ${status}`);
        if (data) {
          console.log(`   Response:`, JSON.stringify(data).substring(0, 200));
        }
      }
    });
    
    // Phase 1: Login
    console.log('\n📌 PHASE 1: AUTHENTICATION');
    console.log('─────────────────────────');
    console.log('Navigating to login page...');
    await page.goto(`${CONFIG.baseUrl}/auth`);
    await page.waitForTimeout(2000);
    
    // Fill login form
    console.log('Filling login credentials...');
    await page.fill('input[type="email"]', CONFIG.testUser.email);
    await page.fill('input[type="password"]', CONFIG.testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    console.log('Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful');
    await page.waitForTimeout(2000);
    
    // Phase 2: Navigate to AI Analytics
    console.log('\n📌 PHASE 2: AI ANALYTICS PAGE');
    console.log('────────────────────────────');
    console.log('Navigating to AI Analytics...');
    await page.goto(`${CONFIG.baseUrl}/admin/ai-analytics`);
    await page.waitForTimeout(5000); // Give time for data to load
    
    // Check page title
    const pageContent = await page.content();
    console.log('\n📋 Page Analysis:');
    
    // Check if it's showing the actual AI Analytics page
    if (pageContent.includes('AI Analytics')) {
      console.log('✅ AI Analytics page loaded');
    } else if (pageContent.includes('Access Denied') || pageContent.includes('Admin Access Required')) {
      console.log('❌ Access denied - admin permissions issue');
      console.log('   Page is requesting dev_members table access');
    } else if (pageContent.includes('Dashboard')) {
      console.log('❌ Wrong page - showing Dashboard instead of AI Analytics');
    }
    
    // Look for token metrics
    console.log('\n📊 Looking for token metrics...');
    
    // Try to find Total Tokens Used
    const tokenElements = await page.locator('text=/Total Tokens/i').count();
    if (tokenElements > 0) {
      console.log(`✅ Found ${tokenElements} token-related elements`);
      
      // Try to get the actual token value
      try {
        const tokenCard = await page.locator('.card:has-text("Total Tokens")').first();
        const tokenValue = await tokenCard.locator('.text-2xl').textContent();
        console.log(`   Total Tokens Value: ${tokenValue}`);
      } catch (e) {
        console.log('   Could not extract token value');
      }
    } else {
      console.log('❌ No token metrics found on page');
    }
    
    // Look for cost information
    const costElements = await page.locator('text=/Total Cost/i').count();
    if (costElements > 0) {
      console.log(`✅ Found ${costElements} cost-related elements`);
      
      try {
        const costCard = await page.locator('.card:has-text("Total Cost")').first();
        const costValue = await costCard.locator('.text-2xl').textContent();
        console.log(`   Total Cost Value: ${costValue}`);
      } catch (e) {
        console.log('   Could not extract cost value');
      }
    } else {
      console.log('❌ No cost metrics found on page');
    }
    
    // Check for charts
    const charts = await page.locator('canvas, svg[role="img"], .recharts-wrapper').count();
    console.log(`📈 Found ${charts} charts on page`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/ai-analytics-fixed.png', fullPage: true });
    console.log('\n📸 Screenshot saved to test-results/ai-analytics-fixed.png');
    
    // Phase 3: API Response Analysis
    console.log('\n📌 PHASE 3: API RESPONSE ANALYSIS');
    console.log('──────────────────────────────────');
    console.log(`Total AI Analytics API calls: ${apiResponses.length}`);
    
    apiResponses.forEach((resp, index) => {
      console.log(`\nAPI Call ${index + 1}:`);
      console.log(`  URL: ${resp.url}`);
      console.log(`  Status: ${resp.status}`);
      if (resp.data) {
        console.log(`  Has Data: ${resp.data.success ? 'Yes' : 'No'}`);
        if (resp.data.data) {
          const keys = Object.keys(resp.data.data);
          console.log(`  Data Keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        }
      }
    });
    
    // Final verdict
    console.log('\n🏁 FINAL VERDICT');
    console.log('────────────────');
    
    if (tokenElements > 0 && costElements > 0) {
      console.log('✅ AI ANALYTICS PAGE IS WORKING');
      console.log('   Token and cost metrics are displayed');
    } else if (pageContent.includes('Access Denied')) {
      console.log('❌ AI ANALYTICS ACCESS ISSUE');
      console.log('\nTo fix this issue:');
      console.log('1. The page requires dev_members table entry');
      console.log('2. User needs admin/developer/super_admin role');
      console.log('3. Check if requireAdmin middleware is working correctly');
    } else {
      console.log('❌ AI ANALYTICS DISPLAY ISSUE');
      console.log('\nPotential issues:');
      console.log('1. API endpoints may not be returning data correctly');
      console.log('2. Frontend may not be handling the data properly');
      console.log('3. Authentication/authorization may be failing');
    }
    
  } catch (error) {
    console.error('Fatal error during test:', error);
  } finally {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Test completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
    await browser.close();
  }
}

// Run the test
testAIAnalytics().catch(console.error);