/**
 * Final test for Leadify Team page
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
      const text = msg.text();
      if (text.includes('Error') || text.includes('error')) {
        console.log('Console Error:', text);
      }
    });

    // Capture API responses
    let teamResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/admin/team/members')) {
        console.log('\n=== API Response Intercepted ===');
        console.log('URL:', response.url());
        console.log('Status:', response.status());
        teamResponse = await response.json().catch(() => null);
        console.log('Response structure:', Object.keys(teamResponse || {}));
        if (teamResponse?.members) {
          console.log('Members count:', teamResponse.members.length);
          console.log('First member:', teamResponse.members[0]);
        }
      }
    });

    console.log('Step 1: Logging in...');
    await page.goto('http://localhost:3000/auth');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    
    console.log('\nStep 2: Navigating to Leadify Team page...');
    await page.goto('http://localhost:3000/admin/leadify-team');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    console.log('\n=== Page Content Analysis ===');
    
    // Get stats
    const statsCards = await page.locator('.text-2xl.font-bold').all();
    if (statsCards.length >= 3) {
      const total = await statsCards[0].textContent();
      const active = await statsCards[1].textContent();
      const inactive = await statsCards[2].textContent();
      
      console.log('📊 Stats:');
      console.log(`  Total Members: ${total}`);
      console.log(`  Active Members: ${active}`);
      console.log(`  Inactive Members: ${inactive}`);
    }
    
    // Get team members from table
    console.log('\n👥 Team Members:');
    const rows = await page.locator('table tbody tr').all();
    
    if (rows.length === 0) {
      console.log('  ❌ No team members displayed in table');
    } else {
      for (const row of rows) {
        const cells = await row.locator('td').all();
        if (cells.length >= 3) {
          const name = await cells[0].textContent();
          const email = await cells[1].textContent();
          const roleElement = await cells[2].locator('span').last();
          const role = await roleElement.textContent();
          
          // Check if this is marwryyy@gmail.com and verify role
          if (email.includes('marwryyy@gmail.com')) {
            if (role.trim() === 'admin') {
              console.log(`  ✅ ${name.trim()} | ${email.trim()} | Role: ${role.trim()} (CORRECT - Admin)`);
            } else {
              console.log(`  ❌ ${name.trim()} | ${email.trim()} | Role: ${role.trim()} (WRONG - Should be Admin)`);
            }
          } else {
            if (role.trim() === 'member') {
              console.log(`  ✅ ${name.trim()} | ${email.trim()} | Role: ${role.trim()} (CORRECT - Member)`);
            } else {
              console.log(`  ⚠️  ${name.trim()} | ${email.trim()} | Role: ${role.trim()} (Should be Member)`);
            }
          }
        }
      }
    }
    
    // Check for any error messages on the page
    const errorToast = await page.locator('[role="alert"]').count();
    if (errorToast > 0) {
      console.log('\n⚠️  Error toast detected on page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'leadify-team-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved as leadify-team-final.png');
    
    // Final verdict
    console.log('\n=== FINAL VERDICT ===');
    if (teamResponse && teamResponse.success && teamResponse.members) {
      console.log('✅ API is returning correct Leadify organization members');
      console.log(`✅ Total of ${teamResponse.members.length} members from Leadify organization`);
      
      // Check if roles are correct
      const marwryyyMember = teamResponse.members.find(m => m.email === 'marwryyy@gmail.com');
      if (marwryyyMember) {
        console.log(`✅ marwryyy@gmail.com found with role: ${marwryyyMember.role}`);
      }
    } else {
      console.log('❌ API response structure is incorrect');
    }
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

testLeadifyTeam();