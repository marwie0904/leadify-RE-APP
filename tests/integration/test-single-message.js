const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const API_URL = 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

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

async function testSingleMessage() {
  console.log(`${colors.bright}${colors.cyan}🚀 SINGLE MESSAGE TEST${colors.reset}`);
  console.log('=' . repeat(70));
  
  try {
    // Step 1: Login
    console.log(`\n${colors.cyan}Step 1: Login${colors.reset}`);
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    
    // Step 2: Get baseline token count
    console.log(`\n${colors.cyan}Step 2: Check baseline tokens${colors.reset}`);
    const beforeResult = await supabase
      .from('ai_token_usage')
      .select('count')
      .single();
    
    const beforeCount = beforeResult.data?.count || 0;
    console.log(`Baseline operations in DB: ${beforeCount}`);
    
    // Step 3: Send a single message
    console.log(`\n${colors.cyan}Step 3: Send test message${colors.reset}`);
    const message = "Hello, I'm looking for a property with a budget of 30 million";
    console.log(`Message: "${message}"`);
    
    const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
    
    console.log(`\nSending to API...`);
    const chatResponse = await axios.post(
      `${API_URL}/api/chat`,
      {
        message,
        agentId,
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
    
    console.log(`${colors.green}✅ Response received${colors.reset}`);
    console.log(`Response: "${chatResponse.data.response?.substring(0, 100)}..."`);
    console.log(`Conversation ID: ${chatResponse.data.conversationId}`);
    
    // Step 4: Wait for operations to be logged
    console.log(`\n${colors.cyan}Step 4: Waiting 5 seconds for operations to be logged...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Check what was tracked
    console.log(`\n${colors.cyan}Step 5: Check tracked operations${colors.reset}`);
    const { data: operations, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error querying database:', error);
      return;
    }
    
    console.log(`\n${colors.bright}📊 Operations Tracked:${colors.reset}`);
    console.log(`Total operations in DB: ${operations?.length || 0}`);
    
    if (operations && operations.length > 0) {
      // Group by operation type
      const opTypes = {};
      operations.forEach(op => {
        const type = op.operation_type || 'unknown';
        if (!opTypes[type]) {
          opTypes[type] = { count: 0, tokens: 0 };
        }
        opTypes[type].count++;
        opTypes[type].tokens += op.total_tokens || 0;
      });
      
      console.log(`\n${colors.yellow}Operations by Type:${colors.reset}`);
      Object.entries(opTypes).forEach(([type, stats]) => {
        console.log(`  ${type}: ${stats.count} calls, ${stats.tokens} tokens`);
      });
      
      // Check for specific operations we expect
      console.log(`\n${colors.yellow}Expected vs Actual:${colors.reset}`);
      const expected = ['intent_classification', 'bant_extraction', 'chat_reply'];
      expected.forEach(op => {
        if (opTypes[op]) {
          console.log(`  ${colors.green}✅ ${op}: Found${colors.reset}`);
        } else {
          console.log(`  ${colors.red}❌ ${op}: MISSING${colors.reset}`);
        }
      });
      
      // Show recent operations details
      console.log(`\n${colors.yellow}Recent Operations (last 5):${colors.reset}`);
      operations.slice(0, 5).forEach(op => {
        const time = new Date(op.created_at).toLocaleTimeString();
        console.log(`  [${time}] ${op.operation_type}: ${op.total_tokens} tokens (${op.model})`);
      });
    } else {
      console.log(`${colors.red}❌ NO OPERATIONS TRACKED!${colors.reset}`);
    }
    
    // Step 6: Summary
    console.log(`\n${colors.bright}${colors.cyan}═══ SUMMARY ═══${colors.reset}`);
    const newOps = (operations?.length || 0) - beforeCount;
    console.log(`New operations tracked: ${newOps}`);
    
    if (!opTypes['chat_reply']) {
      console.log(`${colors.red}🚨 CRITICAL: No 'chat_reply' operation tracked!${colors.reset}`);
      console.log(`This means the main AI response is not being tracked for tokens.`);
    }
    
    const totalTokens = operations?.reduce((sum, op) => sum + (op.total_tokens || 0), 0) || 0;
    console.log(`Total tokens tracked: ${totalTokens}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.log(`\n${colors.yellow}Server returned 500. Check server logs for details.${colors.reset}`);
    }
  }
}

// Run the test
testSingleMessage();