#!/usr/bin/env node

/**
 * Test AI Function 1: Intent Classification
 * Final version with working conversation
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

async function testIntentClassification() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 1: Intent Classification${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Function Details:${colors.reset}`);
  console.log(`  Model: gpt-3.5-turbo`);
  console.log(`  Operation Type: intent_classification`);
  console.log(`  Purpose: Classify user intent (BANT, Estimation, General, etc.)`);
  
  // Get baseline - sum all tokens in last 30 seconds
  console.log(`\n${colors.cyan}Getting baseline token count...${colors.reset}`);
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline total (last 30s): ${beforeTotal} tokens`);
  
  // Use the conversation we just created
  const conversationId = '0cc898c7-838a-457c-ac28-c36149a3eddd';
  const userId = '8ad6ed68-ac60-4483-b22d-e6747727971b';
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  
  // Test message that should trigger intent classification
  const testMessage = "I'm looking for a house with a budget of 30 million";
  
  console.log(`\n${colors.cyan}Test Setup:${colors.reset}`);
  console.log(`  Message: "${testMessage}"`);
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  Conversation ID: ${conversationId}`);
  console.log(`  User ID: ${userId}`);
  
  console.log(`\n${colors.cyan}Sending request to /api/chat...${colors.reset}`);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: testMessage,
        agentId: agentId,
        conversationId: conversationId,
        userId: userId,
        source: 'website'
      },
      {
        headers: {
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
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('operation_type, total_tokens, created_at')
      .gte('created_at', new Date(startTime).toISOString())
      .order('created_at', { ascending: false });
    
    // Group by operation type
    const operations = {};
    let grandTotal = 0;
    
    if (afterData) {
      afterData.forEach(row => {
        if (!operations[row.operation_type]) {
          operations[row.operation_type] = {
            count: 0,
            tokens: 0
          };
        }
        operations[row.operation_type].count++;
        operations[row.operation_type].tokens += row.total_tokens;
        grandTotal += row.total_tokens;
      });
    }
    
    console.log(`\n${colors.yellow}═══ OPERATIONS BREAKDOWN ═══${colors.reset}`);
    Object.entries(operations).forEach(([op, data]) => {
      console.log(`${colors.green}${op}:${colors.reset}`);
      console.log(`  Calls: ${data.count}`);
      console.log(`  Total Tokens: ${data.tokens}`);
    });
    
    console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}  TOTAL TOKENS TRACKED: ${grandTotal}${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
    
    // Show what to look for
    console.log(`\n${colors.bright}${colors.cyan}📊 Please check your OpenAI Dashboard now${colors.reset}`);
    console.log(`${colors.cyan}Look for usage in the last minute and note:${colors.reset}`);
    console.log(`  1. Total tokens used`);
    console.log(`  2. Which models were called`);
    console.log(`  3. Number of requests`);
    console.log(`\n${colors.cyan}Our tracking shows: ${grandTotal} tokens${colors.reset}`);
    console.log(`${colors.cyan}OpenAI should show: ??? tokens${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.response?.data || error.message);
  }
}

// Run the test
testIntentClassification().catch(console.error);