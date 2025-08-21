#!/usr/bin/env node

/**
 * Comprehensive BANT test with mocked server logic
 * Tests fixed questions implementation with 30+ scenarios
 */

// Mock the BANT detection and generation logic
class BANTProcessor {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.bant = {
      budget: null,
      authority: null,
      need: null,
      timeline: null
    };
    this.conversation = [];
  }
  
  // Detect what BANT question was asked
  wasLastAIMessageBANTQuestion() {
    if (this.conversation.length === 0) return null;
    
    const lastAIMessage = [...this.conversation].reverse().find(m => m.sender === 'ai');
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
  
  // Detect if message is a BANT answer
  isLikelyBANTAnswer(message) {
    if (!message) return { isBant: false, type: null, confidence: 0 };
    
    const msg = message.toLowerCase().trim();
    
    // Budget patterns
    if (/\b\d+[\s-]*(m|million|mil)\b/i.test(message) ||
        /\b\d{6,}\b/.test(message) ||
        /php[\s]*\d+/i.test(message) ||
        /budget.*\d+/i.test(message)) {
      return { isBant: true, type: 'budget', confidence: 0.95 };
    }
    
    // Authority patterns - FIXED to properly detect simple "yes"
    const lastQuestion = this.wasLastAIMessageBANTQuestion();
    if (lastQuestion === 'authority') {
      // If we just asked about authority, simple affirmatives are authority answers
      if (/^(yes|yep|yeah|yup|sure|ok|okay|correct|right|absolutely|definitely)[\s!.,]*$/i.test(msg)) {
        return { isBant: true, type: 'authority', confidence: 0.95 };
      }
    }
    
    // General authority patterns
    if (/(sole|decision maker|i am|yes i am|i decide|just me|myself|i'm the|i will)/i.test(message)) {
      return { isBant: true, type: 'authority', confidence: 0.95 };
    }
    
    // Need patterns
    if (/(living|residence|home|investment|rental|personal|family)/i.test(message)) {
      return { isBant: true, type: 'need', confidence: 0.90 };
    }
    
    // Timeline patterns
    if (/(month|year|asap|soon|quarter|q[1-4]|immediately|weeks|days)/i.test(message)) {
      return { isBant: true, type: 'timeline', confidence: 0.90 };
    }
    
    // Contact patterns
    if (/\d{10,}|09\d{9}|\+63/i.test(message) || /[a-z]+[\s]+\d{10}/i.test(message)) {
      return { isBant: true, type: 'contact', confidence: 0.95 };
    }
    
    return { isBant: false, type: null, confidence: 0 };
  }
  
  // Extract BANT from conversation
  extractBANT() {
    const extracted = { ...this.bant };
    
    for (let i = 0; i < this.conversation.length; i++) {
      const msg = this.conversation[i];
      
      if (msg.sender === 'user') {
        const detection = this.isLikelyBANTAnswer(msg.content);
        
        if (detection.isBant && detection.type) {
          if (detection.type === 'budget' && !extracted.budget) {
            extracted.budget = msg.content;
          } else if (detection.type === 'authority' && !extracted.authority) {
            extracted.authority = msg.content;
          } else if (detection.type === 'need' && !extracted.need) {
            extracted.need = msg.content;
          } else if (detection.type === 'timeline' && !extracted.timeline) {
            extracted.timeline = msg.content;
          }
        }
      }
    }
    
    return extracted;
  }
  
  // Generate fixed question response
  generateResponse(userMessage) {
    // Add user message to conversation
    this.conversation.push({ sender: 'user', content: userMessage });
    
    // Extract BANT including current message
    const currentBant = this.extractBANT();
    
    // Get previous BANT (before current message)
    const previousBant = { ...this.bant };
    
    // Update stored BANT
    this.bant = currentBant;
    
    // Build acknowledgment
    let acknowledgment = '';
    const lastUserMessage = userMessage.toLowerCase();
    
    if (currentBant.budget && !previousBant.budget) {
      acknowledgment = `Great! I've noted your budget of ${currentBant.budget}. `;
    } else if (currentBant.authority && !previousBant.authority) {
      if (lastUserMessage.includes('yes') || lastUserMessage.includes('sole') || lastUserMessage.includes('i am')) {
        acknowledgment = 'Perfect, thank you for confirming. ';
      } else {
        acknowledgment = 'Got it, thanks for letting me know. ';
      }
    } else if (currentBant.need && !previousBant.need) {
      const isResidence = lastUserMessage.includes('living') || lastUserMessage.includes('residence');
      acknowledgment = isResidence ? 'Great, for your personal residence! ' : 'Excellent, for investment purposes! ';
    } else if (currentBant.timeline && !previousBant.timeline) {
      acknowledgment = `Perfect, ${currentBant.timeline} works! `;
    }
    
    // Generate next question
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
    
    const response = acknowledgment + nextQuestion;
    
    // Add AI response to conversation
    this.conversation.push({ sender: 'ai', content: response });
    
    return response;
  }
}

// Test scenarios - 30 diverse cases
const testScenarios = [
  {
    name: "Basic flow with simple answers",
    messages: ["Hi I want to buy a condo", "15M", "yes", "for living", "3 months", "John Doe 09171234567"]
  },
  {
    name: "Detailed answers",
    messages: ["Looking for investment property", "My budget is 50 million pesos", "I am the sole decision maker", 
               "This is for investment purposes", "Within 6 months", "Maria Santos 639201234567"]
  },
  {
    name: "Range answers",
    messages: ["Need a house", "50-60M", "just me", "personal use", "next quarter", "Peter 09123456789"]
  },
  {
    name: "Conversational answers",
    messages: ["Hello, interested in properties", "I have around 30 million", "Yes I'll decide myself", 
               "It's our family home", "Planning in 2 months", "Alex Chen 09887654321"]
  },
  {
    name: "Mixed language",
    messages: ["Hi po, looking for bahay", "8-10M budget ko", "ako lang", "for my family", "ASAP", "Juan 09123456789"]
  },
  {
    name: "Very short answers",
    messages: ["buy", "5M", "me", "live", "now", "Bob 0917"]
  },
  {
    name: "Verbose answers",
    messages: ["Good morning! Thinking about real estate", "I've saved about 25 million from business",
               "Yes, only I will decide", "For family to live comfortably", "Next 3-4 months ideally", 
               "Roberto Garcia 09234567890"]
  },
  {
    name: "Pure numbers",
    messages: ["interested", "20000000", "yes", "investment", "Q2 2024", "Ana 09456789012"]
  },
  {
    name: "Uncertain answers",
    messages: ["Maybe buy property", "around 40M more or less", "I think so, yes", "probably for rental",
               "maybe in 6 months", "Chris Lee 09567890123"]
  },
  {
    name: "Multiple people",
    messages: ["My wife and I want to buy", "We have 35M budget", "We both decide together", 
               "For us to live in", "By end of year", "David and Lisa 09678901234"]
  },
  {
    name: "Typos",
    messages: ["i wnat to buy codno", "budgte is 18M", "yse im the decison maker", 
               "for livign", "3 monhts", "Mike 09789012345"]
  },
  {
    name: "All caps",
    messages: ["I NEED A HOUSE", "BUDGET IS 22 MILLION", "YES I AM THE DECISION MAKER",
               "FOR MY FAMILY TO LIVE", "AS SOON AS POSSIBLE", "JAMES SMITH 09890123456"]
  },
  {
    name: "Mixed info in one",
    messages: ["I want to buy a condo with 12M budget", "I'm the buyer", "family home", 
               "next month", "Sarah 09901234567"]
  },
  {
    name: "Negative responses",
    messages: ["Looking for property", "Not more than 30M", "No, my wife and I decide",
               "Not for investment, for living", "Not immediately, maybe 4 months", "Tom 09012345678"]
  },
  {
    name: "Currency variations",
    messages: ["Property hunting", "PHP 45,000,000", "sole decision maker here",
               "residential", "within the year", "Nancy Drew 09123456789"]
  },
  {
    name: "Urgent request",
    messages: ["URGENT! Need condo ASAP!", "Max 25M", "I decide", "To live", 
               "This month!", "Rush buyer 09234567890"]
  },
  {
    name: "Question as intro",
    messages: ["Do you have condos?", "Budget 18-20M", "Yes just me", "For residence",
               "3-6 months timeline", "Karen Tan 09345678901"]
  },
  {
    name: "Specific property",
    messages: ["I want 3-bedroom house", "28 million pesos", "I'm the sole buyer",
               "Family residence", "Q3 2024", "George 09456789012"]
  },
  {
    name: "Location specific",
    messages: ["Property in BGC", "60M maximum", "Me alone", "Investment property",
               "2 months", "Patricia 09567890123"]
  },
  {
    name: "Comparison shopping",
    messages: ["Comparing different condos", "15-18 million range", "I'm deciding",
               "Personal use", "Next year", "Oliver 09678901234"]
  },
  {
    name: "Business discussion",
    messages: ["Expanding business need space", "Company budget 100M", "Board approval but I'm CEO",
               "Commercial use", "Q1 next year", "CEO Richard 09789012345"]
  },
  {
    name: "Indirect answers",
    messages: ["Interested in listings", "Can go up to 70M", "Spouse and I but I lead",
               "Move family there", "After selling current home", "William Chen 09890123456"]
  },
  {
    name: "Technical buyer",
    messages: ["Need 200sqm minimum", "Allocated 55M", "I have full authority",
               "Primary residence", "Closing in 90 days", "Engr. Jose 09901234567"]
  },
  {
    name: "Emotional buyer",
    messages: ["Dream to own beautiful home", "Saved 40 million for this", "It's my decision",
               "Family's future home", "Before birthday in 4 months", "Diana Santos 09012345678"]
  },
  {
    name: "Investor mindset",
    messages: ["Diversify portfolio", "Initial 80M investment", "I manage investments",
               "Purely rental yield", "When opportunity comes", "Mark Lee +639123456789"]
  },
  {
    name: "British English",
    messages: ["Keen on purchasing flat", "Budget is 32 million PHP", "I shall decide",
               "Family dwelling", "Within fortnight", "Charles 09234567890"]
  },
  {
    name: "Millennial speak",
    messages: ["Yo need sick pad", "Got 20M to drop", "All me bro", "Gonna live there",
               "ASAP no cap", "Jake Paul 09345678901"]
  },
  {
    name: "Formal language",
    messages: ["Inquire about real estate", "Allocated PHP 65,000,000", "Authorized as sole decision maker",
               "Corporate guest house", "Fiscal Q2", "Director Jennifer 09456789012"]
  },
  {
    name: "SMS style",
    messages: ["hi need 2 buy house", "hav 38m 4 budget", "yes im d 1 buying",
               "4 my fam 2 live", "nxt 2 mos if ok", "ronald 09567890123"]
  },
  {
    name: "Confused buyer",
    messages: ["Um, I think I want to buy?", "Maybe 25 to 30 million?", "Oh yes, I guess I decide",
               "We'll probably live there", "Hmm, maybe 3 or 4 months?", "Lisa 09678901234"]
  }
];

// Run tests
async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('COMPREHENSIVE BANT FIXED QUESTIONS TEST - MOCKED');
  console.log('═'.repeat(80));
  console.log(`Total Scenarios: ${testScenarios.length}\n`);
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    const processor = new BANTProcessor();
    let success = true;
    const errors = [];
    
    console.log(`\nScenario ${i + 1}/${testScenarios.length}: ${scenario.name}`);
    console.log('-'.repeat(60));
    
    for (let j = 0; j < scenario.messages.length; j++) {
      const userMessage = scenario.messages[j];
      console.log(`  User: "${userMessage}"`);
      
      const aiResponse = processor.generateResponse(userMessage);
      console.log(`  AI: "${aiResponse.substring(0, 80)}${aiResponse.length > 80 ? '...' : ''}"`);
      
      // Check for duplicate questions
      if (j > 0) {
        const currentQuestion = aiResponse.toLowerCase();
        const prevQuestions = processor.conversation
          .filter(m => m.sender === 'ai')
          .slice(0, -1)
          .map(m => m.content.toLowerCase());
        
        for (const prevQ of prevQuestions) {
          if (currentQuestion.includes('budget') && prevQ.includes('budget')) {
            errors.push(`Duplicate budget question at step ${j + 1}`);
            success = false;
          } else if (currentQuestion.includes('decision') && prevQ.includes('decision')) {
            errors.push(`Duplicate authority question at step ${j + 1}`);
            success = false;
          } else if (currentQuestion.includes('residence') && prevQ.includes('residence')) {
            errors.push(`Duplicate need question at step ${j + 1}`);
            success = false;
          } else if (currentQuestion.includes('planning') && prevQ.includes('planning')) {
            errors.push(`Duplicate timeline question at step ${j + 1}`);
            success = false;
          }
        }
      }
    }
    
    // Check final BANT state
    const finalBant = processor.bant;
    console.log(`  Final BANT: B:${finalBant.budget ? '✓' : '✗'} A:${finalBant.authority ? '✓' : '✗'} N:${finalBant.need ? '✓' : '✗'} T:${finalBant.timeline ? '✓' : '✗'}`);
    
    if (!finalBant.budget || !finalBant.authority || !finalBant.need || !finalBant.timeline) {
      errors.push('Not all BANT fields collected');
      success = false;
    }
    
    if (success) {
      console.log(`  ✅ PASSED`);
      passedCount++;
    } else {
      console.log(`  ❌ FAILED: ${errors.join(', ')}`);
      failedCount++;
    }
    
    results.push({
      scenario: scenario.name,
      success,
      errors,
      finalBant
    });
  }
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL RESULTS SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTotal Scenarios: ${testScenarios.length}`);
  console.log(`✅ Passed: ${passedCount} (${((passedCount/testScenarios.length)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failedCount} (${((failedCount/testScenarios.length)*100).toFixed(1)}%)`);
  
  if (failedCount > 0) {
    console.log('\nFailed Scenarios:');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.scenario}`);
      r.errors.forEach(err => console.log(`     - ${err}`));
    });
  }
  
  const successRate = (passedCount / testScenarios.length) * 100;
  console.log(`\n${'='.repeat(80)}`);
  if (successRate === 100) {
    console.log('🎉 PERFECT! 100% SUCCESS RATE ACHIEVED!');
  } else if (successRate >= 90) {
    console.log(`📊 Good progress: ${successRate.toFixed(1)}% success rate`);
  } else {
    console.log(`⚠️ Needs improvement: ${successRate.toFixed(1)}% success rate`);
  }
  console.log('='.repeat(80));
  
  return successRate === 100;
}

// Run the test
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(console.error);