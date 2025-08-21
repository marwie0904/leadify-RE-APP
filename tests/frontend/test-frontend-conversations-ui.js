#!/usr/bin/env node

/**
 * Frontend UI Test - Create Conversations Through Chat Interface
 * This test directly interacts with the frontend to create conversations
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Test accounts for each organization
const TEST_ACCOUNTS = [
  { 
    email: 'admin@primeresidential.com', 
    password: 'TestPassword123!',
    org: 'Prime Residential Realty',
    agent: 'ResidentialBot'
  },
  { 
    email: 'admin@commercialproperty.com', 
    password: 'TestPassword123!',
    org: 'Commercial Property Experts',
    agent: 'CommercialAssist'
  },
  { 
    email: 'admin@luxuryestates.com', 
    password: 'TestPassword123!',
    org: 'Luxury Estate Partners',
    agent: 'LuxuryAdvisor'
  },
  { 
    email: 'admin@urbanrentals.com', 
    password: 'TestPassword123!',
    org: 'Urban Rental Solutions',
    agent: 'RentalHelper'
  }
];

// Conversation templates for different BANT scores
const CONVERSATION_MESSAGES = {
  hot: [
    "I need to buy a house immediately. My budget is $800,000 and I'm the decision maker. We need to close within 30 days.",
    "Looking to purchase property ASAP. $1.5M budget approved. Need to finalize this month.",
    "Ready to buy now. Have $600K cash, need to move in 3 weeks.",
    "Urgent purchase needed. Budget $900K, closing must be within 4 weeks.",
    "I'm the CEO and we need office space immediately. Budget is $2M."
  ],
  warm: [
    "I'm interested in buying a home. Budget around $500K. Looking to buy in 2-3 months.",
    "Exploring properties in the area. Budget might be $750K for Q2.",
    "Considering purchasing a property. Have about $400K budget.",
    "Looking for investment property. Can spend up to $650K.",
    "We're planning to expand our office. Budget TBD but likely around $1M."
  ],
  cold: [
    "Just browsing homes in the area. Not sure about budget yet.",
    "Curious about property prices. No immediate plans.",
    "Window shopping for homes. Maybe next year.",
    "Checking prices for future reference.",
    "Just looking around to see what's available."
  ],
  handoff: [
    "I need to speak with a human agent about complex tax situations.",
    "Can I talk to a real person? I have specific legal questions.",
    "Please connect me with a human. This is urgent.",
    "I want to discuss a complicated situation with an actual agent.",
    "Transfer me to a human representative please."
  ],
  followup: [
    "What areas do you recommend for families?",
    "Do you have virtual tours available?",
    "Can you tell me about the neighborhood?",
    "What's included in the HOA fees?",
    "Are there good schools nearby?"
  ]
};

async function loginToAccount(page, account) {
  console.log(`\n🔐 Logging in as ${account.email}...`);
  
  // Navigate to login page
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  
  // Wait for auth form to be ready
  await page.waitForTimeout(1000);
  
  // Fill login credentials
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  
  // Click sign in button
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation
  await page.waitForNavigation({ 
    url: url => url.includes('/dashboard') || url.includes('/agents'),
    timeout: 10000 
  }).catch(() => {
    console.log('  ⚠️ Navigation timeout, checking current page...');
  });
  
  // Verify login success
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/agents')) {
    console.log('  ✅ Login successful');
    return true;
  } else {
    console.log('  ❌ Login failed');
    return false;
  }
}

async function navigateToConversations(page) {
  console.log('\n📍 Navigating to conversations page...');
  
  // Try multiple methods to get to conversations
  
  // Method 1: Direct navigation
  await page.goto(`${BASE_URL}/conversations`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if we're on conversations page
  const url = page.url();
  if (url.includes('/conversations')) {
    console.log('  ✅ On conversations page');
    return true;
  }
  
  // Method 2: Try via sidebar
  const sidebarLink = page.locator('a[href="/conversations"], nav a:has-text("Conversations")').first();
  if (await sidebarLink.isVisible()) {
    await sidebarLink.click();
    await page.waitForLoadState('networkidle');
    console.log('  ✅ Navigated via sidebar');
    return true;
  }
  
  console.log('  ⚠️ Could not navigate to conversations');
  return false;
}

async function startNewConversation(page) {
  console.log('\n🆕 Starting new conversation...');
  
  // Look for "New Conversation" or "Start Chat" button
  const newChatButtons = [
    page.locator('button:has-text("New Conversation")'),
    page.locator('button:has-text("Start Chat")'),
    page.locator('button:has-text("New Chat")'),
    page.locator('button:has-text("Create Conversation")'),
    page.locator('button[aria-label*="new"]'),
    page.locator('button').filter({ hasText: /new|start|create/i })
  ];
  
  for (const button of newChatButtons) {
    if (await button.first().isVisible()) {
      await button.first().click();
      console.log('  ✅ Clicked new conversation button');
      await page.waitForTimeout(2000);
      return true;
    }
  }
  
  console.log('  ⚠️ No new conversation button found');
  return false;
}

async function sendChatMessage(page, message) {
  console.log(`\n💬 Sending message: "${message.substring(0, 50)}..."`);
  
  // Look for chat input field
  const chatInputs = [
    page.locator('textarea[placeholder*="Type"]'),
    page.locator('textarea[placeholder*="Message"]'),
    page.locator('textarea[placeholder*="message"]'),
    page.locator('input[placeholder*="Type"]'),
    page.locator('input[placeholder*="Message"]'),
    page.locator('textarea').first(),
    page.locator('input[type="text"]').last()
  ];
  
  let inputField = null;
  for (const input of chatInputs) {
    if (await input.isVisible() && await input.isEditable()) {
      inputField = input;
      break;
    }
  }
  
  if (!inputField) {
    console.log('  ❌ No chat input field found');
    return false;
  }
  
  // Type the message
  await inputField.fill(message);
  console.log('  ✅ Message typed');
  
  // Send the message
  // Method 1: Press Enter
  await inputField.press('Enter');
  
  // Method 2: Click send button if Enter doesn't work
  const sendButton = page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send"]').first();
  if (await sendButton.isVisible()) {
    await sendButton.click();
    console.log('  ✅ Clicked send button');
  }
  
  // Wait for response
  await page.waitForTimeout(3000);
  
  // Check if message appeared in chat
  const messageInChat = await page.locator(`text="${message.substring(0, 30)}"`).isVisible();
  if (messageInChat) {
    console.log('  ✅ Message sent and visible in chat');
    return true;
  }
  
  console.log('  ⚠️ Message may not have been sent');
  return false;
}

async function createConversationsForOrganization(browser, account, messagesPerType = 5) {
  console.log('\n' + '='.repeat(60));
  console.log(`🏢 Testing: ${account.org}`);
  console.log('='.repeat(60));
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    byType: {}
  };
  
  try {
    // Login
    const loginSuccess = await loginToAccount(page, account);
    if (!loginSuccess) {
      console.log('❌ Failed to login, skipping organization');
      await context.close();
      return stats;
    }
    
    // Navigate to conversations
    await navigateToConversations(page);
    
    // Create conversations for each type
    for (const [type, messages] of Object.entries(CONVERSATION_MESSAGES)) {
      console.log(`\n📊 Creating ${type.toUpperCase()} conversations...`);
      stats.byType[type] = { attempted: 0, successful: 0 };
      
      for (let i = 0; i < Math.min(messagesPerType, messages.length); i++) {
        stats.total++;
        stats.byType[type].attempted++;
        
        console.log(`\n  Conversation #${stats.total} (${type} ${i + 1}/${messagesPerType})`);
        
        // Start new conversation
        const conversationStarted = await startNewConversation(page);
        if (!conversationStarted) {
          // Try to navigate back to conversations page
          await navigateToConversations(page);
        }
        
        // Send the message
        const message = messages[i];
        const sent = await sendChatMessage(page, message);
        
        if (sent) {
          stats.successful++;
          stats.byType[type].successful++;
          console.log('    ✅ Conversation created successfully');
          
          // If this is a hot or warm lead, send a follow-up
          if ((type === 'hot' || type === 'warm') && CONVERSATION_MESSAGES.followup[i]) {
            await page.waitForTimeout(2000);
            const followup = CONVERSATION_MESSAGES.followup[i];
            await sendChatMessage(page, followup);
            console.log('    📧 Follow-up message sent');
          }
        } else {
          stats.failed++;
          console.log('    ❌ Failed to create conversation');
        }
        
        // Go back to conversations list for next one
        await navigateToConversations(page);
        await page.waitForTimeout(1000);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: `conversations-${account.org.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true 
    });
    console.log(`\n📸 Screenshot saved for ${account.org}`);
    
  } catch (error) {
    console.error(`\n❌ Error testing ${account.org}:`, error.message);
  } finally {
    await context.close();
  }
  
  return stats;
}

async function runConversationUITest() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FRONTEND CONVERSATION UI TEST');
  console.log('='.repeat(60));
  console.log('\nThis test will create real conversations through the UI for each organization');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300 // Slow down to see interactions
  });
  
  const globalStats = {
    organizations: 0,
    totalConversations: 0,
    successfulConversations: 0,
    failedConversations: 0,
    byOrganization: {}
  };
  
  try {
    // Test each organization
    for (const account of TEST_ACCOUNTS) {
      globalStats.organizations++;
      
      const orgStats = await createConversationsForOrganization(browser, account, 5);
      
      globalStats.totalConversations += orgStats.total;
      globalStats.successfulConversations += orgStats.successful;
      globalStats.failedConversations += orgStats.failed;
      globalStats.byOrganization[account.org] = orgStats;
      
      // Break between organizations
      console.log('\n⏳ Waiting before next organization...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`  Organizations Tested: ${globalStats.organizations}`);
  console.log(`  Total Conversations: ${globalStats.totalConversations}`);
  console.log(`  Successful: ${globalStats.successfulConversations}`);
  console.log(`  Failed: ${globalStats.failedConversations}`);
  
  if (globalStats.totalConversations > 0) {
    const successRate = (globalStats.successfulConversations / globalStats.totalConversations * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
  }
  
  console.log('\n📊 By Organization:');
  for (const [org, stats] of Object.entries(globalStats.byOrganization)) {
    console.log(`\n  ${org}:`);
    console.log(`    Total: ${stats.total}`);
    console.log(`    Successful: ${stats.successful}`);
    console.log(`    Failed: ${stats.failed}`);
    
    if (stats.byType) {
      console.log('    By Type:');
      for (const [type, typeStats] of Object.entries(stats.byType)) {
        console.log(`      ${type}: ${typeStats.successful}/${typeStats.attempted}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (globalStats.successfulConversations >= globalStats.totalConversations * 0.8) {
    console.log('✅ TEST PASSED - 80% or more conversations created successfully');
  } else if (globalStats.successfulConversations >= globalStats.totalConversations * 0.5) {
    console.log('⚠️ TEST PARTIALLY PASSED - 50% or more conversations created');
  } else {
    console.log('❌ TEST FAILED - Less than 50% conversations created');
  }
  
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Frontend Conversation UI Test...');
  
  runConversationUITest()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runConversationUITest };