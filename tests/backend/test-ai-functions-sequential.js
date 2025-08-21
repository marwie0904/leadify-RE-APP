#!/usr/bin/env node

/**
 * Sequential AI Function Testing
 * Tests each AI function one by one, waiting for user confirmation
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function waitForUser(message = "Type 'next' to continue or 'stop' to exit: ") {
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      if (answer.toLowerCase() === 'stop') {
        console.log('Stopping tests...');
        rl.close();
        process.exit(0);
      }
      resolve(answer);
    });
  });
}

async function getTokenSnapshot() {
  const { data } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens')
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .order('created_at', { ascending: false });
  
  const summary = {};
  if (data) {
    data.forEach(row => {
      if (!summary[row.operation_type]) {
        summary[row.operation_type] = 0;
      }
      summary[row.operation_type] += row.total_tokens;
    });
  }
  return summary;
}

async function testFunction1_IntentClassification() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 1: Intent Classification${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Details:${colors.reset}`);
  console.log(`  Model: gpt-3.5-turbo`);
  console.log(`  Operation: intent_classification`);
  console.log(`  Purpose: Classify user intent (BANT, Estimation, General)`);
  
  // Get baseline
  const beforeTokens = await getTokenSnapshot();
  console.log(`\n${colors.cyan}Before Test - Recent Tokens:${colors.reset}`);
  Object.entries(beforeTokens).forEach(([op, tokens]) => {
    console.log(`  ${op}: ${tokens}`);
  });
  
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
  
  const testMessage = "I'm looking for a property with a budget of 30 million";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  console.log(`\n${colors.cyan}Sending request...${colors.reset}`);
  
  try {
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
    
    console.log(`${colors.green}✅ Response received${colors.reset}`);
    
    // Wait for DB to update
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get after tokens
    const afterTokens = await getTokenSnapshot();
    console.log(`\n${colors.cyan}After Test - Recent Tokens:${colors.reset}`);
    
    let totalNewTokens = 0;
    Object.entries(afterTokens).forEach(([op, tokens]) => {
      const before = beforeTokens[op] || 0;
      const diff = tokens - before;
      if (diff > 0) {
        console.log(`  ${colors.green}${op}: +${diff} tokens${colors.reset}`);
        totalNewTokens += diff;
      }
    });
    
    console.log(`\n${colors.bright}${colors.yellow}TOTAL TOKENS TRACKED: ${totalNewTokens}${colors.reset}`);
    console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard and note the tokens used.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

async function testFunction2_BANTExtraction() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 2: BANT Extraction${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Details:${colors.reset}`);
  console.log(`  Model: gpt-4 or gpt-5`);
  console.log(`  Operation: bant_extraction`);
  console.log(`  Purpose: Extract Budget, Authority, Need, Timeline`);
  
  const beforeTokens = await getTokenSnapshot();
  console.log(`\n${colors.cyan}Before Test - Recent Tokens:${colors.reset}`);
  Object.entries(beforeTokens).forEach(([op, tokens]) => {
    console.log(`  ${op}: ${tokens}`);
  });
  
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
  
  // Send a message that will trigger BANT extraction
  const testMessage = "My budget is 50 million and I need to move in 3 months";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  console.log(`\n${colors.cyan}Sending request...${colors.reset}`);
  
  try {
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
    
    console.log(`${colors.green}✅ Response received${colors.reset}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterTokens = await getTokenSnapshot();
    console.log(`\n${colors.cyan}After Test - Recent Tokens:${colors.reset}`);
    
    let totalNewTokens = 0;
    Object.entries(afterTokens).forEach(([op, tokens]) => {
      const before = beforeTokens[op] || 0;
      const diff = tokens - before;
      if (diff > 0) {
        console.log(`  ${colors.green}${op}: +${diff} tokens${colors.reset}`);
        totalNewTokens += diff;
      }
    });
    
    console.log(`\n${colors.bright}${colors.yellow}TOTAL TOKENS TRACKED: ${totalNewTokens}${colors.reset}`);
    console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard and note the tokens used.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

async function testFunction3_ContactExtraction() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 3: Contact Extraction${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Details:${colors.reset}`);
  console.log(`  Model: gpt-4o-mini`);
  console.log(`  Operation: contact_extraction`);
  console.log(`  Purpose: Extract contact information from messages`);
  
  const beforeTokens = await getTokenSnapshot();
  console.log(`\n${colors.cyan}Before Test - Recent Tokens:${colors.reset}`);
  Object.entries(beforeTokens).forEach(([op, tokens]) => {
    console.log(`  ${op}: ${tokens}`);
  });
  
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
  
  // Send a message with contact info
  const testMessage = "My name is John Smith and my email is john@example.com, phone is 555-1234";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  console.log(`\n${colors.cyan}Sending request...${colors.reset}`);
  
  try {
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
    
    console.log(`${colors.green}✅ Response received${colors.reset}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterTokens = await getTokenSnapshot();
    console.log(`\n${colors.cyan}After Test - Recent Tokens:${colors.reset}`);
    
    let totalNewTokens = 0;
    Object.entries(afterTokens).forEach(([op, tokens]) => {
      const before = beforeTokens[op] || 0;
      const diff = tokens - before;
      if (diff > 0) {
        console.log(`  ${colors.green}${op}: +${diff} tokens${colors.reset}`);
        totalNewTokens += diff;
      }
    });
    
    console.log(`\n${colors.bright}${colors.yellow}TOTAL TOKENS TRACKED: ${totalNewTokens}${colors.reset}`);
    console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard and note the tokens used.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

async function testFunction4_GeneralChat() {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 4: General Chat Response${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Details:${colors.reset}`);
  console.log(`  Model: gpt-4`);
  console.log(`  Operation: chat_reply`);
  console.log(`  Purpose: Generate general chat responses`);
  
  const beforeTokens = await getTokenSnapshot();
  console.log(`\n${colors.cyan}Before Test - Recent Tokens:${colors.reset}`);
  Object.entries(beforeTokens).forEach(([op, tokens]) => {
    console.log(`  ${op}: ${tokens}`);
  });
  
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
  
  // Send a general question
  const testMessage = "What types of properties do you have available?";
  console.log(`\n${colors.cyan}Test Message:${colors.reset} "${testMessage}"`);
  console.log(`\n${colors.cyan}Sending request...${colors.reset}`);
  
  try {
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
    
    console.log(`${colors.green}✅ Response received${colors.reset}`);
    console.log(`Response preview: "${response.data.response?.substring(0, 100)}..."`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterTokens = await getTokenSnapshot();
    console.log(`\n${colors.cyan}After Test - Recent Tokens:${colors.reset}`);
    
    let totalNewTokens = 0;
    Object.entries(afterTokens).forEach(([op, tokens]) => {
      const before = beforeTokens[op] || 0;
      const diff = tokens - before;
      if (diff > 0) {
        console.log(`  ${colors.green}${op}: +${diff} tokens${colors.reset}`);
        totalNewTokens += diff;
      }
    });
    
    console.log(`\n${colors.bright}${colors.yellow}TOTAL TOKENS TRACKED: ${totalNewTokens}${colors.reset}`);
    console.log(`\n${colors.bright}${colors.cyan}Please check OpenAI Dashboard and note the tokens used.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

// Main test runner
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  SEQUENTIAL AI FUNCTION TESTING${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`\nWe'll test each AI function one by one.`);
  console.log(`After each test, check your OpenAI Dashboard and type 'next' to continue.`);
  
  const tests = [
    { name: 'Intent Classification', fn: testFunction1_IntentClassification },
    { name: 'BANT Extraction', fn: testFunction2_BANTExtraction },
    { name: 'Contact Extraction', fn: testFunction3_ContactExtraction },
    { name: 'General Chat Response', fn: testFunction4_GeneralChat }
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    await test.fn();
    
    if (i < tests.length - 1) {
      console.log(`\n${colors.yellow}Please check OpenAI Dashboard for the actual token usage.${colors.reset}`);
      await waitForUser(`\nType 'next' to test ${tests[i + 1].name} or 'stop' to exit: `);
    }
  }
  
  console.log(`\n${colors.bright}${colors.green}All tests completed!${colors.reset}`);
  
  // Final summary
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  FINAL TOKEN SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  const { data: summary } = await supabase
    .from('ai_token_usage')
    .select('operation_type, SUM(total_tokens)')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  
  if (summary) {
    console.log(`\nTokens by operation type (last hour):`);
    summary.forEach(row => {
      console.log(`  ${row.operation_type}: ${row.sum || 0} tokens`);
    });
  }
  
  rl.close();
}

// Start the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});