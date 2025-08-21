const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Get token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    console.log(token);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();