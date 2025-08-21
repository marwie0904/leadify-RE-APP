#!/usr/bin/env node

/**
 * Simple test of fixed questions logic without requiring auth
 * This simulates the server-side logic directly
 */

// Import the detection functions
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
  
  // Budget patterns
  const budgetPatterns = [
    /\b\d+[\s-]*(m|million|mil)\b/i,
    /\b\d+[\s-]*(k|thousand)\b/i,
    /\b\d{6,}\b/,
    /budget.*\d+/i,
    /php[\s]*\d+/i,
    /around[\s]*\d+/i
  ];
  
  for (const pattern of budgetPatterns) {
    if (pattern.test(message)) {
      return { isBant: true, type: 'budget', confidence: 0.95 };
    }
  }
  
  // Authority patterns
  if (/(sole|decision maker|i am|yes i am|i decide|just me|myself|i'm the|i will)/i.test(message)) {
    return { isBant: true, type: 'authority', confidence: 0.95 };
  }
  
  // Need patterns
  if (/(living|residence|home|investment|rental|personal|family)/i.test(message)) {
    return { isBant: true, type: 'need', confidence: 0.90 };
  }
  
  // Timeline patterns
  if (/(month|year|asap|soon|quarter|q[1-4]|immediately|weeks)/i.test(message)) {
    return { isBant: true, type: 'timeline', confidence: 0.90 };
  }
  
  // Contact patterns
  if (/\d{10,}|09\d{9}|\+63/i.test(message) || /[a-z]+[\s]+\d{10}/i.test(message)) {
    return { isBant: true, type: 'contact', confidence: 0.95 };
  }
  
  return { isBant: false, type: null, confidence: 0 };
}

// Simulate BANT extraction
function extractBANTFromMessages(messages) {
  const bant = {
    budget: null,
    authority: null,
    need: null,
    timeline: null
  };
  
  // Process each message pair
  for (let i = 0; i < messages.length - 1; i++) {
    const currentMsg = messages[i];
    const nextMsg = messages[i + 1];
    
    if (currentMsg.sender === 'ai' && nextMsg.sender === 'user') {
      const bantStep = wasLastAIMessageBANTQuestion([currentMsg]);
      const detection = isLikelyBANTAnswer(nextMsg.content, bantStep);
      
      if (detection.isBant && detection.type) {
        if (detection.type === 'budget' && !bant.budget) {
          bant.budget = nextMsg.content;
        } else if (detection.type === 'authority' && !bant.authority) {
          bant.authority = nextMsg.content;
        } else if (detection.type === 'need' && !bant.need) {
          bant.need = nextMsg.content;
        } else if (detection.type === 'timeline' && !bant.timeline) {
          bant.timeline = nextMsg.content;
        }
      }
    }
  }
  
  return bant;
}

// Generate fixed question response
function generateFixedQuestionResponse(currentBant, previousBant, lastUserMessage) {
  let acknowledgment = '';
  
  // Build acknowledgment based on what was just extracted
  if (currentBant.budget && !previousBant?.budget) {
    acknowledgment = `Great! I've noted your budget of ${currentBant.budget}. `;
  } else if (currentBant.authority && !previousBant?.authority) {
    if (lastUserMessage.toLowerCase().includes('yes') || lastUserMessage.toLowerCase().includes('sole')) {
      acknowledgment = 'Perfect, thank you for confirming. ';
    } else {
      acknowledgment = 'Got it, thanks for letting me know. ';
    }
  } else if (currentBant.need && !previousBant?.need) {
    const isResidence = lastUserMessage.toLowerCase().includes('living') || 
                       lastUserMessage.toLowerCase().includes('residence');
    acknowledgment = isResidence ? 'Great, for your personal residence! ' : 'Excellent, for investment purposes! ';
  } else if (currentBant.timeline && !previousBant?.timeline) {
    acknowledgment = `Perfect, ${currentBant.timeline} works! `;
  }
  
  // Generate the next question based on what's missing
  let nextQuestion = '';
  
  if (!currentBant.budget) {
    nextQuestion = "To help find the perfect property for you, what's your budget range?";
  } else if (!currentBant.authority) {
    nextQuestion = "Will you be the sole decision maker for this purchase?";
  } else if (!currentBant.need) {
    nextQuestion = "Will this property be for personal residence or investment?";
  } else if (!currentBant.timeline) {
    nextQuestion = "When are you planning to make this purchase?";
  } else {
    nextQuestion = "Excellent! To send you the best property options, may I have your name and contact number?";
  }
  
  return acknowledgment + nextQuestion;
}

// Test scenarios
const scenarios = [
  {
    name: "Basic flow",
    conversation: [
      { sender: 'user', content: 'Hi I want to buy a condo' },
      { sender: 'ai', content: "To help find the perfect property for you, what's your budget range?" },
      { sender: 'user', content: '15M' },
      { sender: 'ai', content: "Great! I've noted your budget of 15M. Will you be the sole decision maker for this purchase?" },
      { sender: 'user', content: 'yes' },
      { sender: 'ai', content: "Perfect, thank you for confirming. Will this property be for personal residence or investment?" },
      { sender: 'user', content: 'for living' },
      { sender: 'ai', content: "Great, for your personal residence! When are you planning to make this purchase?" },
      { sender: 'user', content: '3 months' },
      { sender: 'ai', content: "Perfect, 3 months works! Excellent! To send you the best property options, may I have your name and contact number?" },
      { sender: 'user', content: 'John Doe 09171234567' }
    ]
  },
  {
    name: "Complex answers",
    conversation: [
      { sender: 'user', content: 'Looking for investment property' },
      { sender: 'ai', content: "To help find the perfect property for you, what's your budget range?" },
      { sender: 'user', content: 'My budget is 50 million pesos' },
      { sender: 'ai', content: "Great! I've noted your budget of My budget is 50 million pesos. Will you be the sole decision maker for this purchase?" },
      { sender: 'user', content: 'I am the sole decision maker' },
      { sender: 'ai', content: "Perfect, thank you for confirming. Will this property be for personal residence or investment?" },
      { sender: 'user', content: 'This is for investment purposes' },
      { sender: 'ai', content: "Excellent, for investment purposes! When are you planning to make this purchase?" },
      { sender: 'user', content: 'Within 6 months' },
      { sender: 'ai', content: "Perfect, Within 6 months works! Excellent! To send you the best property options, may I have your name and contact number?" }
    ]
  },
  {
    name: "Range answers",
    conversation: [
      { sender: 'user', content: 'Need a house' },
      { sender: 'ai', content: "To help find the perfect property for you, what's your budget range?" },
      { sender: 'user', content: '50-60M' },
      { sender: 'ai', content: "Great! I've noted your budget of 50-60M. Will you be the sole decision maker for this purchase?" },
      { sender: 'user', content: 'just me' },
      { sender: 'ai', content: "Perfect, thank you for confirming. Will this property be for personal residence or investment?" },
      { sender: 'user', content: 'personal use' },
      { sender: 'ai', content: "Great, for your personal residence! When are you planning to make this purchase?" },
      { sender: 'user', content: 'next quarter' },
      { sender: 'ai', content: "Perfect, next quarter works! Excellent! To send you the best property options, may I have your name and contact number?" }
    ]
  }
];

// Run tests
console.log('TESTING FIXED QUESTIONS LOGIC\n');
console.log('='.repeat(80));

let passedCount = 0;
let failedCount = 0;

scenarios.forEach((scenario, index) => {
  console.log(`\nScenario ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(40));
  
  const messages = [];
  let allCorrect = true;
  
  for (let i = 0; i < scenario.conversation.length; i += 2) {
    const userMsg = scenario.conversation[i];
    const expectedAI = scenario.conversation[i + 1];
    
    messages.push(userMsg);
    
    // Extract BANT from messages so far
    const currentBant = extractBANTFromMessages(messages);
    
    // Get previous BANT (excluding current message)
    const previousMessages = messages.slice(0, -1);
    const previousBant = previousMessages.length > 0 ? extractBANTFromMessages(previousMessages) : {};
    
    // Generate response using fixed questions logic
    const aiResponse = generateFixedQuestionResponse(currentBant, previousBant, userMsg.content);
    
    // Add AI response to messages
    messages.push({ sender: 'ai', content: aiResponse });
    
    // Check if response matches expected
    console.log(`  User: "${userMsg.content}"`);
    console.log(`  AI: "${aiResponse}"`);
    
    if (expectedAI) {
      const expectedLC = expectedAI.content.toLowerCase();
      const actualLC = aiResponse.toLowerCase();
      
      // Check for key parts of expected response
      let isCorrect = false;
      if (expectedLC.includes('budget') && actualLC.includes('budget')) isCorrect = true;
      else if (expectedLC.includes('decision') && actualLC.includes('decision')) isCorrect = true;
      else if (expectedLC.includes('residence') && actualLC.includes('residence')) isCorrect = true;
      else if (expectedLC.includes('planning') && actualLC.includes('planning')) isCorrect = true;
      else if (expectedLC.includes('contact') && actualLC.includes('contact')) isCorrect = true;
      
      if (!isCorrect) {
        console.log(`  ❌ Expected to ask about: ${expectedAI.content.substring(0, 50)}...`);
        allCorrect = false;
      } else {
        console.log(`  ✅ Correct question`);
      }
    }
  }
  
  if (allCorrect) {
    console.log(`\n✅ Scenario PASSED`);
    passedCount++;
  } else {
    console.log(`\n❌ Scenario FAILED`);
    failedCount++;
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Scenarios: ${scenarios.length}`);
console.log(`✅ Passed: ${passedCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`Success Rate: ${((passedCount / scenarios.length) * 100).toFixed(1)}%`);

if (passedCount === scenarios.length) {
  console.log('\n🎉 PERFECT! All scenarios passed!');
} else {
  console.log('\n⚠️ Some scenarios failed. Review the logic.');
}