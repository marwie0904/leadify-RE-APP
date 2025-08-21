const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';
const USER_ID = '8ad6ed68-ac60-4483-b22d-e6747727971b';
const AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
const CONVERSATION_ID = '9826beca-4d97-4b51-9170-4515fbcc096c';

// Test different BANT variations
const VARIATION_TESTS = [
  // Test 1: Budget variations
  { message: '15 million pesos', expected: 'BANT', stage: 'budget', description: 'Budget with "million" word' },
  { message: '$20Million', expected: 'BANT', stage: 'budget', description: 'Budget with dollar sign' },
  { message: '10M to 15M', expected: 'BANT', stage: 'budget', description: 'Budget range' },
  
  // Test 2: Authority variations
  { message: 'me and my wife decide together', expected: 'BANT', stage: 'authority', description: 'Joint authority' },
  { message: 'I need board approval', expected: 'BANT', stage: 'authority', description: 'Board approval' },
  { message: 'no, I consult with my partner', expected: 'BANT', stage: 'authority', description: 'Partner consultation' },
  
  // Test 3: Need variations
  { message: 'for residency', expected: 'BANT', stage: 'need', description: 'Residency need' },
  { message: 'investment purposes', expected: 'BANT', stage: 'need', description: 'Investment need' },
  { message: 'rental income', expected: 'BANT', stage: 'need', description: 'Rental need' },
  { message: 'vacation home', expected: 'BANT', stage: 'need', description: 'Vacation home need' },
  
  // Test 4: Timeline variations
  { message: 'ASAP', expected: 'BANT', stage: 'timeline', description: 'ASAP timeline' },
  { message: 'Q1 2025', expected: 'BANT', stage: 'timeline', description: 'Quarter timeline' },
  { message: 'within 3-6 months', expected: 'BANT', stage: 'timeline', description: 'Month range timeline' },
  { message: 'by end of year', expected: 'BANT', stage: 'timeline', description: 'Year end timeline' }
];

async function sendMessage(message, timeout = 30000) {
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: message,
        conversationId: CONVERSATION_ID,
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
    if (error.response && error.response.status === 429) {
      throw new Error('Rate limited - waiting before retry');
    }
    throw error;
  }
}

async function testVariations() {
  console.log('🚀 BANT VARIATION TESTING');
  console.log('Testing different formats and variations for each BANT stage');
  console.log('=' . repeat(70));
  console.log(`📝 Using conversation: ${CONVERSATION_ID}\n`);
  
  const results = {
    budget: [],
    authority: [],
    need: [],
    timeline: []
  };
  
  let totalTests = 0;
  let successfulTests = 0;
  
  for (let i = 0; i < VARIATION_TESTS.length; i++) {
    const test = VARIATION_TESTS[i];
    
    // Add section headers
    if (i === 0) console.log('\n📊 BUDGET VARIATIONS\n' + '-'.repeat(40));
    if (i === 3) console.log('\n👤 AUTHORITY VARIATIONS\n' + '-'.repeat(40));
    if (i === 6) console.log('\n🎯 NEED VARIATIONS\n' + '-'.repeat(40));
    if (i === 10) console.log('\n⏰ TIMELINE VARIATIONS\n' + '-'.repeat(40));
    
    console.log(`\nTest ${i + 1}: ${test.description}`);
    console.log(`Message: "${test.message}"`);
    
    try {
      const startTime = Date.now();
      const response = await sendMessage(test.message);
      const responseTime = Date.now() - startTime;
      
      const intent = response.intent || 'unknown';
      const aiResponse = response.response || '';
      
      totalTests++;
      const success = intent === test.expected;
      if (success) successfulTests++;
      
      console.log(`Intent: ${intent} ${success ? '✅' : '❌'} (expected: ${test.expected})`);
      console.log(`Response time: ${responseTime}ms`);
      console.log(`AI says: "${aiResponse.substring(0, 60)}..."`);
      
      // Store result
      results[test.stage].push({
        message: test.message,
        description: test.description,
        expected: test.expected,
        actual: intent,
        success: success,
        responseTime: responseTime
      });
      
      // Special logging for critical tests
      if (test.stage === 'need' && test.message.includes('residency') && success) {
        console.log('🎉 RESIDENCY correctly classified!');
      }
      if (test.stage === 'authority' && test.message.includes('wife') && success) {
        console.log('🎉 Joint authority handled correctly!');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      totalTests++;
      
      results[test.stage].push({
        message: test.message,
        description: test.description,
        expected: test.expected,
        actual: 'error',
        success: false,
        error: error.message
      });
      
      // If rate limited, wait longer
      if (error.message.includes('Rate limited')) {
        console.log('⏳ Waiting 5 seconds due to rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary by stage
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY BY STAGE');
  console.log('='.repeat(70));
  
  for (const stage of ['budget', 'authority', 'need', 'timeline']) {
    const stageResults = results[stage];
    const successCount = stageResults.filter(r => r.success).length;
    const successRate = (successCount / stageResults.length * 100).toFixed(0);
    
    console.log(`\n${stage.toUpperCase()} (${successCount}/${stageResults.length} = ${successRate}%)`);
    stageResults.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      console.log(`  ${icon} ${r.description}: "${r.message}" → ${r.actual}`);
    });
  }
  
  // Overall summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 OVERALL RESULTS');
  console.log('='.repeat(70));
  
  const successRate = (successfulTests / totalTests * 100).toFixed(1);
  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Success Rate: ${successRate}%`);
  
  // Key findings
  console.log('\n🔍 Key Findings:');
  
  // Check residency
  const residencyTest = results.need.find(r => r.message.includes('residency'));
  if (residencyTest && residencyTest.success) {
    console.log('✅ "residency" classification: WORKING');
  } else {
    console.log('❌ "residency" classification: FAILED');
  }
  
  // Check joint authority
  const jointTest = results.authority.find(r => r.message.includes('wife'));
  if (jointTest && jointTest.success) {
    console.log('✅ Joint authority (wife/spouse): WORKING');
  } else {
    console.log('❌ Joint authority: FAILED');
  }
  
  // Check budget variations
  const budgetSuccess = results.budget.filter(r => r.success).length;
  if (budgetSuccess === results.budget.length) {
    console.log('✅ All budget formats: WORKING');
  } else if (budgetSuccess > 0) {
    console.log(`⚠️ Budget formats: ${budgetSuccess}/${results.budget.length} working`);
  } else {
    console.log('❌ Budget formats: FAILED');
  }
  
  // Check need variations
  const needSuccess = results.need.filter(r => r.success).length;
  if (needSuccess === results.need.length) {
    console.log('✅ All need types: WORKING');
  } else if (needSuccess > 0) {
    console.log(`⚠️ Need types: ${needSuccess}/${results.need.length} working`);
  } else {
    console.log('❌ Need types: FAILED');
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(70));
  if (successRate >= 90) {
    console.log('🏆 EXCELLENT - BANT handling variations very well!');
  } else if (successRate >= 70) {
    console.log('✅ GOOD - Most variations working correctly');
  } else if (successRate >= 50) {
    console.log('⚠️ FAIR - Some variations need improvement');
  } else {
    console.log('❌ POOR - Many variations failing');
  }
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'test-bant-variations-simple-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      conversationId: CONVERSATION_ID,
      totalTests: totalTests,
      successfulTests: successfulTests,
      successRate: successRate + '%',
      results: results
    }, null, 2)
  );
  console.log('\n📄 Results saved to test-bant-variations-simple-results.json');
}

// Run the test
testVariations().catch(console.error);