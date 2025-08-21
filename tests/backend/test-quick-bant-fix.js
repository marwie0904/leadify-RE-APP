#!/usr/bin/env node

/**
 * Quick test to verify BANT fix
 */

const http = require('http');

const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

async function sendMessage(message, conversationId = null) {
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
          resolve({
            success: true,
            response: response.response,
            conversationId: response.conversationId,
            intent: response.intent
          });
        } catch (e) {
          resolve({ success: false, error: data || e.message });
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

async function runTest() {
  console.log('🧪 QUICK BANT FIX TEST\n');
  
  let conversationId = null;
  const messages = [
    { text: 'I need a condo in BGC', expect: 'budget' },
    { text: '10-15M', expect: 'authority' },
    { text: 'Yes I am the sole decision maker', expect: 'need' },
    { text: 'For personal residence', expect: 'timeline' },
    { text: '3-6 months', expect: 'contact' },
    { text: 'John Doe, 09171234567', expect: 'complete' }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n[${i+1}/6] User: "${msg.text}"`);
    
    const result = await sendMessage(msg.text, conversationId);
    
    if (result.success) {
      if (!conversationId) conversationId = result.conversationId;
      
      console.log(`       AI: "${result.response?.substring(0, 100)}..."`);
      console.log(`       Intent: ${result.intent}`);
      
      // Check if response matches expectation
      const response = result.response?.toLowerCase() || '';
      let isCorrect = false;
      
      switch(msg.expect) {
        case 'budget':
          isCorrect = response.includes('budget') || response.includes('price range');
          break;
        case 'authority':
          isCorrect = response.includes('decision') || response.includes('sole');
          break;
        case 'need':
          isCorrect = response.includes('purpose') || response.includes('use') || response.includes('residence');
          break;
        case 'timeline':
          isCorrect = response.includes('when') || response.includes('timeline') || response.includes('move');
          break;
        case 'contact':
          isCorrect = response.includes('contact') || response.includes('name') || response.includes('phone');
          break;
        case 'complete':
          isCorrect = response.includes('thank') || response.includes('complete');
          break;
      }
      
      if (isCorrect) {
        console.log(`       ✅ CORRECT: Asked about ${msg.expect}`);
      } else {
        console.log(`       ❌ WRONG: Should ask about ${msg.expect}`);
        
        // Check for duplicate questions
        if (i > 0) {
          const prevExpect = messages[i-1].expect;
          if (response.includes(prevExpect)) {
            console.log(`       🚨 DUPLICATE: Repeated ${prevExpect} question!`);
          }
        }
      }
    } else {
      console.log(`       ❌ ERROR: ${result.error}`);
    }
    
    // Wait 2 seconds between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✨ Test complete!');
}

// Check server
async function checkServer() {
  return new Promise((resolve) => {
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
}

async function main() {
  console.log('Checking server...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server not running. Start with: node server.js');
    process.exit(1);
  }
  
  console.log('✅ Server running\n');
  await runTest();
}

main().catch(console.error);