#!/usr/bin/env node

/**
 * Comprehensive test of FIXED QUESTIONS LOGIC with 30+ scenarios
 * Tests diverse intros, questions, and BANT answers to ensure 100% success rate
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const AGENT_ID = process.env.TEST_AGENT_ID || 'test-agent-001';

// Test scenarios - 30+ diverse test cases
const testScenarios = [
  // === BASIC FLOWS (1-5) ===
  {
    name: "Basic flow with simple answers",
    messages: [
      { user: "Hi I want to buy a condo" },
      { user: "15M" },
      { user: "yes" },
      { user: "for living" },
      { user: "3 months" },
      { user: "John Doe 09171234567" }
    ],
    expectedQuestions: [
      "what's your budget range",
      "sole decision maker",
      "personal residence or investment",
      "When are you planning",
      "name and contact"
    ]
  },
  {
    name: "Basic flow with detailed answers",
    messages: [
      { user: "Looking for investment property" },
      { user: "My budget is 50 million pesos" },
      { user: "I am the sole decision maker" },
      { user: "This is for investment purposes" },
      { user: "Within 6 months" },
      { user: "Maria Santos, 639201234567" }
    ],
    expectedQuestions: [
      "budget range",
      "decision maker",
      "residence or investment",
      "planning to make",
      "name and contact"
    ]
  },
  {
    name: "Range answers",
    messages: [
      { user: "Need a house" },
      { user: "50-60M" },
      { user: "just me" },
      { user: "personal use" },
      { user: "next quarter" },
      { user: "Peter 09123456789" }
    ],
    expectedQuestions: [
      "budget",
      "decision maker",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Conversational answers",
    messages: [
      { user: "Hello, I'm interested in properties" },
      { user: "I have around 30 million to spend" },
      { user: "Yes I'll be making the decision myself" },
      { user: "It's going to be our family home" },
      { user: "We're planning to move in 2 months" },
      { user: "I'm Alex Chen, my number is 09887654321" }
    ],
    expectedQuestions: [
      "budget",
      "sole decision",
      "residence or investment",
      "planning",
      "name and contact"
    ]
  },
  {
    name: "Mixed language flow",
    messages: [
      { user: "Hi po, looking for bahay" },
      { user: "8-10M budget ko" },
      { user: "ako lang" },
      { user: "for my family" },
      { user: "ASAP" },
      { user: "Juan Cruz 09123456789" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },

  // === EDGE CASES (6-10) ===
  {
    name: "Very short answers",
    messages: [
      { user: "buy" },
      { user: "5M" },
      { user: "me" },
      { user: "live" },
      { user: "now" },
      { user: "Bob 0917" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Verbose answers",
    messages: [
      { user: "Good morning! I've been thinking about purchasing real estate" },
      { user: "Well, I've saved up about 25 million pesos from my business" },
      { user: "Yes, I'm the only one who will decide on this purchase" },
      { user: "We're looking for a place where my family can live comfortably" },
      { user: "Ideally within the next 3 to 4 months if we find something good" },
      { user: "My name is Roberto Garcia and you can reach me at 09234567890" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Numbers without context",
    messages: [
      { user: "interested" },
      { user: "20000000" },
      { user: "yes" },
      { user: "investment" },
      { user: "Q2 2024" },
      { user: "Ana 09456789012" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Uncertain answers",
    messages: [
      { user: "Maybe buy property" },
      { user: "around 40M more or less" },
      { user: "I think so, yes" },
      { user: "probably for rental income" },
      { user: "maybe in 6 months" },
      { user: "Chris Lee 09567890123" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Multiple people mentioned",
    messages: [
      { user: "My wife and I want to buy" },
      { user: "We have 35M budget" },
      { user: "We both decide together" },
      { user: "For us to live in" },
      { user: "By end of year" },
      { user: "David and Lisa 09678901234" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },

  // === STRESS TESTS (11-15) ===
  {
    name: "Typos and misspellings",
    messages: [
      { user: "i wnat to buy codno" },
      { user: "budgte is 18M" },
      { user: "yse im the decison maker" },
      { user: "for livign" },
      { user: "3 monhts" },
      { user: "Mike 09789012345" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "All caps answers",
    messages: [
      { user: "I NEED A HOUSE" },
      { user: "BUDGET IS 22 MILLION" },
      { user: "YES I AM THE DECISION MAKER" },
      { user: "FOR MY FAMILY TO LIVE" },
      { user: "AS SOON AS POSSIBLE" },
      { user: "JAMES SMITH 09890123456" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Mixed information in one message",
    messages: [
      { user: "I want to buy a condo with 12M budget" },
      { user: "I'm the buyer" },
      { user: "family home" },
      { user: "next month" },
      { user: "Sarah 09901234567" }
    ],
    expectedQuestions: [
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Negative responses",
    messages: [
      { user: "Looking for property" },
      { user: "Not more than 30M" },
      { user: "No, my wife and I decide" },
      { user: "Not for investment, for living" },
      { user: "Not immediately, maybe 4 months" },
      { user: "Tom Wilson 09012345678" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Currency variations",
    messages: [
      { user: "Property hunting" },
      { user: "PHP 45,000,000" },
      { user: "sole decision maker here" },
      { user: "residential" },
      { user: "within the year" },
      { user: "Nancy Drew 09123456789" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },

  // === DIFFERENT INTROS (16-20) ===
  {
    name: "Urgent request intro",
    messages: [
      { user: "URGENT! Need condo ASAP!" },
      { user: "Max 25M" },
      { user: "I decide" },
      { user: "To live" },
      { user: "This month!" },
      { user: "Rush buyer 09234567890" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Question as intro",
    messages: [
      { user: "Do you have condos available?" },
      { user: "Budget around 18-20M" },
      { user: "Yes just me" },
      { user: "For my residence" },
      { user: "3-6 months timeline" },
      { user: "Karen Tan 09345678901" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Specific property type intro",
    messages: [
      { user: "I want a 3-bedroom house" },
      { user: "28 million pesos" },
      { user: "I'm the sole buyer" },
      { user: "Family residence" },
      { user: "Q3 2024" },
      { user: "George 09456789012" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Location-specific intro",
    messages: [
      { user: "Looking for property in BGC" },
      { user: "60M maximum" },
      { user: "Me alone" },
      { user: "Investment property" },
      { user: "2 months" },
      { user: "Patricia 09567890123" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Comparison shopping intro",
    messages: [
      { user: "Comparing different condos" },
      { user: "15-18 million range" },
      { user: "I'm deciding" },
      { user: "Personal use" },
      { user: "Next year" },
      { user: "Oliver 09678901234" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },

  // === COMPLEX SCENARIOS (21-25) ===
  {
    name: "Business discussion",
    messages: [
      { user: "We're expanding our business and need commercial space" },
      { user: "Company budget is 100M" },
      { user: "Board approval required but I'm the CEO" },
      { user: "Commercial use for our operations" },
      { user: "Q1 next year after board approval" },
      { user: "CEO Richard Tang 09789012345" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Indirect answers",
    messages: [
      { user: "Interested in your listings" },
      { user: "I can go up to eight figures, say 70M" },
      { user: "My spouse and I will decide but I'm leading the search" },
      { user: "We want to move our family there" },
      { user: "Once we sell our current home, maybe 5 months" },
      { user: "William Chen, mobile 09890123456" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Technical buyer",
    messages: [
      { user: "Need 200sqm floor area minimum" },
      { user: "Allocated 55M for this purchase" },
      { user: "I have full authority" },
      { user: "Primary residence" },
      { user: "Target closing in 90 days" },
      { user: "Engr. Jose Reyes 09901234567" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Emotional buyer",
    messages: [
      { user: "My dream is to own a beautiful home" },
      { user: "I've saved 40 million for this dream" },
      { user: "It's my decision to make" },
      { user: "For my family's future home" },
      { user: "Hopefully before my birthday in 4 months" },
      { user: "Diana Santos 09012345678" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Investor mindset",
    messages: [
      { user: "Looking to diversify my portfolio" },
      { user: "Initial investment of 80M" },
      { user: "I manage my own investments" },
      { user: "Purely for rental yield" },
      { user: "Whenever the right opportunity comes, flexible timing" },
      { user: "Investor Mark Lee +639123456789" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },

  // === ALTERNATIVE PHRASINGS (26-30) ===
  {
    name: "British English",
    messages: [
      { user: "I'm keen on purchasing a flat" },
      { user: "My budget is 32 million PHP" },
      { user: "I shall be making the decision" },
      { user: "For our family dwelling" },
      { user: "Within a fortnight ideally" },
      { user: "Charles Westminster 09234567890" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Casual millennial speak",
    messages: [
      { user: "Yo, need a sick pad" },
      { user: "Got like 20M to drop" },
      { user: "All me bro" },
      { user: "Gonna live there" },
      { user: "ASAP no cap" },
      { user: "Jake Paul 09345678901" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Formal business language",
    messages: [
      { user: "Good day. I would like to inquire about real estate acquisition" },
      { user: "Our allocated budget stands at PHP 65,000,000" },
      { user: "I have been authorized as the sole decision maker" },
      { user: "This will serve as our corporate guest house" },
      { user: "We aim to complete the transaction within fiscal Q2" },
      { user: "Director Jennifer Wu, contact 09456789012" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "SMS/Text style",
    messages: [
      { user: "hi need 2 buy house pls help" },
      { user: "hav 38m 4 budget" },
      { user: "yes im d 1 buying" },
      { user: "4 my fam 2 live" },
      { user: "nxt 2 mos if ok" },
      { user: "ronald 09567890123 tnx" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  },
  {
    name: "Confused but cooperative buyer",
    messages: [
      { user: "Um, I think I want to buy something?" },
      { user: "Maybe like... 25 to 30 million? Is that enough?" },
      { user: "Oh, yes, I guess I'm the one deciding" },
      { user: "We'll probably live there, not rent it out" },
      { user: "Hmm, maybe in a few months? Like 3 or 4?" },
      { user: "I'm Lisa, here's my number 09678901234" }
    ],
    expectedQuestions: [
      "budget",
      "decision",
      "residence or investment",
      "planning",
      "contact"
    ]
  }
];

// Helper function to simulate conversation
async function simulateConversation(scenario, scenarioIndex) {
  const conversationId = uuidv4();
  const results = {
    scenario: scenario.name,
    index: scenarioIndex + 1,
    success: true,
    errors: [],
    responses: [],
    bantExtracted: {}
  };
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO ${scenarioIndex + 1}/${testScenarios.length}: ${scenario.name}`);
  console.log('='.repeat(80));
  
  try {
    let expectedQuestionIndex = 0;
    
    for (let i = 0; i < scenario.messages.length; i++) {
      const msg = scenario.messages[i];
      
      if (msg.user) {
        console.log(`\n→ User: "${msg.user}"`);
        
        // Send message
        const response = await axios.post(`${API_URL}/api/chat`, {
          message: msg.user,
          conversationId,
          agentId: AGENT_ID,
          source: 'test'
        });
        
        const aiResponse = response.data.response;
        console.log(`← AI: "${aiResponse}"`);
        results.responses.push(aiResponse);
        
        // Check if response contains expected question (skip for last message)
        if (i < scenario.messages.length - 1 && scenario.expectedQuestions[expectedQuestionIndex]) {
          const expectedKeywords = scenario.expectedQuestions[expectedQuestionIndex].toLowerCase();
          const responseLC = aiResponse.toLowerCase();
          
          // Check if AI asked the right question
          let foundExpected = false;
          for (const keyword of expectedKeywords.split(' ')) {
            if (responseLC.includes(keyword)) {
              foundExpected = true;
              break;
            }
          }
          
          if (foundExpected) {
            console.log(`✅ Correct question about: ${expectedKeywords}`);
            expectedQuestionIndex++;
          } else {
            // Check if it's asking a question we already answered
            let isDuplicate = false;
            for (let j = 0; j < expectedQuestionIndex; j++) {
              const prevKeywords = scenario.expectedQuestions[j].toLowerCase();
              for (const keyword of prevKeywords.split(' ')) {
                if (responseLC.includes(keyword)) {
                  isDuplicate = true;
                  results.errors.push(`Duplicate question at step ${i + 1}: Asked about "${prevKeywords}" again`);
                  console.log(`❌ DUPLICATE: Asking about "${prevKeywords}" again!`);
                  break;
                }
              }
              if (isDuplicate) break;
            }
            
            if (!isDuplicate) {
              results.errors.push(`Wrong question at step ${i + 1}: Expected "${expectedKeywords}", got "${aiResponse}"`);
              console.log(`❌ WRONG: Expected question about "${expectedKeywords}"`);
            }
          }
        }
        
        // Store BANT data from response if available
        if (response.data.bantData) {
          results.bantExtracted = response.data.bantData;
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Check final BANT extraction
    console.log('\nFinal BANT Extracted:', results.bantExtracted);
    
    if (results.errors.length === 0) {
      console.log('\n✅ SCENARIO PASSED!');
    } else {
      console.log('\n❌ SCENARIO FAILED!');
      results.success = false;
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
  } catch (error) {
    console.error('Error in scenario:', error.message);
    results.success = false;
    results.errors.push(error.message);
  }
  
  return results;
}

// Main test runner
async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('COMPREHENSIVE BANT FIXED QUESTIONS TEST - 30 SCENARIOS');
  console.log('═'.repeat(80));
  console.log(`\nAPI URL: ${API_URL}`);
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`Total Scenarios: ${testScenarios.length}`);
  
  const allResults = [];
  let passedCount = 0;
  let failedCount = 0;
  
  // Run all scenarios
  for (let i = 0; i < testScenarios.length; i++) {
    const result = await simulateConversation(testScenarios[i], i);
    allResults.push(result);
    
    if (result.success) {
      passedCount++;
    } else {
      failedCount++;
    }
    
    // Small delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('FINAL RESULTS SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\nTotal Scenarios: ${testScenarios.length}`);
  console.log(`✅ Passed: ${passedCount} (${((passedCount/testScenarios.length)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failedCount} (${((failedCount/testScenarios.length)*100).toFixed(1)}%)`);
  
  if (failedCount > 0) {
    console.log('\nFailed Scenarios:');
    allResults.filter(r => !r.success).forEach(r => {
      console.log(`  - Scenario ${r.index}: ${r.scenario}`);
      r.errors.forEach(err => console.log(`    • ${err}`));
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
  
  // Save detailed results
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = `test-results-fixed-questions-${timestamp}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({
    summary: {
      total: testScenarios.length,
      passed: passedCount,
      failed: failedCount,
      successRate: successRate
    },
    results: allResults,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\nDetailed results saved to: ${resultsFile}`);
  
  return successRate === 100;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});