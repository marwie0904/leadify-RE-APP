const { chromium } = require('playwright');

async function testOrganizationPages() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Starting organization pages test...\n');
    
    // Navigate to admin dashboard
    await page.goto('http://localhost:3000/admin');
    
    // Get first organization from the list
    const firstOrgCard = await page.locator('.group').first();
    const orgName = await firstOrgCard.locator('h3').textContent();
    console.log(`Testing organization: ${orgName}`);
    
    // Click on the organization to go to detail page
    await firstOrgCard.click();
    await page.waitForLoadState('networkidle');
    
    // Test 1: Issues Page - Check separate sections
    console.log('\n1. Testing Issues Page - Separate Sections');
    await page.locator('a:has-text("Issues")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if issues section exists
    const issuesSection = await page.locator('h3:has-text("Issues")').isVisible();
    console.log(`   ✓ Issues section visible: ${issuesSection}`);
    
    // Check if features section exists
    const featuresSection = await page.locator('h3:has-text("Feature Requests")').isVisible();
    console.log(`   ✓ Feature Requests section visible: ${featuresSection}`);
    
    // Check if statistics cards were removed
    const statsCards = await page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-6').count();
    console.log(`   ✓ Statistics cards removed: ${statsCards === 0}`);
    
    // Test 2: Members Page - Check edit functionality
    console.log('\n2. Testing Members Page - Edit Functionality');
    await page.locator('a:has-text("Members")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if edit button exists
    const editButton = await page.locator('button:has-text("Edit")').isVisible();
    console.log(`   ✓ Edit button visible: ${editButton}`);
    
    if (editButton) {
      // Click edit to enter edit mode
      await page.locator('button:has-text("Edit")').click();
      
      // Check if save button appears
      const saveButton = await page.locator('button:has-text("Save")').isVisible();
      console.log(`   ✓ Save button visible in edit mode: ${saveButton}`);
      
      // Check if role dropdowns appear
      const roleDropdowns = await page.locator('button[role="combobox"]').count();
      console.log(`   ✓ Role dropdowns visible: ${roleDropdowns > 0}`);
      
      // Cancel edit mode
      await page.locator('button:has-text("Cancel")').click();
    }
    
    // Test 3: Leads Page - Check BANT dropdown
    console.log('\n3. Testing Leads Page - BANT Dropdown');
    await page.locator('a:has-text("Leads")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if leads table exists
    const leadsTable = await page.locator('table').isVisible();
    console.log(`   ✓ Leads table visible: ${leadsTable}`);
    
    // Try to expand first lead's BANT details
    const firstLeadExpandButton = await page.locator('tbody button').first();
    if (await firstLeadExpandButton.isVisible()) {
      await firstLeadExpandButton.click();
      
      // Check if BANT details section appears
      const bantDetails = await page.locator('h4:has-text("BANT Qualification Details")').isVisible();
      console.log(`   ✓ BANT details dropdown works: ${bantDetails}`);
      
      if (bantDetails) {
        // Check for BANT components
        const budget = await page.locator('span:has-text("Budget")').isVisible();
        const authority = await page.locator('span:has-text("Authority")').isVisible();
        const need = await page.locator('span:has-text("Need")').isVisible();
        const timeline = await page.locator('span:has-text("Timeline")').isVisible();
        
        console.log(`   ✓ Budget field visible: ${budget}`);
        console.log(`   ✓ Authority field visible: ${authority}`);
        console.log(`   ✓ Need field visible: ${need}`);
        console.log(`   ✓ Timeline field visible: ${timeline}`);
      }
    }
    
    // Test 4: Analytics Page - Check for real data
    console.log('\n4. Testing Analytics Page - Real Data');
    await page.locator('a:has-text("Analytics")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if token usage data exists
    const tokenUsageCard = await page.locator('h3:has-text("Token Usage")').isVisible();
    console.log(`   ✓ Token usage card visible: ${tokenUsageCard}`);
    
    // Check if conversation metrics exist
    const conversationCard = await page.locator('h3:has-text("Total Conversations")').isVisible();
    console.log(`   ✓ Conversation metrics visible: ${conversationCard}`);
    
    // Test 5: Conversations Page
    console.log('\n5. Testing Conversations Page');
    await page.locator('a:has-text("Conversations")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if conversations list exists
    const conversationsList = await page.locator('table').isVisible();
    console.log(`   ✓ Conversations list visible: ${conversationsList}`);
    
    // Test 6: AI Details Page
    console.log('\n6. Testing AI Details Page');
    await page.locator('a:has-text("AI Details")').click();
    await page.waitForLoadState('networkidle');
    
    // Check if AI configuration exists
    const aiConfig = await page.locator('h3:has-text("Configuration")').isVisible();
    console.log(`   ✓ AI configuration visible: ${aiConfig}`);
    
    console.log('\n✅ All organization page tests completed!');
    
    // Take a screenshot of the final page
    await page.screenshot({ 
      path: 'organization-pages-test.png',
      fullPage: true 
    });
    console.log('Screenshot saved as organization-pages-test.png');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ 
      path: 'organization-pages-error.png',
      fullPage: true 
    });
    console.log('Error screenshot saved as organization-pages-error.png');
  } finally {
    await browser.close();
  }
}

testOrganizationPages().catch(console.error);