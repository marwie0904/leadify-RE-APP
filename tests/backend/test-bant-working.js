const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';
const USER_ID = '8ad6ed68-ac60-4483-b22d-e6747727971b';
const AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
const CONVERSATION_ID = '9826beca-4d97-4b51-9170-4515fbcc096c';

// Test messages for complete BANT flow
const TEST_MESSAGES = [
  { message: 'I am looking for a property', stage: 'initial', description: 'Starting BANT flow' },
  { message: '30M', stage: 'budget', description: 'Budget answer' },
  { message: 'yes', stage: 'authority', description: 'Authority answer' },
  { message: 'residency', stage: 'need', description: 'CRITICAL TEST - Need answer' },
  { message: 'next month', stage: 'timeline', description: 'Timeline answer' },
  { message: 'John Doe, 555-1234', stage: 'contact', description: 'Contact information' }
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
    throw error;
  }
}

async function testBANTFlow() {
  console.log('🚀 FINAL BANT CLASSIFICATION TEST');
  console.log('Testing "residency" classification and complete BANT flow');
  console.log('=' . repeat(70));
  console.log(`📝 Using existing conversation: ${CONVERSATION_ID}`);
  console.log(`🤖 Agent: Brown-Homes-Agent (${AGENT_ID})\n`);
  
  const results = [];
  let residencySuccess = false;
  let allBANT = true;
  
  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const test = TEST_MESSAGES[i];
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📬 Message ${i + 1}/${TEST_MESSAGES.length}: "${test.message}"`);
    console.log(`   Stage: ${test.stage}`);
    console.log(`   Description: ${test.description}`);
    
    try {
      const startTime = Date.now();
      const response = await sendMessage(test.message);
      const responseTime = Date.now() - startTime;
      
      const intent = response.intent || 'unknown';
      const aiResponse = response.response || '';
      
      console.log(`   ✅ Request successful (${responseTime}ms)`);
      console.log(`   🎯 Intent: ${intent}`);
      
      // Check if BANT was correctly identified
      if (intent === 'BANT') {
        console.log(`   ✅ Correctly classified as BANT`);
        
        // Special check for "residency"
        if (test.message === 'residency') {
          console.log(`   🎉 SUCCESS: "residency" correctly classified as BANT!`);
          residencySuccess = true;
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
        
        if (test.message === 'residency') {
          console.log(`   🚨 CRITICAL: "residency" misclassified as ${intent}!`);
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
      console.log(`   💬 Response: "${aiResponse.substring(0, 100)}..."`);
      
      // Check if response indicates error (embeddings misclassification)
      if (aiResponse.includes('unfortunately') || aiResponse.includes('not trained')) {
        console.log(`   ⚠️ Warning: AI returned error response (likely misclassified)`);
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
      allBANT = false;
      results.push({
        message: test.message,
        stage: test.stage,
        error: error.message,
        success: false
      });
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;
  
  console.log(`\n✅ Successful Classifications: ${successCount}/${TEST_MESSAGES.length}`);
  console.log(`⏱️ Average Response Time: ${Math.round(avgResponseTime)}ms`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach((r, i) => {
    const status = r.success ? '✅' : '❌';
    const time = r.responseTime ? `${r.responseTime}ms` : 'N/A';
    console.log(`   ${status} Message ${i + 1}: "${r.message}" → Intent: ${r.intent || r.error} (${time})`);
  });
  
  // Critical checks
  console.log('\n🔍 Critical Checks:');
  if (residencySuccess) {
    console.log('   ✅ "residency" classification: WORKING');
  } else {
    console.log('   ❌ "residency" classification: FAILED');
  }
  
  if (allBANT) {
    console.log('   ✅ All messages classified as BANT: YES');
  } else {
    console.log('   ⚠️ All messages classified as BANT: NO');
  }
  
  // Overall verdict
  console.log('\n' + '='.repeat(70));
  if (residencySuccess && allBANT) {
    console.log('🏆 COMPLETE SUCCESS - BANT Classification fully functional!');
    console.log('   ✅ "residency" correctly classified');
    console.log('   ✅ All BANT messages handled properly');
  } else if (residencySuccess) {
    console.log('✅ PRIMARY OBJECTIVE ACHIEVED');
    console.log('   ✅ "residency" classification FIXED and working!');
    console.log('   ⚠️ Some other BANT messages may need attention');
  } else {
    console.log('❌ TEST FAILED');
    console.log('   ❌ "residency" classification not working');
  }
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync(
    'test-bant-final-results.json',
    JSON.stringify({
      timestamp: new Date().toISOString(),
      conversationId: CONVERSATION_ID,
      residencyWorking: residencySuccess,
      allBANTWorking: allBANT,
      successRate: `${successCount}/${TEST_MESSAGES.length}`,
      avgResponseTime: Math.round(avgResponseTime),
      results: results
    }, null, 2)
  );
  console.log('\n📄 Results saved to test-bant-final-results.json');
  
  // Instructions for checking logs
  console.log('\n💡 To verify in server logs:');
  console.log('   tail -100 server.log | grep "MASTER INTENT"');
  console.log('   Look for: Pattern Detection Found -> Type: need');
}

// Run the test
testBANTFlow().catch(console.error);