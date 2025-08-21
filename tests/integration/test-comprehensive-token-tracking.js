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

// Test conversations data
const testConversations = [
  {
    name: "Conversation 1: Complete BANT Flow",
    messages: [
      { text: "Hello, I'm interested in buying a property", expected: ['intent_classification'] },
      { text: "My budget is around 35 million pesos", expected: ['intent_classification', 'bant_extraction'] },
      { text: "I am the primary decision maker", expected: ['intent_classification', 'bant_extraction'] },
      { text: "We need it for our family residence", expected: ['intent_classification', 'bant_extraction'] },
      { text: "We're looking to buy within 2-3 months", expected: ['intent_classification', 'bant_extraction'] },
      { text: "My name is Alex Chen, phone 09175551234", expected: ['intent_classification', 'contact_extraction', 'bant_normalization'] }
    ]
  },
  {
    name: "Conversation 2: Property Estimation Flow",
    messages: [
      { text: "Can you help me estimate property prices?", expected: ['intent_classification'] },
      { text: "I want a house and lot", expected: ['intent_classification', 'property_extraction'] },
      { text: "Show me the 10-year payment plan", expected: ['intent_classification', 'payment_extraction'] },
      { text: "What's the monthly payment?", expected: ['intent_classification'] }
    ]
  },
  {
    name: "Conversation 3: General Questions with Embeddings",
    messages: [
      { text: "What amenities do your properties offer?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Do you have properties in Quezon City?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Tell me about your company", expected: ['intent_classification', 'semantic_search'] }
    ]
  },
  {
    name: "Conversation 4: Mixed Intent Flow",
    messages: [
      { text: "Hi there!", expected: ['intent_classification'] },
      { text: "I have 20 million budget", expected: ['intent_classification', 'bant_extraction'] },
      { text: "What locations are available?", expected: ['intent_classification', 'semantic_search'] },
      { text: "Actually, can you estimate a condo price?", expected: ['intent_classification'] },
      { text: "I choose the 2-bedroom unit", expected: ['intent_classification', 'property_extraction'] }
    ]
  },
  {
    name: "Conversation 5: Edge Cases and Quick Messages",
    messages: [
      { text: "asdf", expected: ['intent_classification'] },
      { text: "123456789", expected: ['intent_classification'] },
      { text: "HELP", expected: ['intent_classification'] },
      { text: "My budget is fifty million", expected: ['intent_classification', 'bant_extraction'] },
      { text: "Contact me at test@email.com", expected: ['intent_classification', 'contact_extraction'] }
    ]
  }
];

async function loginAsRealUser() {
  // First, let's create a password for michael.brown if needed
  const { data: user } = await supabase.auth.admin.updateUserById(
    '8ad6ed68-ac60-4483-b22d-e6747727971b',
    { password: 'TestPassword123!' }
  );
  
  // Now login
  const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'michael.brown@homes.com',
    password: 'TestPassword123!'
  });
  
  return loginResponse.data.token || loginResponse.data.access_token;
}

async function runComprehensiveTest() {
  console.log(`${colors.bright}${colors.cyan}🚀 COMPREHENSIVE TOKEN TRACKING TEST (5 CONVERSATIONS)${colors.reset}`);
  console.log('='.repeat(80));
  
  try {
    // Step 1: Setup authentication
    console.log(`\n${colors.cyan}Step 1: Authentication Setup${colors.reset}`);
    const token = await loginAsRealUser();
    console.log(`${colors.green}✅ Authentication successful${colors.reset}`);
    
    // Get agent
    const agentsResponse = await axios.get(`${API_URL}/api/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const agent = agentsResponse.data[0];
    if (!agent) {
      throw new Error('No agent found for user');
    }
    console.log(`Using agent: ${agent.name} (${agent.id})`);
    
    // Step 2: Get baseline metrics
    console.log(`\n${colors.cyan}Step 2: Baseline Metrics${colors.reset}`);
    const { data: baselineOps } = await supabase
      .from('ai_token_usage')
      .select('*');
    
    const baselineCount = baselineOps?.length || 0;
    const baselineTokens = baselineOps?.reduce((sum, op) => sum + (op.total_tokens || 0), 0) || 0;
    
    console.log(`Baseline operations: ${baselineCount}`);
    console.log(`Baseline tokens: ${baselineTokens}`);
    
    // Step 3: Run test conversations
    const allResults = [];
    const missingOperations = {};
    
    for (let convIndex = 0; convIndex < testConversations.length; convIndex++) {
      const conversation = testConversations[convIndex];
      console.log(`\n${colors.bright}${colors.magenta}═══ ${conversation.name} ═══${colors.reset}`);
      
      let conversationId = null;
      const convResults = [];
      
      for (let msgIndex = 0; msgIndex < conversation.messages.length; msgIndex++) {
        const message = conversation.messages[msgIndex];
        console.log(`\n${colors.blue}Message ${msgIndex + 1}: "${message.text}"${colors.reset}`);
        
        // Get operations count before
        const { data: beforeOps } = await supabase
          .from('ai_token_usage')
          .select('count')
          .single();
        const beforeCount = beforeOps?.count || 0;
        
        try {
          // Send message
          const startTime = Date.now();
          const chatResponse = await axios.post(
            `${API_URL}/api/chat`,
            {
              message: message.text,
              agentId: agent.id,
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
          
          if (chatResponse.data.conversationId) {
            conversationId = chatResponse.data.conversationId;
          }
          
          console.log(`${colors.green}✅ Response received in ${responseTime}ms${colors.reset}`);
          console.log(`Response: "${chatResponse.data.response?.substring(0, 60)}..."`);
          
          // Wait for operations to be logged
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check what was tracked
          const { data: afterOps } = await supabase
            .from('ai_token_usage')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
          
          // Find new operations
          const cutoffTime = new Date(Date.now() - 5000).toISOString();
          const newOps = afterOps?.filter(op => op.created_at > cutoffTime) || [];
          
          // Analyze operations
          const trackedOps = {};
          let messageTokens = 0;
          newOps.forEach(op => {
            const type = op.operation_type || 'unknown';
            trackedOps[type] = (trackedOps[type] || 0) + 1;
            messageTokens += op.total_tokens || 0;
          });
          
          console.log(`Operations tracked: ${Object.keys(trackedOps).join(', ') || 'NONE'}`);
          console.log(`Tokens used: ${messageTokens}`);
          
          // Check for missing operations
          const missing = message.expected.filter(op => !trackedOps[op]);
          if (missing.length > 0) {
            console.log(`${colors.red}⚠️ MISSING: ${missing.join(', ')}${colors.reset}`);
            missing.forEach(op => {
              missingOperations[op] = (missingOperations[op] || 0) + 1;
            });
          }
          
          // CRITICAL: Check for chat_reply
          if (!trackedOps['chat_reply'] && !trackedOps['bant_extraction']) {
            console.log(`${colors.red}🚨 CRITICAL: No response operation tracked!${colors.reset}`);
            missingOperations['chat_reply'] = (missingOperations['chat_reply'] || 0) + 1;
          }
          
          convResults.push({
            message: message.text,
            expected: message.expected,
            tracked: Object.keys(trackedOps),
            tokens: messageTokens,
            missing: missing,
            responseTime
          });
          
        } catch (error) {
          console.error(`${colors.red}❌ Error: ${error.response?.data?.error || error.message}${colors.reset}`);
          convResults.push({
            message: message.text,
            error: error.message,
            expected: message.expected,
            tracked: [],
            tokens: 0
          });
        }
        
        // Brief pause between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      allResults.push({
        conversation: conversation.name,
        results: convResults
      });
    }
    
    // Step 4: Final Analysis
    console.log(`\n${colors.bright}${colors.cyan}═══════ FINAL ANALYSIS ═══════${colors.reset}`);
    console.log('='.repeat(80));
    
    // Get final metrics
    const { data: finalOps } = await supabase
      .from('ai_token_usage')
      .select('*');
    
    const newOperations = (finalOps?.length || 0) - baselineCount;
    const newTokens = (finalOps?.reduce((sum, op) => sum + (op.total_tokens || 0), 0) || 0) - baselineTokens;
    
    console.log(`\n${colors.yellow}Overall Statistics:${colors.reset}`);
    console.log(`Total test messages sent: ${testConversations.reduce((sum, c) => sum + c.messages.length, 0)}`);
    console.log(`Total operations tracked: ${newOperations}`);
    console.log(`Total tokens tracked: ${newTokens}`);
    
    // Operation type breakdown
    const operationSummary = {};
    finalOps?.slice(0, newOperations).forEach(op => {
      const type = op.operation_type || 'unknown';
      if (!operationSummary[type]) {
        operationSummary[type] = { count: 0, tokens: 0 };
      }
      operationSummary[type].count++;
      operationSummary[type].tokens += op.total_tokens || 0;
    });
    
    console.log(`\n${colors.yellow}Operations by Type:${colors.reset}`);
    Object.entries(operationSummary).forEach(([type, stats]) => {
      console.log(`  ${type}: ${stats.count} operations, ${stats.tokens} tokens`);
    });
    
    // Missing operations analysis
    console.log(`\n${colors.yellow}Missing Operations Analysis:${colors.reset}`);
    if (Object.keys(missingOperations).length === 0) {
      console.log(`${colors.green}✅ All expected operations were tracked!${colors.reset}`);
    } else {
      Object.entries(missingOperations).forEach(([op, count]) => {
        console.log(`  ${colors.red}❌ ${op}: Missing in ${count} messages${colors.reset}`);
      });
    }
    
    // CRITICAL FINDINGS
    console.log(`\n${colors.bright}${colors.red}═══ CRITICAL FINDINGS ═══${colors.reset}`);
    
    const totalMessages = testConversations.reduce((sum, c) => sum + c.messages.length, 0);
    const chatReplyCount = operationSummary['chat_reply']?.count || 0;
    const missingChatReplies = totalMessages - chatReplyCount;
    
    if (missingChatReplies > 0) {
      console.log(`${colors.red}🚨 CRITICAL ISSUE CONFIRMED:${colors.reset}`);
      console.log(`${colors.red}${missingChatReplies} out of ${totalMessages} AI responses are NOT tracking tokens!${colors.reset}`);
      console.log(`\nThis means:`);
      console.log(`• Every AI response that doesn't track 'chat_reply' is missing from token count`);
      console.log(`• Estimated missing tokens: ~${missingChatReplies * 200} tokens`);
      console.log(`• This explains the discrepancy between app (328,859) and OpenAI (332,149)`);
      
      console.log(`\n${colors.yellow}Root Cause:${colors.reset}`);
      console.log(`The server.js file is not tracking tokens for chat responses.`);
      console.log(`Look for where AI responses are generated but trackTokenUsage() is not called.`);
    }
    
    // Save detailed results
    const fs = require('fs');
    const detailedResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMessages: totalMessages,
        totalOperationsTracked: newOperations,
        totalTokensTracked: newTokens,
        missingChatReplies: missingChatReplies,
        estimatedMissingTokens: missingChatReplies * 200
      },
      operationBreakdown: operationSummary,
      missingOperations: missingOperations,
      conversations: allResults,
      criticalFinding: missingChatReplies > 0 ? 
        `${missingChatReplies} chat responses not tracking tokens` : 
        'All operations properly tracked'
    };
    
    fs.writeFileSync('comprehensive-tracking-results.json', JSON.stringify(detailedResults, null, 2));
    console.log(`\n${colors.green}✅ Detailed results saved to comprehensive-tracking-results.json${colors.reset}`);
    
    // Final recommendation
    console.log(`\n${colors.bright}${colors.cyan}═══ RECOMMENDATION ═══${colors.reset}`);
    console.log(`${colors.yellow}IMMEDIATE ACTION REQUIRED:${colors.reset}`);
    console.log(`1. Add trackTokenUsage() call for ALL chat_reply operations`);
    console.log(`2. Track failed/retry attempts in callAIWithFallback`);
    console.log(`3. Add tracking for test file API calls`);
    console.log(`4. Implement rate limit header capture`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error.message);
    console.error(error);
  }
}

// Run the comprehensive test
console.log('Starting Comprehensive Token Tracking Test...\n');
runComprehensiveTest();