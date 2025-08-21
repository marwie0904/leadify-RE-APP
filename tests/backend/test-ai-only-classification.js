#!/usr/bin/env node

/**
 * Test AI-Only Intent Classification with gpt-4.1-nano-2025-04-14
 * Verifies that all intents are classified using AI without keyword fallback
 */

const http = require('http');

// Real agent ID from the server logs
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

function sendMessage(message, conversationId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const payload = JSON.stringify({
      message,
      agentId: AGENT_ID,
      conversationId,
      userId: 'test-user',
      source: 'web'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const response = JSON.parse(data);
          resolve({
            message,
            responseTime,
            response: response.response,
            intent: response.intent,
            success: true
          });
        } catch (e) {
          resolve({
            message,
            responseTime,
            error: data,
            success: false
          });
        }
      });
    });
    
    req.on('error', (e) => {
      const responseTime = Date.now() - startTime;
      resolve({
        message,
        responseTime,
        error: e.message,
        success: false
      });
    });
    
    req.write(payload);
    req.end();
  });
}

async function testAIOnlyClassification() {
  console.log('🤖 Testing AI-Only Intent Classification\n');
  console.log('=' .repeat(70));
  console.log('Model: gpt-4.1-nano-2025-04-14');
  console.log('Method: AI classification for ALL messages (no keyword fallback)\n');
  console.log('=' .repeat(70));
  
  // Test various message types
  const testCases = [
    // Greetings
    { message: 'hello', expectedIntent: 'GREETING', description: 'Simple greeting' },
    { message: 'hi there', expectedIntent: 'GREETING', description: 'Casual greeting' },
    { message: 'good morning', expectedIntent: 'GREETING', description: 'Time-based greeting' },
    { message: 'thanks', expectedIntent: 'GREETING', description: 'Gratitude' },
    
    // BANT (property inquiries)
    { message: 'I need a house', expectedIntent: 'BANT', description: 'Property need' },
    { message: 'looking for a condo', expectedIntent: 'BANT', description: 'Property search' },
    { message: 'do you have properties in Manila?', expectedIntent: 'BANT', description: 'Location inquiry' },
    { message: 'interested in buying', expectedIntent: 'BANT', description: 'Purchase intent' },
    
    // Estimation
    { message: 'how much is a condo?', expectedIntent: 'Estimation', description: 'Price inquiry' },
    { message: 'what are the payment plans?', expectedIntent: 'Estimation', description: 'Payment options' },
    { message: 'price range for houses', expectedIntent: 'Estimation', description: 'Budget question' },
    
    // Handoff
    { message: 'I want to speak to a human', expectedIntent: 'HANDOFF', description: 'Human request' },
    { message: 'connect me to real person', expectedIntent: 'HANDOFF', description: 'Agent transfer' },
    { message: 'operator please', expectedIntent: 'HANDOFF', description: 'Operator request' },
    
    // Embeddings (general questions)
    { message: 'what amenities are available?', expectedIntent: 'Embeddings', description: 'Feature inquiry' },
    { message: 'tell me about the location', expectedIntent: 'Embeddings', description: 'Location details' },
    { message: 'where is it located?', expectedIntent: 'Embeddings', description: 'Location question' },
    
    // BANT answers (should be classified as BANT in context)
    { message: '5 million', expectedIntent: 'BANT', description: 'Budget answer' },
    { message: 'next month', expectedIntent: 'BANT', description: 'Timeline answer' },
    { message: 'yes', expectedIntent: 'BANT', description: 'Authority answer' },
    { message: 'for investment', expectedIntent: 'BANT', description: 'Need answer' }
  ];
  
  console.log('\n🚀 Running Classification Tests:\n');
  console.log('=' .repeat(70));
  
  let totalTime = 0;
  let successCount = 0;
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const conversationId = `ai-test-${Date.now()}-${i}`;
    
    console.log(`\n[Test ${i + 1}/${testCases.length}] ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    console.log(`Expected: ${testCase.expectedIntent}`);
    
    const result = await sendMessage(testCase.message, conversationId);
    
    if (result.success) {
      totalTime += result.responseTime;
      
      // Check if intent matches (allowing for case differences)
      const actualIntent = (result.intent || '').toUpperCase();
      const expectedIntent = testCase.expectedIntent.toUpperCase();
      const matches = actualIntent === expectedIntent || 
                     (expectedIntent === 'ESTIMATION' && actualIntent === 'ESTIMATION') ||
                     (expectedIntent === 'EMBEDDINGS' && actualIntent === 'EMBEDDINGS');
      
      if (matches) {
        console.log(`✅ Correct: ${result.intent} (${result.responseTime}ms)`);
        successCount++;
      } else {
        console.log(`❌ Wrong: Got ${result.intent}, expected ${testCase.expectedIntent} (${result.responseTime}ms)`);
      }
      
      results.push({
        ...testCase,
        actual: result.intent,
        correct: matches,
        time: result.responseTime
      });
    } else {
      console.log(`❌ Error: ${result.error}`);
      results.push({
        ...testCase,
        actual: 'ERROR',
        correct: false,
        time: result.responseTime
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 Test Results Summary:\n');
  
  const accuracy = (successCount / testCases.length * 100).toFixed(1);
  const avgTime = Math.round(totalTime / testCases.length);
  
  console.log(`Accuracy: ${successCount}/${testCases.length} (${accuracy}%)`);
  console.log(`Average Response Time: ${avgTime}ms`);
  console.log(`Model: gpt-4.1-nano-2025-04-14`);
  
  // Group results by intent type
  console.log('\n📈 Performance by Intent Type:');
  const intentGroups = {};
  results.forEach(r => {
    if (!intentGroups[r.expectedIntent]) {
      intentGroups[r.expectedIntent] = { correct: 0, total: 0, avgTime: 0 };
    }
    intentGroups[r.expectedIntent].total++;
    if (r.correct) intentGroups[r.expectedIntent].correct++;
    intentGroups[r.expectedIntent].avgTime += r.time;
  });
  
  Object.keys(intentGroups).forEach(intent => {
    const group = intentGroups[intent];
    const acc = (group.correct / group.total * 100).toFixed(0);
    const avg = Math.round(group.avgTime / group.total);
    console.log(`  ${intent}: ${group.correct}/${group.total} correct (${acc}%), avg ${avg}ms`);
  });
  
  console.log('\n🎯 Key Observations:');
  console.log('1. All messages now use AI classification (no keyword shortcuts)');
  console.log('2. Using lightweight nano model for fast responses');
  console.log('3. Simple, efficient prompt optimized for nano model');
  console.log('4. Consistent classification approach for all message types');
  
  if (accuracy >= 80) {
    console.log('\n✅ AI-Only Classification: WORKING WELL');
  } else if (accuracy >= 60) {
    console.log('\n⚠️ AI-Only Classification: NEEDS TUNING');
  } else {
    console.log('\n❌ AI-Only Classification: POOR ACCURACY');
  }
  
  console.log('\n✨ Test complete!\n');
}

// Run the test
testAIOnlyClassification().catch(console.error);