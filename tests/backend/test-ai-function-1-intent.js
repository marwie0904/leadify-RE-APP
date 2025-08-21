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

async function testIntentClassification() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 1: masterIntentClassifier${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Function Details:${colors.reset}`);
  console.log(`  Model: gpt-3.5-turbo`);
  console.log(`  Operation: intent_classification`);
  console.log(`  Purpose: Classify user intent (BANT, Estimation, General, etc.)`);
  
  // Get baseline token count
  console.log(`\n${colors.cyan}Getting baseline token count...${colors.reset}`);
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('*')
    .eq('operation_type', 'intent_classification')
    .order('created_at', { ascending: false })
    .limit(1);
  
  const beforeTokens = beforeData?.[0]?.total_tokens || 0;
  console.log(`Last intent_classification tokens: ${beforeTokens}`);
  
  // Test message
  const testMessage = "I'm looking for a house with a budget of 30 million";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  
  // Create JWT token for authentication
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
  
  console.log(`\n${colors.cyan}Sending request to trigger intent classification...${colors.reset}`);
  
  try {
    const startTime = Date.now();
    
    // Send chat request which will trigger intent classification
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
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check token usage
    console.log(`\n${colors.cyan}Checking token usage...${colors.reset}`);
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('operation_type', 'intent_classification')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (afterData && afterData[0]) {
      const operation = afterData[0];
      console.log(`\n${colors.bright}${colors.green}═══ TOKEN USAGE REPORT ═══${colors.reset}`);
      console.log(`${colors.yellow}Operation Type:${colors.reset} ${operation.operation_type}`);
      console.log(`${colors.yellow}Model:${colors.reset} ${operation.model}`);
      console.log(`${colors.yellow}Prompt Tokens:${colors.reset} ${operation.prompt_tokens}`);
      console.log(`${colors.yellow}Completion Tokens:${colors.reset} ${operation.completion_tokens}`);
      console.log(`${colors.yellow}Total Tokens:${colors.reset} ${operation.total_tokens}`);
      console.log(`${colors.yellow}Timestamp:${colors.reset} ${new Date(operation.created_at).toLocaleString()}`);
      
      // Calculate cost estimate
      const costPer1k = 0.00015; // gpt-3.5-turbo cost
      const estimatedCost = (operation.total_tokens / 1000) * costPer1k;
      console.log(`${colors.yellow}Estimated Cost:${colors.reset} $${estimatedCost.toFixed(6)}`);
      
      console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard to verify these tokens.${colors.reset}`);
      console.log(`${colors.cyan}Type "next" when ready to proceed to Function 2.${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ No token usage found for intent_classification${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
  }
}

// Run the test
testIntentClassification();