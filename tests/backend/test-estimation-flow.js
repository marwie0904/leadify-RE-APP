// Test file for the improved Estimation Handler
// This demonstrates how the step-by-step estimation process works

const axios = require('axios');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001/api/chat';
const AGENT_ID = 'ce26a2fd-83d6-4ae4-a7d7-d167797c3a87'; // Replace with your agent ID

async function testEstimationFlow() {
  console.log('🧪 Testing Improved Estimation Flow\n');
  
  const userId = `test-user-${Date.now()}`;
  
  // Test messages that should trigger estimation flow
  const testScenarios = [
    {
      name: "Initial Estimation Request",
      message: "I want to get an estimate for a property",
      expectedStep: 1,
      description: "Should trigger Step 1 - Property Selection"
    },
    {
      name: "Property Selection",
      message: "I'm interested in M Residences Katipunan",
      expectedStep: 2,
      description: "Should extract property and move to Step 2 - Payment Plans"
    },
    {
      name: "Payment Plan Selection",
      message: "I'll take the 5-year payment plan with 20% down",
      expectedStep: 3,
      description: "Should extract payment plan and move to Step 3 - Final Estimate"
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 ${scenario.name}`);
    console.log(`Message: "${scenario.message}"`);
    console.log(`Expected: ${scenario.description}`);
    
    try {
      const response = await axios.post(API_URL, {
        agentId: AGENT_ID,
        message: scenario.message,
        userId: userId,
        history: []
      });
      
      console.log(`✅ Response received:`);
      console.log(response.data.response.substring(0, 200) + '...\n');
      
      // Wait a bit between messages to simulate real conversation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  console.log('\n✨ Estimation flow test completed!');
}

// Example of what the memory state looks like during the process
function showMemoryExample() {
  console.log('\n📦 Example Memory State During Estimation:\n');
  
  const exampleMemory = {
    step1: {
      currentStep: 1,
      propertyName: null,
      startingPrice: null,
      paymentPlan: null,
      completed: false
    },
    step2: {
      currentStep: 2,
      propertyName: "M Residences Katipunan",
      startingPrice: "5,000,000 PHP",
      paymentPlan: null,
      completed: false
    },
    step3: {
      currentStep: 3,
      propertyName: "M Residences Katipunan",
      startingPrice: "5,000,000 PHP",
      paymentPlan: "5-year plan with 20% down payment",
      completed: true
    }
  };
  
  console.log('After Step 1:', JSON.stringify(exampleMemory.step1, null, 2));
  console.log('\nAfter Step 2:', JSON.stringify(exampleMemory.step2, null, 2));
  console.log('\nAfter Step 3:', JSON.stringify(exampleMemory.step3, null, 2));
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Estimation Handler Test\n');
  console.log('Make sure the backend server is running on port 3001\n');
  
  showMemoryExample();
  
  // Uncomment to run the actual API test
  // testEstimationFlow().catch(console.error);
}

module.exports = { testEstimationFlow }; 