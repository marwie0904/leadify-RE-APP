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

async function testTokenTracking() {
  console.log(`${colors.bright}${colors.cyan}🚀 DIRECT TOKEN TRACKING TEST${colors.reset}`);
  console.log('='.repeat(70));
  
  try {
    // Step 1: Login as real user (marwie)
    console.log(`\n${colors.cyan}Step 1: Login with real user${colors.reset}`);
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'marwie.ang.0904@gmail.com',
      password: 'ayokonga123'
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    
    // Step 2: Get baseline token count
    console.log(`\n${colors.cyan}Step 2: Check baseline token usage${colors.reset}`);
    const { data: beforeOps, error: beforeError } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log(`Current operations in DB: ${beforeOps?.length || 0}`);
    if (beforeOps && beforeOps.length > 0) {
      console.log('Recent operations:');
      beforeOps.forEach(op => {
        console.log(`  • ${op.operation_type}: ${op.total_tokens} tokens`);
      });
    }
    
    // Step 3: Try to find an existing conversation or use agent directly
    console.log(`\n${colors.cyan}Step 3: Get agent and conversation${colors.reset}`);
    
    // Get user's agent
    const agentsResponse = await axios.get(`${API_URL}/api/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const agents = agentsResponse.data;
    if (!agents || agents.length === 0) {
      console.log(`${colors.red}No agents found for user${colors.reset}`);
      return;
    }
    
    const agent = agents[0];
    console.log(`Using agent: ${agent.name} (${agent.id})`);
    
    // Get recent conversation if exists
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    let conversationId = conversations?.[0]?.id;
    if (conversationId) {
      console.log(`Using existing conversation: ${conversationId}`);
    }
    
    // Step 4: Send test messages
    console.log(`\n${colors.cyan}Step 4: Send test messages${colors.reset}`);
    
    const testMessages = [
      {
        text: "Hello, I'm looking for a property",
        expectedOps: ['intent_classification', 'chat_reply']
      },
      {
        text: "My budget is 50 million pesos",
        expectedOps: ['intent_classification', 'bant_extraction', 'chat_reply']
      },
      {
        text: "I am the decision maker for this purchase",
        expectedOps: ['intent_classification', 'bant_extraction', 'chat_reply']
      },
      {
        text: "I need it for investment purposes",
        expectedOps: ['intent_classification', 'bant_extraction', 'chat_reply']
      },
      {
        text: "I plan to buy within 6 months",
        expectedOps: ['intent_classification', 'bant_extraction', 'chat_reply']
      }
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const test = testMessages[i];
      console.log(`\n${colors.bright}Test ${i + 1}: "${test.text}"${colors.reset}`);
      
      try {
        // Send message
        const chatResponse = await axios.post(
          `${API_URL}/api/chat`,
          {
            message: test.text,
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
        
        if (chatResponse.data.conversationId) {
          conversationId = chatResponse.data.conversationId;
        }
        
        console.log(`${colors.green}✅ Response received${colors.reset}`);
        console.log(`Response: "${chatResponse.data.response?.substring(0, 80)}..."`);
        
        // Wait for operations to be logged
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what was tracked
        const { data: newOps } = await supabase
          .from('ai_token_usage')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        // Find operations created in last 5 seconds
        const cutoffTime = new Date(Date.now() - 5000).toISOString();
        const recentOps = newOps?.filter(op => op.created_at > cutoffTime) || [];
        
        console.log(`\nOperations tracked: ${recentOps.length}`);
        const opTypes = {};
        recentOps.forEach(op => {
          const type = op.operation_type || 'unknown';
          opTypes[type] = (opTypes[type] || 0) + 1;
        });
        
        Object.entries(opTypes).forEach(([type, count]) => {
          console.log(`  • ${type}: ${count} operation(s)`);
        });
        
        // Check for missing operations
        const missing = test.expectedOps.filter(op => !opTypes[op]);
        if (missing.length > 0) {
          console.log(`${colors.red}⚠️ MISSING: ${missing.join(', ')}${colors.reset}`);
        }
        
      } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.response?.data?.error || error.message}${colors.reset}`);
      }
      
      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Step 5: Final summary
    console.log(`\n${colors.bright}${colors.cyan}═══ FINAL SUMMARY ═══${colors.reset}`);
    
    // Get all operations from this session
    const sessionStart = new Date(Date.now() - 120000).toISOString(); // Last 2 minutes
    const { data: sessionOps } = await supabase
      .from('ai_token_usage')
      .select('*')
      .gte('created_at', sessionStart)
      .order('created_at', { ascending: false });
    
    console.log(`\nTotal operations tracked in session: ${sessionOps?.length || 0}`);
    
    if (sessionOps && sessionOps.length > 0) {
      const summary = {};
      let totalTokens = 0;
      
      sessionOps.forEach(op => {
        const type = op.operation_type || 'unknown';
        if (!summary[type]) {
          summary[type] = { count: 0, tokens: 0 };
        }
        summary[type].count++;
        summary[type].tokens += op.total_tokens || 0;
        totalTokens += op.total_tokens || 0;
      });
      
      console.log(`\n${colors.yellow}Operations Summary:${colors.reset}`);
      Object.entries(summary).forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.count} calls, ${stats.tokens} tokens`);
      });
      
      console.log(`\n${colors.yellow}Total Tokens: ${totalTokens}${colors.reset}`);
      
      // Critical check
      if (!summary['chat_reply']) {
        console.log(`\n${colors.red}🚨 CRITICAL ISSUE FOUND:${colors.reset}`);
        console.log(`${colors.red}No 'chat_reply' operations are being tracked!${colors.reset}`);
        console.log(`This is likely the main source of the token discrepancy.`);
        console.log(`Every AI response should track its tokens as 'chat_reply'.`);
      }
      
      // Expected vs actual
      const expectedChatReplies = testMessages.length;
      const actualChatReplies = summary['chat_reply']?.count || 0;
      const missingChatReplies = expectedChatReplies - actualChatReplies;
      
      if (missingChatReplies > 0) {
        const estimatedMissingTokens = missingChatReplies * 200; // ~200 tokens per response
        console.log(`\n${colors.yellow}Token Discrepancy Analysis:${colors.reset}`);
        console.log(`  Expected chat_reply operations: ${expectedChatReplies}`);
        console.log(`  Actual chat_reply operations: ${actualChatReplies}`);
        console.log(`  Missing: ${missingChatReplies}`);
        console.log(`  ${colors.red}Estimated missing tokens: ~${estimatedMissingTokens}${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Fatal Error:${colors.reset}`, error.message);
  }
}

// Run the test
console.log('Starting Direct Token Tracking Test...\n');
testTokenTracking();