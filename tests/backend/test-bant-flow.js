#!/usr/bin/env node

/**
 * Test BANT flow improvements
 * Verifies that BANT continuation messages are handled efficiently
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

async function testBANTFlow() {
  console.log('🎯 Testing BANT Flow Improvements\n');
  console.log('=' .repeat(60));
  
  // Create a unique conversation ID for this test
  const conversationId = `bant-test-${Date.now()}`;
  console.log(`Conversation ID: ${conversationId}\n`);
  
  // Simulate a BANT conversation
  const conversation = [
    { message: 'I need a house in Manila', expected: 'BANT', description: 'Initial property query' },
    { message: 'next month', expected: 'BANT', description: 'Timeline answer (should be instant)' },
    { message: '500k', expected: 'BANT', description: 'Budget answer (should be instant)' },
    { message: 'yes, just me', expected: 'BANT', description: 'Authority answer (should be instant)' },
    { message: 'for living', expected: 'BANT', description: 'Need answer (should be instant)' },
    { message: 'Maria Cruz', expected: 'BANT', description: 'Name (contact info)' },
    { message: '09171234567', expected: 'BANT', description: 'Phone (contact info)' }
  ];
  
  console.log('📝 Simulating BANT Conversation:\n');
  
  for (const turn of conversation) {
    console.log(`\n[${turn.description}]`);
    console.log(`User: "${turn.message}"`);
    
    const result = await sendMessage(turn.message, conversationId);
    
    const emoji = result.responseTime < 500 ? '⚡' : 
                 result.responseTime < 1000 ? '✅' : 
                 result.responseTime < 2000 ? '⚠️' : '❌';
    
    console.log(`${emoji} Response time: ${result.responseTime}ms`);
    console.log(`   Intent: ${result.intent || 'N/A'} (expected: ${turn.expected})`);
    
    if (result.success && result.response) {
      console.log(`   AI: "${result.response.substring(0, 100)}..."`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 BANT Flow Analysis:\n');
  
  console.log('Expected Improvements:');
  console.log('✅ "next month" should be recognized as BANT continuation');
  console.log('✅ Simple answers should not trigger AI classification');
  console.log('✅ BANT prompt should acknowledge answers and ask next question');
  console.log('✅ Flow should be natural and conversational');
  
  console.log('\n🔍 Key Optimizations:');
  console.log('1. Added BANT answer patterns to keyword classifier');
  console.log('2. BANT_CONTINUE intent for ongoing conversations');
  console.log('3. Improved BANT prompt with structured guidance');
  console.log('4. Context-aware continuation detection');
  
  console.log('\n✨ Test complete!\n');
}

// Run the test
testBANTFlow().catch(console.error);