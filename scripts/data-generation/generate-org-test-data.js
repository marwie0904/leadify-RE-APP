// Generate test data for specific organization
const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Configuration - using the agent ID from our logs
const CONFIG = {
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  agentId: '11e71600-a372-42ad-8123-dd450cf5cce1', // From the test logs
  iterations: 5 // Number of test conversations to create
};

// Different conversation scenarios
const CONVERSATION_TEMPLATES = [
  {
    name: "High-Value BANT Qualified Lead",
    messages: [
      "Hello, I'm interested in purchasing investment properties",
      "My budget is between $800,000 and $1.2 million",
      "I'm the managing partner of our investment firm with full decision authority",
      "We need properties with high rental yield in growing neighborhoods",
      "We're looking to close on 2-3 properties within the next 60 days"
    ]
  },
  {
    name: "Medium BANT Lead",
    messages: [
      "Hi, I'm looking for my first home",
      "I can afford around $400,000",
      "It's just me and my wife making this decision together",
      "We need a 3-bedroom house with a backyard for our kids",
      "We'd like to move in before the school year starts in September"
    ]
  },
  {
    name: "Low BANT Lead",
    messages: [
      "Just browsing your properties",
      "Not sure about budget yet",
      "I need to discuss with family first",
      "Just seeing what's available",
      "Maybe sometime next year"
    ]
  },
  {
    name: "Technical Support Issue",
    messages: [
      "I'm having issues with your website",
      "The property search is not working",
      "I can't filter by price range",
      "Also the map view keeps freezing",
      "Can someone help me with this?"
    ]
  },
  {
    name: "Feature Request",
    messages: [
      "Do you have virtual tours available?",
      "It would be great to see 360 degree views",
      "Can you add mortgage calculator?",
      "Also school district information would be helpful",
      "These features would really improve the experience"
    ]
  }
];

// Generate realistic delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send a single message in a conversation
async function sendMessage(message, agentId, conversationId, userId, source) {
  try {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message,
      agentId,
      conversationId,
      userId,
      source
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    return {
      success: true,
      conversationId: response.data.conversationId,
      response: response.data.response || response.data.message,
      intent: response.data.intent
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a full conversation
async function createConversation(template, index) {
  const userId = `test-user-${Date.now()}-${index}`;
  const source = ['web', 'facebook', 'embed', 'api'][index % 4];
  
  console.log(`\n🎯 Starting: ${template.name}`);
  console.log(`   User: ${userId} | Source: ${source}`);
  
  let conversationId = null;
  const results = [];
  
  for (let i = 0; i < template.messages.length; i++) {
    const message = template.messages[i];
    console.log(`   [${i+1}/${template.messages.length}] Sending: "${message.substring(0, 40)}..."`);
    
    const result = await sendMessage(
      message,
      CONFIG.agentId,
      conversationId,
      userId,
      source
    );
    
    if (result.success) {
      conversationId = result.conversationId;
      console.log(`   ✓ AI Response: "${result.response.substring(0, 60)}..."`);
      results.push(result);
    } else {
      console.log(`   ✗ Error: ${result.error}`);
    }
    
    // Realistic delay between messages
    await delay(2000 + Math.random() * 2000);
  }
  
  return {
    template: template.name,
    userId,
    source,
    messageCount: results.length,
    conversationId
  };
}

// Main execution
async function generateTestData() {
  console.log('='.repeat(70));
  console.log('🚀 TEST DATA GENERATION FOR ORGANIZATION');
  console.log('='.repeat(70));
  console.log(`Organization: ${CONFIG.organizationId}`);
  console.log(`Agent: ${CONFIG.agentId}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  const results = [];
  
  // Create multiple conversations
  for (let i = 0; i < CONFIG.iterations; i++) {
    const template = CONVERSATION_TEMPLATES[i % CONVERSATION_TEMPLATES.length];
    const result = await createConversation(template, i);
    results.push(result);
    
    if (i < CONFIG.iterations - 1) {
      console.log('\n⏳ Waiting before next conversation...');
      await delay(3000);
    }
  }
  
  // Summary
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 GENERATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Conversations created: ${results.length}`);
  console.log(`💬 Total messages sent: ${results.reduce((sum, r) => sum + r.messageCount, 0)}`);
  console.log(`⏱️ Time taken: ${duration.toFixed(2)} seconds`);
  console.log('\nConversation breakdown:');
  
  const sourceCount = {};
  results.forEach(r => {
    sourceCount[r.source] = (sourceCount[r.source] || 0) + 1;
  });
  
  Object.entries(sourceCount).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} conversations`);
  });
  
  console.log('\n✨ Test data generation complete!');
  console.log('Visit http://localhost:3000/admin/organizations/' + CONFIG.organizationId);
  console.log('to see the generated data in the dashboard.');
}

// Run the generator
generateTestData()
  .then(() => {
    console.log('\n✅ Success! All test data generated.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });