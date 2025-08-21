const { chromium } = require('playwright');

async function testOrganizationPagesDirect() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Testing organization pages directly...\n');
    
    // Use a known organization ID (from the previous tests)
    const orgId = '9a24d180-a1fe-4d22-91e2-066d55679888';
    
    // Set authentication token in localStorage (simulate logged in state)
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('admin_token', 'test-token');
    });
    
    // Test 1: Issues Page - Separate Sections
    console.log('1. Testing Issues Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/issues`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'issues-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ Issues page screenshot saved');
    
    // Check for elements
    const issuesTitle = await page.locator('h3:has-text("Issues")').count();
    const featuresTitle = await page.locator('h3:has-text("Feature Requests")').count();
    console.log(`   ✓ Issues sections found: ${issuesTitle}`);
    console.log(`   ✓ Feature sections found: ${featuresTitle}`);
    
    // Test 2: Members Page
    console.log('\n2. Testing Members Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/members`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'members-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ Members page screenshot saved');
    
    // Check for edit button
    const editButton = await page.locator('button:has-text("Edit")').count();
    console.log(`   ✓ Edit buttons found: ${editButton}`);
    
    // Test 3: Leads Page
    console.log('\n3. Testing Leads Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/leads`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'leads-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ Leads page screenshot saved');
    
    // Try to expand a lead if available
    const expandButtons = await page.locator('button svg.h-4.w-4').count();
    console.log(`   ✓ Expandable leads found: ${expandButtons}`);
    
    if (expandButtons > 0) {
      // Click first expand button
      await page.locator('button svg.h-4.w-4').first().click();
      await page.waitForTimeout(1000);
      
      // Take screenshot with expanded BANT
      await page.screenshot({ 
        path: 'leads-bant-expanded.png',
        fullPage: true 
      });
      console.log('   ✓ BANT details screenshot saved');
    }
    
    // Test 4: Analytics Page
    console.log('\n4. Testing Analytics Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/analytics`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'analytics-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ Analytics page screenshot saved');
    
    // Test 5: Conversations Page
    console.log('\n5. Testing Conversations Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/conversations`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'conversations-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ Conversations page screenshot saved');
    
    // Test 6: AI Details Page
    console.log('\n6. Testing AI Details Page');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}/ai-details`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'ai-details-page-test.png',
      fullPage: true 
    });
    console.log('   ✓ AI Details page screenshot saved');
    
    console.log('\n✅ All page screenshots captured successfully!');
    console.log('Check the generated PNG files to verify the pages.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ 
      path: 'error-screenshot.png',
      fullPage: true 
    });
    console.log('Error screenshot saved');
  } finally {
    await browser.close();
  }
}

testOrganizationPagesDirect().catch(console.error);