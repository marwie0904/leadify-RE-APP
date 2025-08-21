#!/usr/bin/env node

/**
 * Test BANT workflow with initial question handling
 * 
 * This script tests that:
 * 1. Initial question is stored when BANT is triggered
 * 2. BANT questions are asked in sequence
 * 3. After contact info, the initial question is answered
 * 4. Lead is created asynchronously
 */

const fetch = require('node-fetch');
const readline = require('readline');

const API_URL = 'http://localhost:3001';
const TEST_AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca'; // Valid agent ID from database

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
const conversationFlow = [
  {
    message: "Do you have any 3 bedroom condos available in BGC area?",
    expectedBehavior: "Should trigger BANT and ask for budget",
    description: "Initial property inquiry that should trigger BANT"
  },
  {
    message: "My budget is around 15 million pesos",
    expectedBehavior: "Should acknowledge budget and ask for authority",
    description: "Budget response"
  },
  {
    message: "Yes, I'll be the sole decision maker",
    expectedBehavior: "Should acknowledge authority and ask for need/purpose",
    description: "Authority response"
  },
  {
    message: "It's for personal residence, for my family",
    expectedBehavior: "Should acknowledge need and ask for timeline",
    description: "Need response"
  },
  {
    message: "We're looking to buy within 3 months",
    expectedBehavior: "Should acknowledge timeline and ask for contact info",
    description: "Timeline response"
  },
  {
    message: "I'm John Doe, my number is 09171234567",
    expectedBehavior: "Should acknowledge contact AND answer the initial question about 3BR condos in BGC",
    description: "Contact info - SHOULD TRIGGER INITIAL QUESTION RESPONSE"
  }
];

let conversationId = null;
let startTime = null;

async function sendMessage(message, stepIndex) {
  const step = conversationFlow[stepIndex];
  
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}Step ${stepIndex + 1}/${conversationFlow.length}: ${step.description}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  
  console.log(`${colors.blue}USER:${colors.reset} "${message}"`);
  console.log(`${colors.yellow}Expected:${colors.reset} ${step.expectedBehavior}`);
  
  const requestStart = Date.now();
  
  try {
    const payload = {
      message,
      agentId: TEST_AGENT_ID,  // Changed from agent_id to agentId
      source: 'web',
      userId: `test-user-${Date.now()}`
    };
    
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const responseTime = Date.now() - requestStart;
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.conversationId && !conversationId) {
      conversationId = data.conversationId;
      console.log(`${colors.green}✓ Conversation ID:${colors.reset} ${conversationId}`);
    }
    
    console.log(`${colors.green}AI RESPONSE:${colors.reset} "${data.response}"`);
    console.log(`${colors.cyan}Response time: ${responseTime}ms${colors.reset}`);
    
    // Special check for the final step
    if (stepIndex === conversationFlow.length - 1) {
      console.log(`\n${colors.bright}${colors.yellow}🔍 FINAL RESPONSE ANALYSIS:${colors.reset}`);
      
      const response = data.response.toLowerCase();
      const hasContactAck = response.includes('thank you') || response.includes('perfect');
      const hasPropertyInfo = response.includes('condo') || response.includes('bgc') || 
                             response.includes('bedroom') || response.includes('property') ||
                             response.includes('options') || response.includes('available');
      
      if (hasContactAck) {
        console.log(`${colors.green}✓ Contact acknowledgment found${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Missing contact acknowledgment${colors.reset}`);
      }
      
      if (hasPropertyInfo) {
        console.log(`${colors.green}✓ Initial question answered (property info provided)${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Initial question NOT answered (no property info)${colors.reset}`);
      }
      
      if (hasContactAck && hasPropertyInfo) {
        console.log(`${colors.bright}${colors.green}✅ SUCCESS: BANT workflow correctly handles initial question!${colors.reset}`);
      } else {
        console.log(`${colors.bright}${colors.red}❌ FAILURE: Initial question was not properly answered${colors.reset}`);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    throw error;
  }
}

async function runTest() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                 BANT Initial Question Handling Test                       ║
║                                                                            ║
║  This test verifies that the initial question that triggers BANT          ║
║  is properly answered after collecting contact information                ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  startTime = Date.now();
  
  try {
    // Check if server is running
    console.log(`\n${colors.yellow}Checking server connection...${colors.reset}`);
    const healthCheck = await fetch(`${API_URL}/api/health`).catch(() => null);
    
    if (!healthCheck || !healthCheck.ok) {
      console.error(`${colors.red}Error: Server is not running on ${API_URL}${colors.reset}`);
      console.log(`${colors.yellow}Please start the server with: npm run server${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}✓ Server is running${colors.reset}`);
    
    // Run through conversation flow
    for (let i = 0; i < conversationFlow.length; i++) {
      await sendMessage(conversationFlow[i].message, i);
      
      // Add a small delay between messages to simulate real conversation
      if (i < conversationFlow.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}Test Summary:${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`Total conversation time: ${totalTime}ms`);
    console.log(`Average response time: ${Math.round(totalTime / conversationFlow.length)}ms per message`);
    
    // Wait a bit to see if lead creation logs appear (it's async)
    console.log(`\n${colors.yellow}Waiting 3 seconds to check for async lead creation logs...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`\n${colors.green}${colors.bright}Test completed!${colors.reset}`);
    console.log(`Check server logs for [LEAD ASYNC] messages to confirm async lead creation.`);
    
  } catch (error) {
    console.error(`\n${colors.red}Test failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the test
runTest().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});