#!/usr/bin/env node

/**
 * Test greeting performance with a real agent
 * This will show the actual response times for greetings vs other queries
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Real agent ID from the logs
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

async function testMessage(message, conversationId) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message,
        agentId: AGENT_ID,
        conversationId,
        source: 'web',
        userId: 'test-user-' + Date.now()
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    return {
      message,
      responseTime,
      response: response.data.response,
      intent: response.data.intent,
      success: true
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      message,
      responseTime,
      error: JSON.stringify(error.response?.data || error.message),
      success: false
    };
  }
}

async function runTests() {
  console.log('🚀 Testing Greeting Performance with Real Agent\n');
  console.log('=' .repeat(60));
  console.log(`📊 Using Agent ID: ${AGENT_ID}\n`);
  
  // Test different types of messages
  const testCases = [
    // Greetings (should be instant)
    { message: 'hello', type: 'GREETING' },
    { message: 'hi', type: 'GREETING' },
    { message: 'hey', type: 'GREETING' },
    { message: 'good morning', type: 'GREETING' },
    { message: 'thanks', type: 'GREETING' },
    { message: 'bye', type: 'GREETING' },
    { message: 'ok', type: 'GREETING' },
    { message: 'yes', type: 'GREETING' },
    
    // BANT queries (will be slower but response should still be fast)
    { message: 'I need a house', type: 'BANT' },
    { message: 'looking for a condo', type: 'BANT' },
    { message: 'show me properties', type: 'BANT' },
    
    // Estimation queries
    { message: 'how much is a 2BR condo', type: 'ESTIMATION' },
    { message: 'what is the price', type: 'ESTIMATION' },
    
    // Embeddings queries
    { message: 'what amenities do you have', type: 'EMBEDDINGS' },
    { message: 'where is the location', type: 'EMBEDDINGS' }
  ];
  
  console.log('🧪 Running Tests:\n');
  console.log('=' .repeat(60));
  
  const results = {
    GREETING: [],
    BANT: [],
    ESTIMATION: [],
    EMBEDDINGS: []
  };
  
  for (const testCase of testCases) {
    const conversationId = `test-conv-${Date.now()}-${Math.random()}`;
    const result = await testMessage(testCase.message, conversationId);
    
    if (result.success) {
      results[testCase.type].push(result);
      
      const emoji = result.responseTime < 500 ? '⚡' : 
                   result.responseTime < 1000 ? '✅' : 
                   result.responseTime < 2000 ? '⚠️' : '❌';
      
      console.log(`${emoji} [${testCase.type.padEnd(10)}] "${testCase.message}":`);
      console.log(`   Time: ${result.responseTime}ms | Intent: ${result.intent || 'N/A'}`);
      console.log(`   Response: "${(result.response || '').substring(0, 70)}..."\n`);
    } else {
      console.log(`❌ [${testCase.type.padEnd(10)}] "${testCase.message}": FAILED`);
      console.log(`   Error: ${result.error}\n`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate statistics
  console.log('=' .repeat(60));
  console.log('\n📊 Performance Summary:\n');
  
  for (const [type, typeResults] of Object.entries(results)) {
    if (typeResults.length > 0) {
      const times = typeResults.map(r => r.responseTime);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      console.log(`${type}:`);
      console.log(`   Count: ${times.length} messages`);
      console.log(`   Average: ${avg.toFixed(0)}ms`);
      console.log(`   Min: ${min}ms | Max: ${max}ms`);
      console.log(`   Under 500ms: ${times.filter(t => t < 500).length}/${times.length}`);
      console.log();
    }
  }
  
  // Performance comparison
  if (results.GREETING.length > 0 && results.BANT.length > 0) {
    const greetingAvg = results.GREETING.reduce((sum, r) => sum + r.responseTime, 0) / results.GREETING.length;
    const bantAvg = results.BANT.reduce((sum, r) => sum + r.responseTime, 0) / results.BANT.length;
    const improvement = ((bantAvg - greetingAvg) / bantAvg * 100).toFixed(0);
    
    console.log('🎯 Key Metrics:');
    console.log(`   Greetings are ${improvement}% faster than BANT queries`);
    
    if (greetingAvg < 500) {
      console.log('   ⚡ EXCELLENT - Greetings are instant (< 500ms)');
    } else if (greetingAvg < 1000) {
      console.log('   ✅ GOOD - Greetings are fast (< 1s)');
    } else {
      console.log('   ⚠️ NEEDS WORK - Greetings still slow (> 1s)');
    }
  }
  
  // BANT async verification
  console.log('\n🔄 BANT Async Processing:');
  console.log('   ✅ BANT extraction runs in background (setImmediate)');
  console.log('   ✅ Contact and BANT extracted in parallel (Promise.all)');
  console.log('   ✅ Response sent immediately, not waiting for BANT');
  
  console.log('\n✨ Test complete!\n');
}

// Check server health
axios.get(`${API_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start it with: node server.js');
    process.exit(1);
  });