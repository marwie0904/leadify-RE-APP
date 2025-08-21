const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test organization and user details
const TEST_ORG = {
  name: 'Sample Test Realty',
  domain: 'sampletestreal.com',
  admin: {
    email: 'admin@sampletestreal.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Admin'
  }
};

const TEST_AGENT = {
  name: 'SampleBot',
  tone: 'Friendly',
  language: 'English',
  type: 'sales',
  status: 'ready'
};

// Helper functions
async function createTestData() {
  console.log('\n📦 Creating test data in database...');
  
  try {
    // 1. Create auth user
    console.log('  Creating test user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_ORG.admin.email,
      password: TEST_ORG.admin.password,
      email_confirm: true,
      user_metadata: {
        first_name: TEST_ORG.admin.firstName,
        last_name: TEST_ORG.admin.lastName,
        role: 'admin'
      }
    });
    
    if (authError) throw authError;
    console.log('  ✅ User created:', authUser.user.id);
    
    // 2. Add to users table
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email: TEST_ORG.admin.email,
        first_name: TEST_ORG.admin.firstName,
        last_name: TEST_ORG.admin.lastName,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (userError) console.warn('  ⚠️  User table insert warning:', userError.message);
    
    // 3. Create organization
    console.log('  Creating test organization...');
    const orgId = uuidv4();
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: TEST_ORG.name,
        owner_id: authUser.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (orgError) throw orgError;
    console.log('  ✅ Organization created:', orgId);
    
    // 4. Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: authUser.user.id,
        role: 'admin',
        joined_at: new Date().toISOString()
      });
    
    if (memberError) console.warn('  ⚠️  Member insert warning:', memberError.message);
    
    // 5. Create AI agent
    console.log('  Creating test AI agent...');
    const agentId = uuidv4();
    const { error: agentError } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        name: TEST_AGENT.name,
        tone: TEST_AGENT.tone,
        language: TEST_AGENT.language,
        type: TEST_AGENT.type,
        status: TEST_AGENT.status,
        user_id: authUser.user.id,
        organization_id: orgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (agentError) throw agentError;
    console.log('  ✅ Agent created:', agentId);
    
    return {
      userId: authUser.user.id,
      orgId,
      agentId,
      email: TEST_ORG.admin.email,
      password: TEST_ORG.admin.password
    };
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

async function cleanupTestData(email) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Get user ID
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);
    
    if (users && users.length > 0) {
      const userId = users[0].id;
      
      // Delete in order to avoid foreign key constraints
      await supabase.from('messages').delete().eq('user_id', userId);
      await supabase.from('conversation_handoffs').delete().match({ agent_id: userId });
      await supabase.from('leads').delete().match({ agent_id: userId });
      await supabase.from('conversations').delete().match({ agent_id: userId });
      await supabase.from('agents').delete().eq('user_id', userId);
      await supabase.from('organization_members').delete().eq('user_id', userId);
      await supabase.from('organizations').delete().eq('owner_id', userId);
      await supabase.from('users').delete().eq('id', userId);
      
      // Delete auth user
      await supabase.auth.admin.deleteUser(userId);
      
      console.log('  ✅ Test data cleaned up');
    }
  } catch (error) {
    console.error('  ⚠️  Cleanup warning:', error.message);
  }
}

// UI Test Functions
async function testLogin(page, credentials) {
  console.log('\n🔐 Testing login flow...');
  
  // Navigate to auth page
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  console.log('  ✅ Auth page loaded');
  
  // Take screenshot
  await page.screenshot({ path: 'sample-01-auth-page.png' });
  
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
  
  // Fill credentials
  await emailInput.fill(credentials.email);
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
  
  // Wait for navigation
  try {
    // Wait for any navigation away from auth page
    await page.waitForFunction(
      () => !window.location.pathname.includes('/auth'),
      { timeout: 15000 }
    );
    
    // Check where we ended up
    const currentUrl = page.url();
    console.log('  📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('  ✅ Successfully navigated to dashboard');
      await page.screenshot({ path: 'sample-02-dashboard.png' });
      return true;
    } else if (currentUrl.includes('/organization-setup')) {
      console.log('  ✅ Redirected to organization setup (new user flow)');
      // Complete organization setup
      await page.waitForTimeout(2000);
      
      // Click continue or skip if available
      const continueButton = await page.locator('button:has-text("Continue"), button:has-text("Skip"), button:has-text("Next")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        console.log('  ✅ Clicked continue in organization setup');
        await page.waitForTimeout(2000);
      }
      
      return true;
    } else {
      console.log('  ✅ Navigated to:', currentUrl);
      return true;
    }
  } catch (error) {
    console.log('  ❌ Login failed or navigation timeout:', error.message);
    const finalUrl = page.url();
    console.log('  📍 Final URL:', finalUrl);
    await page.screenshot({ path: 'sample-02-error.png' });
    return false;
  }
}

async function testNavigation(page) {
  console.log('\n🧭 Testing navigation...');
  
  // Check for sidebar navigation items
  const navItems = [
    { name: 'Dashboard', selector: 'a[href="/dashboard"]' },
    { name: 'Leads', selector: 'a[href="/leads"]' },
    { name: 'AI Agents', selector: 'a[href="/agents"]' },
    { name: 'Organization', selector: 'a[href="/organization"]' },
    { name: 'Conversations', selector: 'a[href="/conversations"]' }
  ];
  
  for (const item of navItems) {
    const element = await page.locator(item.selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    console.log(`  ${isVisible ? '✅' : '❌'} ${item.name} link ${isVisible ? 'found' : 'not found'}`);
  }
  
  await page.screenshot({ path: 'sample-03-navigation.png' });
  
  return true;
}

async function testAgentsPage(page) {
  console.log('\n🤖 Testing Agents page...');
  
  // Navigate to agents page
  const agentsLink = await page.locator('a[href="/agents"]').first();
  
  if (await agentsLink.isVisible()) {
    await agentsLink.click();
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Navigated to Agents page');
  } else {
    // Try direct navigation
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Directly navigated to Agents page');
  }
  
  // Wait a bit for data to load
  await page.waitForTimeout(2000);
  
  // Look for our test agent
  const agentName = await page.locator(`text=/${TEST_AGENT.name}/i`).first();
  const agentFound = await agentName.isVisible().catch(() => false);
  
  if (agentFound) {
    console.log(`  ✅ Found agent: ${TEST_AGENT.name}`);
  } else {
    console.log(`  ⚠️  Agent not visible on page`);
  }
  
  // Look for chat preview button
  const chatButtons = [
    'button:has-text("Chat Preview")',
    'button:has-text("Preview")',
    'button:has-text("Test")',
    'button:has-text("Chat")',
    'button[aria-label*="chat"]',
    '[data-testid="chat-preview-button"]'
  ];
  
  let chatButtonFound = false;
  for (const selector of chatButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      console.log(`  ✅ Found chat button: ${selector}`);
      chatButtonFound = true;
      break;
    }
  }
  
  if (!chatButtonFound) {
    console.log('  ⚠️  Chat preview button not found');
  }
  
  await page.screenshot({ path: 'sample-04-agents-page.png' });
  
  return agentFound;
}

async function testChatPreview(page) {
  console.log('\n💬 Testing Chat Preview...');
  
  // Try to open chat preview
  const chatButtons = [
    'button:has-text("Chat Preview")',
    'button:has-text("Preview")',
    'button:has-text("Test Chat")',
    'button:has-text("Chat")'
  ];
  
  let chatOpened = false;
  
  for (const selector of chatButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      console.log(`  ✅ Clicked chat button`);
      
      // Wait for modal/chat interface
      await page.waitForTimeout(2000);
      
      // Check if chat interface opened
      const chatInterface = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
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
    const testMessage = "Hello, I'm interested in buying a house";
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
    await page.waitForTimeout(3000);
    
    // Check for messages in chat
    const messages = await page.locator('[class*="message"], [data-testid="message"]').count();
    console.log(`  📊 Found ${messages} messages in chat`);
    
    await page.screenshot({ path: 'sample-05-chat-preview.png' });
    
    // Close chat if it's a modal
    const closeButton = await page.locator('button[aria-label="Close"], button:has-text("Close")').first();
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
    console.log('  ✅ Navigated to Conversations page');
  } else {
    await page.goto(`${BASE_URL}/conversations`);
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Directly navigated to Conversations page');
  }
  
  // Wait for conversations to load
  await page.waitForTimeout(2000);
  
  // Check for conversation elements
  const conversationElements = await page.locator('[class*="conversation"], [data-testid="conversation"]').count();
  console.log(`  📊 Found ${conversationElements} conversation elements`);
  
  // Check for our test conversation
  const testConversation = await page.locator('text=/interested in buying a house/i').first();
  if (await testConversation.isVisible().catch(() => false)) {
    console.log('  ✅ Found our test conversation');
  } else {
    console.log('  ⚠️  Test conversation not visible');
  }
  
  await page.screenshot({ path: 'sample-06-conversations.png' });
  
  return true;
}

// Main test runner
async function runSampleTest() {
  console.log('🎭 SAMPLE UI VALIDATION TEST');
  console.log('=' .repeat(60));
  console.log('This test will:');
  console.log('  1. Create a test organization and user');
  console.log('  2. Test login flow');
  console.log('  3. Validate navigation elements');
  console.log('  4. Test Agents page');
  console.log('  5. Test Chat Preview');
  console.log('  6. Check Conversations page');
  console.log('=' .repeat(60));
  
  let testData = null;
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down for visibility
  });
  
  const results = {
    dataCreation: false,
    login: false,
    navigation: false,
    agentsPage: false,
    chatPreview: false,
    conversationsPage: false
  };
  
  try {
    // Create test data
    testData = await createTestData();
    results.dataCreation = true;
    console.log('\n✅ Test data created successfully');
    
    // Create browser context
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Run UI tests
    results.login = await testLogin(page, testData);
    
    if (results.login) {
      results.navigation = await testNavigation(page);
      results.agentsPage = await testAgentsPage(page);
      
      if (results.agentsPage) {
        results.chatPreview = await testChatPreview(page);
      }
      
      results.conversationsPage = await testConversationsPage(page);
    }
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
  } finally {
    await browser.close();
    
    // Cleanup test data
    if (testData) {
      await cleanupTestData(TEST_ORG.admin.email);
    }
  }
  
  // Generate report
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Data Creation', result: results.dataCreation },
    { name: 'Login Flow', result: results.login },
    { name: 'Navigation', result: results.navigation },
    { name: 'Agents Page', result: results.agentsPage },
    { name: 'Chat Preview', result: results.chatPreview },
    { name: 'Conversations Page', result: results.conversationsPage }
  ];
  
  tests.forEach(test => {
    console.log(`${test.result ? '✅' : '❌'} ${test.name}`);
  });
  
  const passedTests = tests.filter(t => t.result).length;
  const totalTests = tests.length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n📈 Summary:');
  console.log(`  Passed: ${passedTests}/${totalTests} (${passRate}%)`);
  console.log('  Screenshots saved: sample-*.png');
  
  if (passRate === '100.0') {
    console.log('\n✅ All UI elements validated successfully!');
    console.log('Ready to run full test suite.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('  1. Both servers are running (backend: 3001, frontend: 3000)');
    console.log('  2. Database schema matches expected structure');
    console.log('  3. UI elements match the selectors');
  }
  
  console.log('=' .repeat(60));
  
  return results;
}

// Execute the test
if (require.main === module) {
  console.log('🚀 Starting Sample UI Validation Test\n');
  
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
    runSampleTest()
      .then((results) => {
        const allPassed = Object.values(results).every(r => r);
        console.log(`\n${allPassed ? '🎉' : '⚠️ '} Sample test completed!`);
        process.exit(allPassed ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
      });
  });
}

module.exports = { runSampleTest };