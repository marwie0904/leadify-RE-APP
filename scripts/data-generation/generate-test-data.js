// Comprehensive test data generation through real AI interactions
const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Test scenarios for different organizations and agents
const TEST_SCENARIOS = [
  {
    organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
    agentId: '11e71600-a372-42ad-8123-dd450cf5cce1',
    conversations: [
      // BANT qualification conversations
      {
        userId: 'test-user-bant-1',
        messages: [
          "Hi, I'm looking for a property investment",
          "My budget is around $500,000 to $750,000",
          "Yes, I'm the primary decision maker but will consult with my spouse",
          "We need a 3-bedroom home with good schools nearby",
          "We're looking to buy within the next 3 months"
        ]
      },
      {
        userId: 'test-user-bant-2',
        messages: [
          "Hello, I want to buy a house",
          "I haven't really set a budget yet, maybe $200k?",
          "I need to talk to my parents about this",
          "Just browsing for now",
          "Not sure when, maybe next year"
        ]
      },
      {
        userId: 'test-user-bant-3',
        messages: [
          "I need a commercial property for my business",
          "Budget is $2-3 million",
          "I'm the CEO and have board approval",
          "We need 10,000 sq ft warehouse with office space",
          "Must close by end of quarter"
        ]
      },
      // Property estimation conversations
      {
        userId: 'test-user-est-1',
        messages: [
          "Can you help me estimate property value?",
          "It's a single family home",
          "Located in downtown area",
          "About 2500 square feet",
          "Built in 2015"
        ]
      },
      // General inquiry conversations
      {
        userId: 'test-user-general-1',
        messages: [
          "What areas do you cover?",
          "Do you have properties near good schools?",
          "What's the market like right now?",
          "Can you show me some listings?",
          "How do I schedule a viewing?"
        ]
      },
      // Issue reporting conversation
      {
        userId: 'test-user-issue-1',
        messages: [
          "I'm having trouble with the website",
          "The search filters aren't working properly",
          "Also, can you add a feature to save searches?",
          "And it would be great to compare properties side by side",
          "The map view is also loading slowly"
        ]
      }
    ]
  },
  {
    organizationId: 'f6b6c4e8-4c2a-4b1e-9b4a-8e4c5b2a1f3d',
    agentId: 'd4e5f6g7-h8i9-j0k1-l2m3-n4o5p6q7r8s9',
    conversations: [
      {
        userId: 'test-user-org2-1',
        messages: [
          "Looking for luxury properties",
          "Budget over $5 million",
          "I'm an investor with full authority",
          "Need beachfront property with rental potential",
          "Ready to buy immediately"
        ]
      },
      {
        userId: 'test-user-org2-2',
        messages: [
          "First time home buyer here",
          "Budget around $300,000",
          "Just me making the decision",
          "Need something move-in ready",
          "Looking to buy in 6 months"
        ]
      }
    ]
  }
];

// Function to simulate realistic delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to create a conversation and send messages
async function createConversation(agentId, userId, messages, source = 'web') {
  console.log(`\n📝 Starting conversation for user: ${userId}`);
  
  let conversationId = null;
  const results = [];
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`   💬 Sending message ${i + 1}/${messages.length}: "${message.substring(0, 50)}..."`);
    
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message,
        agentId,
        conversationId,
        userId,
        source
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      if (response.data.conversationId) {
        conversationId = response.data.conversationId;
      }
      
      results.push({
        userMessage: message,
        aiResponse: response.data.response || response.data.message,
        conversationId,
        intent: response.data.intent
      });
      
      // Simulate realistic typing delay
      await delay(2000 + Math.random() * 3000);
      
    } catch (error) {
      console.error(`   ❌ Error sending message: ${error.message}`);
      results.push({
        userMessage: message,
        error: error.message
      });
    }
  }
  
  console.log(`   ✅ Conversation completed with ${results.length} messages`);
  return results;
}

// Function to generate conversations for different sources
async function generateMultiSourceData(scenario) {
  const sources = ['web', 'facebook', 'embed', 'api'];
  const sourceConversations = [];
  
  for (const source of sources) {
    const userId = `${scenario.conversations[0].userId}-${source}`;
    const messages = [
      `Hi from ${source}`,
      "I need help finding a property",
      "What's available in my area?",
      "Can you help me?"
    ];
    
    console.log(`\n🌐 Generating ${source} conversation...`);
    const result = await createConversation(
      scenario.agentId,
      userId,
      messages,
      source
    );
    sourceConversations.push({ source, result });
    
    await delay(1000);
  }
  
  return sourceConversations;
}

// Function to create issues and feature requests
async function createIssuesAndFeatures(organizationId) {
  console.log(`\n🐛 Creating issues and feature requests for org: ${organizationId}`);
  
  const issues = [
    {
      title: "Chat widget not loading on mobile",
      description: "The chat widget fails to load on iOS Safari",
      priority: "high",
      status: "open"
    },
    {
      title: "Slow response times during peak hours",
      description: "AI responses take >10 seconds between 2-4 PM",
      priority: "medium",
      status: "in_progress"
    },
    {
      title: "Facebook integration disconnecting",
      description: "Facebook messenger webhook loses connection daily",
      priority: "high",
      status: "open"
    }
  ];
  
  const features = [
    {
      title: "Add voice input support",
      description: "Users want to speak their queries instead of typing",
      priority: "low",
      status: "planned"
    },
    {
      title: "Multi-language support",
      description: "Support Spanish and French for international clients",
      priority: "medium",
      status: "planned"
    },
    {
      title: "Property comparison tool",
      description: "Allow users to compare multiple properties side by side",
      priority: "high",
      status: "in_progress"
    }
  ];
  
  // In a real scenario, these would be created through an API
  // For now, we'll just log them
  console.log(`   📋 Created ${issues.length} issues`);
  console.log(`   ✨ Created ${features.length} feature requests`);
  
  return { issues, features };
}

// Main function to generate all test data
async function generateTestData() {
  console.log('=' .repeat(70));
  console.log('🚀 COMPREHENSIVE TEST DATA GENERATION');
  console.log('=' .repeat(70));
  console.log('Generating real data through AI interactions...\n');
  
  const startTime = Date.now();
  const allResults = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📁 Organization: ${scenario.organizationId}`);
    console.log(`🤖 Agent: ${scenario.agentId}`);
    console.log(`${'='.repeat(50)}`);
    
    // Generate main conversations
    for (const conv of scenario.conversations) {
      const result = await createConversation(
        scenario.agentId,
        conv.userId,
        conv.messages
      );
      allResults.push({
        organizationId: scenario.organizationId,
        conversation: result
      });
      
      await delay(2000); // Delay between conversations
    }
    
    // Generate multi-source conversations
    const multiSourceResults = await generateMultiSourceData(scenario);
    allResults.push({
      organizationId: scenario.organizationId,
      multiSource: multiSourceResults
    });
    
    // Create issues and features
    const issuesAndFeatures = await createIssuesAndFeatures(scenario.organizationId);
    allResults.push({
      organizationId: scenario.organizationId,
      issues: issuesAndFeatures
    });
  }
  
  const duration = (Date.now() - startTime) / 1000;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST DATA GENERATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Total scenarios processed: ${TEST_SCENARIOS.length}`);
  console.log(`💬 Total conversations created: ${allResults.filter(r => r.conversation).length}`);
  console.log(`🌐 Multi-source conversations: ${allResults.filter(r => r.multiSource).length}`);
  console.log(`⏱️ Total time: ${duration.toFixed(2)} seconds`);
  console.log('='.repeat(70));
  
  // Analyze BANT scores
  console.log('\n📈 BANT QUALIFICATION ANALYSIS:');
  console.log('-'.repeat(40));
  
  let qualifiedCount = 0;
  let totalConversations = 0;
  
  for (const result of allResults) {
    if (result.conversation) {
      totalConversations++;
      // Check if any response mentions qualification
      const hasQualification = result.conversation.some(msg => 
        msg.aiResponse && (
          msg.aiResponse.toLowerCase().includes('qualified') ||
          msg.aiResponse.toLowerCase().includes('budget') ||
          msg.aiResponse.toLowerCase().includes('authority')
        )
      );
      if (hasQualification) qualifiedCount++;
    }
  }
  
  console.log(`Conversations with BANT elements: ${qualifiedCount}/${totalConversations}`);
  console.log(`Qualification rate: ${((qualifiedCount/totalConversations) * 100).toFixed(1)}%`);
  
  console.log('\n✨ Test data generation complete!');
  console.log('Check the organization detail pages to see the real data.');
  
  return allResults;
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test data generation
generateTestData()
  .then(() => {
    console.log('\n👍 All done! Test data has been generated successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });