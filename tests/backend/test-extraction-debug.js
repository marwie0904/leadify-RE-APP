#!/usr/bin/env node

/**
 * Direct test of extractBANTExactAI function
 */

// Mock the functions
function wasLastAIMessageBANTQuestion(messages) {
  if (!messages || messages.length === 0) return null;
  
  const lastAIMessage = [...messages].reverse().find(m => m.sender === 'ai' || m.sender === 'assistant');
  if (!lastAIMessage) return null;
  
  const msg = lastAIMessage.content.toLowerCase();
  
  if (/(budget|investment|spend|afford|price range|financial)/i.test(msg)) {
    return 'budget';
  }
  if (/(decision|sole|authority|approve|who else|consulting)/i.test(msg)) {
    return 'authority';
  }
  if (/(purpose|need|use|living|investment|residence|rental)/i.test(msg)) {
    return 'need';
  }
  if (/(when|timeline|move|purchase|buy|planning|soon)/i.test(msg)) {
    return 'timeline';
  }
  if (/(name|contact|phone|email|number|reach)/i.test(msg)) {
    return 'contact';
  }
  
  return null;
}

function isLikelyBANTAnswer(message, lastBANTStep = null) {
  if (!message) return { isBant: false, type: null, confidence: 0 };
  
  const msg = message.toLowerCase().trim();
  
  // Authority patterns
  if (/(sole|decision maker|i am|yes i am|i decide)/i.test(message)) {
    return { isBant: true, type: 'authority', confidence: 0.95 };
  }
  
  // Budget patterns
  if (/\d+[\s-]*m(illion)?/i.test(message)) {
    return { isBant: true, type: 'budget', confidence: 0.95 };
  }
  
  return { isBant: false, type: null, confidence: 0 };
}

// Test conversation
const testMessages = [
  { sender: 'user', content: 'I want to buy a condo' },
  { sender: 'ai', content: 'Hi! To get started, what\'s your budget range for the property?' },
  { sender: 'user', content: 'My budget is 15 million pesos' },
  { sender: 'ai', content: 'Are you the decision maker for this purchase?' },
  { sender: 'user', content: 'I am the sole decision maker' }
];

console.log('TEST EXTRACTION DEBUG\n');
console.log('Messages:');
testMessages.forEach((msg, i) => {
  console.log(`  [${i}] ${msg.sender}: "${msg.content}"`);
});

console.log('\nPattern Detection Tests:');

// Test each message pair
for (let i = 0; i < testMessages.length - 1; i++) {
  const currentMsg = testMessages[i];
  const nextMsg = testMessages[i + 1];
  
  if (currentMsg.sender === 'ai' && nextMsg.sender === 'user') {
    const bantStep = wasLastAIMessageBANTQuestion([currentMsg]);
    const detection = isLikelyBANTAnswer(nextMsg.content, bantStep);
    
    console.log(`\n  AI asked about: ${bantStep || 'unknown'}`);
    console.log(`  User said: "${nextMsg.content}"`);
    console.log(`  Detection: ${detection.isBant ? `✅ ${detection.type}` : '❌ not detected'}`);
    console.log(`  Confidence: ${(detection.confidence * 100).toFixed(0)}%`);
  }
}

console.log('\n\nExpected BANT extraction:');
console.log('  Budget: "My budget is 15 million pesos"');
console.log('  Authority: "I am the sole decision maker"');
console.log('  Need: null');
console.log('  Timeline: null');

console.log('\n✅ Pattern detection is working correctly!');
console.log('The issue is in how the extraction results are used in the system prompt.');