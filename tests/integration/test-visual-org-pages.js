/**
 * Visual test to capture screenshots of all organization pages
 */

const { chromium } = require('playwright');

async function visualTest() {
  console.log('📸 Visual Test of Organization Detail Pages\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slower for visual confirmation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Login
    console.log('Logging in...');
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Use the real organization ID
    const orgId = '9a24d180-a1fe-4d22-91e2-066d55679888';
    
    // Navigate to organization detail page
    console.log('Navigating to organization details...\n');
    await page.goto(`http://localhost:3000/admin/organizations/${orgId}`);
    await page.waitForTimeout(3000);
    
    // Test each page
    const pages = [
      { name: 'Analytics', path: 'analytics' },
      { name: 'Conversations', path: 'conversations' },
      { name: 'Leads', path: 'leads' },
      { name: 'Members', path: 'members' },
      { name: 'AI Details', path: 'ai-details' },
      { name: 'Issues', path: 'issues' }
    ];
    
    for (const pageInfo of pages) {
      console.log(`📸 Capturing ${pageInfo.name} page...`);
      await page.goto(`http://localhost:3000/admin/organizations/${orgId}/${pageInfo.path}`);
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await page.screenshot({ 
        path: `visual-${pageInfo.path}.png`, 
        fullPage: false 
      });
      
      // For editable pages, test edit mode
      if (pageInfo.name === 'Members' || pageInfo.name === 'AI Details') {
        const editButton = page.locator('button:has-text("Edit")').first();
        if (await editButton.isVisible()) {
          console.log(`   Testing edit mode for ${pageInfo.name}...`);
          await editButton.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot of edit mode
          await page.screenshot({ 
            path: `visual-${pageInfo.path}-edit.png`, 
            fullPage: false 
          });
          
          // Cancel edit mode
          const cancelButton = page.locator('button:has-text("Cancel")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }
    
    console.log('\n✅ Visual test complete! Check the screenshots:');
    console.log('  • visual-analytics.png');
    console.log('  • visual-conversations.png');
    console.log('  • visual-leads.png');
    console.log('  • visual-members.png (+ edit mode)');
    console.log('  • visual-ai-details.png (+ edit mode)');
    console.log('  • visual-issues.png');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

visualTest().catch(console.error);