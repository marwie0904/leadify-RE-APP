const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Base URL for the application
const BASE_URL = 'http://localhost:3000';

// Conversation templates for different lead types
const conversationTemplates = {
  hot: [
    {
      messages: [
        "Hi, I'm looking to buy a home in the next month",
        "My budget is around $500,000-$600,000",
        "I'm pre-approved for a mortgage and ready to make an offer",
        "I need a 4 bedroom house with a good school district",
        "Can you show me available properties this weekend?"
      ]
    },
    {
      messages: [
        "Hello, we need to relocate for work by next month",
        "We can spend up to $750,000",
        "My spouse and I are both on the deed",
        "Looking for a modern home with home office space",
        "We're flying in this Friday to view properties"
      ]
    },
    {
      messages: [
        "I'm a cash buyer looking to close quickly",
        "Budget is $1.2 million",
        "I make all property decisions for my family",
        "Need a luxury home with pool and smart home features",
        "Want to close within 2 weeks if we find the right property"
      ]
    },
    {
      messages: [
        "Our company needs new office space urgently",
        "We have a budget of $2 million to purchase",
        "I'm the CFO with full purchasing authority",
        "Need 10,000 sq ft with parking for 50 cars",
        "Our lease ends in 30 days, need to move fast"
      ]
    }
  ],
  warm: [
    {
      messages: [
        "I'm interested in buying a home in the next few months",
        "Budget is probably around $400,000",
        "I'll need to discuss with my partner",
        "Looking for 3 bedrooms, preferably with a garage",
        "We're planning to start seriously looking next month"
      ]
    },
    {
      messages: [
        "Thinking about upgrading from our current home",
        "We could go up to $550,000 with the sale of our current place",
        "Both my wife and I need to agree",
        "Want more space for our growing family",
        "Probably looking to move in 3-4 months"
      ]
    },
    {
      messages: [
        "I'm exploring investment properties",
        "Have about $300,000 to invest",
        "I make investment decisions myself",
        "Looking for good rental income potential",
        "Planning to buy within the next quarter"
      ]
    },
    {
      messages: [
        "We're considering buying our first home",
        "Can afford around $350,000 with our savings",
        "It's just me and my fiancée deciding",
        "Need something move-in ready near downtown",
        "Want to buy before our wedding in 5 months"
      ]
    }
  ],
  cold: [
    {
      messages: [
        "Just browsing to see what's available",
        "Not sure about budget yet",
        "Haven't talked to anyone else about this",
        "Just curious about the market",
        "Maybe next year"
      ]
    },
    {
      messages: [
        "Wondering about home prices in the area",
        "Don't know what we can afford",
        "Would need to convince my spouse first",
        "Just starting to think about it",
        "Probably not for a while"
      ]
    },
    {
      messages: [
        "How much do homes cost here?",
        "Haven't looked into financing",
        "Just me looking for now",
        "Not sure what I want",
        "No specific timeline"
      ]
    },
    {
      messages: [
        "What's the market like these days?",
        "Budget depends on a lot of factors",
        "Need to discuss with family",
        "Just getting information",
        "Maybe in a year or two"
      ]
    }
  ],
  nonResponsive: [
    {
      messages: [
        "Hello",
        "...",
        "Not sure",
        "I'll think about it"
      ]
    },
    {
      messages: [
        "Hi there",
        "Okay",
        "Maybe",
        "Thanks"
      ]
    },
    {
      messages: [
        "Hey",
        "Hmm",
        "Don't know",
        "Bye"
      ]
    },
    {
      messages: [
        "Hi",
        "Not really",
        "No thanks",
        "Goodbye"
      ]
    }
  ],
  handoff: [
    {
      messages: [
        "I have a legal question about property liens",
        "Can you explain the foreclosure process?",
        "What are the tax implications of selling?",
        "I need help with a boundary dispute",
        "Can you review this contract for me?"
      ]
    },
    {
      messages: [
        "Is the agent available to speak directly?",
        "I prefer to talk to a human",
        "This is too complicated for a chatbot",
        "I need someone who can visit the property",
        "Can I schedule a phone call with an agent?"
      ]
    },
    {
      messages: [
        "I have a very specific situation",
        "My case involves probate and inheritance",
        "Need advice on 1031 exchange",
        "Question about zoning regulations",
        "Complex financing structure I need to discuss"
      ]
    },
    {
      messages: [
        "I'm an attorney representing a client",
        "This involves a corporate acquisition",
        "Need to discuss off-market opportunities",
        "Confidential matter requiring discretion",
        "Special circumstances that need human review"
      ]
    }
  ]
};

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to type message with realistic delays
async function typeMessage(page, message) {
  const textarea = await page.locator('textarea[placeholder="Type your message..."]');
  await textarea.click();
  await textarea.fill(message);
  await wait(500 + Math.random() * 1000); // Random delay 0.5-1.5 seconds
  await page.keyboard.press('Enter');
  await wait(2000 + Math.random() * 3000); // Wait 2-5 seconds for response
}

async function simulateConversations() {
  console.log('🎭 Starting conversation simulation with Playwright...');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for production
    slowMo: 50 // Slow down for visibility
  });
  
  try {
    // Get all organizations and their agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    if (agentsError || !agents || agents.length === 0) {
      throw new Error('No agents found');
    }
    
    console.log(`Found ${agents.length} agents to simulate conversations for`);
    
    let totalConversations = 0;
    
    // For each agent, simulate 20 conversations
    for (const agent of agents) {
      console.log(`\n📱 Simulating conversations for ${agent.name} (${agent.organizations.name})`);
      
      const conversationTypes = ['hot', 'warm', 'cold', 'nonResponsive', 'handoff'];
      const conversationsPerType = 4;
      
      for (const type of conversationTypes) {
        for (let i = 0; i < conversationsPerType; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          
          try {
            // Navigate to the agent's chat page
            await page.goto(`${BASE_URL}/chat/${agent.id}`);
            await page.waitForLoadState('networkidle');
            
            // Wait for chat interface to load
            await page.waitForSelector('textarea[placeholder="Type your message..."]', { timeout: 10000 });
            
            // Get conversation template
            const template = conversationTemplates[type][i % conversationTemplates[type].length];
            
            console.log(`  📝 Starting ${type} conversation #${i + 1}`);
            
            // Send each message in the conversation
            for (const message of template.messages) {
              await typeMessage(page, message);
            }
            
            // Wait a bit to ensure all messages are processed
            await wait(3000);
            
            totalConversations++;
            console.log(`  ✅ Completed ${type} conversation #${i + 1}`);
            
          } catch (error) {
            console.error(`  ❌ Error in ${type} conversation #${i + 1}:`, error.message);
          } finally {
            await context.close();
          }
          
          // Small delay between conversations
          await wait(2000);
        }
      }
    }
    
    console.log(`\n📊 Simulation Summary:`);
    console.log(`✅ Simulated ${totalConversations} conversations total`);
    console.log(`   - ${agents.length} agents`);
    console.log(`   - 20 conversations per agent`);
    console.log(`   - 5 different conversation types`);
    
  } catch (error) {
    console.error('❌ Simulation error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Alternative function for headless simulation (faster)
async function simulateConversationsHeadless() {
  console.log('🎭 Starting headless conversation simulation...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Get all agents
    const { data: agents } = await supabase
      .from('agents')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    const conversationPromises = [];
    
    for (const agent of agents) {
      const types = ['hot', 'warm', 'cold', 'nonResponsive', 'handoff'];
      
      for (const type of types) {
        for (let i = 0; i < 4; i++) {
          conversationPromises.push(
            simulateSingleConversation(browser, agent, type, i)
          );
        }
      }
    }
    
    // Run conversations in parallel (with concurrency limit)
    const results = await Promise.allSettled(conversationPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`\n📊 Simulation Complete:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
  } finally {
    await browser.close();
  }
}

async function simulateSingleConversation(browser, agent, type, index) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(`${BASE_URL}/chat/${agent.id}`);
    await page.waitForSelector('textarea[placeholder="Type your message..."]', { timeout: 10000 });
    
    const template = conversationTemplates[type][index % conversationTemplates[type].length];
    
    for (const message of template.messages) {
      await typeMessage(page, message);
    }
    
    await wait(2000);
    console.log(`✅ ${agent.name}: ${type} conversation #${index + 1}`);
    
  } finally {
    await context.close();
  }
}

// Run if called directly
if (require.main === module) {
  const mode = process.argv[2] || 'visible';
  
  if (mode === 'headless') {
    simulateConversationsHeadless().then(() => {
      console.log('\n🎉 Conversation simulation completed!');
      process.exit(0);
    }).catch((error) => {
      console.error('❌ Simulation failed:', error);
      process.exit(1);
    });
  } else {
    simulateConversations().then(() => {
      console.log('\n🎉 Conversation simulation completed!');
      process.exit(0);
    }).catch((error) => {
      console.error('❌ Simulation failed:', error);
      process.exit(1);
    });
  }
}

module.exports = { simulateConversations, simulateConversationsHeadless };