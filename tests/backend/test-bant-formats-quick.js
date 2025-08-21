require('dotenv').config();
const OpenAI = require('openai');
const { trackTestTokens } = require('./test-token-tracker');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test BANT extraction with specific formats
async function testSpecificFormats() {
  console.log('🧪 Testing BANT Extraction with Specific Formats');
  console.log('=' .repeat(80));
  
  const testCases = [
    '30M',
    '20 Million', 
    '15Mil'
  ];
  
  for (const budget of testCases) {
    console.log(`\n📝 Testing: "${budget}"`);
    console.log('-'.repeat(40));
    
    // Create conversation
    const chatHistory = `User: hello
AI: Good afternoon! I'm your real estate agent. What type of property are you looking for?
User: looking for a property
AI: What is your budget range for this property?
User: ${budget}`;
    
    console.log('Chat history:');
    console.log(chatHistory);
    
    const systemPrompt = `You are a BANT information extractor for real estate conversations.
Extract BANT information ONLY from USER messages in the conversation.

CRITICAL: Look for ANY mention of budget in user messages:
- "30M" means budget of 30 million
- "20 Million" means budget of 20 million  
- "15Mil" means budget of 15 million
- Any number with M, Million, Mil = budget

Extract the EXACT phrase the user said.

Return ONLY this JSON:
{
  "budget": "exact phrase from user or null",
  "authority": null,
  "need": null,
  "timeline": null
}`;

    try {
      console.log('\nCalling OpenAI...');
      const response = await openai.chat.completions.create({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: chatHistory }
        ],
        max_completion_tokens: 1000,  // More tokens for complex reasoning
        response_format: { type: "json_object" },
        reasoning_effort: 'medium',  // Balance between reasoning and output
        verbosity: 'low'
      });
      
      console.log('Token usage:', response.usage);
      
      // Track token usage
      await trackTestTokens(response, 'bant_extraction', 'test-bant-formats-quick.js');
      
      const content = response.choices?.[0]?.message?.content;
      console.log('Raw response:', content);
      
      if (content) {
        const parsed = JSON.parse(content);
        console.log('\n📊 Result:');
        console.log(`  Budget: ${parsed.budget ? '✅ ' + parsed.budget : '❌ Not extracted'}`);
      } else {
        console.log('❌ Empty response from API');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response?.status === 429) {
        console.log('⚠️  Rate limited, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
testSpecificFormats().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});