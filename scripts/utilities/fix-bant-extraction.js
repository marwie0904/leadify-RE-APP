#!/usr/bin/env node

/**
 * Fix BANT Extraction Issue
 * 
 * Problem: The extractBANTExactAI function is not properly extracting BANT information
 * from user messages, causing the AI to repeatedly ask for budget even when provided.
 * 
 * Solution: Improve the extraction prompt and add debugging
 */

require('dotenv').config();
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testExtraction() {
  // Test messages that should extract budget
  const testCases = [
    {
      name: "Direct budget statement",
      messages: [
        "User: Hi, I'm looking for a home in the $500K-600K range",
      ],
      expected: { budget: "$500K-600K", authority: null, need: null, timeline: null }
    },
    {
      name: "Budget with other info",
      messages: [
        "User: I need a commercial space, 5000 sq ft, budget $2M. I'm the CEO with board approval. Need to move in 60 days. Contact me at ceo@company.com"
      ],
      expected: { 
        budget: "$2M", 
        authority: "CEO with board approval", 
        need: "commercial space", 
        timeline: "60 days" 
      }
    },
    {
      name: "Conversational budget",
      messages: [
        "AI: May I ask, what's your budget range for this property purchase?",
        "User: Around 500K to 600K"
      ],
      expected: { budget: "500K to 600K", authority: null, need: null, timeline: null }
    },
    {
      name: "Complete BANT in conversation",
      messages: [
        "AI: May I ask, what's your budget range?",
        "User: My budget is $500K",
        "AI: Will you be the sole decision maker?",
        "User: Yes, I am",
        "AI: Will this be for personal residence or investment?",
        "User: For living",
        "AI: When are you planning to make this purchase?",
        "User: Within 3 months"
      ],
      expected: {
        budget: "$500K",
        authority: "Yes, I am",
        need: "For living",
        timeline: "Within 3 months"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log('\n' + '='.repeat(60));
    console.log(`Test: ${testCase.name}`);
    console.log('-'.repeat(60));
    console.log('Messages:');
    testCase.messages.forEach(msg => console.log('  ' + msg));
    
    const chatHistory = testCase.messages.join('\n');
    
    // Original prompt (potentially problematic)
    const originalPrompt = `Extract BANT information from the conversation. Look for:
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

    // Improved prompt
    const improvedPrompt = `You are a BANT information extractor for real estate conversations.

Extract BANT information from the conversation. ONLY extract from USER messages, not AI messages.

IMPORTANT: Look for ANY mention of these topics in user messages:

BUDGET - Extract if user mentions ANY of these:
- Dollar amounts with K, M, or full numbers (e.g., "$500K", "500K-600K", "$2M", "2 million", "500000")
- Price ranges (e.g., "500K to 600K", "between 500K and 600K")
- Budget statements (e.g., "my budget is", "I can spend", "looking to spend")

AUTHORITY - Extract if user mentions:
- Decision making role (e.g., "I'm the CEO", "Yes I am", "just me", "my spouse and I")
- Approval status (e.g., "board approval", "pre-approved", "sole decision maker")
- Response to authority questions (e.g., "Yes", "No", "I am")

NEED - Extract if user mentions:
- Property purpose (e.g., "for living", "investment", "rental", "residence", "commercial space")
- Usage intent (e.g., "personal use", "family home", "business")
- Property type (e.g., "home", "condo", "office")

TIMELINE - Extract if user mentions:
- Timeframes (e.g., "3 months", "60 days", "next month", "this year", "ASAP")
- Moving dates (e.g., "need to move by", "lease expires in")
- Purchase timing (e.g., "planning to buy within")

Return ONLY a JSON object with extracted values or null:
{
  "budget": "exact phrase from user or null",
  "authority": "exact phrase from user or null", 
  "need": "exact phrase from user or null",
  "timeline": "exact phrase from user or null"
}`;

    try {
      console.log('\nTesting with ORIGINAL prompt:');
      const originalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: originalPrompt },
          { role: 'user', content: chatHistory }
        ],
        temperature: 0
      });
      
      const originalResult = JSON.parse(originalResponse.choices[0].message.content);
      console.log('Result:', originalResult);
      
      console.log('\nTesting with IMPROVED prompt:');
      const improvedResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: improvedPrompt },
          { role: 'user', content: chatHistory }
        ],
        temperature: 0
      });
      
      const improvedResult = JSON.parse(improvedResponse.choices[0].message.content);
      console.log('Result:', improvedResult);
      
      console.log('\nExpected:', testCase.expected);
      
      // Check if improved prompt matches expected
      const matches = {
        budget: improvedResult.budget !== null === (testCase.expected.budget !== null),
        authority: improvedResult.authority !== null === (testCase.expected.authority !== null),
        need: improvedResult.need !== null === (testCase.expected.need !== null),
        timeline: improvedResult.timeline !== null === (testCase.expected.timeline !== null)
      };
      
      console.log('\nImproved prompt accuracy:');
      console.log('  Budget:', matches.budget ? '✅' : '❌');
      console.log('  Authority:', matches.authority ? '✅' : '❌');
      console.log('  Need:', matches.need ? '✅' : '❌');
      console.log('  Timeline:', matches.timeline ? '✅' : '❌');
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testExtraction().catch(console.error);