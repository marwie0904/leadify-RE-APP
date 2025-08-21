#!/usr/bin/env node

const { chromium } = require('playwright');
const { spawn } = require('child_process');
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test account from .env
const TEST_ACCOUNT = {
  email: process.env.TEST_EMAIL || 'marwie.ang.0904@gmail.com',
  password: process.env.TEST_PASSWORD || 'ayokonga123'
};

// AI Agents to test
const AGENTS = [
  { name: 'ResidentialBot', type: 'residential' },
  { name: 'CommercialAssist', type: 'commercial' },
  { name: 'LuxuryAdvisor', type: 'luxury' },
  { name: 'RentalHelper', type: 'rental' }
];

// Conversation templates for BANT scoring
const CONVERSATION_TEMPLATES = {
  hot: [
    "I need to buy a house immediately. My budget is $800,000 and I'm the decision maker. We need to close within 30 days.",
    "Looking to purchase commercial property ASAP. $2M budget approved by the board. Need to finalize this month.",
    "I'm ready to buy a luxury home. Have $3M in cash, need to move in 2 weeks. I'm the owner making the decision.",
    "Need a rental property urgently. Budget is $3,000/month, I'm signing the lease. Moving next week."
  ],
  warm: [
    "I'm interested in buying a home. Budget around $500K. Need to discuss with my spouse but looking to buy in 2-3 months.",
    "Exploring commercial properties. Budget might be $1M. Our team is evaluating options for Q2.",
    "Considering a luxury property. Have about $2M budget. Timeline is flexible, maybe 3-4 months.",
    "Looking for rental options. Can spend up to $2,500/month. Need to move in about 2 months."
  ],
  cold: [
    "Just browsing homes in the area. Not sure about budget yet. Maybe next year.",
    "Curious about commercial property prices. No immediate plans.",
    "Window shopping for luxury homes. Just want to see what's available.",
    "Checking rental prices for future reference. Not moving anytime soon."
  ],
  nonResponsive: [
    "Hi",
    "Hello there",
    "Anyone there?",
    "Test"
  ],
  handoff: [
    "I need to speak with a human agent about a complex tax situation regarding property purchase.",
    "Can I talk to a real person? I have specific legal questions about commercial zoning.",
    "Please connect me with a human. I need help with international property investment.",
    "I want to discuss a complicated rental situation with an actual agent."
  ]
};

// Stats tracking
const stats = {
  totalConversations: 0,
  successfulConversations: 0,
  failedConversations: 0,
  conversationIds: new Set(),
  agentStats: {},
  bantScores: { hot: 0, warm: 0, cold: 0, nonResponsive: 0, handoff: 0 }
};

// Check if servers are running
async function checkServers() {
  console.log('📡 Checking servers...');
  
  try {
    const [backendResponse, frontendResponse] = await Promise.all([
      fetch(`${API_URL}/api/health`).catch(() => null),
      fetch(BASE_URL).catch(() => null)
    ]);
    
    if (!backendResponse) {
      console.error('❌ Backend server not running on port 3001');
      console.log('   Start it with: cd BACKEND && npm run server');
      return false;
    }
    
    if (!frontendResponse) {
      console.error('❌ Frontend server not running on port 3000');
      console.log('   Start it with: cd FRONTEND/financial-dashboard-2 && npm run dev');
      return false;
    }
    
    console.log('✅ Both servers are running');
    return true;
  } catch (error) {
    console.error('❌ Server check failed:', error.message);
    return false;
  }
}

// Login to the application
async function login(page) {
  console.log('\n🔐 Logging in...');
  
  // Navigate to dashboard to check auth status
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  
  if (currentUrl.includes('/auth')) {
    console.log('  📝 Need to login');
    
    // Wait for auth page to load
    await page.waitForTimeout(3000);
    
    // Try to find sign in tab
    const signInTab = await page.getByRole('tab', { name: /sign in/i }).first();
    if (await signInTab.isVisible().catch(() => false)) {
      await signInTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Find and fill login form
    const emailInput = await page.locator('input[type="email"]').first();
    const passwordInput = await page.locator('input[type="password"]').first();
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(TEST_ACCOUNT.email);
      await passwordInput.fill(TEST_ACCOUNT.password);
      console.log('  ✅ Filled credentials');
      
      // Submit login
      const submitButton = await page.getByRole('button', { name: /sign in|login/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
      } else {
        await passwordInput.press('Enter');
      }
      
      // Wait for navigation
      await page.waitForTimeout(5000);
      
      if (!page.url().includes('/auth')) {
        console.log('  ✅ Successfully logged in!');
        return true;
      } else {
        console.log('  ❌ Login failed');
        return false;
      }
    } else {
      console.log('  ❌ Could not find login form');
      return false;
    }
  } else {
    console.log('  ✅ Already authenticated');
    return true;
  }
}

// Navigate to agents page
async function navigateToAgents(page) {
  console.log('\n🤖 Navigating to Agents page...');
  
  // Try sidebar link first
  const agentsLink = await page.locator('a[href="/agents"]').first();
  if (await agentsLink.isVisible().catch(() => false)) {
    await agentsLink.click();
  } else {
    // Direct navigation
    await page.goto(`${BASE_URL}/agents`);
  }
  
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  if (page.url().includes('/agents')) {
    console.log('  ✅ On Agents page');
    return true;
  }
  
  return false;
}

// Find and select an agent
async function selectAgent(page, agentName) {
  console.log(`  🔍 Looking for ${agentName}...`);
  
  // Look for agent card or element
  const agentElement = await page.locator(`text=/${agentName}/i`).first();
  
  if (await agentElement.isVisible().catch(() => false)) {
    console.log(`  ✅ Found ${agentName}`);
    
    // Click on the agent or its parent card
    const agentCard = await agentElement.locator('..').first();
    await agentCard.click();
    await page.waitForTimeout(1000);
    
    return true;
  }
  
  console.log(`  ❌ Could not find ${agentName}`);
  return false;
}

// Open chat interface
async function openChatInterface(page) {
  console.log('  💬 Opening chat interface...');
  
  // Try various chat button selectors
  const chatButtonSelectors = [
    'button:has-text("Chat Preview")',
    'button:has-text("Preview")',
    'button:has-text("Test Chat")',
    'button:has-text("Chat")',
    'button:has-text("Test")',
    '[data-testid="chat-preview"]',
    'button[aria-label*="chat"]'
  ];
  
  for (const selector of chatButtonSelectors) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      console.log('    ✅ Clicked chat button');
      await page.waitForTimeout(3000);
      
      // Check if chat interface opened
      const chatInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
      if (await chatInput.isVisible()) {
        console.log('    ✅ Chat interface opened');
        return true;
      }
    }
  }
  
  console.log('    ❌ Could not open chat interface');
  return false;
}

// Send message in chat
async function sendMessage(page, message) {
  const chatInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
  
  if (await chatInput.isVisible()) {
    await chatInput.fill(message);
    
    // Send the message
    const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]:visible').first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
    
    // Wait for response
    await page.waitForTimeout(3000);
    return true;
  }
  
  return false;
}

// Close chat interface
async function closeChatInterface(page) {
  // Try to close modal if exists
  const closeButton = await page.locator('button[aria-label="Close"], button:has-text("Close"), button:has-text("X"), [data-testid="close-chat"]').first();
  
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(1000);
    console.log('    ✅ Closed chat interface');
    return true;
  }
  
  // If no close button, try ESC key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  
  return true;
}

// Create a single conversation
async function createConversation(page, agentName, bantType, messageTemplate, conversationNumber) {
  console.log(`\n  📝 Conversation #${conversationNumber} (${bantType})`);
  
  try {
    // Open chat for this agent
    const chatOpened = await openChatInterface(page);
    if (!chatOpened) {
      console.log('    ❌ Failed to open chat');
      stats.failedConversations++;
      return false;
    }
    
    // Send the message
    const messageSent = await sendMessage(page, messageTemplate);
    if (!messageSent) {
      console.log('    ❌ Failed to send message');
      stats.failedConversations++;
      await closeChatInterface(page);
      return false;
    }
    
    console.log(`    ✅ Sent: "${messageTemplate.substring(0, 50)}..."`);
    
    // Wait for AI response
    await page.waitForTimeout(5000);
    
    // Check for response
    const messages = await page.locator('[class*="message"], [data-testid="message"], div[role="log"]').count();
    if (messages > 1) {
      console.log(`    ✅ Received AI response (${messages} messages in chat)`);
    }
    
    // Close chat to ensure new conversation next time
    await closeChatInterface(page);
    
    // Track success
    stats.successfulConversations++;
    stats.bantScores[bantType]++;
    
    // Add small delay between conversations
    await page.waitForTimeout(2000);
    
    return true;
    
  } catch (error) {
    console.log(`    ❌ Error: ${error.message}`);
    stats.failedConversations++;
    await closeChatInterface(page);
    return false;
  }
}

// Test conversations for one agent
async function testAgentConversations(page, agent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 Testing ${agent.name}`);
  console.log('='.repeat(60));
  
  // Initialize agent stats
  stats.agentStats[agent.name] = {
    total: 0,
    successful: 0,
    failed: 0
  };
  
  // Navigate to agents page
  const onAgentsPage = await navigateToAgents(page);
  if (!onAgentsPage) {
    console.log('❌ Could not navigate to agents page');
    return;
  }
  
  // Select the agent
  const agentSelected = await selectAgent(page, agent.name);
  if (!agentSelected) {
    console.log(`❌ Could not select ${agent.name}`);
    return;
  }
  
  let conversationCount = 0;
  
  // Create 4 conversations of each type (total 20 per agent)
  for (const [bantType, templates] of Object.entries(CONVERSATION_TEMPLATES)) {
    console.log(`\n  📊 Creating ${bantType.toUpperCase()} conversations...`);
    
    for (let i = 0; i < 4; i++) {
      conversationCount++;
      const globalCount = stats.totalConversations + 1;
      
      // Select appropriate template
      const template = templates[i % templates.length];
      
      // Create the conversation
      const success = await createConversation(
        page,
        agent.name,
        bantType,
        template,
        globalCount
      );
      
      stats.totalConversations++;
      stats.agentStats[agent.name].total++;
      
      if (success) {
        stats.agentStats[agent.name].successful++;
      } else {
        stats.agentStats[agent.name].failed++;
      }
      
      // Progress update
      if (conversationCount % 5 === 0) {
        console.log(`  ⏳ Progress: ${conversationCount}/20 conversations for ${agent.name}`);
      }
    }
  }
  
  console.log(`\n  ✅ Completed ${agent.name}: ${stats.agentStats[agent.name].successful}/${stats.agentStats[agent.name].total} successful`);
}

// Generate final report
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 Overall Statistics:');
  console.log(`  Total Conversations: ${stats.totalConversations}`);
  console.log(`  Successful: ${stats.successfulConversations}`);
  console.log(`  Failed: ${stats.failedConversations}`);
  console.log(`  Success Rate: ${((stats.successfulConversations / stats.totalConversations) * 100).toFixed(1)}%`);
  
  console.log('\n🤖 Per Agent Results:');
  for (const [agentName, agentStats] of Object.entries(stats.agentStats)) {
    const successRate = agentStats.total > 0 
      ? ((agentStats.successful / agentStats.total) * 100).toFixed(1)
      : 0;
    console.log(`  ${agentName}:`);
    console.log(`    - Total: ${agentStats.total}`);
    console.log(`    - Successful: ${agentStats.successful}`);
    console.log(`    - Failed: ${agentStats.failed}`);
    console.log(`    - Success Rate: ${successRate}%`);
  }
  
  console.log('\n🎯 BANT Distribution:');
  console.log(`  Hot Leads: ${stats.bantScores.hot}`);
  console.log(`  Warm Leads: ${stats.bantScores.warm}`);
  console.log(`  Cold Leads: ${stats.bantScores.cold}`);
  console.log(`  Non-Responsive: ${stats.bantScores.nonResponsive}`);
  console.log(`  Handoff Requests: ${stats.bantScores.handoff}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (stats.successfulConversations >= 64) { // 80% success rate
    console.log('✅ TEST PASSED - Successfully created majority of conversations');
  } else if (stats.successfulConversations >= 40) {
    console.log('⚠️  TEST PARTIALLY PASSED - Some conversations created');
  } else {
    console.log('❌ TEST FAILED - Too many failures');
  }
  
  console.log('='.repeat(60));
}

// Main test execution
async function run80ConversationsTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 80 CONVERSATIONS TEST SUITE');
  console.log('='.repeat(60));
  console.log('Goal: Create 80 unique conversations (20 per AI agent)');
  console.log('BANT Types: Hot, Warm, Cold, Non-Responsive, Handoff');
  console.log('='.repeat(60));
  
  // Check servers
  const serversRunning = await checkServers();
  if (!serversRunning) {
    process.exit(1);
  }
  
  // Launch browser
  console.log('\n🌐 Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Login
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      console.error('❌ Failed to login');
      await browser.close();
      process.exit(1);
    }
    
    // Test each agent
    for (const agent of AGENTS) {
      await testAgentConversations(page, agent);
      
      // Take a screenshot after each agent
      await page.screenshot({ 
        path: `test-80-conv-${agent.name.toLowerCase()}-${Date.now()}.png` 
      });
    }
    
    // Navigate to conversations page to verify
    console.log('\n📜 Checking Conversations page...');
    await page.goto(`${BASE_URL}/conversations`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const conversationElements = await page.locator('[class*="conversation"], [data-testid="conversation"]').count();
    console.log(`  Found ${conversationElements} conversation elements on page`);
    
    await page.screenshot({ path: `test-80-conv-final-${Date.now()}.png` });
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
  
  // Generate report
  generateReport();
}

// Execute
if (require.main === module) {
  run80ConversationsTest()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(stats.successfulConversations >= 40 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { run80ConversationsTest };