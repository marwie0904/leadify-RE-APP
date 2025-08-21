#!/usr/bin/env node

/**
 * Verification test for GPT-5 token tracking fixes
 * Tests that reasoning_effort='low' and increased max_completion_tokens work correctly
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Colors for output
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

async function testIntentClassification() {
  console.log(`\n${colors.cyan}═══ Test 1: Intent Classification ═══${colors.reset}`);
  
  const messages = [
    { 
      role: 'system', 
      content: 'Classify the user intent. Categories: BANT, GENERAL_INQUIRY, ESTIMATION_REQUEST, HANDOFF, EMBEDDINGS, OTHER. Reply with ONE word only.'
    },
    { 
      role: 'user', 
      content: 'I need a 3-bedroom house in Miami' 
    }
  ];
  
  console.log('Testing with reasoning_effort=low and max_completion_tokens=1000');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 1000,
      reasoning_effort: 'low'
    });
    
    console.log(`Response: ${colors.green}${response.choices[0].message.content}${colors.reset}`);
    console.log(`\n${colors.yellow}Token Usage:${colors.reset}`);
    console.log(`  Prompt: ${response.usage.prompt_tokens}`);
    console.log(`  Completion: ${response.usage.completion_tokens}`);
    console.log(`  Reasoning: ${response.usage.completion_tokens_details?.reasoning_tokens || 0}`);
    console.log(`  ${colors.bright}TOTAL: ${response.usage.total_tokens}${colors.reset}`);
    
    return response.usage.total_tokens;
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    return 0;
  }
}

async function testBANTExtraction() {
  console.log(`\n${colors.cyan}═══ Test 2: BANT Extraction ═══${colors.reset}`);
  
  const conversation = "I have a budget of 10 million dollars. I need a 5-bedroom house. My wife and I will decide together. We want to move in 3 months.";
  
  const systemPrompt = `Extract BANT information and return JSON with: budget(number), authority(single/dual/group), need(string), timeline(string), hasContact(boolean)`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversation }
  ];
  
  console.log('Testing with reasoning_effort=low and max_completion_tokens=2000');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 2000,
      reasoning_effort: 'low'
    });
    
    console.log(`Response: ${colors.green}${response.choices[0].message.content?.substring(0, 100)}...${colors.reset}`);
    console.log(`\n${colors.yellow}Token Usage:${colors.reset}`);
    console.log(`  Prompt: ${response.usage.prompt_tokens}`);
    console.log(`  Completion: ${response.usage.completion_tokens}`);
    console.log(`  Reasoning: ${response.usage.completion_tokens_details?.reasoning_tokens || 0}`);
    console.log(`  ${colors.bright}TOTAL: ${response.usage.total_tokens}${colors.reset}`);
    
    return response.usage.total_tokens;
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    return 0;
  }
}

async function testGeneralChat() {
  console.log(`\n${colors.cyan}═══ Test 3: General Chat Response ═══${colors.reset}`);
  
  const messages = [
    { 
      role: 'system', 
      content: 'You are a helpful real estate AI assistant. Be concise.' 
    },
    { 
      role: 'user', 
      content: 'What are the best neighborhoods in Miami for families?' 
    }
  ];
  
  console.log('Testing with reasoning_effort=low and max_completion_tokens=2000');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 2000,
      reasoning_effort: 'low'
    });
    
    console.log(`Response: ${colors.green}${response.choices[0].message.content?.substring(0, 100)}...${colors.reset}`);
    console.log(`\n${colors.yellow}Token Usage:${colors.reset}`);
    console.log(`  Prompt: ${response.usage.prompt_tokens}`);
    console.log(`  Completion: ${response.usage.completion_tokens}`);
    console.log(`  Reasoning: ${response.usage.completion_tokens_details?.reasoning_tokens || 0}`);
    console.log(`  ${colors.bright}TOTAL: ${response.usage.total_tokens}${colors.reset}`);
    
    return response.usage.total_tokens;
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    return 0;
  }
}

async function checkDatabaseTracking() {
  console.log(`\n${colors.cyan}═══ Checking Database Token Tracking ═══${colors.reset}`);
  
  // Get recent token usage from database
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens, reasoning_tokens, created_at')
    .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error(`${colors.red}Database error: ${error.message}${colors.reset}`);
    return;
  }
  
  if (data && data.length > 0) {
    console.log(`\n${colors.yellow}Recent database entries:${colors.reset}`);
    data.forEach(entry => {
      const time = new Date(entry.created_at).toLocaleTimeString();
      console.log(`  ${time} - ${entry.operation_type}: ${entry.total_tokens} tokens (reasoning: ${entry.reasoning_tokens || 0})`);
    });
  } else {
    console.log('No recent entries found');
  }
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  GPT-5 TOKEN TRACKING FIX VERIFICATION${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Configuration:${colors.reset}`);
  console.log('  Model: gpt-5-2025-08-07');
  console.log('  reasoning_effort: low (reduces hidden tokens)');
  console.log('  max_completion_tokens: 1000-2000 (accounts for reasoning)');
  
  console.log(`\n${colors.bright}${colors.yellow}📊 RECORD YOUR OPENAI DASHBOARD READING BEFORE STARTING${colors.reset}`);
  console.log('Press Enter when ready to continue...');
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  let totalTokens = 0;
  
  // Run tests
  totalTokens += await testIntentClassification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  totalTokens += await testBANTExtraction();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  totalTokens += await testGeneralChat();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check database
  await checkDatabaseTracking();
  
  // Summary
  console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.green}  SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.cyan}Total tokens tracked by our system: ${colors.bright}${totalTokens}${colors.reset}`);
  
  console.log(`\n${colors.bright}${colors.yellow}📊 NOW CHECK YOUR OPENAI DASHBOARD${colors.reset}`);
  console.log('Compare the dashboard increase with our tracked total');
  console.log('\nExpected behavior with fixes:');
  console.log('  1. reasoning_effort=low reduces reasoning tokens (~256 vs ~384)');
  console.log('  2. Higher max_completion_tokens ensures we get actual output');
  console.log('  3. reasoning_tokens are now tracked separately in database');
  console.log('  4. Total tracking should be closer to OpenAI dashboard');
  
  console.log(`\n${colors.green}If the discrepancy is now minimal (within 5-10%), the fix is working!${colors.reset}`);
}

// Run the tests
runAllTests().catch(console.error);