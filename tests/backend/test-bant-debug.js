#!/usr/bin/env node

/**
 * Debug test for BANT flow
 */

const http = require('http');

const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function sendMessage(message, conversationId = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SENDING: "${message}"`);
  console.log(`ConvID: ${conversationId || 'NEW'}`);
  console.log(`${'='.repeat(60)}`);
  
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      message,
      agentId: AGENT_ID,
      conversationId,
      userId: 'test-' + generateUUID().slice(0, 8),
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
          console.log(`RESPONSE: "${response.response?.substring(0, 150)}..."`);
          console.log(`Intent: ${response.intent}`);
          console.log(`ConvID: ${response.conversationId}`);
          resolve({
            success: true,
            response: response.response,
            conversationId: response.conversationId,
            intent: response.intent
          });
        } catch (e) {
          console.log(`ERROR: ${data || e.message}`);
          resolve({ success: false, error: data || e.message });
        }
      });
    });
    
    req.on('error', (e) => {
      console.log(`ERROR: ${e.message}`);
      resolve({ success: false, error: e.message });
    });
    
    req.write(payload);
    req.end();
  });
}

async function testScenario1() {
  console.log('\n' + '╔'.repeat(60));
  console.log('║ TEST 1: Basic BANT Flow');
  console.log('╚'.repeat(60));
  
  let convId = null;
  
  // Message 1
  const r1 = await sendMessage('I want to buy a condo', convId);
  if (r1.success) {
    convId = r1.conversationId;
    const response = r1.response?.toLowerCase() || '';
    
    if (response.includes('budget')) {
      console.log('✅ Step 1: Correctly asked for budget');
    } else {
      console.log('❌ Step 1: Should ask for budget');
      console.log('   Response:', r1.response?.substring(0, 200));
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Message 2
  const r2 = await sendMessage('My budget is 15 million pesos', convId);
  if (r2.success) {
    const response = r2.response?.toLowerCase() || '';
    
    if (response.includes('decision') || response.includes('authority')) {
      console.log('✅ Step 2: Correctly asked for authority');
    } else if (response.includes('budget')) {
      console.log('❌ Step 2: DUPLICATE - Still asking for budget!');
      console.log('   Response:', r2.response?.substring(0, 200));
    } else {
      console.log('❌ Step 2: Should ask for authority');
      console.log('   Response:', r2.response?.substring(0, 200));
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Message 3
  const r3 = await sendMessage('I am the sole decision maker', convId);
  if (r3.success) {
    const response = r3.response?.toLowerCase() || '';
    
    if (response.includes('purpose') || response.includes('use') || response.includes('need')) {
      console.log('✅ Step 3: Correctly asked for need/purpose');
    } else if (response.includes('decision') || response.includes('authority')) {
      console.log('❌ Step 3: DUPLICATE - Still asking for authority!');
      console.log('   Response:', r3.response?.substring(0, 200));
    } else {
      console.log('❌ Step 3: Should ask for need/purpose');
      console.log('   Response:', r3.response?.substring(0, 200));
    }
  }
}

async function testScenario2() {
  console.log('\n' + '╔'.repeat(60));
  console.log('║ TEST 2: Short Answer BANT Flow');
  console.log('╚'.repeat(60));
  
  let convId = null;
  
  // Message 1
  const r1 = await sendMessage('Looking for property', convId);
  if (r1.success) {
    convId = r1.conversationId;
    console.log(r1.response?.includes('budget') ? '✅ Asked for budget' : '❌ Should ask for budget');
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Message 2 - Short budget answer
  const r2 = await sendMessage('10M', convId);
  if (r2.success) {
    const response = r2.response?.toLowerCase() || '';
    if (response.includes('decision') || response.includes('authority')) {
      console.log('✅ Recognized "10M" as budget, moved to authority');
    } else if (response.includes('budget')) {
      console.log('❌ FAILED to recognize "10M" as budget answer!');
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Message 3 - Short authority answer
  const r3 = await sendMessage('yes', convId);
  if (r3.success) {
    const response = r3.response?.toLowerCase() || '';
    if (response.includes('purpose') || response.includes('use')) {
      console.log('✅ Recognized "yes" as authority, moved to need');
    } else if (response.includes('decision')) {
      console.log('❌ FAILED to recognize "yes" as authority answer!');
    }
  }
}

async function main() {
  console.log('🧪 BANT DEBUG TEST');
  console.log('=' .repeat(60));
  
  // Check server
  const serverCheck = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
  
  if (!serverCheck) {
    console.log('❌ Server not running');
    process.exit(1);
  }
  
  console.log('✅ Server is running');
  
  // Run tests
  await testScenario1();
  await new Promise(r => setTimeout(r, 5000));
  await testScenario2();
  
  console.log('\n✨ Tests complete!');
}

main().catch(console.error);