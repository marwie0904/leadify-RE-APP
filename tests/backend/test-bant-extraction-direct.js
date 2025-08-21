require('dotenv').config();
const OpenAI = require('openai');
const { trackTestTokens } = require('./test-token-tracker');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test messages simulating the conversation
const testMessages = [
  "User: hello",
  "AI: Good afternoon! Welcome to our real estate service. I'm Brown-Homes-Agent, ready to help you find your dream property. How can I assist you today?",
  "User: what properties do you have",
  "AI: What is your budget range for this property?",
  "User: 25M"
].join('\n');

async function testBANTExtraction() {
  console.log('🧪 Testing BANT Extraction Directly');
  console.log('=' .repeat(80));
  console.log('Test conversation:');
  console.log(testMessages);
  console.log('=' .repeat(80));

  const systemPrompt = `You are a BANT information extractor for real estate conversations.
Extract BANT information ONLY from USER messages in the conversation.

CRITICAL: Look for ANY mention of these topics in user messages:

BUDGET - Extract if user mentions:
- Dollar amounts with K, M, or numbers (e.g., "$500K", "500K-600K", "$2M", "2 million", "500000", "budget of", "budget is")
- Price ranges (e.g., "500K to 600K", "between 500K and 600K", "$500K-$600K range")
- Any number followed by K or M when discussing property
- Phrases like "my budget is", "I can spend", "looking to spend", "price range"

AUTHORITY - Extract if user mentions:
- Decision role (e.g., "I'm the CEO", "I am", "Yes", "just me", "my spouse and I", "sole buyer")
- Approval status (e.g., "board approval", "pre-approved", "sole decision maker")
- Direct answers to authority questions (e.g., "Yes", "No", "I am", "We are")

NEED - Extract if user mentions:
- Property purpose (e.g., "for living", "investment", "rental", "residence", "commercial space", "home")
- Usage intent (e.g., "personal use", "family home", "business", "my business")
- Property type needed (e.g., "home", "condo", "office", "3 bedrooms")

TIMELINE - Extract if user mentions:
- Specific timeframes (e.g., "3 months", "60 days", "2 months", "next month", "this year", "ASAP")
- Urgency indicators (e.g., "need to move by", "lease expires", "within")
- Purchase timing (e.g., "planning to buy", "looking to purchase")

EXAMPLES to recognize:
- "Hi, I'm looking for a home in the $500K-600K range" → budget: "$500K-600K"
- "My budget is 2M" → budget: "2M"
- "35M" → budget: "35M"
- "25M" → budget: "25M"
- "I need 3 bedrooms and want to move within 2 months" → need: "3 bedrooms", timeline: "2 months"
- "I'm the sole buyer and have been pre-approved" → authority: "sole buyer and have been pre-approved"

CRITICAL: Return ONLY a valid JSON object, no other text or explanation:
{
  "budget": "exact phrase from user or null",
  "authority": "exact phrase from user or null",
  "need": "exact phrase from user or null",
  "timeline": "exact phrase from user or null"
}

If user mentions a number with M or K in context of property discussion, extract it as budget.`;

  try {
    console.log('\n📤 Calling OpenAI GPT-5...');
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: testMessages }
      ],
      max_completion_tokens: 150,
      response_format: { type: "json_object" },
      reasoning_effort: 'medium',
      verbosity: 'low'
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Response received in ${elapsed}ms`);
    
    // Track token usage
    await trackTestTokens(response, 'bant_extraction', 'test-bant-extraction-direct.js');
    
    console.log('\n📊 Response Structure:');
    console.log('  - Type:', typeof response);
    console.log('  - Has choices:', response.choices ? 'YES' : 'NO');
    console.log('  - Number of choices:', response.choices?.length);
    console.log('  - Has message:', response.choices?.[0]?.message ? 'YES' : 'NO');
    console.log('  - Has content:', response.choices?.[0]?.message?.content ? 'YES' : 'NO');
    
    // Let's inspect the full message object
    console.log('\n🔍 Full Message Object:');
    console.log(JSON.stringify(response.choices?.[0]?.message, null, 2));
    
    // Check for reasoning field
    console.log('\n🧠 Reasoning Field:');
    console.log(response.choices?.[0]?.message?.reasoning || 'No reasoning field');
    
    console.log('\n📝 Raw Response Content:');
    const content = response.choices?.[0]?.message?.content;
    console.log(content);
    
    if (content) {
      console.log('\n🔍 Parsing JSON...');
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Successfully parsed JSON:');
        console.log(JSON.stringify(parsed, null, 2));
        
        console.log('\n📋 Extracted BANT:');
        console.log('  Budget:', parsed.budget || '❌ Not found');
        console.log('  Authority:', parsed.authority || '❌ Not found');
        console.log('  Need:', parsed.need || '❌ Not found');
        console.log('  Timeline:', parsed.timeline || '❌ Not found');
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.error('Content that failed:', content.substring(0, 200));
      }
    }
    
    console.log('\n📊 Token Usage:');
    console.log('  Prompt tokens:', response.usage?.prompt_tokens);
    console.log('  Completion tokens:', response.usage?.completion_tokens);
    console.log('  Total tokens:', response.usage?.total_tokens);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testBANTExtraction().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});