#!/usr/bin/env node

/**
 * Test BANT Flow with Off-Topic Questions
 * 
 * This script tests that the BANT flow properly handles off-topic questions
 * by answering them first, then redirecting back to BANT questions.
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

// Test conversation flow
const testMessages = [
  { message: "Hi, how much are your properties?", expected: "budget question" },
  { message: "What is Leadify about?", expected: "answer about company + budget redirect" },
  { message: "30 million", expected: "acknowledge budget + authority question" },
  { message: "Tell me more about your services", expected: "answer about services + authority redirect" },
  { message: "Yes, I'm the sole decision maker", expected: "acknowledge authority + need question" },
  { message: "For personal residence", expected: "acknowledge need + timeline question" },
  { message: "Within 3 months", expected: "acknowledge timeline + contact question" },
  { message: "John Doe, 09171234567", expected: "acknowledge contact + property options" }
];

async function testOffTopicHandling() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                    BANT Off-Topic Question Handling Test                   ║
║                                                                            ║
║  Testing that off-topic questions are answered before BANT redirect        ║
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
    console.log(`  ID: ${agent.id}\n`);
    
    let conversationId = null;
    
    // Test each message in sequence
    for (let i = 0; i < testMessages.length; i++) {
      const testMsg = testMessages[i];
      console.log(`${colors.yellow}Step ${i + 1}: Sending message...${colors.reset}`);
      console.log(`  User: "${testMsg.message}"`);
      console.log(`  Expected: ${testMsg.expected}`);
      
      const requestBody = {
        message: testMsg.message,
        agentId: agent.id,
        userId: 'test-user',
        source: 'test'
      };
      
      if (conversationId) {
        requestBody.conversationId = conversationId;
      }
      
      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const error = await response.text();
          console.log(`${colors.red}  ✗ API Error: ${response.status}${colors.reset}`);
          console.log(`    ${error}`);
          continue;
        }
        
        const data = await response.json();
        conversationId = data.conversationId;
        
        console.log(`${colors.blue}  AI Response:${colors.reset}`);
        
        // Split response by double newline to check for multiple messages
        const messages = data.response.split('\n\n').filter(m => m.trim());
        
        if (messages.length > 1) {
          console.log(`${colors.green}  ✓ Multiple messages detected (${messages.length} messages)${colors.reset}`);
          messages.forEach((msg, idx) => {
            console.log(`    Message ${idx + 1}: "${msg.substring(0, 100)}${msg.length > 100 ? '...' : ''}"`);
          });
        } else {
          console.log(`    "${data.response.substring(0, 150)}${data.response.length > 150 ? '...' : ''}"`);
        }
        
        console.log(`${colors.cyan}  Intent: ${data.intent}${colors.reset}`);
        
        // Check if off-topic questions are handled properly
        if (testMsg.message.toLowerCase().includes('what is') || 
            testMsg.message.toLowerCase().includes('tell me') ||
            testMsg.message.toLowerCase().includes('about')) {
          if (messages.length > 1) {
            console.log(`${colors.green}  ✓ Off-topic handled correctly with separate messages${colors.reset}`);
          } else if (data.response.includes('budget') || 
                     data.response.includes('authority') || 
                     data.response.includes('decision')) {
            console.log(`${colors.yellow}  ⚠ Response includes BANT question but might not have answered off-topic${colors.reset}`);
          }
        }
        
        console.log('');
        
        // Wait a bit between messages to simulate real conversation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`${colors.red}  ✗ Request failed: ${error.message}${colors.reset}`);
      }
    }
    
    // Check if lead was created
    if (conversationId) {
      console.log(`${colors.yellow}Checking if lead was created...${colors.reset}`);
      
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('conversation_id', conversationId);
      
      if (!leadError && leads && leads.length > 0) {
        const lead = leads[0];
        console.log(`${colors.green}✓ Lead created successfully!${colors.reset}`);
        console.log(`  Name: ${lead.full_name || 'Not captured'}`);
        console.log(`  Phone: ${lead.mobile_number || 'Not captured'}`);
        console.log(`  Budget: ${lead.budget_range || 'Not captured'}`);
        console.log(`  Authority: ${lead.authority || 'Not captured'}`);
        console.log(`  Need: ${lead.need || 'Not captured'}`);
        console.log(`  Timeline: ${lead.timeline || 'Not captured'}`);
        console.log(`  Score: ${lead.lead_score}`);
        console.log(`  Classification: ${lead.lead_classification}`);
      } else {
        console.log(`${colors.yellow}No lead created yet${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}Test error:${colors.reset}`, error.message);
  }
}

// Run the test
testOffTopicHandling().then(() => {
  console.log(`\n${colors.green}Test complete!${colors.reset}`);
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});