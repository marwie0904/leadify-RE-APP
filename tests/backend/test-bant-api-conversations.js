const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

// 5 Different BANT conversation scenarios
const CONVERSATIONS = [
  {
    name: 'Standard Residency Flow',
    messages: [
      { input: 'Hi, I am looking for a property', expectBANT: true, stage: 'initial' },
      { input: '35M', expectBANT: true, stage: 'budget' },
      { input: 'yes', expectBANT: true, stage: 'authority' },
      { input: 'residency', expectBANT: true, stage: 'need' },
      { input: 'next month', expectBANT: true, stage: 'timeline' },
      { input: 'John Smith, 555-1234', expectBANT: true, stage: 'contact' }
    ]
  },
  {
    name: 'Investment Property Flow',
    messages: [
      { input: 'Looking to invest in real estate', expectBANT: true, stage: 'initial' },
      { input: '20 Million', expectBANT: true, stage: 'budget' },
      { input: "I'm the decision maker", expectBANT: true, stage: 'authority' },
      { input: 'investment', expectBANT: true, stage: 'need' },
      { input: 'Q1 2025', expectBANT: true, stage: 'timeline' },
      { input: 'Sarah Johnson, sarah@company.com', expectBANT: true, stage: 'contact' }
    ]
  },
  {
    name: 'Rental Property with Range Budget',
    messages: [
      { input: 'I want to buy a property', expectBANT: true, stage: 'initial' },
      { input: '10M to 15M', expectBANT: true, stage: 'budget' },
      { input: 'my company decides', expectBANT: true, stage: 'authority' },
      { input: 'rental income', expectBANT: true, stage: 'need' },
      { input: '3 months', expectBANT: true, stage: 'timeline' },
      { input: 'Mike Brown 09171234567', expectBANT: true, stage: 'contact' }
    ]
  },
  {
    name: 'Personal Use with Joint Decision',
    messages: [
      { input: 'Interested in properties', expectBANT: true, stage: 'initial' },
      { input: 'around 25 million', expectBANT: true, stage: 'budget' },
      { input: 'me and my spouse', expectBANT: true, stage: 'authority' },
      { input: 'for living', expectBANT: true, stage: 'need' },
      { input: 'ASAP', expectBANT: true, stage: 'timeline' },
      { input: 'contact me at 555-9876', expectBANT: true, stage: 'contact' }
    ]
  },
  {
    name: 'Mixed Answers and Edge Cases',
    messages: [
      { input: 'show me properties', expectBANT: true, stage: 'initial' },
      { input: '$15Mil', expectBANT: true, stage: 'budget' },
      { input: 'no, need approval', expectBANT: true, stage: 'authority' },
      { input: 'personal residence', expectBANT: true, stage: 'need' },
      { input: 'within 6 months', expectBANT: true, stage: 'timeline' },
      { input: 'Anna Lee, anna.lee@gmail.com', expectBANT: true, stage: 'contact' }
    ]
  }
];

// Helper function to analyze AI response
function analyzeResponse(response, stage) {
  const patterns = {
    budget: /budget|how much|price range|afford|spend/i,
    authority: /decision|authority|who.*making|approval|purchase decision/i,
    need: /purpose|need|looking for|type.*property|primary use/i,
    timeline: /when|timeline|purchase|move|buy|planning/i,
    contact: /contact|phone|email|name|reach|information/i,
    complete: /thank|information.*need|prepare|options|contact.*soon|best.*options/i
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.test(response)) {
      return key;
    }
  }
  
  // Check for error responses
  if (/unfortunately|not trained|cannot/i.test(response)) {
    return 'error';
  }
  
  return 'unknown';
}

async function testConversations() {
  console.log('🚀 Testing 5 Full BANT Conversations via API');
  console.log('=' . repeat(60));
  
  const results = [];
  
  // Check server
  try {
    const health = await axios.get(`${API_URL}/api/health`);
    console.log('✅ Server is running:', health.data.status);
  } catch (error) {
    console.error('❌ Server is not running');
    return;
  }
  
  // Get agent info using Supabase
  const supabase = require('@supabase/supabase-js').createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', '8ad6ed68-ac60-4483-b22d-e6747727971b')
    .limit(1);
  
  if (!agents || agents.length === 0) {
    console.error('❌ No agents found');
    return;
  }
  
  const agent = agents[0];
  console.log(`✅ Using agent: ${agent.name} (${agent.id})\n`);
  
  // Test each conversation
  for (let convIndex = 0; convIndex < CONVERSATIONS.length; convIndex++) {
    const conversation = CONVERSATIONS[convIndex];
    const conversationId = uuidv4();
    const convResult = {
      name: conversation.name,
      conversationId: conversationId,
      messages: [],
      success: true,
      classificationLog: []
    };
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 CONVERSATION ${convIndex + 1}: ${conversation.name}`);
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`${'='.repeat(60)}`);
    
    // Send each message
    for (let msgIndex = 0; msgIndex < conversation.messages.length; msgIndex++) {
      const message = conversation.messages[msgIndex];
      const messageResult = {
        input: message.input,
        stage: message.stage,
        expectBANT: message.expectBANT,
        response: '',
        classification: '',
        nextQuestion: '',
        success: false
      };
      
      console.log(`\n  💬 Message ${msgIndex + 1} (${message.stage}): "${message.input}"`);
      
      try {
        // Prepare the request
        const requestBody = {
          message: message.input,
          conversationId: conversationId,
          agentId: agent.id,
          source: 'web',
          userId: '8ad6ed68-ac60-4483-b22d-e6747727971b'
        };
        
        // Send message
        const response = await axios.post(
          `${API_URL}/api/chat`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': '8ad6ed68-ac60-4483-b22d-e6747727971b'
            },
            timeout: 15000
          }
        );
        
        const aiResponse = response.data.response || '';
        messageResult.response = aiResponse.substring(0, 150);
        
        // Analyze what the AI is asking next
        const nextStage = analyzeResponse(aiResponse, message.stage);
        messageResult.nextQuestion = nextStage;
        
        // Determine if classification was correct
        if (nextStage === 'error') {
          console.log(`     ❌ ERROR: AI gave error response (likely classified as Embeddings)`);
          console.log(`        Response: "${aiResponse.substring(0, 100)}..."`);
          messageResult.success = false;
          convResult.success = false;
        } else {
          console.log(`     ✅ AI responded, asking about: ${nextStage}`);
          messageResult.success = true;
          
          // Special check for "residency" - the critical test
          if (message.input.toLowerCase() === 'residency' && nextStage === 'error') {
            console.log(`     🚨 CRITICAL FAIL: "residency" misclassified!`);
            convResult.success = false;
          }
        }
        
      } catch (error) {
        console.log(`     ⚠️ Request error: ${error.message}`);
        messageResult.response = error.message;
        convResult.success = false;
      }
      
      convResult.messages.push(messageResult);
      
      // Wait before next message
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    results.push(convResult);
  }
  
  // Print detailed results
  console.log('\n' + '='.repeat(60));
  console.log('📊 DETAILED TEST RESULTS');
  console.log('='.repeat(60));
  
  let totalSuccess = 0;
  let totalFailed = 0;
  let residencySuccess = 0;
  let residencyFailed = 0;
  
  results.forEach((conv, index) => {
    console.log(`\n${index + 1}. ${conv.name}:`);
    console.log(`   Conversation ID: ${conv.conversationId}`);
    
    if (conv.success) {
      console.log('   ✅ All messages processed correctly');
      totalSuccess++;
    } else {
      console.log('   ❌ Some messages failed');
      totalFailed++;
    }
    
    // Check specifically for residency
    const residencyMsg = conv.messages.find(m => 
      m.input.toLowerCase().includes('residency') || 
      m.input.toLowerCase().includes('residence')
    );
    
    if (residencyMsg) {
      if (residencyMsg.success) {
        console.log('   ✅ "residency/residence" classified correctly as BANT');
        residencySuccess++;
      } else {
        console.log('   ❌ "residency/residence" misclassified');
        residencyFailed++;
      }
    }
    
    // Show failed messages
    const failures = conv.messages.filter(m => !m.success);
    if (failures.length > 0) {
      console.log('   Failed messages:');
      failures.forEach(msg => {
        console.log(`     - "${msg.input}" (${msg.stage})`);
      });
    }
  });
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Overall Success: ${totalSuccess}/${CONVERSATIONS.length} conversations`);
  console.log(`Success Rate: ${(totalSuccess / CONVERSATIONS.length * 100).toFixed(1)}%`);
  console.log(`\nResidency Classification:`);
  console.log(`  ✅ Correct: ${residencySuccess}`);
  console.log(`  ❌ Failed: ${residencyFailed}`);
  
  if (totalSuccess === CONVERSATIONS.length) {
    console.log('\n🎉 EXCELLENT: All BANT conversations working perfectly!');
  } else if (totalSuccess >= 3) {
    console.log('\n⚠️ GOOD: Most conversations working, some issues remain');
  } else {
    console.log('\n❌ NEEDS WORK: Multiple conversation failures detected');
  }
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('test-bant-api-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to: test-bant-api-results.json');
  
  // Check logs
  console.log('\n💡 To see classification details:');
  console.log('   grep "MASTER INTENT" server-new.log | tail -100');
  console.log('   grep "residency" server-new.log | tail -20');
}

// Run the test
testConversations().catch(console.error);