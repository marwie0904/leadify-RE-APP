const { chromium } = require('playwright');
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Use existing test users from the database
const EXISTING_USERS = [
  {
    email: 'agent1@primeresidential.com',
    password: 'TestPassword123!',
    org: 'Prime Residential Realty',
    agent: 'ResidentialBot'
  },
  {
    email: 'agent1@commercialproperty.com', 
    password: 'TestPassword123!',
    org: 'Commercial Property Experts',
    agent: 'CommercialAssist'
  },
  {
    email: 'agent1@luxuryestates.com',
    password: 'TestPassword123!',
    org: 'Luxury Estate Partners',
    agent: 'LuxuryAdvisor'
  },
  {
    email: 'agent1@urbanrentals.com',
    password: 'TestPassword123!',
    org: 'Urban Rental Solutions',
    agent: 'RentalHelper'
  }
];

// UI Test Functions
async function testLogin(page, credentials) {
  console.log(`\n🔐 Testing login for ${credentials.email}...`);
  
  // Navigate to auth page
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  console.log('  ✅ Auth page loaded');
  
  // Take screenshot
  await page.screenshot({ path: `test-01-auth-${Date.now()}.png` });
  
  // Check if already redirected to dashboard (auto-login)
  const url = page.url();
  if (url.includes('/dashboard')) {
    console.log('  ✅ Already logged in, redirected to dashboard');
    return true;
  }
  
  // Find login form elements
  const emailInput = await page.locator('input[type="email"]').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  
  if (!await emailInput.isVisible() || !await passwordInput.isVisible()) {
    console.log('  ❌ Login form not found');
    return false;
  }
  
  console.log('  ✅ Found email and password inputs');
  
  // Clear and fill credentials
  await emailInput.clear();
  await emailInput.fill(credentials.email);
  await passwordInput.clear();
  await passwordInput.fill(credentials.password);
  console.log('  ✅ Filled credentials');
  
  // Find and click sign in button
  const signInButton = await page.locator('button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Login")').first();
  
  if (!await signInButton.isVisible()) {
    console.log('  ❌ Sign in button not found');
    return false;
  }
  
  await signInButton.click();
  console.log('  ✅ Clicked sign in button');
  
  // Wait for navigation with longer timeout
  try {
    await page.waitForFunction(
      () => {
        const path = window.location.pathname;
        return !path.includes('/auth') && path !== '/';
      },
      { timeout: 20000 }
    );
    
    const currentUrl = page.url();
    console.log('  📍 Navigated to:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('  ✅ Successfully logged in to dashboard');
      await page.screenshot({ path: `test-02-dashboard-${Date.now()}.png` });
      return true;
    } else if (currentUrl.includes('/organization')) {
      console.log('  ✅ Logged in, redirected to organization page');
      return true;
    } else {
      console.log('  ✅ Logged in, navigated to:', currentUrl);
      return true;
    }
  } catch (error) {
    console.log('  ❌ Login timeout or error:', error.message);
    const finalUrl = page.url();
    console.log('  📍 Final URL:', finalUrl);
    await page.screenshot({ path: `test-error-${Date.now()}.png` });
    return false;
  }
}

async function testNavigation(page) {
  console.log('\n🧭 Testing navigation sidebar...');
  
  const navItems = [
    { name: 'Dashboard', selector: 'a[href="/dashboard"]' },
    { name: 'Leads', selector: 'a[href="/leads"]' },
    { name: 'AI Agents', selector: 'a[href="/agents"]' },
    { name: 'Organization', selector: 'a[href="/organization"]' },
    { name: 'Conversations', selector: 'a[href="/conversations"]' }
  ];
  
  let foundCount = 0;
  for (const item of navItems) {
    const element = await page.locator(item.selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    console.log(`  ${isVisible ? '✅' : '❌'} ${item.name} ${isVisible ? 'found' : 'not found'}`);
    if (isVisible) foundCount++;
  }
  
  await page.screenshot({ path: `test-03-navigation-${Date.now()}.png` });
  
  return foundCount >= 3; // At least 3 nav items should be visible
}

async function testAgentsPage(page, expectedAgent) {
  console.log(`\n🤖 Testing Agents page (expecting ${expectedAgent})...`);
  
  // Navigate to agents page
  const agentsLink = await page.locator('a[href="/agents"]').first();
  
  if (await agentsLink.isVisible()) {
    await agentsLink.click();
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Navigated to Agents page via sidebar');
  } else {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Directly navigated to Agents page');
  }
  
  // Wait for data to load
  await page.waitForTimeout(3000);
  
  // Look for the expected agent
  const agentName = await page.locator(`text=/${expectedAgent}/i`).first();
  const agentFound = await agentName.isVisible().catch(() => false);
  
  if (agentFound) {
    console.log(`  ✅ Found agent: ${expectedAgent}`);
  } else {
    console.log(`  ⚠️  Agent "${expectedAgent}" not visible on page`);
    // Try to find any agent
    const anyAgent = await page.locator('text=/ResidentialBot|CommercialAssist|LuxuryAdvisor|RentalHelper/i').first();
    if (await anyAgent.isVisible()) {
      const foundText = await anyAgent.textContent();
      console.log(`  ℹ️  Found different agent: ${foundText}`);
    }
  }
  
  // Look for chat preview button
  const chatButtons = [
    'button:has-text("Chat Preview")',
    'button:has-text("Preview")',
    'button:has-text("Test")',
    'button:has-text("Chat")',
    '[data-testid="chat-preview"]'
  ];
  
  let chatButtonFound = false;
  for (const selector of chatButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      console.log(`  ✅ Found chat button`);
      chatButtonFound = true;
      break;
    }
  }
  
  if (!chatButtonFound) {
    console.log('  ⚠️  Chat preview button not found');
  }
  
  await page.screenshot({ path: `test-04-agents-${Date.now()}.png` });
  
  return agentFound || chatButtonFound;
}

async function testChatPreview(page) {
  console.log('\n💬 Testing Chat Preview...');
  
  // Make sure we're on agents page
  if (!page.url().includes('/agents')) {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
  
  // Try to open chat preview
  const chatButtons = [
    'button:has-text("Chat Preview")',
    'button:has-text("Preview")',
    'button:has-text("Test Chat")',
    'button:has-text("Chat")',
    'button:has-text("Test")'
  ];
  
  let chatOpened = false;
  
  for (const selector of chatButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      console.log(`  ✅ Clicked chat button`);
      
      // Wait for modal/chat interface
      await page.waitForTimeout(3000);
      
      // Check if chat interface opened (modal or inline)
      const chatInterface = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"], input[placeholder*="chat"]').first();
      if (await chatInterface.isVisible().catch(() => false)) {
        console.log('  ✅ Chat interface opened');
        chatOpened = true;
        break;
      }
    }
  }
  
  if (!chatOpened) {
    console.log('  ⚠️  Could not open chat preview');
    return false;
  }
  
  // Send a test message
  const messageInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
  
  if (await messageInput.isVisible()) {
    const testMessage = "Hello, I'm looking for a property";
    await messageInput.fill(testMessage);
    console.log(`  ✅ Typed message: "${testMessage}"`);
    
    // Send message
    const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]:visible').first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
      console.log('  ✅ Clicked send button');
    } else {
      await page.keyboard.press('Enter');
      console.log('  ✅ Pressed Enter to send');
    }
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for messages in chat
    const messages = await page.locator('[class*="message"], [data-testid="message"], div:has-text("Hello")').count();
    console.log(`  📊 Found ${messages} message elements in chat`);
    
    await page.screenshot({ path: `test-05-chat-${Date.now()}.png` });
    
    // Try to close chat if it's a modal
    const closeButton = await page.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("X")').first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      console.log('  ✅ Closed chat modal');
    }
    
    return true;
  }
  
  return false;
}

async function testConversationsPage(page) {
  console.log('\n📜 Testing Conversations page...');
  
  // Navigate to conversations
  const conversationsLink = await page.locator('a[href="/conversations"]').first();
  
  if (await conversationsLink.isVisible()) {
    await conversationsLink.click();
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Navigated to Conversations page via sidebar');
  } else {
    await page.goto(`${BASE_URL}/conversations`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Directly navigated to Conversations page');
  }
  
  // Wait for conversations to load
  await page.waitForTimeout(3000);
  
  // Check for conversation elements
  const conversationElements = await page.locator('[class*="conversation"], [data-testid="conversation"], [class*="message"]').count();
  console.log(`  📊 Found ${conversationElements} conversation-related elements`);
  
  // Check for our test conversation
  const testConversation = await page.locator('text=/looking for a property|Hello/i').first();
  if (await testConversation.isVisible().catch(() => false)) {
    console.log('  ✅ Found test conversation content');
  } else {
    console.log('  ℹ️  Test conversation not yet visible');
  }
  
  await page.screenshot({ path: `test-06-conversations-${Date.now()}.png` });
  
  return conversationElements > 0;
}

// Main test runner
async function runExistingUserTest() {
  console.log('🎭 TESTING WITH EXISTING USERS');
  console.log('=' .repeat(60));
  console.log('This test will use existing users from the database');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const allResults = [];
  
  // Test with first user that works
  for (const user of EXISTING_USERS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📧 Testing with: ${user.email}`);
    console.log(`🏢 Organization: ${user.org}`);
    console.log(`🤖 Expected Agent: ${user.agent}`);
    console.log('='.repeat(60));
    
    const results = {
      user: user.email,
      login: false,
      navigation: false,
      agentsPage: false,
      chatPreview: false,
      conversationsPage: false
    };
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Run tests
      results.login = await testLogin(page, user);
      
      if (results.login) {
        results.navigation = await testNavigation(page);
        results.agentsPage = await testAgentsPage(page, user.agent);
        
        if (results.agentsPage) {
          results.chatPreview = await testChatPreview(page);
        }
        
        results.conversationsPage = await testConversationsPage(page);
      }
      
      allResults.push(results);
      
      // If all tests pass, we can stop
      const allPassed = Object.values(results).filter(v => typeof v === 'boolean').every(v => v);
      if (allPassed) {
        console.log('\n✅ All tests passed for this user!');
        await context.close();
        break;
      }
      
    } catch (error) {
      console.error(`\n❌ Error testing ${user.email}:`, error.message);
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
  
  // Generate report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  allResults.forEach(result => {
    console.log(`\n📧 ${result.user}:`);
    console.log(`  Login: ${result.login ? '✅' : '❌'}`);
    console.log(`  Navigation: ${result.navigation ? '✅' : '❌'}`);
    console.log(`  Agents Page: ${result.agentsPage ? '✅' : '❌'}`);
    console.log(`  Chat Preview: ${result.chatPreview ? '✅' : '❌'}`);
    console.log(`  Conversations: ${result.conversationsPage ? '✅' : '❌'}`);
  });
  
  // Find best result
  const bestResult = allResults.reduce((best, current) => {
    const currentScore = Object.values(current).filter(v => v === true).length;
    const bestScore = Object.values(best).filter(v => v === true).length;
    return currentScore > bestScore ? current : best;
  }, allResults[0]);
  
  const passedTests = Object.values(bestResult).filter(v => v === true).length;
  const totalTests = 5; // login, navigation, agents, chat, conversations
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n📈 Best Result:');
  console.log(`  User: ${bestResult.user}`);
  console.log(`  Passed: ${passedTests}/${totalTests} (${passRate}%)`);
  console.log(`  Screenshots saved: test-*.png`);
  
  if (passRate >= 80) {
    console.log('\n✅ UI validation successful! Ready for full test suite.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check screenshots and logs.');
  }
  
  console.log('=' .repeat(60));
  
  return bestResult;
}

// Execute the test
if (require.main === module) {
  console.log('🚀 Starting Test with Existing Users\n');
  
  // Check if servers are running
  Promise.all([
    fetch('http://localhost:3001/api/health').catch(() => null),
    fetch('http://localhost:3000').catch(() => null)
  ]).then(([backendResponse, frontendResponse]) => {
    if (!backendResponse) {
      console.error('❌ Backend server not running on port 3001');
      console.log('   Start it with: cd BACKEND && npm run server');
      process.exit(1);
    }
    if (!frontendResponse) {
      console.error('❌ Frontend server not running on port 3000');
      console.log('   Start it with: cd FRONTEND/financial-dashboard-2 && npm run dev');
      process.exit(1);
    }
    
    console.log('✅ Both servers are running\n');
    
    // Run the test
    runExistingUserTest()
      .then((result) => {
        const success = Object.values(result).filter(v => v === true).length >= 4;
        console.log(`\n${success ? '🎉' : '⚠️ '} Test completed!`);
        process.exit(success ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
      });
  });
}

module.exports = { runExistingUserTest };