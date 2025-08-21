// Quick test to verify all pages are loading correctly
const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  pages: [
    '/analytics',
    '/conversations', 
    '/leads',
    '/members',
    '/ai-details',
    '/issues'
  ]
};

async function quickTest() {
  console.log('🚀 Quick Page Load Test');
  console.log('='.repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Set authentication bypass
  await page.goto(CONFIG.baseUrl);
  await page.evaluate(() => {
    localStorage.setItem('admin_token', 'test-token');
  });
  
  const results = [];
  
  for (const pagePath of CONFIG.pages) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${pagePath}`;
    console.log(`\nTesting ${pagePath}...`);
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      const hasContent = await page.$('main, div[class*="container"], div[class*="page"]');
      const hasError = await page.$('text="Error"');
      const status = response ? response.status() : 0;
      
      if (status === 200 && hasContent && !hasError) {
        console.log(`  ✅ Page loaded successfully (${status})`);
        results.push({ page: pagePath, success: true, status });
        
        // Take screenshot
        await page.screenshot({ 
          path: `./test-results/${pagePath.replace('/', '')}.png`,
          fullPage: true 
        });
      } else {
        console.log(`  ❌ Page failed (Status: ${status}, Error: ${hasError ? 'Yes' : 'No'})`);
        results.push({ page: pagePath, success: false, status });
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({ page: pagePath, success: false, error: error.message });
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successful}/${results.length}`);
  
  if (successful === results.length) {
    console.log('\n🎉 All pages loaded successfully!');
  } else {
    console.log('\n⚠️ Some pages failed to load');
    const failed = results.filter(r => !r.success);
    failed.forEach(r => {
      console.log(`  - ${r.page}: ${r.error || `Status ${r.status}`}`);
    });
  }
}

quickTest().catch(console.error);