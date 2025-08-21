#!/usr/bin/env node

/**
 * Final comprehensive BANT test with AI-only extraction
 * 30+ diverse scenarios to achieve 100% success rate
 */

const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// AI extraction function (mirrors server implementation)
async function extractBANTExactAI(messages) {
  try {
    const chatHistory = messages
      .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
      .slice(-20)
      .map(msg => `${(msg.sender === 'user' ? 'User' : 'AI')}: ${msg.content}`)
      .join('\n');
    
    const systemPrompt = `Extract BANT information from the conversation. Look for:
- Budget: Any mention of price, amount, or budget (e.g., "30M", "50-60M", "around 30M", "500k to 1M", "2 million", "8-10M", pure numbers like "50000000")
- Authority: Who makes decisions (e.g., "just me", "Yes I am", "yes", "no", "my spouse and I", "sole decision maker")
- Need: Purpose/use (e.g., "for living", "investment", "rental", "residence", "personal residence", "home")
- Timeline: When to move/buy (e.g., "next month", "3 months", "this year", "ASAP", "3-6 months", "within the year")

IMPORTANT RULES:
1. If user says numbers like "50-60M", "8-10M", "50000000" - that IS a budget answer!
2. If user says "Yes", "Yes I am", "Yep" after being asked about decision making - that IS an authority answer!
3. If user says "for living", "residence", "home" after being asked about purpose - that IS a need answer!
4. If user says "3 months", "next month", "ASAP" after being asked about timeline - that IS a timeline answer!

Return a JSON object with:
{
  "budget": "exact user answer or null",
  "authority": "exact user answer or null",
  "need": "exact user answer or null",
  "timeline": "exact user answer or null"
}
Only output the JSON, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: chatHistory }
      ],
      max_tokens: 150,
      temperature: 0
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[EXTRACT] Error:', error.message);
    return { budget: null, authority: null, need: null, timeline: null };
  }
}

// Fixed questions logic (mirrors server implementation)
function generateFixedQuestion(currentBant, previousBant, userMessage) {
  const lastUserMessage = userMessage.toLowerCase();
  let acknowledgment = '';
  
  // Build acknowledgment for what was just extracted
  if (currentBant.budget && !previousBant?.budget) {
    acknowledgment = `Great! I've noted your budget. `;
  } else if (currentBant.authority && !previousBant?.authority) {
    if (lastUserMessage.includes('yes') || lastUserMessage.includes('sole') || lastUserMessage.includes('i am')) {
      acknowledgment = 'Perfect, thank you for confirming. ';
    } else {
      acknowledgment = 'Got it, thanks for letting me know. ';
    }
  } else if (currentBant.need && !previousBant?.need) {
    const isResidence = lastUserMessage.includes('living') || 
                       lastUserMessage.includes('residence') || 
                       lastUserMessage.includes('live') ||
                       lastUserMessage.includes('family') ||
                       lastUserMessage.includes('home');
    acknowledgment = isResidence ? 'Great, for your personal residence! ' : 'Excellent, for investment purposes! ';
  } else if (currentBant.timeline && !previousBant?.timeline) {
    acknowledgment = `Perfect! `;
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
  
  return acknowledgment + nextQuestion;
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
    name: "Conversational",
    messages: ["Hello, interested in properties", "I have around 30 million", "Yes I'll decide myself", 
               "It's our family home", "Planning in 2 months", "Alex Chen 09887654321"]
  },
  {
    name: "Mixed language",
    messages: ["Hi po, looking for bahay", "8-10M budget ko", "ako lang", "for my family", "ASAP", "Juan 09123456789"]
  },
  {
    name: "Very short",
    messages: ["buy", "5M", "me", "live", "now", "Bob 0917"]
  },
  {
    name: "Verbose",
    messages: ["Good morning! Thinking about real estate", "I've saved about 25 million from business",
               "Yes, only I will decide", "For family to live comfortably", "Next 3-4 months ideally", 
               "Roberto Garcia 09234567890"]
  },
  {
    name: "Pure numbers",
    messages: ["interested", "20000000", "yes", "investment", "Q2 2024", "Ana 09456789012"]
  },
  {
    name: "Uncertain",
    messages: ["Maybe buy property", "around 40M more or less", "I think so, yes", "probably for rental",
               "maybe in 6 months", "Chris Lee 09567890123"]
  },
  {
    name: "Multiple people",
    messages: ["My wife and I want to buy", "We have 35M budget", "We both decide together", 
               "For us to live in", "By end of year", "David and Lisa 09678901234"]
  },
  {
    name: "With typos",
    messages: ["i wnat to buy codno", "budgte is 18M", "yse im the decison maker", 
               "for livign", "3 monhts", "Mike 09789012345"]
  },
  {
    name: "All caps",
    messages: ["I NEED A HOUSE", "BUDGET IS 22 MILLION", "YES I AM THE DECISION MAKER",
               "FOR MY FAMILY TO LIVE", "AS SOON AS POSSIBLE", "JAMES SMITH 09890123456"]
  },
  {
    name: "Mixed info",
    messages: ["I want to buy a condo with 12M budget", "I'm the buyer", "family home", 
               "next month", "Sarah 09901234567"]
  },
  {
    name: "Negative form",
    messages: ["Looking for property", "Not more than 30M", "No, my wife and I decide",
               "Not for investment, for living", "Not immediately, maybe 4 months", "Tom 09012345678"]
  },
  {
    name: "Currency format",
    messages: ["Property hunting", "PHP 45,000,000", "sole decision maker here",
               "residential", "within the year", "Nancy Drew 09123456789"]
  },
  {
    name: "Urgent",
    messages: ["URGENT! Need condo ASAP!", "Max 25M", "I decide", "To live", 
               "This month!", "Rush buyer 09234567890"]
  },
  {
    name: "Question intro",
    messages: ["Do you have condos?", "Budget 18-20M", "Yes just me", "For residence",
               "3-6 months timeline", "Karen Tan 09345678901"]
  },
  {
    name: "Specific type",
    messages: ["I want 3-bedroom house", "28 million pesos", "I'm the sole buyer",
               "Family residence", "Q3 2024", "George 09456789012"]
  },
  {
    name: "Location focus",
    messages: ["Property in BGC", "60M maximum", "Me alone", "Investment property",
               "2 months", "Patricia 09567890123"]
  },
  {
    name: "Comparison",
    messages: ["Comparing different condos", "15-18 million range", "I'm deciding",
               "Personal use", "Next year", "Oliver 09678901234"]
  },
  {
    name: "Business buyer",
    messages: ["Expanding business need space", "Company budget 100M", "Board approval but I'm CEO",
               "Commercial use", "Q1 next year", "CEO Richard 09789012345"]
  },
  {
    name: "Indirect",
    messages: ["Interested in listings", "Can go up to 70M", "Spouse and I but I lead",
               "Move family there", "After selling current home", "William Chen 09890123456"]
  },
  {
    name: "Technical",
    messages: ["Need 200sqm minimum", "Allocated 55M", "I have full authority",
               "Primary residence", "Closing in 90 days", "Engr. Jose 09901234567"]
  },
  {
    name: "Emotional",
    messages: ["Dream to own beautiful home", "Saved 40 million for this", "It's my decision",
               "Family's future home", "Before birthday in 4 months", "Diana Santos 09012345678"]
  },
  {
    name: "Investor",
    messages: ["Diversify portfolio", "Initial 80M investment", "I manage investments",
               "Purely rental yield", "When opportunity comes", "Mark Lee +639123456789"]
  },
  {
    name: "British style",
    messages: ["Keen on purchasing flat", "Budget is 32 million PHP", "I shall decide",
               "Family dwelling", "Within fortnight", "Charles 09234567890"]
  },
  {
    name: "Casual",
    messages: ["Yo need sick pad", "Got 20M to drop", "All me bro", "Gonna live there",
               "ASAP no cap", "Jake Paul 09345678901"]
  },
  {
    name: "Formal",
    messages: ["Inquire about real estate", "Allocated PHP 65,000,000", "Authorized as sole decision maker",
               "Corporate guest house", "Fiscal Q2", "Director Jennifer 09456789012"]
  },
  {
    name: "SMS style",
    messages: ["hi need 2 buy house", "hav 38m 4 budget", "yes im d 1 buying",
               "4 my fam 2 live", "nxt 2 mos if ok", "ronald 09567890123"]
  },
  {
    name: "Confused",
    messages: ["Um, I think I want to buy?", "Maybe 25 to 30 million?", "Oh yes, I guess I decide",
               "We'll probably live there", "Hmm, maybe 3 or 4 months?", "Lisa 09678901234"]
  }
];

// Run comprehensive test
async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL COMPREHENSIVE BANT TEST - AI EXTRACTION ONLY');
  console.log('═'.repeat(80));
  console.log(`Total Scenarios: ${testScenarios.length}\n`);
  
  const results = [];
  let passedCount = 0;
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    const conversation = [];
    let previousBant = null;
    let success = true;
    const errors = [];
    
    console.log(`\nScenario ${i + 1}/${testScenarios.length}: ${scenario.name}`);
    console.log('-'.repeat(60));
    
    for (let j = 0; j < scenario.messages.length; j++) {
      const userMsg = scenario.messages[j];
      
      // Add user message
      conversation.push({ sender: 'user', content: userMsg });
      
      // Extract BANT with AI
      const currentBant = await extractBANTExactAI(conversation);
      
      // Generate response
      const aiResponse = generateFixedQuestion(currentBant, previousBant, userMsg);
      
      // Add AI response
      conversation.push({ sender: 'ai', content: aiResponse });
      
      // Check for duplicates
      const currentQ = aiResponse.toLowerCase();
      if (j > 0) {
        for (let k = 0; k < conversation.length - 2; k += 2) {
          const prevQ = conversation[k + 1].content.toLowerCase();
          if (currentQ.includes('budget') && prevQ.includes('budget') && currentBant.budget) {
            errors.push(`Duplicate budget question at message ${j + 1}`);
            success = false;
          }
          if (currentQ.includes('decision') && prevQ.includes('decision') && currentBant.authority) {
            errors.push(`Duplicate authority question at message ${j + 1}`);
            success = false;
          }
          if (currentQ.includes('residence') && prevQ.includes('residence') && currentBant.need) {
            errors.push(`Duplicate need question at message ${j + 1}`);
            success = false;
          }
          if (currentQ.includes('planning') && prevQ.includes('planning') && currentBant.timeline) {
            errors.push(`Duplicate timeline question at message ${j + 1}`);
            success = false;
          }
        }
      }
      
      previousBant = { ...currentBant };
      
      // Progress indicator
      process.stdout.write('.');
    }
    
    // Final BANT check
    const finalBant = await extractBANTExactAI(conversation);
    const complete = finalBant.budget && finalBant.authority && finalBant.need && finalBant.timeline;
    
    if (!complete) {
      errors.push('BANT not complete');
      success = false;
    }
    
    if (success) {
      console.log(' ✅ PASSED');
      passedCount++;
    } else {
      console.log(' ❌ FAILED');
      console.log('  Errors:', errors.join(', '));
    }
    
    results.push({ scenario: scenario.name, success, errors, finalBant });
  }
  
  // Summary
  const successRate = (passedCount / testScenarios.length) * 100;
  
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL RESULTS');
  console.log('═'.repeat(80));
  console.log(`\nTotal: ${testScenarios.length}`);
  console.log(`Passed: ${passedCount} (${successRate.toFixed(1)}%)`);
  console.log(`Failed: ${testScenarios.length - passedCount}`);
  
  if (successRate === 100) {
    console.log('\n🎉 PERFECT! 100% SUCCESS RATE ACHIEVED!');
  } else {
    console.log('\nFailed scenarios:');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.scenario}: ${r.errors.join(', ')}`);
    });
  }
  
  console.log('\n' + '═'.repeat(80));
  
  // Save results
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    `test-results-final-${timestamp}.json`,
    JSON.stringify({ summary: { total: testScenarios.length, passed: passedCount, successRate }, results }, null, 2)
  );
  
  return successRate === 100;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });