#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Test accounts with their agents
const TEST_CONFIGS = [
  { 
    email: 'admin@primeresidential.com', 
    password: 'TestPassword123!',
    agentId: '59f3e30b-107a-4289-905b-92fa46f56e5f',
    agentName: 'ResidentialBot'
  }
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
  bantScores: { hot: 0, warm: 0, cold: 0, nonResponsive: 0, handoff: 0 },
  tokenUsage: 0
};

// Login to get auth token
async function login(email, password) {
  try {
    console.log(`🔐 Logging in as ${email}...`);
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    
    if (response.data.token) {
      console.log('  ✅ Login successful');
      return {
        token: response.data.token,
        userId: response.data.user.id,
        organizationId: response.data.user.organizationId
      };
    }
  } catch (error) {
    console.error(`  ❌ Login failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

// Create a conversation via API
async function createConversation(auth, agentId, agentName, message, bantType, conversationNumber) {
  try {
    console.log(`  📝 Conversation #${conversationNumber} (${bantType})`);
    
    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send chat message
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message,
        agentId,
        conversationId,
        userId: auth.userId,
        source: 'web'
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data) {
      console.log(`    ✅ Created conversation: ${conversationId}`);
      stats.conversationIds.add(conversationId);
      stats.successfulConversations++;
      stats.bantScores[bantType]++;
      
      // Track token usage if available
      if (response.data.tokenUsage) {
        stats.tokenUsage += response.data.tokenUsage;
      }
      
      return true;
    }
  } catch (error) {
    console.log(`    ❌ Failed: ${error.response?.data?.error || error.message}`);
    stats.failedConversations++;
    return false;
  }
}

// Test conversations for one agent
async function testAgentConversations(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 Testing ${config.agentName}`);
  console.log('='.repeat(60));
  
  // Login
  const auth = await login(config.email, config.password);
  if (!auth) {
    console.log('❌ Failed to authenticate');
    return;
  }
  
  // Initialize agent stats
  stats.agentStats[config.agentName] = {
    total: 0,
    successful: 0,
    failed: 0
  };
  
  let conversationCount = 0;
  
  // Create 4 conversations of each type (20 total per agent)
  for (const [bantType, templates] of Object.entries(CONVERSATION_TEMPLATES)) {
    console.log(`\n  📊 Creating ${bantType.toUpperCase()} conversations...`);
    
    for (let i = 0; i < 4; i++) {
      conversationCount++;
      stats.totalConversations++;
      const template = templates[i % templates.length];
      
      const success = await createConversation(
        auth,
        config.agentId,
        config.agentName,
        template,
        bantType,
        stats.totalConversations
      );
      
      stats.agentStats[config.agentName].total++;
      if (success) {
        stats.agentStats[config.agentName].successful++;
      } else {
        stats.agentStats[config.agentName].failed++;
      }
      
      // Small delay between conversations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n  ✅ Completed ${config.agentName}: ${stats.agentStats[config.agentName].successful}/${stats.agentStats[config.agentName].total} successful`);
}

// Verify conversations were created
async function verifyConversations(auth) {
  try {
    console.log('\n📜 Verifying conversations...');
    
    const response = await axios.get(
      `${API_URL}/api/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      }
    );
    
    if (response.data) {
      const conversations = response.data.conversations || response.data;
      console.log(`  ✅ Found ${conversations.length} conversations in database`);
      
      // Count by status
      const statusCounts = {};
      conversations.forEach(conv => {
        statusCounts[conv.status] = (statusCounts[conv.status] || 0) + 1;
      });
      
      console.log('  Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
    }
  } catch (error) {
    console.log(`  ❌ Verification failed: ${error.message}`);
  }
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 Overall Statistics:');
  console.log(`  Total Conversations Attempted: ${stats.totalConversations}`);
  console.log(`  Successful: ${stats.successfulConversations}`);
  console.log(`  Failed: ${stats.failedConversations}`);
  console.log(`  Unique Conversation IDs: ${stats.conversationIds.size}`);
  
  if (stats.totalConversations > 0) {
    console.log(`  Success Rate: ${((stats.successfulConversations / stats.totalConversations) * 100).toFixed(1)}%`);
  }
  
  if (stats.tokenUsage > 0) {
    console.log(`  Total Token Usage: ${stats.tokenUsage}`);
  }
  
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
  
  if (stats.successfulConversations >= 16) { // 80% of 20
    console.log('✅ TEST PASSED - Successfully created majority of conversations');
  } else if (stats.successfulConversations >= 10) {
    console.log('⚠️  TEST PARTIALLY PASSED - Some conversations created');
  } else {
    console.log('❌ TEST FAILED - Too many failures');
  }
  
  console.log('='.repeat(60));
}

// Main execution
async function run80ConversationsAPITest() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 80 CONVERSATIONS API TEST');
  console.log('='.repeat(60));
  console.log('Creating conversations via direct API calls');
  console.log('='.repeat(60));
  
  // Check backend is running
  try {
    await axios.get(`${API_URL}/api/health`);
    console.log('✅ Backend server is running');
  } catch (error) {
    console.error('❌ Backend server not responding on', API_URL);
    process.exit(1);
  }
  
  // Test with each configured account
  for (const config of TEST_CONFIGS) {
    await testAgentConversations(config);
  }
  
  // Note: For full 80 conversations, you would need all 4 agents configured
  // This test runs with available agents
  console.log('\n📝 Note: Test ran with available agents.');
  console.log('To achieve 80 conversations, configure all 4 agents with their credentials.');
  
  // Verify conversations
  if (TEST_CONFIGS.length > 0) {
    const auth = await login(TEST_CONFIGS[0].email, TEST_CONFIGS[0].password);
    if (auth) {
      await verifyConversations(auth);
    }
  }
  
  // Generate report
  generateReport();
}

// Execute
if (require.main === module) {
  run80ConversationsAPITest()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(stats.successfulConversations >= 10 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { run80ConversationsAPITest };