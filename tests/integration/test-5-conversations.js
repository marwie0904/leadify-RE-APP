const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const API_URL = 'http://localhost:3001';

// 5 Unique Test Conversations
const testConversations = [
  {
    name: "CONVERSATION 1: Full BANT Qualification Flow",
    userId: '8ad6ed68-ac60-4483-b22d-e6747727971b', // michael.brown
    agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca', // Brown-Homes-Agent
    messages: [
      { text: "Hi, I'm looking for a luxury home", expected: ['intent_classification'] },
      { text: "My budget is 45 million pesos", expected: ['intent_classification', 'bant_extraction'] },
      { text: "I'm the sole decision maker", expected: ['intent_classification', 'bant_extraction'] },
      { text: "It's for my family residence", expected: ['intent_classification', 'bant_extraction'] },
      { text: "Planning to buy in 3 months", expected: ['intent_classification', 'bant_extraction'] },
      { text: "I'm Maria Santos, call me at 09182223333", expected: ['intent_classification', 'contact_extraction'] }
    ]
  },
  {
    name: "CONVERSATION 2: Property Estimation Journey",
    userId: '8ad6ed68-ac60-4483-b22d-e6747727971b',
    agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
    messages: [
      { text: "I want to estimate property prices", expected: ['intent_classification'] },
      { text: "Show me condominiums", expected: ['intent_classification', 'property_extraction'] },
      { text: "I prefer the 3-bedroom unit", expected: ['intent_classification'] },
      { text: "What's the 5-year payment plan?", expected: ['intent_classification', 'payment_extraction'] },
      { text: "Calculate monthly payment please", expected: ['intent_classification'] }
    ]
  },
  {
    name: "CONVERSATION 3: Information Seeking (Embeddings)",
    userId: '8ad6ed68-ac60-4483-b22d-e6747727971b',
    agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
    messages: [
      { text: "What amenities are available?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Do you have properties in BGC?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Tell me about your payment terms", expected: ['intent_classification', 'semantic_search'] },
      { text: "What makes your properties unique?", expected: ['intent_classification', 'semantic_search'] }
    ]
  },
  {
    name: "CONVERSATION 4: Mixed Intent Conversation",
    userId: '8ad6ed68-ac60-4483-b22d-e6747727971b',
    agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
    messages: [
      { text: "Hello!", expected: ['intent_classification'] },
      { text: "I have 30 million budget for investment", expected: ['intent_classification', 'bant_extraction'] },
      { text: "What areas do you cover?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Actually, let me estimate a house price", expected: ['intent_classification'] },
      { text: "I'll take the corner lot", expected: ['intent_classification', 'property_extraction'] },
      { text: "My email is investor@example.com", expected: ['intent_classification', 'contact_extraction'] }
    ]
  },
  {
    name: "CONVERSATION 5: Edge Cases and Special Characters",
    userId: '8ad6ed68-ac60-4483-b22d-e6747727971b',
    agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
    messages: [
      { text: "???", expected: ['intent_classification'] },
      { text: "URGENT HELP NEEDED", expected: ['intent_classification'] },
      { text: "My budget is ₱25,000,000.00", expected: ['intent_classification', 'bant_extraction'] },
      { text: "I need 2BR/2BA ASAP!", expected: ['intent_classification'] },
      { text: "Contact: +63-917-888-9999", expected: ['intent_classification', 'contact_extraction'] }
    ]
  }
];

async function getAuthToken(userId) {
  // Create a JWT token for the user (simulating authentication)
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      sub: userId,
      email: 'michael.brown@homes.com',
      aud: 'authenticated',
      role: 'authenticated'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return token;
}

async function runFiveConversationTest() {
  console.log(`${colors.bright}${colors.cyan}🚀 5 UNIQUE CONVERSATION TOKEN TRACKING TEST${colors.reset}`);
  console.log('='.repeat(80));
  
  // Get baseline metrics
  console.log(`\n${colors.cyan}Getting baseline metrics...${colors.reset}`);
  const { data: baselineOps } = await supabase
    .from('ai_token_usage')
    .select('*');
  
  const baselineCount = baselineOps?.length || 0;
  const baselineTokens = baselineOps?.reduce((sum, op) => sum + (op.total_tokens || 0), 0) || 0;
  
  console.log(`Baseline: ${baselineCount} operations, ${baselineTokens} tokens`);
  
  // Track all results
  const allResults = [];
  const globalMissingOps = {};
  let totalMessagesLSent = 0;
  let totalResponsesReceived = 0;
  
  // Run each conversation
  for (let convNum = 0; convNum < testConversations.length; convNum++) {
    const conversation = testConversations[convNum];
    console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}  ${conversation.name}${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`);
    
    const token = await getAuthToken(conversation.userId);
    let conversationId = null;
    const convResults = {
      name: conversation.name,
      messages: [],
      totalTokens: 0,
      missingOps: []
    };
    
    // Send each message in the conversation
    for (let msgNum = 0; msgNum < conversation.messages.length; msgNum++) {
      const message = conversation.messages[msgNum];
      console.log(`\n${colors.blue}[Message ${msgNum + 1}/${conversation.messages.length}] "${message.text}"${colors.reset}`);
      
      totalMessagesLSent++;
      
      try {
        // Record time before API call
        const beforeTime = new Date().toISOString();
        
        // Send message to AI
        const startTime = Date.now();
        const response = await axios.post(
          `${API_URL}/api/chat`,
          {
            message: message.text,
            agentId: conversation.agentId,
            conversationId,
            source: 'website'
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        const responseTime = Date.now() - startTime;
        totalResponsesReceived++;
        
        if (response.data.conversationId) {
          conversationId = response.data.conversationId;
        }
        
        console.log(`${colors.green}✅ Response in ${responseTime}ms${colors.reset}`);
        console.log(`   "${response.data.response?.substring(0, 80)}..."`);
        
        // Wait for operations to be logged
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what operations were tracked
        const { data: newOps } = await supabase
          .from('ai_token_usage')
          .select('*')
          .gte('created_at', beforeTime)
          .order('created_at', { ascending: false });
        
        const trackedOps = {};
        let msgTokens = 0;
        
        newOps?.forEach(op => {
          if (op.conversation_id === conversationId || 
              (op.user_id === conversation.userId && new Date(op.created_at) > new Date(beforeTime))) {
            const type = op.operation_type || 'unknown';
            trackedOps[type] = (trackedOps[type] || 0) + 1;
            msgTokens += op.total_tokens || 0;
          }
        });
        
        console.log(`   Tracked: ${Object.keys(trackedOps).join(', ') || 'NONE'}`);
        console.log(`   Tokens: ${msgTokens}`);
        
        // Check for missing operations
        const missing = message.expected.filter(op => !trackedOps[op]);
        if (missing.length > 0) {
          console.log(`   ${colors.yellow}⚠️  Missing: ${missing.join(', ')}${colors.reset}`);
          missing.forEach(op => {
            globalMissingOps[op] = (globalMissingOps[op] || 0) + 1;
            convResults.missingOps.push(op);
          });
        }
        
        // CRITICAL CHECK: Is the main response tracked?
        if (!trackedOps['chat_reply'] && !trackedOps['bant_extraction']) {
          console.log(`   ${colors.red}🚨 CRITICAL: Response not tracked!${colors.reset}`);
          globalMissingOps['chat_reply'] = (globalMissingOps['chat_reply'] || 0) + 1;
        }
        
        convResults.messages.push({
          text: message.text,
          expected: message.expected,
          tracked: Object.keys(trackedOps),
          tokens: msgTokens,
          missing
        });
        convResults.totalTokens += msgTokens;
        
      } catch (error) {
        console.log(`   ${colors.red}❌ Error: ${error.response?.data?.error || error.message}${colors.reset}`);
        convResults.messages.push({
          text: message.text,
          error: error.message,
          expected: message.expected,
          tracked: [],
          tokens: 0
        });
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    allResults.push(convResults);
    console.log(`\n${colors.cyan}Conversation Summary:${colors.reset}`);
    console.log(`  Total tokens tracked: ${convResults.totalTokens}`);
    console.log(`  Missing operations: ${convResults.missingOps.length}`);
  }
  
  // Final Analysis
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}                    FINAL ANALYSIS                          ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  // Get final metrics
  const { data: finalOps } = await supabase
    .from('ai_token_usage')
    .select('*');
  
  const newOpsCount = (finalOps?.length || 0) - baselineCount;
  const newTokens = (finalOps?.reduce((sum, op) => sum + (op.total_tokens || 0), 0) || 0) - baselineTokens;
  
  console.log(`\n${colors.yellow}Test Statistics:${colors.reset}`);
  console.log(`  Messages sent: ${totalMessagesLSent}`);
  console.log(`  Responses received: ${totalResponsesReceived}`);
  console.log(`  Operations tracked: ${newOpsCount}`);
  console.log(`  Tokens tracked: ${newTokens}`);
  
  // Operation breakdown
  const opBreakdown = {};
  finalOps?.slice(-newOpsCount).forEach(op => {
    const type = op.operation_type || 'unknown';
    if (!opBreakdown[type]) {
      opBreakdown[type] = { count: 0, tokens: 0 };
    }
    opBreakdown[type].count++;
    opBreakdown[type].tokens += op.total_tokens || 0;
  });
  
  console.log(`\n${colors.yellow}Operations Breakdown:${colors.reset}`);
  Object.entries(opBreakdown).forEach(([type, stats]) => {
    console.log(`  ${type}: ${stats.count} ops, ${stats.tokens} tokens`);
  });
  
  // Missing operations
  console.log(`\n${colors.yellow}Missing Operations:${colors.reset}`);
  if (Object.keys(globalMissingOps).length === 0) {
    console.log(`  ${colors.green}✅ All operations tracked!${colors.reset}`);
  } else {
    Object.entries(globalMissingOps).forEach(([op, count]) => {
      console.log(`  ${colors.red}❌ ${op}: Missing in ${count} messages${colors.reset}`);
    });
  }
  
  // CRITICAL FINDING
  const chatReplyCount = opBreakdown['chat_reply']?.count || 0;
  const missingChatReplies = totalMessagesLSent - chatReplyCount;
  
  if (missingChatReplies > 0) {
    console.log(`\n${colors.bright}${colors.red}🚨🚨🚨 CRITICAL FINDING 🚨🚨🚨${colors.reset}`);
    console.log(`${colors.red}${missingChatReplies} out of ${totalMessagesLSent} AI responses NOT tracking tokens!${colors.reset}`);
    console.log(`\nImpact:`);
    console.log(`  • Each response uses ~200-500 tokens`);
    console.log(`  • Estimated missing: ${missingChatReplies * 350} tokens`);
    console.log(`  • This is the PRIMARY cause of the discrepancy`);
    
    console.log(`\n${colors.yellow}Root Cause Location:${colors.reset}`);
    console.log(`  Check server.js where AI responses are generated`);
    console.log(`  Look for missing trackTokenUsage() calls`);
    console.log(`  Especially in BANT and estimation flows`);
  } else {
    console.log(`\n${colors.green}✅ All chat responses are tracking tokens correctly${colors.reset}`);
  }
  
  // Save results
  const fs = require('fs');
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalMessages: totalMessagesLSent,
      totalResponses: totalResponsesReceived,
      totalOperations: newOpsCount,
      totalTokens: newTokens,
      missingChatReplies,
      estimatedMissingTokens: missingChatReplies * 350
    },
    operationBreakdown: opBreakdown,
    missingOperations: globalMissingOps,
    conversations: allResults
  };
  
  fs.writeFileSync('5-conversation-test-results.json', JSON.stringify(results, null, 2));
  console.log(`\n${colors.green}✅ Results saved to 5-conversation-test-results.json${colors.reset}`);
  
  // Final verdict
  console.log(`\n${colors.bright}${colors.cyan}═══ VERDICT ═══${colors.reset}`);
  if (missingChatReplies > 0) {
    console.log(`${colors.red}❌ TOKEN TRACKING IS BROKEN${colors.reset}`);
    console.log(`${colors.red}   ${missingChatReplies} responses not tracking tokens${colors.reset}`);
    console.log(`${colors.red}   Fix required in server.js chat response handling${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ Token tracking appears to be working${colors.reset}`);
  }
}

// Run the test
console.log('Starting 5 Conversation Test...\n');
runFiveConversationTest().catch(console.error);