const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';
const USER_ID = '8ad6ed68-ac60-4483-b22d-e6747727971b';
const AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';

// 5 Different BANT conversation scenarios
const TEST_SCENARIOS = [
  {
    name: 'Standard Residency Flow',
    messages: [
      { message: 'I am looking for a property', stage: 'initial' },
      { message: '35M', stage: 'budget' },
      { message: 'yes', stage: 'authority' },
      { message: 'residency', stage: 'need' },
      { message: 'next month', stage: 'timeline' },
      { message: 'John Smith, 555-1234', stage: 'contact' }
    ]
  },
  {
    name: 'Investment Property Flow',
    messages: [
      { message: 'Looking to invest in real estate', stage: 'initial' },
      { message: '20 Million', stage: 'budget' },
      { message: "I'm the decision maker", stage: 'authority' },
      { message: 'investment', stage: 'need' },
      { message: 'Q1 2025', stage: 'timeline' },
      { message: 'Sarah Johnson, sarah@company.com', stage: 'contact' }
    ]
  },
  {
    name: 'Rental Property with Range Budget',
    messages: [
      { message: 'I want to buy a property', stage: 'initial' },
      { message: '10M to 15M', stage: 'budget' },
      { message: 'my company decides', stage: 'authority' },
      { message: 'rental income', stage: 'need' },
      { message: '3 months', stage: 'timeline' },
      { message: 'Mike Brown 09171234567', stage: 'contact' }
    ]
  },
  {
    name: 'Personal Use with Joint Decision',
    messages: [
      { message: 'Interested in properties', stage: 'initial' },
      { message: 'around 25 million', stage: 'budget' },
      { message: 'me and my spouse', stage: 'authority' },
      { message: 'for living', stage: 'need' },
      { message: 'ASAP', stage: 'timeline' },
      { message: 'contact me at 555-9876', stage: 'contact' }
    ]
  },
  {
    name: 'Edge Cases and Variations',
    messages: [
      { message: 'show me properties', stage: 'initial' },
      { message: '$15Mil', stage: 'budget' },
      { message: 'no, need approval', stage: 'authority' },
      { message: 'personal residence', stage: 'need' },
      { message: 'within 6 months', stage: 'timeline' },
      { message: 'Anna Lee, anna.lee@gmail.com', stage: 'contact' }
    ]
  }
];

async function createConversation() {
  try {
    const response = await axios.post(
      `${API_URL}/api/conversations`,
      {
        agentId: AGENT_ID,
        source: 'web'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        }
      }
    );
    return response.data.id;
  } catch (error) {
    console.error('Failed to create conversation:', error.message);
    return null;
  }
}

async function sendMessage(conversationId, message, timeout = 30000) {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: message,
        conversationId: conversationId,
        agentId: AGENT_ID,
        source: 'web',
        userId: USER_ID
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': USER_ID
        },
        timeout: timeout
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function testScenario(scenario, scenarioNum) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 SCENARIO ${scenarioNum}: ${scenario.name}`);
  console.log('='.repeat(70));
  
  // Create new conversation for this scenario
  const conversationId = await createConversation();
  if (!conversationId) {
    console.log('❌ Failed to create conversation');
    return { name: scenario.name, success: false, error: 'Failed to create conversation' };
  }
  
  console.log(`📝 Conversation ID: ${conversationId}`);
  
  const results = [];
  let allSuccess = true;
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const test = scenario.messages[i];
    console.log(`\n📬 Message ${i + 1}/${scenario.messages.length}: "${test.message}"`);
    console.log(`   Stage: ${test.stage}`);
    
    try {
      const startTime = Date.now();
      const response = await sendMessage(conversationId, test.message);
      const responseTime = Date.now() - startTime;
      
      const intent = response.intent || 'unknown';
      const aiResponse = response.response || '';
      
      console.log(`   ✅ Sent successfully (${responseTime}ms)`);
      console.log(`   🎯 Intent: ${intent}`);
      
      // Check if BANT was correctly identified
      if (intent === 'BANT') {
        console.log(`   ✅ Correctly classified as BANT`);
        
        // Special check for "residency"
        if (test.message === 'residency') {
          console.log(`   🎉 SUCCESS: "residency" correctly classified as BANT!`);
        }
        
        results.push({
          message: test.message,
          stage: test.stage,
          intent: intent,
          success: true,
          responseTime: responseTime
        });
      } else {
        console.log(`   ❌ Misclassified as: ${intent}`);
        allSuccess = false;
        
        if (test.message === 'residency') {
          console.log(`   🚨 CRITICAL: "residency" misclassified!`);
        }
        
        results.push({
          message: test.message,
          stage: test.stage,
          intent: intent,
          success: false,
          responseTime: responseTime
        });
      }
      
      // Show AI response preview
      console.log(`   💬 Response: "${aiResponse.substring(0, 80)}..."`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allSuccess = false;
      results.push({
        message: test.message,
        stage: test.stage,
        error: error.message,
        success: false
      });
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Scenario summary
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 Scenario Summary: ${successCount}/${scenario.messages.length} messages successful`);
  
  if (allSuccess) {
    console.log('✅ SCENARIO PASSED - All messages classified correctly');
  } else {
    console.log('❌ SCENARIO FAILED - Some messages misclassified');
  }
  
  return {
    name: scenario.name,
    conversationId: conversationId,
    success: allSuccess,
    results: results
  };
}

async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE BANT CLASSIFICATION TEST');
  console.log('Testing 5 different conversation scenarios');
  console.log('=' . repeat(70));
  
  const testResults = [];
  
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const result = await testScenario(TEST_SCENARIOS[i], i + 1);
    testResults.push(result);
    
    // Delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passedScenarios = testResults.filter(r => r.success).length;
  console.log(`\n✅ Passed Scenarios: ${passedScenarios}/${TEST_SCENARIOS.length}`);
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Scenario ${index + 1}: ${result.name}`);
    if (result.conversationId) {
      console.log(`   Conversation: ${result.conversationId}`);
    }
  });
  
  // Check for critical residency classification
  let residencyWorking = true;
  testResults.forEach(result => {
    if (result.results) {
      const residencyTest = result.results.find(r => 
        r.message && (r.message.includes('residency') || r.message.includes('residence'))
      );
      if (residencyTest && !residencyTest.success) {
        residencyWorking = false;
      }
    }
  });
  
  if (residencyWorking) {
    console.log('\n🎉 SUCCESS: "residency" classification is working correctly!');
  } else {
    console.log('\n🚨 ISSUE: "residency" classification needs attention');
  }
  
  if (passedScenarios === TEST_SCENARIOS.length) {
    console.log('\n🏆 ALL TESTS PASSED - BANT Classification fully functional!');
  } else if (passedScenarios >= 3) {
    console.log('\n⚠️ PARTIAL SUCCESS - Most scenarios working');
  } else {
    console.log('\n❌ TESTS FAILED - BANT Classification needs fixes');
  }
  
  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    'test-bant-results.json',
    JSON.stringify(testResults, null, 2)
  );
  console.log('\n📄 Detailed results saved to test-bant-results.json');
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);