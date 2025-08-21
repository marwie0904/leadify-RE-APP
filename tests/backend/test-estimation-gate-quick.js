#!/usr/bin/env node

/**
 * Quick Test for ESTIMATION-after-BANT Gate
 * Verifies the core functionality is working
 */

const http = require('http');

// Real agent ID
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

function sendMessage(message, conversationId) {
  return new Promise((resolve) => {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ success: true, response: response.response, intent: response.intent });
        } catch (e) {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ success: false, error: e.message });
    });
    
    req.write(payload);
    req.end();
  });
}

async function quickTest() {
  console.log('🧪 Quick ESTIMATION-after-BANT Test\n');
  console.log('=' .repeat(60));
  
  const convId = `quick-test-${Date.now()}`;
  
  // Test 1: Price request should redirect to BANT
  console.log('\n📝 Test 1: Price request without BANT');
  const result1 = await sendMessage('How much is a condo?', convId);
  
  if (result1.success) {
    console.log(`Response: "${result1.response?.substring(0, 100)}..."`);
    
    // Check if it asks for BANT (budget)
    if (result1.response?.toLowerCase().includes('budget') || 
        result1.response?.toLowerCase().includes('investment') ||
        result1.response?.toLowerCase().includes('help')) {
      console.log('✅ Correctly redirects to BANT');
    } else {
      console.log('❌ Did not redirect to BANT');
    }
  } else {
    console.log('❌ Request failed:', result1.error);
  }
  
  // Test 2: Complete mini-BANT
  console.log('\n📝 Test 2: Quick BANT completion');
  
  await sendMessage('5 million', convId);
  console.log('Provided budget...');
  
  await sendMessage('yes', convId);
  console.log('Provided authority...');
  
  await sendMessage('for living', convId);
  console.log('Provided need...');
  
  await sendMessage('next month', convId);
  console.log('Provided timeline...');
  
  const contactResult = await sendMessage('John Test, 09171234567', convId);
  console.log('Provided contact...');
  
  if (contactResult.success) {
    console.log(`Response: "${contactResult.response?.substring(0, 100)}..."`);
  }
  
  // Wait for BANT to process
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Price request after BANT
  console.log('\n📝 Test 3: Price request after BANT');
  const result3 = await sendMessage('What are the prices?', convId);
  
  if (result3.success) {
    console.log(`Response: "${result3.response?.substring(0, 100)}..."`);
    
    // Should NOT ask for BANT again
    if (!result3.response?.toLowerCase().includes('budget range') &&
        !result3.response?.toLowerCase().includes('decision maker')) {
      console.log('✅ Does not repeat BANT');
    } else {
      console.log('❌ Incorrectly asking for BANT again');
    }
  } else {
    console.log('❌ Request failed:', result3.error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Quick test complete!\n');
}

quickTest().catch(console.error);