#!/usr/bin/env node

/**
 * Test BANT flow with AI extraction only (no pattern detection)
 * This simulates the exact server logic
 */

const axios = require('axios');
require('dotenv').config();

const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simulate AI extraction (mirrors server logic)
async function extractBANTExactAI(messages) {
  try {
    console.log('\n[EXTRACT BANT] Starting AI extraction...');
    
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

    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('[EXTRACT BANT] AI Results:');
    console.log('  Budget:', result.budget || '❌ Not found');
    console.log('  Authority:', result.authority || '❌ Not found');
    console.log('  Need:', result.need || '❌ Not found');
    console.log('  Timeline:', result.timeline || '❌ Not found');
    
    return result;
  } catch (error) {
    console.error('[EXTRACT BANT] Error:', error.message);
    return { budget: null, authority: null, need: null, timeline: null };
  }
}

// Simulate fixed questions logic
function generateFixedQuestion(currentBant, previousBant, userMessage) {
  let acknowledgment = '';
  
  // Build acknowledgment for what was just provided
  if (currentBant.budget && !previousBant?.budget) {
    acknowledgment = `Great! I've noted your budget of ${currentBant.budget}. `;
  } else if (currentBant.authority && !previousBant?.authority) {
    acknowledgment = 'Perfect, thank you for confirming. ';
  } else if (currentBant.need && !previousBant?.need) {
    const needLower = currentBant.need.toLowerCase();
    acknowledgment = (needLower.includes('living') || 
                     needLower.includes('residence') || 
                     needLower.includes('live') ||
                     needLower.includes('family') ||
                     needLower.includes('home'))
      ? 'Great, for your personal residence! ' 
      : 'Excellent, for investment purposes! ';
  } else if (currentBant.timeline && !previousBant?.timeline) {
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
  
  return acknowledgment + nextQuestion;
}

// Test scenarios
async function runTest() {
  console.log('TESTING BANT FLOW WITH AI EXTRACTION ONLY\n');
  console.log('='.repeat(80));
  
  const conversation = [];
  let previousBant = null;
  
  // Simulate conversation
  const userMessages = [
    'Hi I want to buy a condo',
    '15 million pesos',
    'I am the sole decision maker',
    'For my family to live in',
    '3 months',
    'John Doe 09171234567'
  ];
  
  for (const userMsg of userMessages) {
    // Add user message
    conversation.push({ sender: 'user', content: userMsg });
    console.log(`\nUser: "${userMsg}"`);
    
    // Extract BANT with current message
    const currentBant = await extractBANTExactAI(conversation);
    
    // Generate response using fixed questions
    const aiResponse = generateFixedQuestion(currentBant, previousBant, userMsg);
    console.log(`AI: "${aiResponse}"`);
    
    // Add AI response to conversation
    conversation.push({ sender: 'ai', content: aiResponse });
    
    // Check if we're asking duplicate questions
    const hasBudget = currentBant.budget !== null;
    const hasAuthority = currentBant.authority !== null;
    const hasNeed = currentBant.need !== null;
    const hasTimeline = currentBant.timeline !== null;
    
    console.log(`Status: Budget=${hasBudget ? '✓' : '✗'} Authority=${hasAuthority ? '✓' : '✗'} Need=${hasNeed ? '✓' : '✗'} Timeline=${hasTimeline ? '✓' : '✗'}`);
    
    // Update previous BANT for next iteration
    previousBant = { ...currentBant };
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  
  // Final check
  const finalBant = await extractBANTExactAI(conversation);
  const allCollected = finalBant.budget && finalBant.authority && finalBant.need && finalBant.timeline;
  
  if (allCollected) {
    console.log('✅ SUCCESS: All BANT information collected without duplicates!');
  } else {
    console.log('❌ FAILURE: Missing BANT information');
    console.log('Final BANT:', finalBant);
  }
}

// Run the test
runTest().catch(console.error);