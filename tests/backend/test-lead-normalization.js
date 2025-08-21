#!/usr/bin/env node

/**
 * Test lead creation with normalization
 */

const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test the normalization function
async function testNormalization() {
  console.log('TESTING LEAD NORMALIZATION\n');
  console.log('='.repeat(80));
  
  // Test cases with raw BANT values
  const testCases = [
    {
      name: 'Michael Jackson case',
      raw: {
        budget: '30-50M',
        authority: 'Yes I am',
        need: 'personal residence',
        timeline: 'Next month'
      },
      expected: {
        budget_range: 'high',
        authority: 'individual',
        need: 'residence',
        timeline: '1-3m'
      }
    },
    {
      name: 'Simple yes answer',
      raw: {
        budget: '15 million pesos',
        authority: 'yes',
        need: 'for living',
        timeline: '3 months'
      },
      expected: {
        budget_range: 'medium',
        authority: 'individual',
        need: 'residence',
        timeline: '1-3m'
      }
    },
    {
      name: 'Investment buyer',
      raw: {
        budget: '80M',
        authority: 'I am the sole decision maker',
        need: 'investment',
        timeline: 'ASAP'
      },
      expected: {
        budget_range: 'high',
        authority: 'individual',
        need: 'investment',
        timeline: '1m'
      }
    },
    {
      name: 'Shared decision',
      raw: {
        budget: '8 million',
        authority: 'my wife and I',
        need: 'family home',
        timeline: '6 months'
      },
      expected: {
        budget_range: 'low',
        authority: 'shared',
        need: 'residence',
        timeline: '3-6m'
      }
    },
    {
      name: 'Long-term buyer',
      raw: {
        budget: '25M PHP',
        authority: 'board approval',
        need: 'commercial property',
        timeline: 'next year'
      },
      expected: {
        budget_range: 'medium',
        authority: 'shared',
        need: 'investment',
        timeline: '6m+'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('Raw BANT:', testCase.raw);
    
    // Call the normalization API
    const systemPrompt = `You are a data normalizer. Map the following BANT fields to the EXACT allowed values for a database.

IMPORTANT: Return ONLY these exact values or null if unclear:

- authority: Map to EXACTLY one of these:
  * 'individual' - if sole decision maker, "yes", "I am", "just me", "myself"
  * 'shared' - if multiple decision makers, "no", "we", "spouse and I", "board", "committee"
  * null - if unclear

- need: Map to EXACTLY one of these:
  * 'residence' - for living, personal use, family home, primary residence
  * 'investment' - for rental, income, business, ROI, passive income, commercial
  * 'resale' - for flipping, reselling, trading
  * null - if unclear

- timeline: Map to EXACTLY one of these database codes:
  * '1m' - within 1 month, ASAP, immediate, this month, now
  * '1-3m' - 1-3 months, next month, 2 months, soon, 3 months
  * '3-6m' - 3-6 months, next quarter, Q2/Q3, 6 months
  * '6m+' - 6+ months, next year, later, flexible
  * null - if unclear

- budget_range: Map to EXACTLY one of these:
  * 'high' - for budgets above 30M PHP
  * 'medium' - for budgets 10M-30M PHP  
  * 'low' - for budgets below 10M PHP
  * null - if unclear or no specific amount

Return a JSON object with these exact field names and values. Only output the JSON.`;
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Raw BANT: ${JSON.stringify(testCase.raw)}` }
        ],
        max_tokens: 100,
        temperature: 0
      });
      
      const normalized = JSON.parse(response.choices[0].message.content);
      console.log('Normalized:', normalized);
      
      // Check if normalization is correct
      let correct = true;
      for (const field of ['budget_range', 'authority', 'need', 'timeline']) {
        if (normalized[field] !== testCase.expected[field]) {
          console.log(`  ❌ ${field}: got '${normalized[field]}', expected '${testCase.expected[field]}'`);
          correct = false;
        }
      }
      
      if (correct) {
        console.log('  ✅ All fields normalized correctly!');
      }
      
    } catch (error) {
      console.error('  ❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('\nThe normalization should now produce values that match database constraints:');
  console.log('- authority: individual, shared');
  console.log('- need: residence, investment, resale');
  console.log('- timeline: 1m, 1-3m, 3-6m, 6m+');
  console.log('- budget_range: high, medium, low');
}

// Test scoring with normalized values
function testScoring() {
  console.log('\n\nTESTING LEAD SCORING\n');
  console.log('='.repeat(80));
  
  const testCases = [
    {
      name: 'Hot Lead',
      bant: {
        budget_range: 'high',
        authority: 'individual',
        need: 'investment',
        timeline: '1m'
      },
      expectedScores: {
        budget: 30,
        authority: 30,
        need: 30,
        timeline: 30
      },
      expectedClass: 'Hot'
    },
    {
      name: 'Warm Lead',
      bant: {
        budget_range: 'medium',
        authority: 'individual',
        need: 'residence',
        timeline: '1-3m'
      },
      expectedScores: {
        budget: 20,
        authority: 30,
        need: 25,
        timeline: 25
      },
      expectedClass: 'Warm'
    },
    {
      name: 'Cold Lead',
      bant: {
        budget_range: 'low',
        authority: 'shared',
        need: 'residence',
        timeline: '6m+'
      },
      expectedScores: {
        budget: 10,
        authority: 20,
        need: 25,
        timeline: 10
      },
      expectedClass: 'Cold'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name}`);
    console.log('BANT:', testCase.bant);
    
    // Calculate scores (mimicking server logic)
    const scores = {
      budget_score: 0,
      authority_score: 0,
      need_score: 0,
      timeline_score: 0
    };
    
    // Budget scoring
    if (testCase.bant.budget_range) {
      scores.budget_score = testCase.bant.budget_range === 'high' ? 30 : 
                           testCase.bant.budget_range === 'medium' ? 20 : 10;
    }
    
    // Authority scoring
    if (testCase.bant.authority === 'individual') {
      scores.authority_score = 30;
    } else if (testCase.bant.authority === 'shared') {
      scores.authority_score = 20;
    }
    
    // Need scoring
    if (testCase.bant.need) {
      scores.need_score = testCase.bant.need === 'investment' ? 30 : 25;
    }
    
    // Timeline scoring
    if (testCase.bant.timeline === '1m') {
      scores.timeline_score = 30;
    } else if (testCase.bant.timeline === '1-3m') {
      scores.timeline_score = 25;
    } else if (testCase.bant.timeline === '3-6m') {
      scores.timeline_score = 15;
    } else if (testCase.bant.timeline === '6m+') {
      scores.timeline_score = 10;
    }
    
    console.log('Calculated Scores:', scores);
    
    // Calculate total with default weights (25% each)
    const totalScore = (scores.budget_score + scores.authority_score + 
                       scores.need_score + scores.timeline_score) * 0.25;
    
    console.log('Total Score:', totalScore);
    
    // Determine classification
    let classification = 'Cold';
    if (totalScore >= 70) {
      classification = 'Hot';
    } else if (totalScore >= 50) {
      classification = 'Warm';
    }
    
    console.log('Classification:', classification);
    
    // Verify
    let correct = true;
    for (const field of ['budget', 'authority', 'need', 'timeline']) {
      const scoreField = `${field}_score`;
      if (scores[scoreField] !== testCase.expectedScores[field]) {
        console.log(`  ❌ ${field} score: got ${scores[scoreField]}, expected ${testCase.expectedScores[field]}`);
        correct = false;
      }
    }
    
    if (correct) {
      console.log('  ✅ All scores calculated correctly!');
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run tests
testNormalization()
  .then(() => testScoring())
  .catch(console.error);