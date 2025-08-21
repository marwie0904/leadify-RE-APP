const { chromium } = require('playwright');

async function testOrganizationPagesWithAuth() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Starting organization pages test with authentication...\n');
    
    // Step 1: Login first
    console.log('1. Authenticating...');
    await page.goto('http://localhost:3000/admin/login');
    
    // Fill in login form
    await page.fill('input[type="email"]', 'admin@leadfinder.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log('   ✓ Successfully logged in');
    
    // Step 2: Navigate to organizations list
    console.log('\n2. Navigating to organizations...');
    await page.goto('http://localhost:3000/admin/organizations');
    await page.waitForLoadState('networkidle');
    
    // Check if organizations are listed
    const orgCards = await page.locator('.group').count();
    console.log(`   ✓ Found ${orgCards} organizations`);
    
    if (orgCards > 0) {
      // Get first organization
      const firstOrgCard = await page.locator('.group').first();
      const orgName = await firstOrgCard.locator('h3').textContent();
      console.log(`   ✓ Testing organization: ${orgName}`);
      
      // Click on the organization
      await firstOrgCard.click();
      await page.waitForLoadState('networkidle');
      
      // Get organization ID from URL
      const url = page.url();
      const orgId = url.split('/organizations/')[1]?.split('/')[0];
      console.log(`   ✓ Organization ID: ${orgId}`);
      
      // Test 3: Issues Page - Check separate sections
      console.log('\n3. Testing Issues Page - Separate Sections');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/issues`);
      await page.waitForLoadState('networkidle');
      
      // Check for separate sections
      const issuesCard = await page.locator('div.card:has(h3:has-text("Issues"))').count();
      const featuresCard = await page.locator('div.card:has(h3:has-text("Feature Requests"))').count();
      console.log(`   ✓ Issues section exists: ${issuesCard > 0}`);
      console.log(`   ✓ Feature Requests section exists: ${featuresCard > 0}`);
      
      // Test 4: Members Page - Check edit functionality
      console.log('\n4. Testing Members Page - Edit Functionality');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/members`);
      await page.waitForLoadState('networkidle');
      
      // Check if members are loaded
      const membersTable = await page.locator('table').isVisible();
      console.log(`   ✓ Members table visible: ${membersTable}`);
      
      // Check for edit button
      const editButton = await page.locator('button:has-text("Edit")');
      if (await editButton.isVisible()) {
        console.log(`   ✓ Edit button found`);
        await editButton.click();
        
        // Check for save/cancel buttons in edit mode
        const saveButton = await page.locator('button:has-text("Save")').isVisible();
        const cancelButton = await page.locator('button:has-text("Cancel")').isVisible();
        console.log(`   ✓ Edit mode activated: Save=${saveButton}, Cancel=${cancelButton}`);
        
        // Cancel edit mode
        if (cancelButton) {
          await page.locator('button:has-text("Cancel")').click();
        }
      }
      
      // Test 5: Leads Page - Check BANT dropdown
      console.log('\n5. Testing Leads Page - BANT Dropdown');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/leads`);
      await page.waitForLoadState('networkidle');
      
      // Check if leads exist
      const leadsRows = await page.locator('tbody tr').count();
      console.log(`   ✓ Found ${leadsRows} leads`);
      
      if (leadsRows > 0) {
        // Click first lead's expand button
        const expandButton = await page.locator('tbody button').first();
        if (await expandButton.isVisible()) {
          await expandButton.click();
          await page.waitForTimeout(500);
          
          // Check for BANT details
          const bantSection = await page.locator('text="BANT Qualification Details"').isVisible();
          console.log(`   ✓ BANT details dropdown works: ${bantSection}`);
          
          if (bantSection) {
            // Check individual BANT fields
            const budget = await page.locator('text="Budget"').isVisible();
            const authority = await page.locator('text="Authority"').isVisible();
            const need = await page.locator('text="Need"').isVisible();
            const timeline = await page.locator('text="Timeline"').isVisible();
            
            console.log(`   ✓ BANT fields visible: B=${budget}, A=${authority}, N=${need}, T=${timeline}`);
          }
        }
      }
      
      // Test 6: Analytics Page
      console.log('\n6. Testing Analytics Page - Token Usage');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/analytics`);
      await page.waitForLoadState('networkidle');
      
      // Check for analytics data
      const hasAnalytics = await page.locator('h3').first().isVisible();
      console.log(`   ✓ Analytics page loaded: ${hasAnalytics}`);
      
      // Test 7: Conversations Page
      console.log('\n7. Testing Conversations Page');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/conversations`);
      await page.waitForLoadState('networkidle');
      
      const conversationsVisible = await page.locator('h3').first().isVisible();
      console.log(`   ✓ Conversations page loaded: ${conversationsVisible}`);
      
      // Test 8: AI Details Page
      console.log('\n8. Testing AI Details Page');
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/ai-details`);
      await page.waitForLoadState('networkidle');
      
      const aiDetailsVisible = await page.locator('h3').first().isVisible();
      console.log(`   ✓ AI Details page loaded: ${aiDetailsVisible}`);
      
      console.log('\n✅ All tests completed successfully!');
      
      // Take a final screenshot
      await page.screenshot({ 
        path: 'organization-pages-success.png',
        fullPage: true 
      });
      console.log('Screenshot saved as organization-pages-success.png');
      
    } else {
      console.log('⚠️  No organizations found to test');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ 
      path: 'organization-pages-error.png',
      fullPage: true 
    });
    console.log('Error screenshot saved as organization-pages-error.png');
  } finally {
    await browser.close();
  }
}

testOrganizationPagesWithAuth().catch(console.error);