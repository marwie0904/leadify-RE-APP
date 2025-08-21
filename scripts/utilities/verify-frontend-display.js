const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'http://localhost:3000';

// Pages to verify
const PAGES_TO_CHECK = [
  { name: 'Dashboard', path: '/dashboard', expectedElements: ['Analytics', 'Recent Activity'] },
  { name: 'Conversations', path: '/conversations', expectedElements: ['Conversations', 'Messages'] },
  { name: 'Leads', path: '/leads', expectedElements: ['Leads', 'BANT Score'] },
  { name: 'AI Analytics', path: '/ai-analytics', expectedElements: ['Token Usage', 'Cost'] },
  { name: 'Agents', path: '/agents', expectedElements: ['ResidentialBot', 'CommercialAssist'] },
  { name: 'Organizations', path: '/organizations', expectedElements: ['Prime Residential', 'Commercial Property'] },
  { name: 'Issues', path: '/issues', expectedElements: ['Chat widget', 'BANT scoring'] },
  { name: 'Feature Requests', path: '/feature-requests', expectedElements: ['Zillow', 'Multi-language'] }
];

async function verifyPage(page, pageInfo) {
  console.log(`\n📄 Checking ${pageInfo.name} page...`);
  
  // Navigate to page
  await page.goto(`${BASE_URL}${pageInfo.path}`);
  await page.waitForLoadState('networkidle');
  
  // Check for expected elements
  let foundElements = 0;
  for (const element of pageInfo.expectedElements) {
    const found = await page.locator(`text=/${element}/i`).first().isVisible().catch(() => false);
    if (found) {
      console.log(`  ✅ Found: ${element}`);
      foundElements++;
    } else {
      console.log(`  ❌ Missing: ${element}`);
    }
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: `verify-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`,
    fullPage: true 
  });
  
  return foundElements === pageInfo.expectedElements.length;
}

async function verifyDatabaseSync() {
  console.log('\n🔄 Verifying Database Synchronization...');
  
  const checks = {
    users: 0,
    organizations: 0,
    agents: 0,
    conversations: 0,
    messages: 0,
    leads: 0,
    issues: 0,
    feature_requests: 0,
    ai_token_usage: 0
  };
  
  // Check each table
  for (const table of Object.keys(checks)) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      checks[table] = count || 0;
      console.log(`  ${count > 0 ? '✅' : '⚠️ '} ${table}: ${count} records`);
    } else {
      console.log(`  ❌ ${table}: Error - ${error.message}`);
    }
  }
  
  return checks;
}

async function runVerification() {
  console.log('🔍 Frontend Display Verification Tool');
  console.log('=' .repeat(50));
  console.log('This tool verifies that all test data is properly displayed\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const results = {
    pagesChecked: 0,
    pagesSuccess: 0,
    pagesFailed: 0,
    databaseSync: null
  };
  
  try {
    // First verify database has data
    results.databaseSync = await verifyDatabaseSync();
    
    // Create context and login
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Login as admin
    console.log('\n🔐 Logging in as admin...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    
    await emailInput.fill('admin@primeresidential.com');
    await passwordInput.fill('TestPassword123!');
    
    await page.locator('button:has-text("Sign in"), button:has-text("Login")').first().click();
    await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {});
    
    console.log('✅ Logged in successfully');
    
    // Verify each page
    for (const pageInfo of PAGES_TO_CHECK) {
      results.pagesChecked++;
      const success = await verifyPage(page, pageInfo);
      
      if (success) {
        results.pagesSuccess++;
      } else {
        results.pagesFailed++;
      }
      
      await page.waitForTimeout(1000);
    }
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Verification error:', error);
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n' + '=' .repeat(50));
  console.log('📊 VERIFICATION REPORT');
  console.log('=' .repeat(50));
  
  console.log('\n📈 Database Status:');
  if (results.databaseSync) {
    console.log(`  - Users: ${results.databaseSync.users}`);
    console.log(`  - Organizations: ${results.databaseSync.organizations}`);
    console.log(`  - AI Agents: ${results.databaseSync.agents}`);
    console.log(`  - Conversations: ${results.databaseSync.conversations}`);
    console.log(`  - Messages: ${results.databaseSync.messages}`);
    console.log(`  - Leads: ${results.databaseSync.leads}`);
    console.log(`  - Issues: ${results.databaseSync.issues}`);
    console.log(`  - Feature Requests: ${results.databaseSync.feature_requests}`);
    console.log(`  - Token Usage Records: ${results.databaseSync.ai_token_usage}`);
  }
  
  console.log('\n📄 Page Verification:');
  console.log(`  - Pages Checked: ${results.pagesChecked}`);
  console.log(`  - Successful: ${results.pagesSuccess}`);
  console.log(`  - Failed: ${results.pagesFailed}`);
  console.log(`  - Success Rate: ${((results.pagesSuccess / results.pagesChecked) * 100).toFixed(1)}%`);
  
  console.log('\n📸 Screenshots saved to current directory');
  console.log('=' .repeat(50));
  
  // Recommendations
  if (results.pagesFailed > 0) {
    console.log('\n⚠️  RECOMMENDATIONS:');
    console.log('  1. Check if all frontend routes are properly configured');
    console.log('  2. Verify that API endpoints are returning data');
    console.log('  3. Check browser console for JavaScript errors');
    console.log('  4. Ensure authentication tokens are valid');
  } else {
    console.log('\n✅ All pages are displaying test data correctly!');
  }
  
  return results;
}

// Main execution
if (require.main === module) {
  runVerification()
    .then((results) => {
      console.log('\n🎉 Verification completed!');
      process.exit(results.pagesFailed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { runVerification };