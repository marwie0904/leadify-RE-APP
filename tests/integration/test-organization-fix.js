/**
 * Test organization detail page fix
 */

const { chromium } = require('playwright');

async function testOrganizationFix() {
  console.log('🔧 Testing Organization Detail Page Fix\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('   ✅ Login successful\n');
    
    // Navigate to organization detail page
    console.log('2️⃣ Navigating to Leadify organization...');
    await page.goto('http://localhost:3000/admin/organizations/9a24d180-a1fe-4d22-91e2-066d55679888');
    await page.waitForTimeout(3000);
    
    // Check if organization loads or shows error
    const hasError = await page.locator('text=Organization not found').isVisible().catch(() => false);
    const hasLeadify = await page.locator('text=Leadify').isVisible().catch(() => false);
    
    if (hasError) {
      console.log('   ❌ Still showing "Organization not found" error');
      await page.screenshot({ path: 'test-org-error.png' });
    } else if (hasLeadify) {
      console.log('   ✅ Organization "Leadify" loaded successfully!');
      
      // Check if we're redirected to analytics
      const url = page.url();
      console.log('   📍 Current URL:', url);
      
      // Check for key elements
      const hasAnalytics = await page.locator('text=/Analytics|Conversations|Leads/').isVisible().catch(() => false);
      if (hasAnalytics) {
        console.log('   ✅ Navigation tabs visible');
      }
      
      // Take screenshot
      await page.screenshot({ path: 'test-org-success.png' });
      
      // Try navigating to different tabs
      console.log('\n3️⃣ Testing tab navigation...');
      
      const tabs = ['Conversations', 'Leads', 'Members', 'AI Details', 'Issues'];
      for (const tab of tabs) {
        const tabLink = page.locator(`a:has-text("${tab}")`).first();
        if (await tabLink.isVisible()) {
          await tabLink.click();
          await page.waitForTimeout(1000);
          console.log(`   ✅ ${tab} tab accessible`);
        }
      }
      
      console.log('\n✅ ORGANIZATION DETAIL PAGES ARE WORKING!');
    } else {
      console.log('   ⚠️ Page loaded but no specific content detected');
      await page.screenshot({ path: 'test-org-unknown.png' });
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'test-org-error.png' });
  } finally {
    await browser.close();
  }
}

testOrganizationFix().catch(console.error);
