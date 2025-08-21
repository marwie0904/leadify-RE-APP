const { chromium } = require('playwright');
require('dotenv').config();

// Test configurations
const BASE_URL = 'http://localhost:3000';
const TEST_ACCOUNTS = [
  { email: 'admin@primeresidential.com', password: 'TestPassword123!', role: 'admin' },
  { email: 'agent1@primeresidential.com', password: 'TestPassword123!', role: 'agent' }
];

// Test scenarios
const testScenarios = {
  login: async (page, account) => {
    console.log(`\n🔐 Testing login for ${account.email}...`);
    
    // Navigate to login page
    await page.goto(BASE_URL);
    
    // Look for login form
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    const loginButton = await page.locator('button:has-text("Login"), button:has-text("Sign in"), button[type="submit"]').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(account.email);
      await passwordInput.fill(account.password);
      
      // Take screenshot before login
      await page.screenshot({ path: `login-attempt-${account.role}.png` });
      
      await loginButton.click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Check if login successful
      const dashboardVisible = await page.locator('text=/dashboard/i, text=/home/i, text=/welcome/i').first().isVisible();
      
      if (dashboardVisible) {
        console.log(`  ✅ Login successful for ${account.role}`);
        await page.screenshot({ path: `dashboard-${account.role}.png` });
        return true;
      } else {
        console.log(`  ❌ Login failed for ${account.role}`);
        return false;
      }
    } else {
      console.log(`  ⚠️  Could not find login form`);
      return false;
    }
  },
  
  checkDashboard: async (page) => {
    console.log(`\n📊 Testing dashboard features...`);
    
    // Check for main dashboard elements
    const checks = [
      { name: 'Analytics', selector: 'text=/analytics/i, text=/metrics/i' },
      { name: 'Conversations', selector: 'text=/conversations/i, text=/chats/i' },
      { name: 'Leads', selector: 'text=/leads/i' },
      { name: 'Agents', selector: 'text=/agents/i, text=/ai agents/i' },
      { name: 'Organizations', selector: 'text=/organization/i, text=/team/i' }
    ];
    
    for (const check of checks) {
      const element = await page.locator(check.selector).first();
      if (await element.isVisible()) {
        console.log(`  ✅ Found ${check.name}`);
      } else {
        console.log(`  ❌ Missing ${check.name}`);
      }
    }
    
    await page.screenshot({ path: 'dashboard-overview.png' });
  },
  
  navigateToAIAnalytics: async (page) => {
    console.log(`\n🤖 Testing AI Analytics page...`);
    
    // Try to find and click AI Analytics link
    const aiAnalyticsLink = await page.locator('a:has-text("AI Analytics"), text=/ai analytics/i, text=/token usage/i').first();
    
    if (await aiAnalyticsLink.isVisible()) {
      await aiAnalyticsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check if we're on the AI Analytics page
      const pageTitle = await page.locator('h1, h2').first();
      const titleText = await pageTitle.textContent();
      
      console.log(`  📄 Page title: ${titleText}`);
      
      // Look for token usage information
      const tokenInfo = await page.locator('text=/tokens/i, text=/usage/i').first();
      if (await tokenInfo.isVisible()) {
        console.log(`  ✅ Token usage information visible`);
      } else {
        console.log(`  ❌ No token usage information found`);
      }
      
      await page.screenshot({ path: 'ai-analytics-page.png' });
      return true;
    } else {
      console.log(`  ⚠️  Could not find AI Analytics link`);
      return false;
    }
  },
  
  navigateToIssues: async (page) => {
    console.log(`\n🐛 Testing Issues page...`);
    
    const issuesLink = await page.locator('a:has-text("Issues"), text=/issues/i, text=/bugs/i').first();
    
    if (await issuesLink.isVisible()) {
      await issuesLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check for issues we created
      const issueCount = await page.locator('text=/Chat widget not loading/i, text=/BANT scoring/i, text=/AI responses/i').count();
      
      console.log(`  📊 Found ${issueCount} issues on page`);
      
      await page.screenshot({ path: 'issues-page.png' });
      return true;
    } else {
      console.log(`  ⚠️  Could not find Issues link`);
      return false;
    }
  },
  
  navigateToFeatureRequests: async (page) => {
    console.log(`\n✨ Testing Feature Requests page...`);
    
    const featureLink = await page.locator('a:has-text("Feature"), text=/feature request/i').first();
    
    if (await featureLink.isVisible()) {
      await featureLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check for feature requests we created
      const featureCount = await page.locator('text=/Zillow/i, text=/Multi-language/i, text=/Virtual tour/i').count();
      
      console.log(`  📊 Found ${featureCount} feature requests on page`);
      
      await page.screenshot({ path: 'feature-requests-page.png' });
      return true;
    } else {
      console.log(`  ⚠️  Could not find Feature Requests link`);
      return false;
    }
  },
  
  testChatWithAgent: async (page) => {
    console.log(`\n💬 Testing chat with AI agent...`);
    
    // Try to find agents or chat interface
    const agentsLink = await page.locator('a:has-text("Agents"), text=/ai agents/i').first();
    
    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for ResidentialBot or any agent
      const agentCard = await page.locator('text=/ResidentialBot/i, text=/CommercialAssist/i, text=/LuxuryAdvisor/i').first();
      
      if (await agentCard.isVisible()) {
        console.log(`  ✅ Found AI agents`);
        
        // Try to find chat or preview button
        const chatButton = await page.locator('button:has-text("Chat"), button:has-text("Preview"), button:has-text("Test")').first();
        
        if (await chatButton.isVisible()) {
          await chatButton.click();
          await page.waitForTimeout(2000);
          
          // Look for chat interface
          const chatInput = await page.locator('textarea, input[type="text"][placeholder*="message" i]').first();
          
          if (await chatInput.isVisible()) {
            console.log(`  ✅ Chat interface opened`);
            
            // Send a test message
            await chatInput.fill("I'm looking to buy a home with a budget of $500,000");
            
            // Find send button or press Enter
            const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]').first();
            if (await sendButton.isVisible()) {
              await sendButton.click();
            } else {
              await page.keyboard.press('Enter');
            }
            
            // Wait for response
            await page.waitForTimeout(5000);
            
            // Check if response appeared
            const messages = await page.locator('.message, [role="assistant"], .assistant-message').count();
            console.log(`  💬 Found ${messages} messages in chat`);
            
            await page.screenshot({ path: 'chat-conversation.png' });
            return true;
          } else {
            console.log(`  ❌ Could not find chat interface`);
          }
        } else {
          console.log(`  ⚠️  Could not find chat button`);
        }
      } else {
        console.log(`  ❌ No agents found on page`);
      }
    }
    
    return false;
  }
};

async function runFrontendTests() {
  console.log('🎭 Starting Playwright Frontend Tests');
  console.log('=' .repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 500 // Slow down for visibility
  });
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Test with admin account
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    console.log('\n👤 TESTING ADMIN ACCOUNT');
    console.log('-'.repeat(40));
    
    // Admin tests
    if (await testScenarios.login(adminPage, TEST_ACCOUNTS[0])) {
      results.passed++;
      await testScenarios.checkDashboard(adminPage);
      await testScenarios.navigateToAIAnalytics(adminPage);
      await testScenarios.navigateToIssues(adminPage);
      await testScenarios.navigateToFeatureRequests(adminPage);
      await testScenarios.testChatWithAgent(adminPage);
    } else {
      results.failed++;
    }
    
    await adminContext.close();
    
    // Test with agent account
    const agentContext = await browser.newContext();
    const agentPage = await agentContext.newPage();
    
    console.log('\n👤 TESTING AGENT ACCOUNT');
    console.log('-'.repeat(40));
    
    // Agent tests
    if (await testScenarios.login(agentPage, TEST_ACCOUNTS[1])) {
      results.passed++;
      await testScenarios.checkDashboard(agentPage);
      await testScenarios.testChatWithAgent(agentPage);
    } else {
      results.failed++;
    }
    
    await agentContext.close();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    results.failed++;
  } finally {
    await browser.close();
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📸 Screenshots saved to current directory`);
  console.log('='.repeat(50));
  
  return results;
}

// Run if called directly
if (require.main === module) {
  runFrontendTests().then((results) => {
    console.log('\n🎉 Frontend testing completed!');
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runFrontendTests };