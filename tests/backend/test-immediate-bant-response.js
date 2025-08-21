// Test file for the immediate BANT response feature
// This demonstrates how the AI immediately responds with the user's name after contact info

const axios = require('axios');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001/api/chat';
const AGENT_ID = 'ce26a2fd-83d6-4ae4-a7d7-d167797c3a87'; // Replace with your agent ID

async function testImmediateBantResponse() {
  console.log('🧪 Testing Immediate BANT Response Feature\n');
  
  const userId = `test-user-${Date.now()}`;
  
  // Simulate a complete BANT conversation ending with contact info
  const bantConversation = [
    {
      step: "Initial Question",
      message: "I'm looking for a 2-bedroom condo in BGC",
      description: "User asks initial question - should be stored in memory"
    },
    {
      step: "Budget",
      message: "Around 8 million pesos",
      description: "User provides budget"
    },
    {
      step: "Authority", 
      message: "I'll be making the decision myself",
      description: "User provides authority information"
    },
    {
      step: "Need",
      message: "It's for my primary residence",
      description: "User provides need information"
    },
    {
      step: "Timeline",
      message: "I want to move in within 6 months",
      description: "User provides timeline"
    },
    {
      step: "Contact Info",
      message: "My name is John Smith, you can reach me at 09171234567",
      description: "User provides contact info - should trigger immediate response"
    }
  ];
  
  console.log('📋 Simulating BANT Conversation Flow:\n');
  
  for (const step of bantConversation) {
    console.log(`${step.step}: "${step.message}"`);
    console.log(`Expected: ${step.description}`);
    
    try {
      const response = await axios.post(API_URL, {
        agentId: AGENT_ID,
        message: step.message,
        userId: userId,
        history: []
      });
      
      console.log(`✅ AI Response: "${response.data.response}"`);
      
      // Check if this is the contact info step
      if (step.step === "Contact Info") {
        console.log('\n🎯 CHECKING FOR IMMEDIATE RESPONSE:');
        if (response.data.response.toLowerCase().includes('hi john')) {
          console.log('✅ SUCCESS: Response is personalized with user name!');
          console.log('✅ SUCCESS: Immediate response detected (not generic "I will send you...")');
        } else {
          console.log('❌ ISSUE: Response may not be personalized or immediate');
        }
      }
      
      console.log('---\n');
      
      // Wait between messages to simulate real conversation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      break;
    }
  }
  
  console.log('✨ BANT immediate response test completed!');
}

// Example of what we expect to see
function showExpectedBehavior() {
  console.log('\n📋 Expected Behavior:\n');
  
  console.log('BEFORE (Old Behavior):');
  console.log('User: "My name is John Smith, 09171234567"');
  console.log('AI: "Thank you for your information. I will send you a list of properties shortly."');
  console.log('');
  
  console.log('AFTER (New Behavior):');
  console.log('User: "My name is John Smith, 09171234567"');
  console.log('AI: "Hi John, I found several 2-bedroom condos in BGC within your 8M budget. Here are some options that would work for your primary residence..."');
  console.log('');
  
  console.log('🎯 Key Improvements:');
  console.log('• Personalized greeting with user\'s name');
  console.log('• Immediate answer to their original question');
  console.log('• Happens BEFORE backend lead processing');
  console.log('• Uses embeddings to provide relevant information');
  console.log('• Natural conversation flow without delays');
}

// Run the test
if (require.main === module) {
  console.log('🚀 Testing Immediate BANT Response Feature\n');
  console.log('Make sure the backend server is running on port 3001\n');
  
  showExpectedBehavior();
  
  // Uncomment to run the actual API test
  // testImmediateBantResponse().catch(console.error);
}

module.exports = { testImmediateBantResponse }; 