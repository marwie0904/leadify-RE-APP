#!/usr/bin/env node

/**
 * Direct test of BANT flow by simulating the server logic
 * Tests the fixed questions implementation
 */

// Load server functions directly
const { extractBANTExactAI, wasLastAIMessageBANTQuestion, isLikelyBANTAnswer } = require('./server.js');

// Test scenario
async function testBANTFlow() {
  console.log('TESTING FIXED QUESTIONS BANT FLOW\n');
  console.log('='.repeat(80));
  
  // Simulate a conversation
  const conversation = [];
  const bantState = {
    budget: null,
    authority: null,
    need: null,
    timeline: null
  };
  
  // Test inputs
  const userInputs = [
    'Hi I want to buy a condo',
    '15 million pesos',
    'I am the sole decision maker',
    'For my family to live in',
    '3 months',
    'John Doe 09171234567'
  ];
  
  // Expected questions in order
  const expectedQuestions = [
    'budget',
    'authority',
    'need/purpose',
    'timeline',
    'contact'
  ];
  
  let currentQuestionIndex = 0;
  
  for (const input of userInputs) {
    console.log(`\nUser: "${input}"`);
    
    // Add user message to conversation
    conversation.push({ sender: 'user', content: input });
    
    // Detect if this is a BANT answer
    const lastAIQuestion = conversation.length > 1 ? 
      wasLastAIMessageBANTQuestion(conversation.slice(-2)) : null;
    
    const detection = isLikelyBANTAnswer(input, lastAIQuestion);
    
    if (detection.isBant) {
      console.log(`  Detected: ${detection.type} (${(detection.confidence * 100).toFixed(0)}% confidence)`);
      
      // Update BANT state
      if (detection.type === 'budget' && !bantState.budget) {
        bantState.budget = input;
      } else if (detection.type === 'authority' && !bantState.authority) {
        bantState.authority = input;
      } else if (detection.type === 'need' && !bantState.need) {
        bantState.need = input;
      } else if (detection.type === 'timeline' && !bantState.timeline) {
        bantState.timeline = input;
      }
    }
    
    // Generate next question using fixed logic
    let aiResponse = '';
    let acknowledgment = '';
    
    // Acknowledge what was just provided
    if (detection.isBant) {
      switch (detection.type) {
        case 'budget':
          acknowledgment = `Great! I've noted your budget of ${input}. `;
          break;
        case 'authority':
          acknowledgment = 'Perfect, thank you for confirming. ';
          break;
        case 'need':
          acknowledgment = 'Great, for your personal residence! ';
          break;
        case 'timeline':
          acknowledgment = `Perfect, ${input} works! `;
          break;
      }
    }
    
    // Determine next question
    let nextQuestion = '';
    if (!bantState.budget) {
      nextQuestion = "To help find the perfect property for you, what's your budget range?";
    } else if (!bantState.authority) {
      nextQuestion = "Will you be the sole decision maker for this purchase?";
    } else if (!bantState.need) {
      nextQuestion = "Will this property be for personal residence or investment?";
    } else if (!bantState.timeline) {
      nextQuestion = "When are you planning to make this purchase?";
    } else {
      nextQuestion = "Excellent! To send you the best property options, may I have your name and contact number?";
    }
    
    aiResponse = acknowledgment + nextQuestion;
    console.log(`AI: "${aiResponse}"`);
    
    // Add AI response to conversation
    conversation.push({ sender: 'ai', content: aiResponse });
    
    // Check if asking the right question
    if (currentQuestionIndex < expectedQuestions.length) {
      const expected = expectedQuestions[currentQuestionIndex];
      if (nextQuestion.toLowerCase().includes(expected)) {
        console.log(`  ✅ Correct - asking about ${expected}`);
      } else {
        // Check if it's a duplicate
        let isDuplicate = false;
        for (let i = 0; i < currentQuestionIndex; i++) {
          if (nextQuestion.toLowerCase().includes(expectedQuestions[i])) {
            console.log(`  ❌ DUPLICATE - already asked about ${expectedQuestions[i]}`);
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          console.log(`  ❌ WRONG - expected to ask about ${expected}`);
        }
      }
      
      if (detection.isBant) {
        currentQuestionIndex++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FINAL BANT STATE:');
  console.log('='.repeat(80));
  console.log(`Budget: ${bantState.budget || 'Not collected'}`);
  console.log(`Authority: ${bantState.authority || 'Not collected'}`);
  console.log(`Need: ${bantState.need || 'Not collected'}`);
  console.log(`Timeline: ${bantState.timeline || 'Not collected'}`);
  
  // Check if all BANT collected
  const allCollected = bantState.budget && bantState.authority && 
                      bantState.need && bantState.timeline;
  
  if (allCollected) {
    console.log('\n✅ SUCCESS: All BANT information collected!');
  } else {
    console.log('\n❌ FAILURE: Missing BANT information');
  }
}

// Run the test
testBANTFlow().catch(console.error);