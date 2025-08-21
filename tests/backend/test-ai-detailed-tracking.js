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

async function detailedTokenTracking() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  DETAILED TOKEN TRACKING FOR SINGLE REQUEST${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  // Get baseline for ALL operations
  console.log(`\n${colors.cyan}Getting baseline token count for ALL operations...${colors.reset}`);
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('operation_type, SUM(total_tokens)')
    .gte('created_at', new Date(Date.now() - 60000).toISOString());
  
  const beforeTokensTotal = beforeData?.reduce((sum, row) => sum + (row.sum || 0), 0) || 0;
  console.log(`Tokens used in last minute BEFORE request: ${beforeTokensTotal}`);
  
  // Test message
  const testMessage = "I need a property urgently, my budget is 50 million pesos";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  
  // Create JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      sub: '8ad6ed68-ac60-4483-b22d-e6747727971b',
      email: 'michael.brown@homes.com',
      aud: 'authenticated',
      role: 'authenticated'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  console.log(`\n${colors.cyan}Sending single request...${colors.reset}`);
  const beforeTime = new Date().toISOString();
  
  try {
    const startTime = Date.now();
    
    // Send ONE chat request
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: testMessage,
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
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
    console.log(`${colors.green}✅ Response received in ${responseTime}ms${colors.reset}`);
    console.log(`Response: "${response.data.response?.substring(0, 100)}..."`);
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check ALL operations that were triggered
    console.log(`\n${colors.cyan}Checking ALL operations triggered by this single request...${colors.reset}`);
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('*')
      .gte('created_at', beforeTime)
      .order('created_at', { ascending: true });
    
    if (afterData && afterData.length > 0) {
      console.log(`\n${colors.bright}${colors.yellow}═══ OPERATIONS BREAKDOWN ═══${colors.reset}`);
      console.log(`Total operations triggered: ${afterData.length}`);
      
      let grandTotal = 0;
      afterData.forEach((op, index) => {
        console.log(`\n${colors.yellow}Operation ${index + 1}:${colors.reset}`);
        console.log(`  Type: ${op.operation_type}`);
        console.log(`  Model: ${op.model}`);
        console.log(`  Prompt Tokens: ${op.prompt_tokens}`);
        console.log(`  Completion Tokens: ${op.completion_tokens}`);
        console.log(`  Total Tokens: ${op.total_tokens}`);
        grandTotal += op.total_tokens;
      });
      
      console.log(`\n${colors.bright}${colors.green}═══ SUMMARY ═══${colors.reset}`);
      console.log(`${colors.yellow}Single Request Triggered:${colors.reset}`);
      
      // Group by operation type
      const grouped = {};
      afterData.forEach(op => {
        const type = op.operation_type;
        if (!grouped[type]) {
          grouped[type] = { count: 0, tokens: 0 };
        }
        grouped[type].count++;
        grouped[type].tokens += op.total_tokens;
      });
      
      Object.entries(grouped).forEach(([type, data]) => {
        console.log(`  ${type}: ${data.count} call(s), ${data.tokens} tokens`);
      });
      
      console.log(`\n${colors.bright}${colors.cyan}GRAND TOTAL TOKENS FOR ONE REQUEST: ${grandTotal}${colors.reset}`);
      
      // Check for issues
      console.log(`\n${colors.bright}${colors.red}═══ ISSUES FOUND ═══${colors.reset}`);
      
      if (grouped['bant_extraction']?.count > 1) {
        console.log(`${colors.red}❌ DUPLICATE BANT EXTRACTION: Called ${grouped['bant_extraction'].count} times${colors.reset}`);
      }
      
      if (grouped['chat_reply']?.tokens === 0) {
        console.log(`${colors.red}❌ CHAT_REPLY TRACKING 0 TOKENS: Not calculating properly${colors.reset}`);
      }
      
      if (!grouped['chat_reply']) {
        console.log(`${colors.red}❌ NO CHAT_REPLY TRACKED: Missing response tracking${colors.reset}`);
      }
      
      console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard for total tokens used.${colors.reset}`);
      console.log(`${colors.cyan}Our tracking shows: ${grandTotal} tokens${colors.reset}`);
      console.log(`${colors.cyan}OpenAI should show approximately the same amount.${colors.reset}`);
      
    } else {
      console.log(`${colors.red}❌ No operations tracked!${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
  }
}

// Run the test
detailedTokenTracking();