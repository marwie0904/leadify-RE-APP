// Test what extractBANTExactAI function is actually doing
require('dotenv').config();
const OpenAI = require('openai');
const { trackTestTokens } = require('./test-token-tracker');

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
    verbosity: 'low'  // FIXED: Must be 'low' for JSON response format
  }
};

// Simplified extractBANTExactAI to test
async function extractBANTExactAI(messages) {
  console.log('\n[TEST EXTRACT BANT] ===== STARTING EXTRACTION =====');
  console.log('[TEST EXTRACT BANT] Messages count:', messages?.length || 0);
  
  if (!messages || messages.length === 0) {
    console.log('[TEST EXTRACT BANT] No messages');
    return { budget: null, authority: null, need: null, timeline: null };
  }
  
  // Convert messages to chat format
  const chatHistory = messages
    .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`)
    .join('\n');
  
  console.log('[TEST EXTRACT BANT] Chat history:');
  console.log('---START---');
  console.log(chatHistory);
  console.log('---END---');
  
  const systemPrompt = `You are a BANT information extractor for real estate conversations.
Extract BANT information ONLY from USER messages in the conversation.

CRITICAL: Look for ANY mention of these topics in user messages:

BUDGET - Extract if user mentions:
- Dollar amounts with K, M, or numbers (e.g., "$500K", "500K-600K", "$2M", "2 million", "500000")
- Any number followed by K or M when discussing property
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
- "25M" → budget: "25M"
- "My budget is 2M" → budget: "2M"

CRITICAL: Return ONLY a valid JSON object:
{
  "budget": "exact phrase from user or null",
  "authority": "exact phrase from user or null",
  "need": "exact phrase from user or null",
  "timeline": "exact phrase from user or null"
}

If user mentions a number with M or K in context of property discussion, extract it as budget.`;

  try {
    console.log('[TEST EXTRACT BANT] Calling OpenAI with model:', AI_MODELS.REASONING);
    console.log('[TEST EXTRACT BANT] Parameters:', JSON.stringify({
      ...GPT5_PARAMS.COMPLEX_REASONING,
      max_completion_tokens: 500,  // Increased to allow for reasoning + JSON output
      response_format: { type: "json_object" }
    }));
    
    const response = await openai.chat.completions.create({
      model: AI_MODELS.REASONING,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: chatHistory }
      ],
      max_completion_tokens: 500,  // Increased to allow for reasoning + JSON output
      response_format: { type: "json_object" },
      ...GPT5_PARAMS.COMPLEX_REASONING
    });
    
    console.log('[TEST EXTRACT BANT] Response received');
    console.log('[TEST EXTRACT BANT] Usage:', response.usage);
    
    // Track token usage
    await trackTestTokens(response, 'bant_extraction', 'test-bant-extraction-module.js');
    
    const content = response.choices?.[0]?.message?.content;
    console.log('[TEST EXTRACT BANT] Raw content:');
    console.log(content);
    
    if (content) {
      const parsed = JSON.parse(content);
      console.log('[TEST EXTRACT BANT] Parsed result:');
      console.log(JSON.stringify(parsed, null, 2));
      return parsed;
    }
  } catch (error) {
    console.error('[TEST EXTRACT BANT] Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
  
  return { budget: null, authority: null, need: null, timeline: null };
}

// Test with the exact conversation
async function test() {
  const messages = [
    { sender: 'user', content: 'hello' },
    { sender: 'ai', content: "Good afternoon! I'm Brown-Homes-Agent, here to help you find your perfect property. What type of property are you looking for today?" },
    { sender: 'user', content: 'what properties do you have' },
    { sender: 'ai', content: 'What is your budget range for this property?' },
    { sender: 'user', content: '35M' }
  ];
  
  console.log('🧪 Testing BANT extraction with conversation:');
  messages.forEach((msg, i) => {
    console.log(`  ${i+1}. ${msg.sender}: "${msg.content}"`);
  });
  
  const result = await extractBANTExactAI(messages);
  
  console.log('\n📊 FINAL RESULT:');
  console.log('  Budget:', result.budget || '❌ Not found');
  console.log('  Authority:', result.authority || '❌ Not found');
  console.log('  Need:', result.need || '❌ Not found');
  console.log('  Timeline:', result.timeline || '❌ Not found');
  
  if (result.budget === '35M') {
    console.log('\n✅ SUCCESS! Budget "35M" was correctly extracted!');
  } else {
    console.log('\n❌ FAILURE! Budget "35M" was NOT extracted!');
  }
}

test().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});