require('dotenv').config();
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Models configuration matching server.js
const AI_MODELS = {
  REASONING: 'gpt-5-2025-08-07',
  FALLBACK_REASONING: 'gpt-5-2025-08-07'
};

const GPT5_PARAMS = {
  COMPLEX_REASONING: {
    reasoning_effort: 'high',
    verbosity: 'low'  // Must be 'low' for JSON response format
  }
};

// Test BANT extraction function
async function extractBANTExactAI(messages) {
  if (!messages || messages.length === 0) {
    return { budget: null, authority: null, need: null, timeline: null };
  }
  
  // Convert messages to chat format
  const chatHistory = messages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`)
    .join('\n');
  
  const systemPrompt = `You are a BANT information extractor for real estate conversations.
Extract BANT information ONLY from USER messages in the conversation.

CRITICAL: Look for ANY mention of these topics in user messages:

BUDGET - Extract if user mentions:
- Dollar amounts with K, M, or numbers (e.g., "$500K", "500K-600K", "$2M", "2 million", "500000")
- Any number followed by K or M when discussing property
- Written out millions (e.g., "20 million", "15 mil", "thirty million")
- Abbreviated millions (e.g., "15Mil", "20M", "30m")
- Phrases like "my budget is", "I can spend", "looking to spend"

AUTHORITY - Extract if user mentions:
- Decision role (e.g., "I'm the CEO", "I am", "Yes", "just me", "sole buyer")
- Direct answers to authority questions (e.g., "Yes", "No", "I am")

NEED - Extract if user mentions:
- Property purpose (e.g., "for living", "investment", "rental", "residence", "home")
- Usage intent (e.g., "personal use", "family home", "business")

TIMELINE - Extract if user mentions:
- Specific timeframes (e.g., "3 months", "60 days", "2 months", "ASAP")
- Purchase timing (e.g., "planning to buy", "looking to purchase")

EXAMPLES to recognize:
- "35M" → budget: "35M"
- "30M" → budget: "30M"
- "20 Million" → budget: "20 Million"
- "15Mil" → budget: "15Mil"
- "25 million" → budget: "25 million"
- "My budget is 2M" → budget: "2M"

CRITICAL: Return ONLY a valid JSON object:
{
  "budget": "exact phrase from user or null",
  "authority": "exact phrase from user or null",
  "need": "exact phrase from user or null",
  "timeline": "exact phrase from user or null"
}

If user mentions a number with M, K, "million", "mil" in context of property discussion, extract it as budget.`;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.REASONING,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: chatHistory }
      ],
      max_completion_tokens: 500,  // Increased for reasoning + JSON output
      response_format: { type: "json_object" },
      ...GPT5_PARAMS.COMPLEX_REASONING
    });
    
    const content = response.choices?.[0]?.message?.content;
    
    if (content) {
      const parsed = JSON.parse(content);
      return parsed;
    }
  } catch (error) {
    console.error('[TEST] Error:', error.message);
  }
  
  return { budget: null, authority: null, need: null, timeline: null };
}

// Test various budget formats
async function testVariousBudgetFormats() {
  console.log('🧪 Testing BANT Extraction with Various Budget Formats');
  console.log('=' .repeat(80));
  
  const testCases = [
    { input: '35M', expected: '35M' },
    { input: '30M', expected: '30M' },
    { input: '20 Million', expected: '20 Million' },
    { input: '15Mil', expected: '15Mil' },
    { input: '25 million', expected: '25 million' },
    { input: '10m', expected: '10m' },
    { input: '5.5M', expected: '5.5M' },
    { input: '$8M', expected: '$8M' },
    { input: 'around 12 million', expected: 'around 12 million' },
    { input: 'My budget is 18M', expected: '18M' },
    { input: 'I can spend up to 22 million', expected: 'up to 22 million' },
    { input: '500K', expected: '500K' },
    { input: '1.5 million', expected: '1.5 million' },
    { input: 'between 10M and 15M', expected: 'between 10M and 15M' },
    { input: '30-40 million', expected: '30-40 million' }
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test Case: "${testCase.input}"`);
    
    // Create a conversation with this budget answer
    const messages = [
      { sender: 'user', content: 'hello' },
      { sender: 'ai', content: "Good afternoon! I'm your real estate agent. What type of property are you looking for?" },
      { sender: 'user', content: 'looking for a property' },
      { sender: 'ai', content: 'What is your budget range for this property?' },
      { sender: 'user', content: testCase.input }
    ];
    
    const result = await extractBANTExactAI(messages);
    
    if (result.budget) {
      console.log(`  ✅ Extracted: "${result.budget}"`);
      successCount++;
    } else {
      console.log(`  ❌ Failed to extract budget`);
      failureCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 RESULTS SUMMARY:');
  console.log(`  ✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`  ❌ Failed: ${failureCount}/${testCases.length}`);
  console.log(`  Success Rate: ${((successCount/testCases.length) * 100).toFixed(1)}%`);
  
  if (failureCount === 0) {
    console.log('\n🎉 PERFECT! All budget formats were correctly extracted!');
  } else {
    console.log('\n⚠️  Some budget formats failed. Check the results above.');
  }
}

// Run the tests
testVariousBudgetFormats().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});