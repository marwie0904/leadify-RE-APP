const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';
const USER_ID = '8ad6ed68-ac60-4483-b22d-e6747727971b';
const AGENT_ID = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
const CONVERSATION_ID = '9826beca-4d97-4b51-9170-4515fbcc096c';

// Quick test of key variations
const KEY_VARIATIONS = [
  { message: '15 million', stage: 'budget', description: 'Budget with "million"' },
  { message: 'me and my wife', stage: 'authority', description: 'Joint authority' },
  { message: 'residency', stage: 'need', description: 'Residency need' },
  { message: 'investment', stage: 'need', description: 'Investment need' },
  { message: 'ASAP', stage: 'timeline', description: 'ASAP timeline' }
];

async function testQuickVariations() {
  console.log('🚀 QUICK BANT VARIATION TEST');
  console.log('Testing 5 key variations');
  console.log('=' . repeat(50));
  
  const results = [];
  
  for (const test of KEY_VARIATIONS) {
    console.log(`\n📬 Testing: "${test.message}"`);
    console.log(`   Stage: ${test.stage}`);
    console.log(`   Description: ${test.description}`);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/chat`,
        {
          message: test.message,
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
          timeout: 30000
        }
      );
      
      const intent = response.data.intent || 'unknown';
      const success = intent === 'BANT';
      
      console.log(`   Intent: ${intent} ${success ? '✅' : '❌'}`);
      
      if (test.message === 'residency' && success) {
        console.log('   🎉 RESIDENCY WORKING!');
      }
      if (test.message.includes('wife') && success) {
        console.log('   🎉 JOINT AUTHORITY WORKING!');
      }
      
      results.push({ ...test, intent, success });
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ ...test, error: error.message, success: false });
    }
    
    // Wait 3 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Summary
  console.log('\n' + '=' . repeat(50));
  console.log('📊 SUMMARY');
  console.log('=' . repeat(50));
  
  const successful = results.filter(r => r.success).length;
  console.log(`\nSuccess Rate: ${successful}/${results.length}`);
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.description}: "${r.message}" → ${r.intent || 'error'}`);
  });
  
  // Key checks
  const residencyWorks = results.find(r => r.message === 'residency')?.success;
  const jointAuthWorks = results.find(r => r.message.includes('wife'))?.success;
  const investmentWorks = results.find(r => r.message === 'investment')?.success;
  
  console.log('\n🔍 Critical Checks:');
  console.log(`   Residency: ${residencyWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Joint Authority: ${jointAuthWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`   Investment: ${investmentWorks ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (successful === results.length) {
    console.log('\n🏆 PERFECT - All variations classified correctly!');
  } else if (successful >= 3) {
    console.log('\n✅ GOOD - Most variations working');
  } else {
    console.log('\n⚠️ NEEDS WORK - Several variations failing');
  }
}

testQuickVariations().catch(console.error);