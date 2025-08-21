/**
 * Test Leadify Team page with Playwright
 */

const { chromium } = require('playwright');

async function testLeadifyTeam() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 30000
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      console.log('Console:', msg.text());
    });

    // Capture API responses
    let teamResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/admin/team/members')) {
        console.log('\n=== API Response ===');
        console.log('URL:', response.url());
        console.log('Status:', response.status());
        teamResponse = await response.json().catch(() => null);
        console.log('Data:', JSON.stringify(teamResponse, null, 2));
      }
    });

    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    
    console.log('2. Navigating to Leadify Team page...');
    await page.goto('http://localhost:3000/admin/leadify-team');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    console.log('\n3. Reading page content...');
    
    // Check if we're showing placeholder data
    const pageContent = await page.content();
    const hasPlaceholder = pageContent.includes('Mar Wie Ang') || 
                          pageContent.includes('Zareal Marwie') || 
                          pageContent.includes('Test Admin');
    
    if (hasPlaceholder) {
      console.log('⚠️  Page is showing PLACEHOLDER data!');
    }
    
    // Get stats
    console.log('\n=== Stats Cards ===');
    const statsCards = await page.locator('.text-2xl.font-bold').all();
    if (statsCards.length >= 3) {
      console.log('Total Members:', await statsCards[0].textContent());
      console.log('Active Members:', await statsCards[1].textContent());
      console.log('Inactive Members:', await statsCards[2].textContent());
    }
    
    // Get team members from table
    console.log('\n=== Team Members Table ===');
    const rows = await page.locator('table tbody tr').all();
    
    if (rows.length === 0) {
      console.log('No team members displayed');
    } else {
      for (const row of rows) {
        const cells = await row.locator('td').all();
        if (cells.length >= 3) {
          const name = await cells[0].textContent();
          const email = await cells[1].textContent();
          const role = await cells[2].textContent();
          console.log(`- ${name.trim()} | ${email.trim()} | Role: ${role.trim()}`);
        }
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'leadify-team-check.png', fullPage: true });
    console.log('\n✅ Screenshot saved as leadify-team-check.png');
    
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testLeadifyTeam();