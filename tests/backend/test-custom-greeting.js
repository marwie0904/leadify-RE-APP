#!/usr/bin/env node

/**
 * Test Custom Greeting Feature
 * 
 * This script tests that the custom greeting feature works correctly:
 * 1. Creates/updates an agent with custom greeting
 * 2. Tests that greeting is returned when user says hello
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testCustomGreeting() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                          Custom Greeting Test                              ║
║                                                                            ║
║  Testing that custom greetings work when users say hello                   ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Get or create a test agent
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (agentError || !agents || agents.length === 0) {
      console.log(`${colors.red}✗ No agents found. Please create an agent first.${colors.reset}`);
      return;
    }
    
    const agent = agents[0];
    console.log(`${colors.green}✓ Using agent: ${agent.name}${colors.reset}`);
    console.log(`  ID: ${agent.id}`);
    
    // Update agent with custom greeting
    const customGreeting = "Welcome to Leadify Real Estate! I'm your personal property assistant. Whether you're looking to buy, sell, or invest in real estate, I'm here to help you every step of the way. What brings you here today?";
    
    console.log(`\n${colors.yellow}Setting custom greeting...${colors.reset}`);
    const { error: updateError } = await supabase
      .from('agents')
      .update({ custom_greeting: customGreeting })
      .eq('id', agent.id);
    
    if (updateError) {
      console.log(`${colors.red}✗ Failed to update custom greeting: ${updateError.message}${colors.reset}`);
      console.log(`${colors.yellow}Note: You may need to manually add the custom_greeting column to the agents table.${colors.reset}`);
      console.log(`  Run: ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_greeting TEXT;`);
      return;
    }
    
    console.log(`${colors.green}✓ Custom greeting set successfully${colors.reset}`);
    
    // Test greetings
    const greetingTests = [
      "Hi",
      "Hello",
      "Hey there",
      "Good morning",
      "Hola"
    ];
    
    console.log(`\n${colors.yellow}Testing greeting responses...${colors.reset}\n`);
    
    for (const greeting of greetingTests) {
      console.log(`${colors.blue}User: "${greeting}"${colors.reset}`);
      
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: greeting,
          agentId: agent.id,
          userId: 'test-user',
          source: 'test'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.log(`${colors.red}  ✗ API Error: ${response.status}${colors.reset}`);
        console.log(`    ${error}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`${colors.cyan}AI Response:${colors.reset}`);
      
      // Check if custom greeting is used
      if (data.response === customGreeting || data.response.includes("Welcome to Leadify")) {
        console.log(`${colors.green}  ✓ Custom greeting returned!${colors.reset}`);
        console.log(`    "${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}"`);
      } else {
        console.log(`${colors.yellow}  ⚠ Default greeting returned (custom greeting may not be set)${colors.reset}`);
        console.log(`    "${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}"`);
      }
      
      console.log('');
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test non-greeting message to ensure normal flow works
    console.log(`${colors.yellow}Testing non-greeting message...${colors.reset}`);
    console.log(`${colors.blue}User: "What properties do you have available?"${colors.reset}`);
    
    const normalResponse = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "What properties do you have available?",
        agentId: agent.id,
        userId: 'test-user',
        source: 'test'
      })
    });
    
    if (normalResponse.ok) {
      const data = await normalResponse.json();
      console.log(`${colors.cyan}AI Response:${colors.reset}`);
      console.log(`  "${data.response.substring(0, 150)}${data.response.length > 150 ? '...' : ''}"`);
      console.log(`${colors.green}  ✓ Normal conversation flow works${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Test error:${colors.reset}`, error.message);
  }
}

// Run the test
testCustomGreeting().then(() => {
  console.log(`\n${colors.green}Custom greeting test complete!${colors.reset}`);
  console.log(`${colors.yellow}Note: If custom greetings are not working, ensure the custom_greeting column exists in the agents table.${colors.reset}`);
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});