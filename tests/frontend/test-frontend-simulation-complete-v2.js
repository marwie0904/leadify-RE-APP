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

// AI Agents to test
const AI_AGENTS = [
  { name: 'ResidentialBot', org: 'Prime Residential Realty' },
  { name: 'CommercialAssist', org: 'Commercial Property Experts' },
  { name: 'LuxuryAdvisor', org: 'Luxury Estate Partners' },
  { name: 'RentalHelper', org: 'Urban Rental Solutions' }
];

// Test accounts for each organization
const TEST_ACCOUNTS = {
  'Prime Residential Realty': { 
    email: 'admin@primeresidential.com', 
    password: 'TestPassword123!' 
  },
  'Commercial Property Experts': { 
    email: 'admin@commercialproperty.com', 
    password: 'TestPassword123!' 
  },
  'Luxury Estate Partners': { 
    email: 'admin@luxuryestates.com', 
    password: 'TestPassword123!' 
  },
  'Urban Rental Solutions': { 
    email: 'admin@urbanrentals.com', 
    password: 'TestPassword123!' 
  }
};

// Conversation templates - 4 of each type = 20 per agent
const CONVERSATION_TEMPLATES = {
  hot: [
    {
      messages: [
        "I need to buy a home urgently for my family",
        "My budget is $800,000 cash",
        "I'm the sole decision maker",
        "Need 4 bedrooms near good schools",
        "Must close within 30 days"
      ]
    },
    {
      messages: [
        "Relocating for executive position next month",
        "Company provides $1.2M housing budget",
        "I have full purchasing authority",
        "Looking for luxury home with home office",
        "Need to move in by month end"
      ]
    },
    {
      messages: [
        "Investment opportunity with immediate cash",
        "Have $950,000 ready to invest",
        "I manage our family investment fund",
        "Want rental property with good ROI",
        "Ready to close this week"
      ]
    },
    {
      messages: [
        "Selling in California, buying here",
        "Budget is $750,000 from sale proceeds",
        "My spouse and I are ready to buy",
        "Need modern home with pool",
        "Want to close before school starts"
      ]
    }
  ],
  warm: [
    {
      messages: [
        "Interested in buying in the next few months",
        "Budget around $400,000-450,000",
        "Need to discuss with my partner",
        "Looking for 3 bedrooms",
        "Planning to start looking seriously soon"
      ]
    },
    {
      messages: [
        "Thinking about upgrading our home",
        "Could spend up to $550,000",
        "Will need family approval",
        "Want more space for kids",
        "Maybe in 3-4 months"
      ]
    },
    {
      messages: [
        "Exploring investment properties",
        "Have about $350,000 to invest",
        "Making decision with business partner",
        "Looking for rental income",
        "Probably next quarter"
      ]
    },
    {
      messages: [
        "First time home buyer",
        "Pre-approval in progress for $380,000",
        "Need parents' input",
        "Want something move-in ready",
        "Looking to buy this year"
      ]
    }
  ],
  cold: [
    {
      messages: [
        "Just browsing the market",
        "Not sure about budget",
        "Haven't discussed with anyone",
        "Just curious about prices",
        "Maybe someday"
      ]
    },
    {
      messages: [
        "Checking what's available",
        "Don't know what I can afford",
        "Would need to convince spouse",
        "Just starting research",
        "No timeline"
      ]
    },
    {
      messages: [
        "How much do homes cost here?",
        "Haven't looked into financing",
        "Just me looking",
        "Not sure what I want",
        "Far in the future"
      ]
    },
    {
      messages: [
        "Market research only",
        "Budget depends on many factors",
        "Need family discussion first",
        "Information gathering",
        "Year or two maybe"
      ]
    }
  ],
  nonResponsive: [
    {
      messages: [
        "Hello",
        "...",
        "Ok",
        "Thanks"
      ]
    },
    {
      messages: [
        "Hi there",
        "Hmm",
        "I see",
        "Bye"
      ]
    },
    {
      messages: [
        "Hey",
        "Not sure",
        "Maybe",
        "Later"
      ]
    },
    {
      messages: [
        "Hi",
        "Yes",
        "No",
        "Goodbye"
      ]
    }
  ],
  handoff: [
    {
      messages: [
        "I have a complex legal situation",
        "It involves probate and property transfer",
        "Need to speak with a human expert",
        "This requires specialized knowledge",
        "Please connect me with an agent"
      ]
    },
    {
      messages: [
        "Corporate relocation package",
        "Tax implications need discussion",
        "Prefer human agent for this",
        "Complex financial structure",
        "Can someone call me?"
      ]
    },
    {
      messages: [
        "1031 exchange question",
        "Multiple property transaction",
        "Need expert guidance",
        "Too complex for chat",
        "Human agent please"
      ]
    },
    {
      messages: [
        "Special circumstances",
        "Confidential matter",
        "Need discrete handling",
        "Prefer phone conversation",
        "Agent assistance required"
      ]
    }
  ]
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Login function
async function login(page, account) {
  console.log(`    🔐 Logging in as ${account.email}...`);
  
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  // Check if already logged in
  const dashboardVisible = await page.locator('text=/dashboard/i').isVisible().catch(() => false);
  if (dashboardVisible) {
    console.log(`      ✅ Already logged in`);
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
  console.log(`      ${success ? '✅ Login successful' : '❌ Login failed'}`);
  
  return success;
}

// Navigate to agents page and select an agent
async function selectAgent(page, agentName) {
  console.log(`    🤖 Selecting agent: ${agentName}...`);
  
  // Navigate to agents page
  const agentsLink = await page.locator('a:has-text("Agents"), a:has-text("AI Agents")').first();
  if (await agentsLink.isVisible()) {
    await agentsLink.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Find and click on the specific agent
  const agentCard = await page.locator(`text=/${agentName}/i`).first();
  if (await agentCard.isVisible()) {
    await agentCard.click();
    await wait(1000);
    console.log(`      ✅ Selected ${agentName}`);
    return true;
  }
  
  console.log(`      ❌ Could not find ${agentName}`);
  return false;
}

// Start a new conversation
async function startNewConversation(page, agentName) {
  console.log(`    💬 Starting new conversation...`);
  
  // Look for "New Conversation", "Start Chat", "New Chat" button
  const newChatButtons = [
    'button:has-text("New Conversation")',
    'button:has-text("Start New Chat")',
    'button:has-text("New Chat")',
    'button:has-text("Start Chat")',
    'button:has-text("Chat")',
    'button:has-text("Preview")',
    'button:has-text("Test Agent")',
    'a:has-text("Chat with Agent")'
  ];
  
  for (const selector of newChatButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible()) {
      await button.click();
      await wait(2000);
      
      // Check if chat interface opened
      const chatOpened = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').isVisible().catch(() => false);
      if (chatOpened) {
        console.log(`      ✅ New conversation started`);
        return true;
      }
    }
  }
  
  // Alternative: Try navigating to conversations and creating new
  const conversationsLink = await page.locator('a:has-text("Conversations")').first();
  if (await conversationsLink.isVisible()) {
    await conversationsLink.click();
    await page.waitForLoadState('networkidle');
    
    // Look for new conversation button
    const newButton = await page.locator('button:has-text("New"), button:has-text("Create")').first();
    if (await newButton.isVisible()) {
      await newButton.click();
      await wait(2000);
      
      // Select agent if dropdown appears
      const agentDropdown = await page.locator('select, [role="combobox"]').first();
      if (await agentDropdown.isVisible()) {
        await agentDropdown.selectOption({ label: agentName }).catch(() => {});
      }
      
      console.log(`      ✅ New conversation created via Conversations page`);
      return true;
    }
  }
  
  // Alternative: Try embed URL
  await page.goto(`${BASE_URL}/chat/${agentName.toLowerCase().replace(/\s+/g, '-')}`);
  await page.waitForLoadState('networkidle');
  
  const chatVisible = await page.locator('textarea, input[placeholder*="message"]').isVisible().catch(() => false);
  if (chatVisible) {
    console.log(`      ✅ New conversation via direct URL`);
    return true;
  }
  
  console.log(`      ⚠️  Could not start new conversation`);
  return false;
}

// Send a message in the chat
async function sendMessage(page, message) {
  const messageInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="Type"]').first();
  
  if (!await messageInput.isVisible()) {
    return false;
  }
  
  await messageInput.fill(message);
  await wait(500);
  
  // Send message
  const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]:visible').first();
  if (await sendButton.isVisible()) {
    await sendButton.click();
  } else {
    await page.keyboard.press('Enter');
  }
  
  // Wait for AI response
  await wait(3000 + Math.random() * 2000);
  
  return true;
}

// Simulate a complete conversation
async function simulateConversation(page, template, conversationType, conversationNumber) {
  console.log(`    📝 Conversation ${conversationNumber}: ${conversationType} lead`);
  
  let messagesSent = 0;
  
  for (const message of template.messages) {
    console.log(`      💭 Sending: "${message.substring(0, 40)}..."`);
    
    const sent = await sendMessage(page, message);
    if (sent) {
      messagesSent++;
      await wait(1000 + Math.random() * 1000);
    } else {
      console.log(`      ❌ Failed to send message`);
      break;
    }
  }
  
  // Take screenshot of conversation
  await page.screenshot({ 
    path: `conversation-${conversationType}-${conversationNumber}-${Date.now()}.png`,
    fullPage: false 
  });
  
  console.log(`      ✅ Sent ${messagesSent}/${template.messages.length} messages`);
  
  return messagesSent > 0;
}

// Close current conversation and prepare for next
async function closeConversation(page) {
  // Try to close or navigate away from current conversation
  const closeButtons = [
    'button[aria-label="Close"]',
    'button:has-text("Close")',
    'button:has-text("End Chat")',
    'button:has-text("Back")'
  ];
  
  for (const selector of closeButtons) {
    const button = await page.locator(selector).first();
    if (await button.isVisible()) {
      await button.click();
      await wait(1000);
      return true;
    }
  }
  
  // Alternative: Navigate back to agents or dashboard
  const dashboardLink = await page.locator('a:has-text("Dashboard")').first();
  if (await dashboardLink.isVisible()) {
    await dashboardLink.click();
    await wait(1000);
    return true;
  }
  
  return false;
}

// Main test function for a single agent
async function testAgentConversations(browser, agent, account) {
  console.log(`\n🤖 Testing ${agent.name} (${agent.org})`);
  console.log('  ' + '-'.repeat(50));
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    agent: agent.name,
    organization: agent.org,
    totalConversations: 0,
    successfulConversations: 0,
    conversationsByType: {
      hot: 0,
      warm: 0,
      cold: 0,
      nonResponsive: 0,
      handoff: 0
    }
  };
  
  try {
    // Login
    if (!await login(page, account)) {
      console.log(`    ❌ Failed to login for ${agent.org}`);
      await context.close();
      return results;
    }
    
    // Select the agent once
    if (!await selectAgent(page, agent.name)) {
      console.log(`    ❌ Failed to select agent ${agent.name}`);
      await context.close();
      return results;
    }
    
    // Create 20 conversations (4 of each type)
    const conversationTypes = ['hot', 'warm', 'cold', 'nonResponsive', 'handoff'];
    let conversationNumber = 0;
    
    for (const type of conversationTypes) {
      console.log(`\n  📂 Creating ${type.toUpperCase()} conversations...`);
      
      for (let i = 0; i < 4; i++) {
        conversationNumber++;
        console.log(`\n  🔄 Starting conversation ${conversationNumber}/20`);
        
        // Start a new conversation
        const started = await startNewConversation(page, agent.name);
        if (!started) {
          console.log(`    ⚠️  Skipping conversation ${conversationNumber} - couldn't start`);
          continue;
        }
        
        // Get the template for this conversation
        const template = CONVERSATION_TEMPLATES[type][i];
        
        // Simulate the conversation
        const success = await simulateConversation(page, template, type, conversationNumber);
        
        if (success) {
          results.successfulConversations++;
          results.conversationsByType[type]++;
        }
        
        results.totalConversations++;
        
        // Close conversation and prepare for next
        await closeConversation(page);
        
        // Small delay between conversations
        await wait(2000);
        
        // Navigate back to agent if needed
        if (conversationNumber < 20) {
          await selectAgent(page, agent.name);
        }
      }
    }
    
  } catch (error) {
    console.error(`  ❌ Error testing ${agent.name}:`, error.message);
  } finally {
    await context.close();
  }
  
  // Summary for this agent
  console.log(`\n  📊 ${agent.name} Summary:`);
  console.log(`    Total Conversations: ${results.totalConversations}/20`);
  console.log(`    Successful: ${results.successfulConversations}`);
  console.log(`    By Type:`);
  Object.entries(results.conversationsByType).forEach(([type, count]) => {
    console.log(`      - ${type}: ${count}/4`);
  });
  
  return results;
}

// Main test runner
async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE FRONTEND TESTING - 80 CONVERSATIONS');
  console.log('=' .repeat(70));
  console.log('This will create 20 unique conversations for each of the 4 AI agents');
  console.log('Total: 80 conversations (16 hot, 16 warm, 16 cold, 16 non-responsive, 16 handoff)');
  console.log('=' .repeat(70));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const overallResults = {
    totalAgents: 4,
    totalConversations: 0,
    successfulConversations: 0,
    agentResults: [],
    startTime: new Date(),
    endTime: null
  };
  
  try {
    // Test each agent with their organization's account
    for (const agent of AI_AGENTS) {
      const account = TEST_ACCOUNTS[agent.org];
      const agentResults = await testAgentConversations(browser, agent, account);
      
      overallResults.agentResults.push(agentResults);
      overallResults.totalConversations += agentResults.totalConversations;
      overallResults.successfulConversations += agentResults.successfulConversations;
      
      // Delay between agents
      await wait(3000);
    }
    
    overallResults.endTime = new Date();
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    await browser.close();
  }
  
  // Generate final report
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(70));
  console.log(`Test Duration: ${Math.round((overallResults.endTime - overallResults.startTime) / 1000 / 60)} minutes`);
  console.log(`\nOverall Statistics:`);
  console.log(`  Total Agents Tested: ${overallResults.totalAgents}`);
  console.log(`  Total Conversations Created: ${overallResults.totalConversations}/80`);
  console.log(`  Successful Conversations: ${overallResults.successfulConversations}`);
  console.log(`  Success Rate: ${((overallResults.successfulConversations / 80) * 100).toFixed(1)}%`);
  
  console.log(`\nPer-Agent Results:`);
  overallResults.agentResults.forEach(result => {
    console.log(`\n  ${result.agent} (${result.organization}):`);
    console.log(`    Conversations: ${result.successfulConversations}/${result.totalConversations}`);
    console.log(`    Hot: ${result.conversationsByType.hot}/4`);
    console.log(`    Warm: ${result.conversationsByType.warm}/4`);
    console.log(`    Cold: ${result.conversationsByType.cold}/4`);
    console.log(`    Non-Responsive: ${result.conversationsByType.nonResponsive}/4`);
    console.log(`    Handoff: ${result.conversationsByType.handoff}/4`);
  });
  
  // Verify in database
  console.log('\n🔍 Verifying Database Records...');
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, agent_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(80);
  
  if (!convError && conversations) {
    console.log(`  ✅ Found ${conversations.length} recent conversations in database`);
    
    // Count by status
    const byStatus = {};
    conversations.forEach(conv => {
      byStatus[conv.status] = (byStatus[conv.status] || 0) + 1;
    });
    console.log(`  Status breakdown:`, byStatus);
  }
  
  // Check token usage
  const { data: tokens, error: tokenError } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, cost')
    .order('created_at', { ascending: false })
    .limit(80);
  
  if (!tokenError && tokens && tokens.length > 0) {
    const totalTokens = tokens.reduce((sum, t) => sum + (t.total_tokens || 0), 0);
    const totalCost = tokens.reduce((sum, t) => sum + (t.cost || 0), 0);
    console.log(`  ✅ Token Usage: ${totalTokens} tokens, $${totalCost.toFixed(4)} total cost`);
  }
  
  // Check leads
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('id, bant_score, status')
    .order('created_at', { ascending: false })
    .limit(64); // Should be 64 (80 - 16 handoffs)
  
  if (!leadError && leads) {
    const hotLeads = leads.filter(l => l.bant_score >= 80).length;
    const warmLeads = leads.filter(l => l.bant_score >= 50 && l.bant_score < 80).length;
    const coldLeads = leads.filter(l => l.bant_score < 50).length;
    console.log(`  ✅ Leads Created: ${leads.length} total`);
    console.log(`     Hot (80+): ${hotLeads}, Warm (50-79): ${warmLeads}, Cold (<50): ${coldLeads}`);
  }
  
  console.log('\n📸 Screenshots saved to current directory');
  console.log('=' .repeat(70));
  
  return overallResults;
}

// Execute the test
if (require.main === module) {
  console.log('🎭 Real Estate AI Agent - Complete Frontend Testing');
  console.log('Creating 80 unique conversations (20 per agent) through the UI\n');
  
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
    runComprehensiveTest()
      .then((results) => {
        console.log('\n🎉 Testing completed!');
        process.exit(results.successfulConversations < 40 ? 1 : 0);
      })
      .catch((error) => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
      });
  });
}

module.exports = { runComprehensiveTest };