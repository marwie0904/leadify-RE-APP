// Test script to verify Organization Page UI fixes
const puppeteer = require('puppeteer');

async function testOrganizationPages() {
  console.log('Starting Organization Page UI Tests...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--window-size=1400,900']
  });
  const page = await browser.newPage();
  
  // Set test authentication
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    localStorage.setItem('test_mode', 'true');
    localStorage.setItem('admin_token', 'test-admin-token');
    localStorage.setItem('auth_token', 'test-auth-token');
  });
  
  console.log('✓ Authentication set\n');
  
  // Test 1: Analytics Section
  console.log('Testing Analytics Section...');
  await page.goto('http://localhost:3000/admin/organizations/8266be99-fcfd-42f7-a6e2-948e070f1eef/analytics');
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if data is displayed
  const analyticsData = await page.evaluate(() => {
    const cards = document.querySelectorAll('.text-2xl.font-bold');
    return {
      totalConversations: cards[0]?.textContent || 'Not found',
      totalLeads: cards[1]?.textContent || 'Not found',
      tokenUsage: cards[2]?.textContent || 'Not found',
      totalCost: cards[3]?.textContent || 'Not found'
    };
  });
  
  console.log('Analytics Data:');
  console.log('- Total Conversations:', analyticsData.totalConversations);
  console.log('- Total Leads:', analyticsData.totalLeads);
  console.log('- Token Usage:', analyticsData.tokenUsage);
  console.log('- Total Cost:', analyticsData.totalCost);
  console.log('');
  
  // Test 2: Lead Section - Color coding
  console.log('Testing Lead Section Color Coding...');
  await page.goto('http://localhost:3000/admin/organizations/8266be99-fcfd-42f7-a6e2-948e070f1eef/leads');
  await new Promise(r => setTimeout(r, 2000));
  
  const leadColors = await page.evaluate(() => {
    const badges = document.querySelectorAll('[class*="Badge"]');
    const classifications = [];
    badges.forEach(badge => {
      const text = badge.textContent;
      const classes = badge.className;
      if (text && (text.includes('Priority') || text.includes('Hot') || text.includes('Warm') || text.includes('Cold'))) {
        classifications.push({
          text: text,
          hasRedColor: classes.includes('red'),
          hasOrangeColor: classes.includes('orange'),
          hasYellowColor: classes.includes('yellow'),
          hasGrayColor: classes.includes('gray')
        });
      }
    });
    return classifications;
  });
  
  console.log('Lead Classifications:');
  leadColors.forEach(lead => {
    let color = 'unknown';
    if (lead.hasRedColor) color = 'Red';
    else if (lead.hasOrangeColor) color = 'Orange';
    else if (lead.hasYellowColor) color = 'Yellow';
    else if (lead.hasGrayColor) color = 'Gray';
    console.log(`- ${lead.text}: ${color}`);
  });
  console.log('');
  
  // Test 3: AI Analytics Page
  console.log('Testing AI Analytics Page...');
  await page.goto('http://localhost:3000/admin/ai-analytics');
  await new Promise(r => setTimeout(r, 2000));
  
  // Check for Hourly Token Usage Trend
  const hourlyTrend = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.text-lg, .text-xl, .font-semibold'));
    return titles.find(el => el.textContent.includes('Hourly Token Usage Trend'))?.textContent || 'Not found';
  });
  
  console.log('Token Usage Trend Title:', hourlyTrend);
  
  // Check that Cost Optimization is removed
  const costOptimization = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.text-lg, .text-xl, .font-semibold'));
    return titles.find(el => el.textContent.includes('Cost Optimization'))?.textContent || 'Not found';
  });
  
  console.log('Cost Optimization Section:', costOptimization === 'Not found' ? '✓ Removed' : '✗ Still present');
  console.log('');
  
  // Take screenshots
  console.log('Taking screenshots...');
  await page.goto('http://localhost:3000/admin/organizations/8266be99-fcfd-42f7-a6e2-948e070f1eef/analytics');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'test-analytics-page.png', fullPage: true });
  console.log('✓ Analytics page screenshot saved');
  
  await page.goto('http://localhost:3000/admin/organizations/8266be99-fcfd-42f7-a6e2-948e070f1eef/leads');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'test-leads-page.png', fullPage: true });
  console.log('✓ Leads page screenshot saved');
  
  await page.goto('http://localhost:3000/admin/ai-analytics');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'test-ai-analytics-page.png', fullPage: true });
  console.log('✓ AI Analytics page screenshot saved');
  
  console.log('\n✅ All tests completed!');
  console.log('Check the screenshot files to visually verify the changes.');
  
  await browser.close();
}

testOrganizationPages().catch(console.error);