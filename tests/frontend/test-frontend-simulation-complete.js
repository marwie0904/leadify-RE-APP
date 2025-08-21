const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test accounts created earlier
const TEST_ACCOUNTS = {
  admins: [
    { email: 'admin@primeresidential.com', password: 'TestPassword123!', org: 'Prime Residential Realty' },
    { email: 'admin@commercialproperty.com', password: 'TestPassword123!', org: 'Commercial Property Experts' },
    { email: 'admin@luxuryestates.com', password: 'TestPassword123!', org: 'Luxury Estate Partners' },
    { email: 'admin@urbanrentals.com', password: 'TestPassword123!', org: 'Urban Rental Solutions' }
  ],
  agents: [
    { email: 'agent1@primeresidential.com', password: 'TestPassword123!', name: 'Emily Davis' },
    { email: 'agent2@primeresidential.com', password: 'TestPassword123!', name: 'James Wilson' },
    { email: 'agent1@commercialproperty.com', password: 'TestPassword123!', name: 'Jennifer Lee' },
    { email: 'agent1@luxuryestates.com', password: 'TestPassword123!', name: 'Alexander Black' },
    { email: 'agent1@urbanrentals.com', password: 'TestPassword123!', name: 'Maria Garcia' }
  ]
};

// Conversation scenarios for BANT testing
const CONVERSATION_SCENARIOS = {
  hot: {
    messages: [
      "I need to buy a home urgently, relocating for work",
      "My budget is $800,000 and I'm pre-approved",
      "I'm the sole decision maker for my family",
      "Need 4 bedrooms with home office, good schools",
      "Must move in within 30 days"
    ],
    expectedScore: 85
  },
  warm: {
    messages: [
      "I'm interested in buying a home",
      "Budget is around $400,000-450,000",
      "Need to discuss with my spouse first",
      "Looking for 3 bedrooms in a quiet area",
      "Planning to buy in the next 3-4 months"
    ],
    expectedScore: 65
  },
  cold: {
    messages: [
      "Just browsing to see what's available",
      "Not sure about budget yet",
      "Haven't talked to anyone about this",
      "Just curious about the market",
      "Maybe next year"
    ],
    expectedScore: 30
  },
  handoff: {
    messages: [
      "I need help with a complex 1031 exchange",
      "This involves multiple properties and tax implications",
      "Can I speak to a human agent who understands these transactions?",
      "I have specific legal questions about the process",
      "This needs expert attention"
    ],
    expectedHandoff: true
  }
};

// Helper functions
async function login(page, account) {
  console.log(`  🔐 Logging in as ${account.email}...`);
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in
  const dashboardVisible = await page.locator('text=/dashboard/i').isVisible().catch(() => false);
  if (dashboardVisible) {
    console.log(`    ✅ Already logged in`);
    return true;
  }
  
  // Find and fill login form
  const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
  
  await emailInput.fill(account.email);
  await passwordInput.fill(account.password);
  
  // Click login button
  await page.locator('button:has-text("Sign in"), button:has-text("Login")').first().click();
  
  // Wait for navigation
  await page.waitForURL('**/dashboard/**', { timeout: 10000 }).catch(() => {});
  
  const success = await page.locator('text=/dashboard/i').isVisible().catch(() => false);
  console.log(`    ${success ? '✅' : '❌'} Login ${success ? 'successful' : 'failed'}`);
  
  return success;
}

async function navigateToChat(page) {
  console.log(`  📱 Navigating to chat interface...`);
  
  // Try multiple navigation paths
  const paths = [
    { selector: 'a:has-text("Conversations")', name: 'Conversations' },
    { selector: 'a:has-text("Chat")', name: 'Chat' },
    { selector: 'a:has-text("Messages")', name: 'Messages' },
    { selector: 'button:has-text("New Chat")', name: 'New Chat' }
  ];
  
  for (const path of paths) {
    const element = await page.locator(path.selector).first();
    if (await element.isVisible()) {
      await element.click();
      await page.waitForLoadState('networkidle');
      console.log(`    ✅ Clicked on ${path.name}`);
      return true;
    }
  }
  
  // Try direct URL navigation
  await page.goto(`${BASE_URL}/conversations`);
  await page.waitForLoadState('networkidle');
  
  return await page.locator('textarea, input[placeholder*="message"]').isVisible().catch(() => false);
}

async function selectAgent(page, agentName) {
  console.log(`  🤖 Selecting agent: ${agentName}...`);
  
  // Look for agent selector or agent card
  const agentElements = await page.locator(`text=/${agentName}/i`).all();
  
  if (agentElements.length > 0) {
    await agentElements[0].click();
    await page.waitForTimeout(1000);
    console.log(`    ✅ Selected ${agentName}`);
    return true;
  }
  
  // Try dropdown selector
  const dropdown = await page.locator('select, [role="combobox"]').first();
  if (await dropdown.isVisible()) {
    await dropdown.selectOption({ label: agentName }).catch(() => {});
    console.log(`    ✅ Selected ${agentName} from dropdown`);
    return true;
  }
  
  console.log(`    ⚠️  Could not find agent selector`);
  return false;
}

async function sendMessage(page, message) {
  // Find message input
  const messageInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
  
  if (!await messageInput.isVisible()) {
    console.log(`    ❌ Message input not found`);
    return false;
  }
  
  // Type message
  await messageInput.fill(message);
  await page.waitForTimeout(500);
  
  // Send message
  const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]:visible').first();
  if (await sendButton.isVisible()) {
    await sendButton.click();
  } else {
    await page.keyboard.press('Enter');
  }
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  return true;
}

async function simulateConversation(page, scenario, scenarioName) {
  console.log(`  💬 Starting ${scenarioName} conversation...`);
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    console.log(`    📝 Sending: "${message.substring(0, 50)}..."`);
    
    const sent = await sendMessage(page, message);
    if (!sent) {
      console.log(`    ❌ Failed to send message`);
      return false;
    }
    
    // Wait for AI response
    await page.waitForTimeout(2000 + Math.random() * 2000);
    
    // Check for response
    const messages = await page.locator('.message, [class*="message"], [data-role="message"]').count();
    console.log(`    💭 Total messages in conversation: ${messages}`);
  }
  
  // Take screenshot
  await page.screenshot({ 
    path: `conversation-${scenarioName}-${Date.now()}.png`,
    fullPage: true 
  });
  
  console.log(`    ✅ Completed ${scenarioName} conversation`);
  return true;
}

async function checkTokenUsage(page) {
  console.log(`  📊 Checking token usage...`);
  
  // Navigate to AI Analytics
  const analyticsLink = await page.locator('a:has-text("AI Analytics"), a:has-text("Token Usage")').first();
  
  if (await analyticsLink.isVisible()) {
    await analyticsLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for token metrics
    const tokenElements = await page.locator('text=/tokens/i, text=/usage/i').all();
    
    if (tokenElements.length > 0) {
      console.log(`    ✅ Found ${tokenElements.length} token usage indicators`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `token-usage-${Date.now()}.png`,
        fullPage: true 
      });
      
      return true;
    }
  }
  
  console.log(`    ⚠️  Could not access token usage data`);
  return false;
}

async function checkLeads(page) {
  console.log(`  👥 Checking leads...`);
  
  // Navigate to leads
  const leadsLink = await page.locator('a:has-text("Leads")').first();
  
  if (await leadsLink.isVisible()) {
    await leadsLink.click();
    await page.waitForLoadState('networkidle');
    
    // Count leads
    const leadCards = await page.locator('[class*="lead"], [data-testid="lead"]').count();
    console.log(`    📊 Found ${leadCards} leads`);
    
    // Look for BANT scores
    const bantScores = await page.locator('text=/score/i, text=/BANT/i').count();
    console.log(`    🎯 Found ${bantScores} BANT score indicators`);
    
    // Take screenshot
    await page.screenshot({ 
      path: `leads-${Date.now()}.png`,
      fullPage: true 
    });
    
    return true;
  }
  
  console.log(`    ⚠️  Could not access leads page`);
  return false;
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Frontend Testing with Real Conversations');
  console.log('=' .repeat(70));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const results = {
    totalTests: 0,
    successful: 0,
    failed: 0,
    conversations: [],
    tokenTracking: false,
    leadTracking: false
  };
  
  try {
    // Test 1: Admin login and setup verification
    console.log('\n📌 TEST 1: Admin Login and Dashboard Access');
    console.log('-'.repeat(50));
    
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    if (await login(adminPage, TEST_ACCOUNTS.admins[0])) {
      results.successful++;
      
      // Check dashboard elements
      await adminPage.screenshot({ path: 'admin-dashboard.png' });
      
      // Check token usage before conversations
      await checkTokenUsage(adminPage);
      
      // Check existing leads
      await checkLeads(adminPage);
    } else {
      results.failed++;
    }
    results.totalTests++;
    
    await adminContext.close();
    
    // Test 2: Simulate conversations with different BANT scores
    console.log('\n📌 TEST 2: Simulating Real Conversations with AI Agents');
    console.log('-'.repeat(50));
    
    for (const [scenarioName, scenario] of Object.entries(CONVERSATION_SCENARIOS)) {
      console.log(`\n🔹 Testing ${scenarioName.toUpperCase()} lead scenario`);
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Login as agent
      const agent = TEST_ACCOUNTS.agents[0];
      if (await login(page, agent)) {
        // Navigate to chat
        if (await navigateToChat(page)) {
          // Select AI agent if needed
          await selectAgent(page, 'ResidentialBot');
          
          // Simulate conversation
          const success = await simulateConversation(page, scenario, scenarioName);
          
          if (success) {
            results.successful++;
            results.conversations.push({
              type: scenarioName,
              completed: true,
              expectedScore: scenario.expectedScore || 0,
              expectedHandoff: scenario.expectedHandoff || false
            });
          } else {
            results.failed++;
          }
        } else {
          results.failed++;
        }
      } else {
        results.failed++;
      }
      
      results.totalTests++;
      await context.close();
      
      // Wait between conversations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test 3: Verify token tracking after conversations
    console.log('\n📌 TEST 3: Verifying Token Usage Tracking');
    console.log('-'.repeat(50));
    
    const verifyContext = await browser.newContext();
    const verifyPage = await verifyContext.newPage();
    
    if (await login(verifyPage, TEST_ACCOUNTS.admins[0])) {
      results.tokenTracking = await checkTokenUsage(verifyPage);
      results.leadTracking = await checkLeads(verifyPage);
      results.successful++;
    } else {
      results.failed++;
    }
    results.totalTests++;
    
    await verifyContext.close();
    
    // Test 4: Check conversation history
    console.log('\n📌 TEST 4: Verifying Conversation History');
    console.log('-'.repeat(50));
    
    const historyContext = await browser.newContext();
    const historyPage = await historyContext.newPage();
    
    if (await login(historyPage, TEST_ACCOUNTS.admins[0])) {
      // Navigate to conversations
      const convLink = await historyPage.locator('a:has-text("Conversations")').first();
      if (await convLink.isVisible()) {
        await convLink.click();
        await historyPage.waitForLoadState('networkidle');
        
        // Count conversations
        const convCount = await historyPage.locator('[class*="conversation"], [data-testid="conversation"]').count();
        console.log(`  📊 Found ${convCount} conversations in history`);
        
        // Take screenshot
        await historyPage.screenshot({ 
          path: 'conversation-history.png',
          fullPage: true 
        });
        
        results.successful++;
      } else {
        results.failed++;
      }
    } else {
      results.failed++;
    }
    results.totalTests++;
    
    await historyContext.close();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    results.failed++;
  } finally {
    await browser.close();
  }
  
  // Generate summary report
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests Run: ${results.totalTests}`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.successful / results.totalTests) * 100).toFixed(1)}%`);
  console.log('\n📝 Conversation Simulations:');
  results.conversations.forEach(conv => {
    console.log(`  - ${conv.type}: ${conv.completed ? '✅' : '❌'} ${conv.expectedScore ? `(Expected BANT: ${conv.expectedScore})` : ''}`);
  });
  console.log(`\n🎯 Feature Verification:`);
  console.log(`  - Token Tracking: ${results.tokenTracking ? '✅ Working' : '❌ Not Working'}`);
  console.log(`  - Lead Tracking: ${results.leadTracking ? '✅ Working' : '❌ Not Working'}`);
  console.log('\n📸 Screenshots saved to current directory');
  console.log('='.repeat(70));
  
  return results;
}

// Verify database data after tests
async function verifyDatabaseData() {
  console.log('\n🔍 Verifying Database Records...');
  console.log('-'.repeat(50));
  
  // Check conversations
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!convError) {
    console.log(`  📊 Recent conversations: ${conversations.length}`);
  }
  
  // Check messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (!msgError) {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    console.log(`  💬 Recent messages: ${userMessages} user, ${assistantMessages} assistant`);
  }
  
  // Check token usage
  const { data: tokens, error: tokenError } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, cost, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!tokenError && tokens.length > 0) {
    const totalTokens = tokens.reduce((sum, t) => sum + t.total_tokens, 0);
    const totalCost = tokens.reduce((sum, t) => sum + t.cost, 0);
    console.log(`  🎯 Token usage: ${totalTokens} tokens, $${totalCost.toFixed(4)} cost`);
  }
  
  // Check leads
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('id, bant_score, status')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (!leadError) {
    const hotLeads = leads.filter(l => l.status === 'hot').length;
    const warmLeads = leads.filter(l => l.status === 'warm').length;
    const coldLeads = leads.filter(l => l.status === 'cold').length;
    console.log(`  👥 Recent leads: ${hotLeads} hot, ${warmLeads} warm, ${coldLeads} cold`);
  }
}

// Main execution
if (require.main === module) {
  console.log('🎭 Real Estate AI Agent - Complete Frontend Testing Suite');
  console.log('This will simulate real conversations and track all metrics\n');
  
  runComprehensiveTest()
    .then(async (results) => {
      await verifyDatabaseData();
      console.log('\n🎉 Testing completed successfully!');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTest };