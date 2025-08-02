const { chromium } = require('playwright');

async function testUIHandoff() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Going directly to handoff page...');
    await page.goto('http://localhost:3000/human-handoff');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'ui-handoff-page.png' });
    console.log('2. Screenshot saved to ui-handoff-page.png');
    
    // Check what's on the page
    const pageTitle = await page.title();
    console.log('3. Page title:', pageTitle);
    
    // Check for any error messages
    const errorMessage = await page.locator('.alert').textContent().catch(() => null);
    if (errorMessage) {
      console.log('4. Alert message found:', errorMessage);
    }
    
    // Check for handoff conversations
    const handoffCount = await page.locator('.space-y-4 > div').count();
    console.log(`5. Found ${handoffCount} handoff conversations in UI`);
    
    // Check page content
    const bodyText = await page.locator('body').innerText();
    console.log('6. Page contains:', bodyText.substring(0, 500) + '...');
    
    // Wait a bit more for any dynamic content
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'ui-handoff-error.png' });
  } finally {
    await browser.close();
  }
}

testUIHandoff();