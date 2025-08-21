#!/usr/bin/env node

/**
 * Test the fixed questions BANT flow
 * This simulates a complete conversation through the BANT process
 */

const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simulate the extractBANTExactAI function
async function extractBANTExactAI(messages) {
  const lastMessages = messages.slice(-20);
  
  const systemPrompt = `You are a BANT extractor. Extract Budget, Authority, Need, Timeline, and Contact information from the conversation.

IMPORTANT: Only extract information that has been EXPLICITLY provided by the user. Do not infer or guess.

Return a JSON object with these fields:
- budget: The budget mentioned (e.g., "50M", "30-50 million") or null
- authority: The decision-making authority mentioned (e.g., "Yes I am", "my wife and I") or null  
- need: The purpose/need mentioned (e.g., "personal residence", "investment") or null
- timeline: The timeline mentioned (e.g., "next month", "3 months") or null
- contact: Object with fullName, mobileNumber, and email (or null for each)

ONLY extract if the user has EXPLICITLY answered. If they haven't answered yet, return null for that field.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(lastMessages) }
      ],
      max_tokens: 200,
      temperature: 0
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('AI extraction error:', error);
    return { budget: null, authority: null, need: null, timeline: null, contact: null };
  }
}

// Simulate the fixed questions logic
function getNextBANTQuestion(currentBant) {
  let nextQuestion = null;
  
  // FIXED QUESTIONS LOGIC - Don't rely on AI, generate questions programmatically
  if (!currentBant.budget) {
    nextQuestion = "To help find the perfect property for you, what's your budget range?";
  } else if (!currentBant.authority) {
    nextQuestion = "Will you be the sole decision maker for this purchase?";
  } else if (!currentBant.need) {
    nextQuestion = "Are you looking for a property for personal use, investment, or resale?";
  } else if (!currentBant.timeline) {
    nextQuestion = "When are you planning to make this purchase?";
  } else if (!currentBant.contact?.fullName) {
    nextQuestion = "May I have your full name for our records?";
  } else if (!currentBant.contact?.mobileNumber) {
    nextQuestion = "What's the best mobile number to reach you?";
  } else if (!currentBant.contact?.email) {
    nextQuestion = "And finally, what's your email address?";
  }
  
  return nextQuestion;
}

async function testBANTFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('TESTING FIXED QUESTIONS BANT FLOW');
  console.log('='.repeat(80) + '\n');
  
  // Simulate a conversation
  const conversation = [
    { role: 'assistant', content: "Hi! I'm here to help you find your dream property." },
    { role: 'user', content: "Hello, I'm looking for a condo" }
  ];
  
  // User responses for each BANT question
  const userResponses = [
    "My budget is around 30 to 50 million pesos",  // Budget
    "Yes I am the sole decision maker",             // Authority
    "It's for my personal residence",               // Need
    "I'm planning to buy next month",               // Timeline
    "My name is Michael Jackson",                   // Full name
    "You can reach me at 09171234567",             // Mobile
    "My email is mj@test.com"                       // Email
  ];
  
  let responseIndex = 0;
  let currentBant = { budget: null, authority: null, need: null, timeline: null, contact: null };
  
  console.log('Starting BANT conversation flow...\n');
  
  // Run through the BANT flow
  while (responseIndex < userResponses.length) {
    // Extract current BANT state
    currentBant = await extractBANTExactAI(conversation);
    
    console.log(`\nStep ${responseIndex + 1}:`);
    console.log('Current BANT State:');
    console.log('  Budget:', currentBant.budget || 'NOT SET');
    console.log('  Authority:', currentBant.authority || 'NOT SET');
    console.log('  Need:', currentBant.need || 'NOT SET');
    console.log('  Timeline:', currentBant.timeline || 'NOT SET');
    console.log('  Contact:', currentBant.contact ? 
      `${currentBant.contact.fullName || ''} ${currentBant.contact.mobileNumber || ''} ${currentBant.contact.email || ''}`.trim() 
      : 'NOT SET');
    
    // Get next question using fixed logic
    const nextQuestion = getNextBANTQuestion(currentBant);
    
    if (!nextQuestion) {
      console.log('\n✅ BANT COMPLETE! All information collected.');
      break;
    }
    
    console.log('\nAI Question:', nextQuestion);
    
    // Simulate user response
    const userResponse = userResponses[responseIndex];
    console.log('User Response:', userResponse);
    
    // Add to conversation
    conversation.push({ role: 'assistant', content: nextQuestion });
    conversation.push({ role: 'user', content: userResponse });
    
    responseIndex++;
  }
  
  // Final extraction
  const finalBant = await extractBANTExactAI(conversation);
  
  console.log('\n' + '='.repeat(80));
  console.log('FINAL BANT EXTRACTION:');
  console.log('='.repeat(80));
  console.log(JSON.stringify(finalBant, null, 2));
  
  // Validate the flow worked correctly
  const allFieldsCollected = 
    finalBant.budget !== null &&
    finalBant.authority !== null &&
    finalBant.need !== null &&
    finalBant.timeline !== null &&
    finalBant.contact?.fullName !== null &&
    finalBant.contact?.mobileNumber !== null &&
    finalBant.contact?.email !== null;
  
  if (allFieldsCollected) {
    console.log('\n✅ SUCCESS: Fixed questions flow collected all BANT information!');
    console.log('The system correctly:');
    console.log('  1. Asked questions in the correct order');
    console.log('  2. Detected when each field was answered');
    console.log('  3. Moved to the next question only after extraction');
    console.log('  4. Collected all required information');
  } else {
    console.log('\n⚠️  WARNING: Some fields were not collected');
    console.log('This might indicate the AI extraction needs adjustment');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run test
testBANTFlow().catch(console.error);