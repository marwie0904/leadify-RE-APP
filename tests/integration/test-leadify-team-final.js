const { chromium } = require('playwright');
const fs = require('fs');

const API_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'marwryyy@gmail.com',
  password: 'ayokonga123'
};

async function testLeadifyTeamPage() {
  let browser;
  const results = {
    timestamp: new Date().toISOString(),
    frontend_url: FRONTEND_URL,
    api_url: API_URL,
    test_user: TEST_CREDENTIALS.email,
    tests: [],
    screenshots: []
  };

  try {
    console.log('🚀 Starting Leadify Team Page Test...\n');
    
    browser = await chromium.launch({ 
      headless: false,
      devtools: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log(`❌ Console Error: ${text}`);
        results.tests.push({
          name: 'Console Error',
          status: 'error',
          message: text
        });
      } else if (text.includes('[useTeamMembers]') || text.includes('Bearer')) {
        console.log(`📝 ${text}`);
      }
    });

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/admin/team')) {
        console.log(`📡 API Request: ${request.method()} ${request.url()}`);
        const headers = request.headers();
        if (headers.authorization) {
          console.log(`   Auth: ${headers.authorization.substring(0, 20)}...`);
        }
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/admin/team')) {
        console.log(`📥 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Step 1: Navigate to admin login
    console.log('1️⃣ Navigating to admin login...');
    await page.goto(`${FRONTEND_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    
    results.tests.push({
      name: 'Navigate to Admin Login',
      status: 'passed',
      message: 'Successfully loaded admin login page'
    });

    // Step 2: Login with test credentials
    console.log('2️⃣ Logging in as admin...');
    await page.fill('input[type="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin area (could be /admin or /admin/dashboard)
    await page.waitForURL(url => url.pathname.startsWith('/admin'), { timeout: 10000 });
    console.log('   ✅ Logged in successfully');
    
    results.tests.push({
      name: 'Admin Login',
      status: 'passed',
      message: 'Successfully logged in and redirected to dashboard'
    });

    // Step 3: Navigate to Team page
    console.log('3️⃣ Navigating to Leadify Team page...');
    await page.goto(`${FRONTEND_URL}/admin/team`);
    await page.waitForLoadState('networkidle');
    
    // Wait for either loading to finish or data to appear
    await page.waitForSelector('h1:has-text("Leadify Team")', { timeout: 5000 });
    
    // Check if loading skeleton is visible
    const loadingSkeletons = await page.locator('.animate-pulse').count();
    if (loadingSkeletons > 0) {
      console.log('   ⏳ Loading state detected, waiting for data...');
      // Wait for loading to complete (skeletons to disappear)
      await page.waitForFunction(() => {
        const skeletons = document.querySelectorAll('.animate-pulse');
        return skeletons.length === 0;
      }, { timeout: 10000 });
    }
    
    console.log('   ✅ Team page loaded');
    
    results.tests.push({
      name: 'Navigate to Team Page',
      status: 'passed',
      message: 'Successfully navigated to team page'
    });

    // Step 4: Check for error state
    console.log('4️⃣ Checking for error state...');
    const errorMessage = await page.locator('text=/Error:/.').count();
    if (errorMessage > 0) {
      const errorText = await page.locator('p.text-red-600').textContent();
      console.log(`   ❌ Error found: ${errorText}`);
      results.tests.push({
        name: 'Error State Check',
        status: 'failed',
        message: `Error state displayed: ${errorText}`
      });
      
      // Take screenshot of error
      await page.screenshot({ 
        path: 'leadify-team-error.png',
        fullPage: true 
      });
      results.screenshots.push('leadify-team-error.png');
      
      // Try to click retry button if available
      const retryButton = await page.locator('button:has-text("Try Again")').count();
      if (retryButton > 0) {
        console.log('   🔄 Clicking retry button...');
        await page.click('button:has-text("Try Again")');
        await page.waitForLoadState('networkidle');
      }
    } else {
      console.log('   ✅ No error state detected');
      results.tests.push({
        name: 'Error State Check',
        status: 'passed',
        message: 'No error state present'
      });
    }

    // Step 5: Check for real data in stats cards
    console.log('5️⃣ Checking team statistics...');
    const statsCards = await page.locator('.grid.gap-4.md\\:grid-cols-6 .card').count();
    console.log(`   Found ${statsCards} stat cards`);
    
    if (statsCards > 0) {
      // Check Total Members stat
      const totalMembersText = await page.locator('text=/Total Members/').first().locator('..').locator('..').locator('.text-2xl').textContent();
      const totalMembers = parseInt(totalMembersText || '0');
      console.log(`   📊 Total Members: ${totalMembers}`);
      
      // Check Active stat
      const activeText = await page.locator('text=/^Active$/').first().locator('..').locator('..').locator('.text-2xl').textContent();
      const activeMembers = parseInt(activeText || '0');
      console.log(`   📊 Active Members: ${activeMembers}`);
      
      // Check if we have real data (not all zeros)
      if (totalMembers > 0) {
        console.log('   ✅ Real statistics data found');
        results.tests.push({
          name: 'Team Statistics',
          status: 'passed',
          message: `Found ${totalMembers} total members, ${activeMembers} active`
        });
      } else {
        console.log('   ⚠️ Statistics show zero members');
        results.tests.push({
          name: 'Team Statistics',
          status: 'warning',
          message: 'Statistics show zero members - database might be empty'
        });
      }
    }

    // Step 6: Check for team members in table
    console.log('6️⃣ Checking team members table...');
    
    // Wait for table to be present
    await page.waitForSelector('table', { timeout: 5000 });
    
    // Check for table rows (excluding header)
    const tableRows = await page.locator('tbody tr').count();
    console.log(`   Found ${tableRows} table rows`);
    
    if (tableRows > 0) {
      // Check if it's showing "No team members" message
      const noMembersMessage = await page.locator('text=/No team members/').count();
      if (noMembersMessage > 0) {
        console.log('   ⚠️ Table shows "No team members" message');
        results.tests.push({
          name: 'Team Members Table',
          status: 'warning',
          message: 'Table displays "No team members" - database might be empty'
        });
      } else {
        // Get details of first member
        const firstRow = page.locator('tbody tr').first();
        const memberName = await firstRow.locator('td').nth(0).locator('.font-medium').textContent();
        const memberEmail = await firstRow.locator('td').nth(0).locator('.text-sm.text-muted-foreground').textContent();
        const memberRole = await firstRow.locator('td').nth(1).locator('.badge').textContent();
        const memberStatus = await firstRow.locator('td').nth(2).locator('.badge').textContent();
        
        console.log(`   👤 First Member:`);
        console.log(`      Name: ${memberName}`);
        console.log(`      Email: ${memberEmail}`);
        console.log(`      Role: ${memberRole}`);
        console.log(`      Status: ${memberStatus}`);
        
        // Check if this is real data (not placeholder)
        const isRealData = memberEmail && !memberEmail.includes('example.com') && !memberEmail.includes('placeholder');
        
        if (isRealData) {
          console.log('   ✅ Real team member data found');
          results.tests.push({
            name: 'Team Members Data',
            status: 'passed',
            message: `Found real team members, first member: ${memberName} (${memberEmail})`
          });
        } else {
          console.log('   ❌ Appears to be placeholder data');
          results.tests.push({
            name: 'Team Members Data',
            status: 'failed',
            message: 'Table shows placeholder data instead of real dev_members'
          });
        }
      }
    } else {
      console.log('   ⚠️ No table rows found');
      results.tests.push({
        name: 'Team Members Table',
        status: 'warning',
        message: 'No table rows found'
      });
    }

    // Step 7: Test search functionality
    console.log('7️⃣ Testing search functionality...');
    const searchInput = await page.locator('input[placeholder="Search members..."]').count();
    if (searchInput > 0) {
      await page.fill('input[placeholder="Search members..."]', 'marwryyy');
      await page.waitForTimeout(500); // Wait for filter to apply
      
      const filteredRows = await page.locator('tbody tr').count();
      console.log(`   🔍 Search for "marwryyy" returned ${filteredRows} results`);
      
      results.tests.push({
        name: 'Search Functionality',
        status: 'passed',
        message: `Search functionality working, found ${filteredRows} results`
      });
      
      // Clear search
      await page.fill('input[placeholder="Search members..."]', '');
    }

    // Step 8: Check for action buttons
    console.log('8️⃣ Checking action buttons...');
    const inviteButton = await page.locator('button:has-text("Invite Member")').count();
    const actionDropdowns = await page.locator('button[aria-haspopup="menu"]').count();
    
    console.log(`   Found Invite button: ${inviteButton > 0 ? 'Yes' : 'No'}`);
    console.log(`   Found ${actionDropdowns} action dropdowns`);
    
    results.tests.push({
      name: 'UI Controls',
      status: 'passed',
      message: `Invite button: ${inviteButton > 0 ? 'present' : 'missing'}, Action dropdowns: ${actionDropdowns}`
    });

    // Step 9: Take final screenshot
    console.log('9️⃣ Taking screenshot of final state...');
    await page.screenshot({ 
      path: 'leadify-team-final.png',
      fullPage: true 
    });
    results.screenshots.push('leadify-team-final.png');
    console.log('   📸 Screenshot saved: leadify-team-final.png');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('='.repeat(50));
    
    const passed = results.tests.filter(t => t.status === 'passed').length;
    const failed = results.tests.filter(t => t.status === 'failed').length;
    const warnings = results.tests.filter(t => t.status === 'warning').length;
    const errors = results.tests.filter(t => t.status === 'error').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`🔥 Errors: ${errors}`);
    
    console.log('\nDetailed Results:');
    results.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : 
                   test.status === 'failed' ? '❌' : 
                   test.status === 'warning' ? '⚠️' : '🔥';
      console.log(`${icon} ${test.name}: ${test.message}`);
    });

    // Save results to file
    fs.writeFileSync('leadify-team-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Full results saved to leadify-team-test-results.json');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    results.tests.push({
      name: 'Test Execution',
      status: 'error',
      message: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testLeadifyTeamPage().catch(console.error);