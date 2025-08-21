const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';
const USER_ID = '8ad6ed68-ac60-4483-b22d-e6747727971b';
const AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';

// 5 Different BANT conversation variations
const CONVERSATION_SCENARIOS = [
  {
    name: 'Budget with "million" word',
    conversationId: null, // Will be set to existing conversation
    messages: [
      { message: 'Hi, I need help finding a property', stage: 'initial' },
      { message: '15 million pesos', stage: 'budget' },
      { message: 'yes I can decide', stage: 'authority' },
      { message: 'for residency', stage: 'need' },
      { message: 'within 2 months', stage: 'timeline' },
      { message: 'Maria Santos, 09171234567', stage: 'contact' }
    ]
  },
  {
    name: 'Joint authority with spouse',
    conversationId: null,
    messages: [
      { message: 'Looking for real estate options', stage: 'initial' },
      { message: '20M to 25M', stage: 'budget' },
      { message: 'me and my wife decide together', stage: 'authority' },
      { message: 'personal use', stage: 'need' },
      { message: 'ASAP', stage: 'timeline' },
      { message: 'Juan Cruz, juan@email.com', stage: 'contact' }
    ]
  },
  {
    name: 'Investment property flow',
    conversationId: null,
    messages: [
      { message: 'I want to invest in property', stage: 'initial' },
      { message: 'around 30 million', stage: 'budget' },
      { message: 'I need board approval', stage: 'authority' },
      { message: 'investment purposes', stage: 'need' },
      { message: 'Q1 2025', stage: 'timeline' },
      { message: 'Robert Lee, 555-8888', stage: 'contact' }
    ]
  },
  {
    name: 'Rental income focus',
    conversationId: null,
    messages: [
      { message: 'Show me available properties', stage: 'initial' },
      { message: '10-12M budget', stage: 'budget' },
      { message: 'my company makes the decision', stage: 'authority' },
      { message: 'rental income', stage: 'need' },
      { message: '3-6 months', stage: 'timeline' },
      { message: 'Contact me at sarah.j@company.com', stage: 'contact' }
    ]
  },
  {
    name: 'Mixed formats and variations',
    conversationId: null,
    messages: [
      { message: 'interested in buying', stage: 'initial' },
      { message: '$18Million', stage: 'budget' },
      { message: 'no, I need to consult my partner', stage: 'authority' },
      { message: 'vacation home', stage: 'need' },
      { message: 'by end of year', stage: 'timeline' },
      { message: 'Ana Garcia 0917-555-1234', stage: 'contact' }
    ]
  }
];

// Use existing conversation IDs (you mentioned these exist)
const EXISTING_CONVERSATIONS = [
  '9826beca-4d97-4b51-9170-4515fbcc096c',
  'cb2a2e2d-fcb0-4a08-8be1-b6538dbd4ae6',
  'ea3c4017-9ab7-4db2-9449-ff5067b360d5',
  '445986b1-5feb-4dc2-9edb-8617764166ce',
  'b4cd926c-a0f5-4a8b-8292-75a190805920'
];

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
  console.log(`📝 Conversation ID: ${scenario.conversationId}`);
  
  const results = [];
  let allBANT = true;
  let criticalTests = {
    budget: false,
    authority: false,
    need: false,
    timeline: false
  };
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const test = scenario.messages[i];
    console.log(`\n📬 Message ${i + 1}/${scenario.messages.length}: "${test.message}"`);
    console.log(`   Stage: ${test.stage}`);
    
    try {
      const startTime = Date.now();
      const response = await sendMessage(scenario.conversationId, test.message);
      const responseTime = Date.now() - startTime;
      
      const intent = response.intent || 'unknown';
      const aiResponse = response.response || '';
      
      console.log(`   ⏱️ Response time: ${responseTime}ms`);
      console.log(`   🎯 Intent: ${intent}`);
      
      // Check if BANT was correctly identified
      if (intent === 'BANT') {
        console.log(`   ✅ Correctly classified as BANT`);
        
        // Track critical BANT stages
        if (test.stage === 'budget') criticalTests.budget = true;
        if (test.stage === 'authority') criticalTests.authority = true;
        if (test.stage === 'need') criticalTests.need = true;
        if (test.stage === 'timeline') criticalTests.timeline = true;
        
        // Special checks for variations
        if (test.stage === 'budget' && test.message.toLowerCase().includes('million')) {
          console.log(`   ✅ Budget with "million" word handled correctly`);
        }
        if (test.stage === 'authority' && (test.message.includes('wife') || test.message.includes('spouse'))) {
          console.log(`   ✅ Joint authority handled correctly`);
        }
        if (test.stage === 'need' && (test.message.includes('residency') || test.message.includes('investment') || test.message.includes('rental'))) {
          console.log(`   ✅ Need type "${test.message}" handled correctly`);
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
        allBANT = false;
        
        results.push({
          message: test.message,
          stage: test.stage,
          intent: intent,
          success: false,
          responseTime: responseTime
        });
      }
      
      // Show AI response preview
      const responsePreview = aiResponse.substring(0, 80);
      console.log(`   💬 Response: "${responsePreview}..."`);
      
      // Check for error responses
      if (aiResponse.includes('unfortunately') || aiResponse.includes('not trained')) {
        console.log(`   ⚠️ AI returned error response (possible misclassification)`);
        allBANT = false;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      allBANT = false;
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
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / (results.filter(r => r.responseTime).length || 1);
  
  console.log(`\n📊 Scenario Summary:`);
  console.log(`   Success Rate: ${successCount}/${scenario.messages.length} messages`);
  console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`   Critical BANT Stages:`);
  console.log(`     Budget: ${criticalTests.budget ? '✅' : '❌'}`);
  console.log(`     Authority: ${criticalTests.authority ? '✅' : '❌'}`);
  console.log(`     Need: ${criticalTests.need ? '✅' : '❌'}`);
  console.log(`     Timeline: ${criticalTests.timeline ? '✅' : '❌'}`);
  
  if (allBANT) {
    console.log(`   ✅ SCENARIO PASSED - All messages classified correctly`);
  } else {
    console.log(`   ❌ SCENARIO FAILED - Some messages misclassified`);
  }
  
  return {
    name: scenario.name,
    conversationId: scenario.conversationId,
    success: allBANT,
    successRate: `${successCount}/${scenario.messages.length}`,
    avgResponseTime: Math.round(avgResponseTime),
    criticalTests: criticalTests,
    results: results
  };
}

async function runVariationTests() {
  console.log('🚀 BANT VARIATION TESTS');
  console.log('Testing 5 different conversation scenarios with varying answers');
  console.log('=' . repeat(70));
  
  // Assign conversation IDs to scenarios
  for (let i = 0; i < CONVERSATION_SCENARIOS.length; i++) {
    CONVERSATION_SCENARIOS[i].conversationId = EXISTING_CONVERSATIONS[i % EXISTING_CONVERSATIONS.length];
  }
  
  const testResults = [];
  
  for (let i = 0; i < CONVERSATION_SCENARIOS.length; i++) {
    const result = await testScenario(CONVERSATION_SCENARIOS[i], i + 1);
    testResults.push(result);
    
    // Update todo list
    console.log(`\n✅ Completed test for: ${CONVERSATION_SCENARIOS[i].name}`);
    
    // Delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(70));
  
  const passedScenarios = testResults.filter(r => r.success).length;
  const totalMessages = testResults.reduce((sum, r) => sum + r.results.length, 0);
  const successfulMessages = testResults.reduce((sum, r) => sum + r.results.filter(m => m.success).length, 0);
  const avgResponseTime = testResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / testResults.length;
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   Scenarios Passed: ${passedScenarios}/${CONVERSATION_SCENARIOS.length}`);
  console.log(`   Messages Success Rate: ${successfulMessages}/${totalMessages} (${Math.round(successfulMessages/totalMessages*100)}%)`);
  console.log(`   Average Response Time: ${Math.round(avgResponseTime)}ms`);
  
  console.log(`\n📋 Scenario Results:`);
  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Scenario ${index + 1}: ${result.name}`);
    console.log(`   Success Rate: ${result.successRate}`);
    console.log(`   Avg Response: ${result.avgResponseTime}ms`);
    console.log(`   BANT Coverage: B:${result.criticalTests.budget ? '✓' : '✗'} A:${result.criticalTests.authority ? '✓' : '✗'} N:${result.criticalTests.need ? '✓' : '✗'} T:${result.criticalTests.timeline ? '✓' : '✗'}`);
  });
  
  // Key variation tests
  console.log(`\n🔍 Key Variation Tests:`);
  const budgetVariations = testResults.filter(r => r.name.includes('million')).every(r => r.criticalTests.budget);
  const authorityVariations = testResults.filter(r => r.name.includes('spouse') || r.name.includes('authority')).every(r => r.criticalTests.authority);
  const needVariations = testResults.every(r => r.criticalTests.need);
  
  console.log(`   Budget variations (15 million, $18Million, etc.): ${budgetVariations ? '✅ WORKING' : '❌ ISSUES'}`);
  console.log(`   Authority variations (wife, partner, board): ${authorityVariations ? '✅ WORKING' : '❌ ISSUES'}`);
  console.log(`   Need variations (residency, investment, rental): ${needVariations ? '✅ WORKING' : '❌ ISSUES'}`);
  
  // Overall verdict
  console.log('\n' + '='.repeat(70));
  if (passedScenarios === CONVERSATION_SCENARIOS.length) {
    console.log('🏆 COMPLETE SUCCESS - All BANT variations handled perfectly!');
  } else if (passedScenarios >= 3) {
    console.log('✅ GOOD PERFORMANCE - Most variations working correctly');
  } else {
    console.log('⚠️ NEEDS ATTENTION - Multiple variations failing');
  }
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'test-bant-variations-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      overallSuccess: passedScenarios === CONVERSATION_SCENARIOS.length,
      passedScenarios: `${passedScenarios}/${CONVERSATION_SCENARIOS.length}`,
      messageSuccessRate: `${successfulMessages}/${totalMessages}`,
      avgResponseTime: Math.round(avgResponseTime),
      scenarios: testResults
    }, null, 2)
  );
  console.log('\n📄 Detailed results saved to test-bant-variations-results.json');
}

// Run the variation tests
runVariationTests().catch(console.error);