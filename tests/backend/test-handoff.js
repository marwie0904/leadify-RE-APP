const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  let errors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('ERROR:', text);
    }
  });

  try {
    console.log('Testing handoff page...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'marwie0904@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    console.log('Navigating to handoff page...');
    await page.goto('http://localhost:3000/handoff');
    await page.waitForTimeout(5000);
    
    const pageTitle = await page.textContent('h1').catch(() => 'Error loading');
    console.log('Handoff page title:', pageTitle);
    
    const hasErrors = errors.length > 0;
    console.log('Handoff page errors:', hasErrors ? 'FOUND' : 'NONE');
    
    await page.screenshot({ path: 'handoff-test.png' });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
  
  await browser.close();
})();
