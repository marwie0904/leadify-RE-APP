#!/usr/bin/env node

/**
 * Test AI Function 1: Intent Classification
 */

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

async function getRecentTokens(seconds = 60) {
  const { data } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens, created_at')
    .gte('created_at', new Date(Date.now() - (seconds * 1000)).toISOString())
    .order('created_at', { ascending: false });
  
  return data || [];
}

async function testIntentClassification() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 1: Intent Classification${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Function Details:${colors.reset}`);
  console.log(`  Model: gpt-3.5-turbo`);
  console.log(`  Operation Type: intent_classification`);
  console.log(`  Purpose: Classify user intent (BANT, Estimation, General, etc.)`);
  
  // Get baseline - tokens in last 10 seconds
  console.log(`\n${colors.cyan}Getting baseline (last 10 seconds)...${colors.reset}`);
  const beforeTokens = await getRecentTokens(10);
  const beforeTotal = beforeTokens.reduce((sum, row) => sum + row.total_tokens, 0);
  console.log(`Baseline tokens: ${beforeTotal}`);
  
  // Create JWT token for authentication with complete claims
  const jwt = require('jsonwebtoken');
  const userId = '8ad6ed68-ac60-4483-b22d-e6747727971b';
  const token = jwt.sign(
    { 
      sub: userId,
      email: 'michael.brown@homes.com',
      aud: 'authenticated',
      role: 'authenticated',
      user_metadata: {
        full_name: 'Michael Brown'
      }
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  // Test message that should trigger intent classification
  const testMessage = "I'm looking for a house with a budget of 30 million";
  // Don't specify conversation ID to create a new one
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  console.log(`${colors.cyan}Agent ID:${colors.reset} 2b51a1a2-e10b-43a0-8501-ca28cf767cca`);
  console.log(`${colors.cyan}Creating new conversation...${colors.reset}`);
  
  console.log(`\n${colors.cyan}Sending request to /api/chat...${colors.reset}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: testMessage,
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        userId: userId,
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
    console.log(`Response preview: "${response.data.response?.substring(0, 100)}..."`);
    
    // Wait for database to update
    console.log(`\n${colors.cyan}Waiting 3 seconds for database update...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get tokens after the request
    console.log(`\n${colors.cyan}Checking token usage...${colors.reset}`);
    const afterTokens = await getRecentTokens(10);
    
    // Show all operations that happened
    console.log(`\n${colors.yellow}Operations triggered:${colors.reset}`);
    const operations = {};
    afterTokens.forEach(row => {
      const time = new Date(row.created_at);
      if (time > new Date(startTime)) {
        if (!operations[row.operation_type]) {
          operations[row.operation_type] = [];
        }
        operations[row.operation_type].push(row.total_tokens);
      }
    });
    
    let grandTotal = 0;
    Object.entries(operations).forEach(([op, tokens]) => {
      const total = tokens.reduce((sum, t) => sum + t, 0);
      console.log(`  ${colors.green}${op}:${colors.reset} ${tokens.join(' + ')} = ${total} tokens`);
      grandTotal += total;
    });
    
    console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}  TOTAL TOKENS TRACKED: ${grandTotal}${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    
    // Breakdown by operation
    if (operations['intent_classification']) {
      console.log(`\n${colors.cyan}Intent Classification Details:${colors.reset}`);
      console.log(`  Tokens: ${operations['intent_classification'].join(', ')}`);
      console.log(`  Total: ${operations['intent_classification'].reduce((sum, t) => sum + t, 0)}`);
    }
    
    if (operations['bant_extraction']) {
      console.log(`\n${colors.cyan}BANT Extraction Details:${colors.reset}`);
      console.log(`  Tokens: ${operations['bant_extraction'].join(', ')}`);
      console.log(`  Total: ${operations['bant_extraction'].reduce((sum, t) => sum + t, 0)}`);
    }
    
    if (operations['chat_reply']) {
      console.log(`\n${colors.cyan}Chat Reply Details:${colors.reset}`);
      console.log(`  Tokens: ${operations['chat_reply'].join(', ')}`);
      console.log(`  Total: ${operations['chat_reply'].reduce((sum, t) => sum + t, 0)}`);
    }
    
    console.log(`\n${colors.bright}${colors.cyan}Please check your OpenAI Dashboard now.${colors.reset}`);
    console.log(`${colors.cyan}Look for the usage in the last minute and compare.${colors.reset}`);
    console.log(`${colors.cyan}Our tracking shows: ${grandTotal} tokens${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
  }
}

// Run the test
testIntentClassification().catch(console.error);