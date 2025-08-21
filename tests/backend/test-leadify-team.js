/**
 * Test Leadify Team page
 */

const { chromium } = require('playwright');

async function testLeadifyTeam() {
  const browser = await chromium.launch({ 
    headless: true,
    timeout: 30000
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('team') || text.includes('Team') || text.includes('Error')) {
        logs.push(text);
      }
    });

    // Capture API responses
    let teamResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/admin/team/members')) {
        teamResponse = {
          status: response.status(),
          data: await response.json().catch(() => null)
        };
      }
    });

    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'test-admin@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait a bit for login to complete
    await page.waitForTimeout(2000);
    
    console.log('2. Going to Leadify Team page...');
    await page.goto('http://localhost:3000/admin/leadify-team');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    console.log('3. Reading stats...');
    const stats = {};
    
    try {
      // Get stats values
      const statsCards = await page.locator('.text-2xl.font-bold').all();
      if (statsCards.length >= 3) {
        stats.totalMembers = await statsCards[0].textContent();
        stats.activeMembers = await statsCards[1].textContent();
        stats.inactiveMembers = await statsCards[2].textContent();
      }
    } catch (e) {
      console.log('Could not read stats from page:', e.message);
    }
    
    console.log('4. Reading team members...');
    let members = [];
    try {
      // Get table rows (skip header)
      const rows = await page.locator('table tbody tr').all();
      for (const row of rows) {
        const cells = await row.locator('td').all();
        if (cells.length >= 6) {
          const member = {
            name: await cells[0].textContent(),
            email: await cells[1].textContent(),
            role: await cells[2].textContent(),
            status: await cells[3].textContent(),
            lastActive: await cells[4].textContent(),
            joined: await cells[5].textContent()
          };
          members.push(member);
        }
      }
    } catch (e) {
      console.log('Could not read members from table:', e.message);
    }
    
    console.log('\n=== RESULTS ===');
    console.log('Stats:', stats);
    console.log('API Response:', teamResponse);
    console.log('\nTeam Members:');
    members.forEach(member => {
      console.log(`  - ${member.name.trim()} (${member.email.trim()}) - Role: ${member.role.trim()}, Status: ${member.status.trim()}`);
    });
    
    console.log('\nConsole Logs:');
    logs.forEach(log => console.log('  ', log));
    
    // Take a screenshot
    await page.screenshot({ path: 'leadify-team-page.png', fullPage: true });
    console.log('\nScreenshot saved as leadify-team-page.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLeadifyTeam();