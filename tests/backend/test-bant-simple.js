const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

// Test messages for BANT flow
const TEST_MESSAGES = [
  { message: 'I am looking for a property', stage: 'initial', description: 'Starting BANT flow' },
  { message: '30M', stage: 'budget', description: 'Budget answer' },
  { message: 'yes', stage: 'authority', description: 'Authority answer' },
  { message: 'residency', stage: 'need', description: 'CRITICAL TEST - Need answer' },
  { message: 'next month', stage: 'timeline', description: 'Timeline answer' },
  { message: 'John Doe, 555-1234', stage: 'contact', description: 'Contact information' }
];

async function testSimpleBANT() {
  console.log('🚀 Simple BANT Test with Focus on "residency" Classification');
  console.log('=' . repeat(60));
  
  try {
    // Use existing conversation ID
    const conversationId = '9826beca-4d97-4b51-9170-4515fbcc096c';
    const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
    const userId = '8ad6ed68-ac60-4483-b22d-e6747727971b';
    
    console.log(`Using existing conversation: ${conversationId}`);
    console.log(`Agent: Brown-Homes-Agent (${agentId})\n`);
    
    const results = [];
    
    for (let i = 0; i < TEST_MESSAGES.length; i++) {
      const test = TEST_MESSAGES[i];
      console.log(`\n${'='.repeat(40)}`);
      console.log(`📬 Message ${i + 1}: "${test.message}"`);
      console.log(`   Stage: ${test.stage}`);
      console.log(`   Description: ${test.description}`);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/chat`,
          {
            message: test.message,
            conversationId: conversationId,
            agentId: agentId,
            source: 'web',
            userId: userId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            timeout: 10000
          }
        );
        
        const aiResponse = response.data.response || '';
        console.log(`   ✅ Sent successfully`);
        
        // Check if it's an error response
        if (aiResponse.includes('unfortunately') || aiResponse.includes('not trained')) {
          console.log(`   ❌ AI ERROR RESPONSE - Likely misclassified as Embeddings`);
          console.log(`   Response: "${aiResponse.substring(0, 100)}..."`);
          
          if (test.message === 'residency') {
            console.log(`   🚨 CRITICAL FAILURE: "residency" was misclassified!`);
            results.push({ message: test.message, status: 'FAILED - Misclassified', critical: true });
          } else {
            results.push({ message: test.message, status: 'FAILED - Error response' });
          }
        } else {
          console.log(`   ✅ AI responded appropriately`);
          console.log(`   Response preview: "${aiResponse.substring(0, 100)}..."`);
          results.push({ message: test.message, status: 'SUCCESS' });
        }
        
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        results.push({ message: test.message, status: 'ERROR', error: error.message });
      }
      
      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const failedCount = results.filter(r => r.status.includes('FAILED')).length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    const criticalFail = results.some(r => r.critical);
    
    console.log(`✅ Successful: ${successCount}/${TEST_MESSAGES.length}`);
    console.log(`❌ Failed: ${failedCount}/${TEST_MESSAGES.length}`);
    console.log(`⚠️ Errors: ${errorCount}/${TEST_MESSAGES.length}`);
    
    if (criticalFail) {
      console.log('\n🚨 CRITICAL: "residency" classification FAILED!');
      console.log('   The AI is misclassifying BANT answers as Embeddings');
    }
    
    if (successCount === TEST_MESSAGES.length) {
      console.log('\n🎉 SUCCESS: All BANT messages classified correctly!');
    } else if (successCount >= 4) {
      console.log('\n⚠️ PARTIAL SUCCESS: Most messages working');
    } else {
      console.log('\n❌ FAILURE: BANT classification not working properly');
    }
    
    // Check server logs
    console.log('\n💡 To see classification details in server logs:');
    console.log('   grep "MASTER INTENT" server.log | tail -50');
    console.log('   Look for:');
    console.log('   - "Pattern Detection Found" (should show residency detected)');
    console.log('   - "AI Response: BANT"');
    console.log('   - "FINAL CLASSIFICATION: BANT"');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testSimpleBANT().catch(console.error);