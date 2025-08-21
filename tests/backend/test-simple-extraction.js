#!/usr/bin/env node

const http = require('http');

async function sendMessage(message, conversationId = null) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      message,
      agentId: 'e70a85ac-8480-4b1d-bd15-2d7b817b2399',
      conversationId,
      userId: 'test-user',
      source: 'web'
    });
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ ...response, success: true });
        } catch (e) {
          resolve({ success: false, error: data });
        }
      });
    });
    
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function test() {
  console.log('SIMPLE EXTRACTION TEST\n');
  
  // Message 1
  console.log('Sending: "I need a condo"');
  const r1 = await sendMessage('I need a condo');
  console.log(`Response: "${r1.response?.substring(0, 100)}..."`);
  
  if (!r1.success) {
    console.log('Error:', r1.error);
    return;
  }
  
  const convId = r1.conversationId;
  await new Promise(r => setTimeout(r, 2000));
  
  // Message 2
  console.log('\nSending: "15M"');
  const r2 = await sendMessage('15M', convId);
  console.log(`Response: "${r2.response?.substring(0, 100)}..."`);
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Message 3
  console.log('\nSending: "I am the sole decision maker"');
  const r3 = await sendMessage('I am the sole decision maker', convId);
  console.log(`Response: "${r3.response?.substring(0, 100)}..."`);
  
  console.log('\nDone! Check server logs for extraction details.');
}

test().catch(console.error);