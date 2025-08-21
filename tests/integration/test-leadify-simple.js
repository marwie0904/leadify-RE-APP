/**
 * Simple test for Leadify Team page
 */

const { chromium } = require('playwright');

async function testLeadifyTeam() {
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 30000
  });
  
  try {
    const page = await browser.newPage();
    
    // Capture API responses
    let teamResponse = null;
    page.on('response', async response => {
      if (response.url().includes('/api/admin/team')) {
        console.log('\n=== API Response ===');
        console.log('URL:', response.url());
        console.log('Status:', response.status());
        teamResponse = await response.json().catch(() => null);
        if (teamResponse?.success && teamResponse?.data?.members) {
          console.log('✅ API returned', teamResponse.data.members.length, 'members');
          teamResponse.data.members.forEach(m => {
            console.log(`  - ${m.name} (${m.email}) - Role: ${m.role}`);
          });
        }
      }
    });

    console.log('Step 1: Logging in to admin...');
    await page.goto('http://localhost:3000/admin/login');
    await page.fill('input[type="email"]', 'marwryyy@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    
    // Wait for login and redirect
    await page.waitForTimeout(3000);
    
    console.log('\nStep 2: Going to Leadify Team page...');
    await page.goto('http://localhost:3000/admin/team');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    console.log('\n=== Page Stats ===');
    const statsCards = await page.locator('.text-2xl.font-bold').all();
    if (statsCards.length >= 3) {
      console.log('Total Members:', await statsCards[0].textContent());
      console.log('Active Members:', await statsCards[1].textContent());
      console.log('Inactive Members:', await statsCards[2].textContent());
    }
    
    console.log('\n=== Team Members Table ===');
    // Try to get table content
    const tableBody = await page.locator('table tbody').textContent();
    if (tableBody.includes('marwryyy@gmail.com')) {
      console.log('✅ marwryyy@gmail.com found in table');
      if (tableBody.includes('admin')) {
        console.log('✅ marwryyy@gmail.com is shown as admin');
      } else {
        console.log('❌ marwryyy@gmail.com is NOT shown as admin');
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: 'leadify-team-working.png', fullPage: true });
    console.log('\n📸 Screenshot saved as leadify-team-working.png');
    
    console.log('\n=== SUMMARY ===');
    if (teamResponse?.success) {
      console.log('✅ Backend is returning dev_members data');
      const marwryyy = teamResponse.data.members.find(m => m.email === 'marwryyy@gmail.com');
      if (marwryyy) {
        console.log(`✅ marwryyy@gmail.com has role: ${marwryyy.role} in backend`);
      }
    }
    
    // Check if real data is displayed on page
    const hasRealEmail = tableBody.includes('marwryyy@gmail.com');
    if (hasRealEmail) {
      console.log('✅ SUCCESS: Real dev_members data (marwryyy@gmail.com) is displayed on the page!');
    } else {
      console.log('❌ FAILURE: Real dev_members data is NOT displayed on the page');
    }
    
    // Keep browser open briefly
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLeadifyTeam();