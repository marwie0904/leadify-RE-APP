const { chromium } = require('playwright');

async function takeScreenshot() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Login
    await page.fill('input[type="email"]', 'marwie0904@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Login successful');
    
    // Navigate to conversations
    await page.goto('http://localhost:3000/conversations');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'conversations-with-handoff.png', fullPage: true });
    console.log('Screenshot saved to conversations-with-handoff.png');
    
    // Check for handoff badges
    const handoffBadges = await page.locator('text="Handoff"').count();
    console.log(`Found ${handoffBadges} handoff badge(s)`);
    
    // Check that refresh/new buttons are not in the main chat interface
    const chatInterface = await page.locator('.h-\\[500px\\]').count();
    if (chatInterface > 0) {
      const refreshButton = await page.locator('.h-\\[500px\\] button:has-text("Refresh")').count();
      const newButton = await page.locator('.h-\\[500px\\] button:has-text("New")').count();
      console.log(`Refresh buttons in chat interface: ${refreshButton}`);
      console.log(`New conversation buttons in chat interface: ${newButton}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch(console.error);