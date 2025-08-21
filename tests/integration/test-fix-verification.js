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

async function verifyFix() {
  console.log(`${colors.bright}${colors.cyan}🚀 CHAT_REPLY FIX VERIFICATION TEST${colors.reset}`);
  console.log('='.repeat(70));
  
  try {
    // Step 1: Login
    console.log(`\n${colors.cyan}Step 1: Login${colors.reset}`);
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    
    // Step 2: Get user info to find agent
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    const userId = decoded.sub;
    
    // Create auth token for user with agent
    const authToken = jwt.sign(
      { 
        sub: '8ad6ed68-ac60-4483-b22d-e6747727971b', // michael.brown
        email: 'michael.brown@homes.com',
        aud: 'authenticated',
        role: 'authenticated'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Step 3: Get baseline
    console.log(`\n${colors.cyan}Step 2: Check baseline${colors.reset}`);
    const { data: beforeOps } = await supabase
      .from('ai_token_usage')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    const beforeCount = beforeOps?.length || 0;
    console.log(`Baseline operations: ${beforeCount}`);
    
    // Show recent operations
    if (beforeOps && beforeOps.length > 0) {
      console.log('Recent operations:');
      beforeOps.forEach(op => {
        const time = new Date(op.created_at).toLocaleTimeString();
        console.log(`  [${time}] ${op.operation_type}: ${op.total_tokens} tokens`);
      });
    }
    
    // Step 4: Send test messages
    console.log(`\n${colors.cyan}Step 3: Send test messages${colors.reset}`);
    
    const testMessages = [
      "Hello, I need help finding a property",
      "My budget is 40 million pesos",
      "I am the decision maker"
    ];
    
    const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca'; // Brown-Homes-Agent
    let conversationId = null;
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n${colors.blue}Message ${i + 1}: "${message}"${colors.reset}`);
      
      const beforeTime = new Date().toISOString();
      
      try {
        const response = await axios.post(
          `${API_URL}/api/chat`,
          {
            message,
            agentId,
            conversationId,
            source: 'website'
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        if (response.data.conversationId) {
          conversationId = response.data.conversationId;
        }
        
        console.log(`${colors.green}✅ Response received${colors.reset}`);
        console.log(`   "${response.data.response?.substring(0, 60)}..."`);
        
        // Wait for operations to be logged
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check what was tracked
        const { data: newOps } = await supabase
          .from('ai_token_usage')
          .select('*')
          .gte('created_at', beforeTime)
          .order('created_at', { ascending: false });
        
        const trackedOps = {};
        newOps?.forEach(op => {
          const type = op.operation_type || 'unknown';
          trackedOps[type] = (trackedOps[type] || 0) + 1;
        });
        
        console.log(`   Tracked operations: ${Object.keys(trackedOps).join(', ') || 'NONE'}`);
        
        // CHECK FOR CHAT_REPLY
        if (trackedOps['chat_reply']) {
          console.log(`   ${colors.green}✅ CHAT_REPLY TRACKED!${colors.reset}`);
        } else {
          console.log(`   ${colors.red}❌ CHAT_REPLY NOT TRACKED${colors.reset}`);
        }
        
      } catch (error) {
        console.error(`   ${colors.red}Error: ${error.response?.data?.error || error.message}${colors.reset}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 5: Final check
    console.log(`\n${colors.cyan}Step 4: Final Analysis${colors.reset}`);
    
    const { data: finalOps } = await supabase
      .from('ai_token_usage')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false });
    
    const opSummary = {};
    finalOps?.forEach(op => {
      const type = op.operation_type || 'unknown';
      opSummary[type] = (opSummary[type] || 0) + 1;
    });
    
    console.log(`\nOperations tracked in last minute:`);
    Object.entries(opSummary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // VERDICT
    console.log(`\n${colors.bright}${colors.cyan}═══ VERDICT ═══${colors.reset}`);
    if (opSummary['chat_reply'] && opSummary['chat_reply'] >= testMessages.length) {
      console.log(`${colors.green}✅ FIX SUCCESSFUL!${colors.reset}`);
      console.log(`${colors.green}   chat_reply operations are now being tracked${colors.reset}`);
      console.log(`${colors.green}   ${opSummary['chat_reply']} chat_reply operations tracked${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ FIX NOT WORKING${colors.reset}`);
      console.log(`${colors.red}   Expected ${testMessages.length} chat_reply operations${colors.reset}`);
      console.log(`${colors.red}   Found ${opSummary['chat_reply'] || 0} chat_reply operations${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
  }
}

// Run the test
console.log('Starting fix verification test...\n');
verifyFix();