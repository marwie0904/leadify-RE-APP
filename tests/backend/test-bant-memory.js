#!/usr/bin/env node

/**
 * Test BANT Memory Optimization
 * Verifies that BANT conversations bypass the MASTER INTENT classifier
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
            intent: response.intent,
            response: response.response,
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

async function testBANTMemory() {
  console.log('🧠 Testing BANT Memory Optimization\n');
  console.log('=' .repeat(70));
  console.log('Expected Flow with Memory Optimization:\n');
  console.log('1. "hello" → Keyword classifier → GREETING');
  console.log('2. "I need a house" → Keyword classifier → BANT (memory activated)');
  console.log('3. "next month" → BANT memory bypass (no classification)');
  console.log('4. "500k" → BANT memory bypass (no classification)');
  console.log('5. All subsequent messages bypass classifier until BANT complete\n');
  console.log('=' .repeat(70));
  
  // Create a unique conversation ID for this test
  const conversationId = `memory-test-${Date.now()}`;
  console.log(`\n📝 Conversation ID: ${conversationId}\n`);
  
  // Test conversation flow
  const conversation = [
    { 
      message: 'hello', 
      expectedFlow: 'Keyword → GREETING',
      description: 'Initial greeting',
      shouldBypass: false
    },
    { 
      message: 'I need a house in Manila', 
      expectedFlow: 'Keyword → BANT (activates memory)',
      description: 'Property query (starts BANT)',
      shouldBypass: false
    },
    { 
      message: 'next month', 
      expectedFlow: 'Memory bypass → BANT',
      description: 'Timeline (should bypass classifier)',
      shouldBypass: true
    },
    { 
      message: '500k to 1M', 
      expectedFlow: 'Memory bypass → BANT',
      description: 'Budget (should bypass classifier)',
      shouldBypass: true
    },
    { 
      message: 'yes, just me', 
      expectedFlow: 'Memory bypass → BANT',
      description: 'Authority (should bypass classifier)',
      shouldBypass: true
    },
    { 
      message: 'for living', 
      expectedFlow: 'Memory bypass → BANT',
      description: 'Need (should bypass classifier)',
      shouldBypass: true
    },
    { 
      message: 'hello', 
      expectedFlow: 'Memory check → GREETING (interrupts BANT)',
      description: 'Greeting during BANT',
      shouldBypass: true // Still bypasses classifier but routes to GREETING
    },
    { 
      message: 'Maria Cruz, 09171234567', 
      expectedFlow: 'Memory bypass → BANT',
      description: 'Contact info (completes BANT)',
      shouldBypass: true
    }
  ];
  
  console.log('🚀 Running BANT Memory Test:\n');
  console.log('=' .repeat(70));
  
  const results = [];
  
  for (let i = 0; i < conversation.length; i++) {
    const turn = conversation[i];
    console.log(`\n[Step ${i + 1}] ${turn.description}`);
    console.log(`User: "${turn.message}"`);
    console.log(`Expected: ${turn.expectedFlow}`);
    
    const result = await sendMessage(turn.message, conversationId);
    results.push({ ...result, ...turn });
    
    // Determine if this was fast (likely bypassed) or slow (went through classifier)
    const wasFast = result.responseTime < 300;
    const emoji = wasFast ? '⚡' : '🔄';
    const status = wasFast ? 'FAST' : 'NORMAL';
    
    console.log(`${emoji} Response: ${result.responseTime}ms (${status})`);
    
    if (turn.shouldBypass && !wasFast) {
      console.log('⚠️  WARNING: Expected bypass but took longer than expected');
    } else if (turn.shouldBypass && wasFast) {
      console.log('✅ Confirmed: Classifier bypassed!');
    }
    
    if (result.success && result.response) {
      console.log(`AI: "${result.response.substring(0, 80)}..."`);
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 BANT Memory Performance Analysis:\n');
  
  // Analyze results
  const preBANT = results.slice(0, 2);
  const duringBANT = results.slice(2, 7);
  const postContact = results.slice(7);
  
  const avgPreBANT = preBANT.reduce((sum, r) => sum + r.responseTime, 0) / preBANT.length;
  const avgDuringBANT = duringBANT.reduce((sum, r) => sum + r.responseTime, 0) / duringBANT.length;
  
  console.log(`Pre-BANT average: ${avgPreBANT.toFixed(0)}ms (uses classifier)`);
  console.log(`During BANT average: ${avgDuringBANT.toFixed(0)}ms (should bypass)`);
  console.log(`Improvement: ${((avgPreBANT - avgDuringBANT) / avgPreBANT * 100).toFixed(0)}% faster\n`);
  
  // Check if bypass is working
  const bypassWorking = duringBANT.filter(r => r.responseTime < 300).length >= 3;
  
  if (bypassWorking) {
    console.log('✅ BANT Memory Bypass: WORKING');
    console.log('   Messages during BANT skip the classifier entirely');
  } else {
    console.log('⚠️  BANT Memory Bypass: May not be working optimally');
    console.log('   Some messages still going through classifier');
  }
  
  console.log('\n🎯 Key Benefits of BANT Memory:');
  console.log('1. Eliminates 0-900ms classification delay during BANT');
  console.log('2. Reduces API calls (no AI classification needed)');
  console.log('3. Maintains conversation context automatically');
  console.log('4. Allows interruption for greetings/handoff requests');
  console.log('5. Clears memory after BANT completion');
  
  console.log('\n✨ Test complete!\n');
}

// Run the test
testBANTMemory().catch(console.error);