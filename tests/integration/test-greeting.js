#!/usr/bin/env node

/**
 * Test Greeting Recognition and Response
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testGreetings() {
  console.log('🧪 Testing Greeting Recognition and Responses\n');
  console.log('=' .repeat(50));
  
  const agentId = '59f3e30b-107a-4289-905b-92fa46f56e5f'; // ResidentialBot
  
  // Test various greeting types
  const greetingTests = [
    { message: "hello", expected: "greeting response with agent name" },
    { message: "hi", expected: "greeting response" },
    { message: "Hello", expected: "greeting response" },
    { message: "good morning", expected: "time-specific greeting" },
    { message: "good afternoon", expected: "time-specific greeting" },
    { message: "good evening", expected: "time-specific greeting" },
    { message: "hey", expected: "greeting response" },
    { message: "what's up", expected: "casual greeting response" },
    { message: "morning", expected: "time-based greeting" },
    { message: "👋", expected: "emoji greeting response" },
    { message: "hola", expected: "foreign language acknowledgment" },
    { message: "thanks", expected: "you're welcome response" },
    { message: "bye", expected: "goodbye response" }
  ];
  
  for (const test of greetingTests) {
    console.log(`\n📝 Testing: "${test.message}"`);
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: test.message,
        agentId: agentId
      });
      
      console.log(`✅ Response: "${response.data.response}"`);
      console.log(`   Expected: ${test.expected}`);
      
      // Check if response contains greeting elements
      const responseText = response.data.response.toLowerCase();
      const hasGreeting = responseText.includes('hello') || 
                          responseText.includes('hi') || 
                          responseText.includes('good morning') ||
                          responseText.includes('good afternoon') ||
                          responseText.includes('good evening') ||
                          responseText.includes('welcome') ||
                          responseText.includes('hey');
      
      const hasAgentName = responseText.includes('residentialbot') || 
                           responseText.includes("i'm") ||
                           responseText.includes("i am");
      
      const hasPropertyQuestion = responseText.includes('property') || 
                                  responseText.includes('looking for') ||
                                  responseText.includes('help you') ||
                                  responseText.includes('assist');
      
      if (test.message === 'thanks') {
        console.log(`   ✓ Thanks acknowledgment: ${responseText.includes("you're welcome") ? '✅' : '❌'}`);
      } else if (test.message === 'bye') {
        console.log(`   ✓ Goodbye acknowledgment: ${responseText.includes('thank you') || responseText.includes('feel free') ? '✅' : '❌'}`);
      } else {
        console.log(`   ✓ Has greeting: ${hasGreeting ? '✅' : '❌'}`);
        console.log(`   ✓ Has agent introduction: ${hasAgentName ? '✅' : '❌'}`);
        console.log(`   ✓ Has property question: ${hasPropertyQuestion ? '✅' : '❌'}`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Greeting Tests Complete\n');
}

// Run the test
testGreetings().catch(console.error);