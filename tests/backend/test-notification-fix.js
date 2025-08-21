// Test the notification system fix
const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Testing Notification System Fix\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Track errors
  const errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && text.includes('notifications.filter')) {
      errors.push(text);
      console.error('❌ Filter error still present:', text);
    }
    
    if (text.includes('NotificationService') || text.includes('Config')) {
      console.log('📢', text);
    }
  });
  
  // Monitor API requests
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/notifications') && !url.includes('stream')) {
      console.log(`📡 API Response: ${response.status()} ${url}`);
    }
  });
  
  try {
    // Go directly to the dashboard (assuming user is already logged in)
    console.log('🏠 Navigating to dashboard...');
    await page.goto('http://localhost:3000/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Dashboard loaded');
    
    // Wait for notification system to initialize
    console.log('⏳ Waiting for notification system...');
    await page.waitForTimeout(5000);
    
    // Try to find and click notification bell
    console.log('🔔 Looking for notification bell...');
    
    // More specific selectors for notification bell
    const bellSelectors = [
      'button:has([data-testid*="bell"])',
      'button:has(svg[data-lucide="bell"])',
      'button:has(svg):has-text("")', // SVG with bell icon
      '[aria-label*="notification" i]',
      'button:has(.lucide-bell)',
      'button[data-testid*="notification"]'
    ];
    
    let bellFound = false;
    for (const selector of bellSelectors) {
      const bell = page.locator(selector).first();
      if (await bell.count() > 0) {
        console.log(`✅ Found notification bell with selector: ${selector}`);
        await bell.click();
        bellFound = true;
        break;
      }
    }
    
    if (!bellFound) {
      console.log('⚠️ No notification bell found, taking screenshot...');
      await page.screenshot({ path: 'no-bell-found.png', fullPage: true });
      
      // Try to find any button with "Bell" or similar
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on page`);
      
      // Look for SVG elements that might be bells
      const svgElements = await page.locator('svg').all();
      console.log(`Found ${svgElements.length} SVG elements on page`);
    } else {
      // Wait for dropdown to appear
      await page.waitForTimeout(2000);
      console.log('✅ Notification bell clicked');
    }
    
    // Final check for errors
    console.log('\n📊 Results:');
    console.log('===========');
    
    if (errors.length === 0) {
      console.log('✅ No "notifications.filter" errors detected!');
      console.log('✅ The API response format issue appears to be fixed');
    } else {
      console.log('❌ Filter errors still present:');
      errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
    console.log('\n🔍 Browser will stay open for manual inspection');
    console.log('Press Ctrl+C to exit');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await browser.close();
  }
})();