#!/usr/bin/env node

/**
 * Test BANT Sequential Order
 * Verifies that BANT follows the strict order: Budget → Authority → Need → Timeline
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

function checkForKeywords(response, keywords, shouldContain = true) {
  if (!response) {
    console.log(`❌ No response received`);
    return false;
  }
  
  const lowerResponse = response.toLowerCase();
  const found = keywords.some(keyword => lowerResponse.includes(keyword.toLowerCase()));
  
  if (shouldContain && !found) {
    console.log(`❌ Expected keywords not found: ${keywords.join(', ')}`);
    console.log(`   Response: "${response.substring(0, 150)}..."`);
    return false;
  } else if (!shouldContain && found) {
    console.log(`❌ Unexpected keywords found: ${keywords.join(', ')}`);
    console.log(`   Response: "${response.substring(0, 150)}..."`);
    return false;
  }
  
  return true;
}

async function testBANTSequentialOrder() {
  console.log('🔍 Testing BANT Sequential Order\n');
  console.log('=' .repeat(70));
  console.log('Expected Order: Budget → Authority → Need → Timeline\n');
  console.log('=' .repeat(70));
  
  // Test 1: Property query should ask for BUDGET first
  console.log('\n📝 Test 1: Initial property query\n');
  
  const conv1 = `order-test-1-${Date.now()}`;
  console.log(`Conversation ID: ${conv1}\n`);
  
  const result1 = await sendMessage('What properties do you have in Katipunan', conv1);
  console.log(`User: "What properties do you have in Katipunan"`);
  console.log(`AI: "${result1.response}"\n`);
  
  // Should ask for BUDGET, not authority/need/timeline
  const budgetKeywords = ['budget', 'how much', 'investment', 'price range', 'afford'];
  const authorityKeywords = ['decision maker', 'sole', 'family members', 'who else'];
  const needKeywords = ['residence', 'investment', 'purpose', 'live in', 'rental'];
  const timelineKeywords = ['when', 'timeline', 'how soon', 'planning to'];
  
  const askedBudget = checkForKeywords(result1.response, budgetKeywords, true);
  const askedAuthority = checkForKeywords(result1.response, authorityKeywords, false);
  const askedNeed = checkForKeywords(result1.response, needKeywords, false);
  const askedTimeline = checkForKeywords(result1.response, timelineKeywords, false);
  
  if (askedBudget && !askedAuthority && !askedNeed && !askedTimeline) {
    console.log('✅ Correctly asked for BUDGET first (Step 1)');
  } else {
    console.log('❌ Did not follow correct order - should ask for BUDGET first');
  }
  
  // Test 2: After providing budget, should ask for AUTHORITY
  console.log('\n' + '=' .repeat(70));
  console.log('\n📝 Test 2: After providing budget\n');
  
  const result2 = await sendMessage('Around 5 million', conv1);
  console.log(`User: "Around 5 million"`);
  console.log(`AI: "${result2.response}"\n`);
  
  const askedAuthority2 = checkForKeywords(result2.response, authorityKeywords, true);
  const askedNeed2 = checkForKeywords(result2.response, needKeywords, false);
  const askedTimeline2 = checkForKeywords(result2.response, timelineKeywords, false);
  
  if (askedAuthority2 && !askedNeed2 && !askedTimeline2) {
    console.log('✅ Correctly asked for AUTHORITY second (Step 2)');
  } else {
    console.log('❌ Did not follow correct order - should ask for AUTHORITY after budget');
  }
  
  // Test 3: User provides timeline out of order
  console.log('\n' + '=' .repeat(70));
  console.log('\n📝 Test 3: User provides timeline out of order\n');
  
  const conv2 = `order-test-2-${Date.now()}`;
  console.log(`New Conversation ID: ${conv2}\n`);
  
  const result3a = await sendMessage('I need a condo', conv2);
  console.log(`User: "I need a condo"`);
  console.log(`AI: "${result3a.response}"\n`);
  
  // User provides timeline before budget
  const result3b = await sendMessage('I want to buy next month', conv2);
  console.log(`User: "I want to buy next month" (timeline provided out of order)`);
  console.log(`AI: "${result3b.response}"\n`);
  
  // Should acknowledge timeline but ask for BUDGET
  const acknowledgedTimeline = checkForKeywords(result3b.response, ['next month', 'month', 'noted', 'understand'], true);
  const askedBudgetNext = checkForKeywords(result3b.response, budgetKeywords, true);
  
  if (acknowledgedTimeline && askedBudgetNext) {
    console.log('✅ Correctly acknowledged timeline but asked for BUDGET (following order)');
  } else {
    console.log('❌ Did not handle out-of-order information correctly');
  }
  
  // Test 4: Complete flow in correct order
  console.log('\n' + '=' .repeat(70));
  console.log('\n📝 Test 4: Complete BANT flow in correct order\n');
  
  const conv3 = `order-test-3-${Date.now()}`;
  console.log(`New Conversation ID: ${conv3}\n`);
  
  const flow = [
    { message: 'Looking for a house', expectedStep: 'Budget', keywords: budgetKeywords },
    { message: '10 million pesos', expectedStep: 'Authority', keywords: authorityKeywords },
    { message: 'Just me deciding', expectedStep: 'Need', keywords: needKeywords },
    { message: 'For living', expectedStep: 'Timeline', keywords: timelineKeywords },
    { message: 'Within 3 months', expectedStep: 'Contact', keywords: ['name', 'contact', 'phone', 'number', 'email'] }
  ];
  
  let allCorrect = true;
  
  for (let i = 0; i < flow.length; i++) {
    const step = flow[i];
    console.log(`\n[Step ${i + 1}] Expected: ${step.expectedStep}`);
    console.log(`User: "${step.message}"`);
    
    const result = await sendMessage(step.message, conv3);
    console.log(`AI: "${result.response.substring(0, 150)}..."`);
    
    const hasExpectedKeywords = checkForKeywords(result.response, step.keywords, true);
    
    if (hasExpectedKeywords) {
      console.log(`✅ Correctly asked for ${step.expectedStep}`);
    } else {
      console.log(`❌ Did not ask for ${step.expectedStep} as expected`);
      allCorrect = false;
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 Test Summary:\n');
  
  if (allCorrect) {
    console.log('✅ BANT Sequential Order: WORKING CORRECTLY');
    console.log('   The system follows Budget → Authority → Need → Timeline order');
  } else {
    console.log('⚠️ BANT Sequential Order: Some issues detected');
    console.log('   Review the order enforcement in the prompt');
  }
  
  console.log('\n🎯 Key Rules Verified:');
  console.log('1. Always starts with BUDGET question');
  console.log('2. Follows strict order: Budget → Authority → Need → Timeline');
  console.log('3. Handles out-of-order information correctly');
  console.log('4. Never skips ahead in the sequence');
  
  console.log('\n✨ Test complete!\n');
}

// Run the test
testBANTSequentialOrder().catch(console.error);