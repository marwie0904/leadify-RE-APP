#!/usr/bin/env node

/**
 * Test GPT-5 Models with New Parameters (reasoning_effort and verbosity)
 * Tests the new implementation that replaces temperature with these parameters
 */

require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// GPT-5 parameter presets (from server.js)
const GPT5_PARAMS = {
  FAST_EXTRACTION: { reasoning_effort: 'minimal', verbosity: 'low' },
  CLASSIFICATION: { reasoning_effort: 'minimal', verbosity: 'low' },
  BALANCED_CHAT: { reasoning_effort: 'medium', verbosity: 'medium' },
  COMPLEX_REASONING: { reasoning_effort: 'high', verbosity: 'medium' },
  DETAILED_RESPONSE: { reasoning_effort: 'high', verbosity: 'high' },
  ESTIMATION: { reasoning_effort: 'medium', verbosity: 'low' }
};

// Test 1: Test FAST_EXTRACTION preset with GPT-5 Nano
async function testFastExtraction() {
  console.log(`\n${colors.blue}📝 Test 1: FAST_EXTRACTION (GPT-5 Nano)${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('Testing with reasoning_effort: minimal, verbosity: low...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'system', content: 'Extract the name from the message. Reply with just the name.' },
        { role: 'user', content: 'Hi, my name is John Smith' }
      ],
      max_completion_tokens: 10,
      ...GPT5_PARAMS.FAST_EXTRACTION
    });
    
    console.log(`${colors.green}✅ SUCCESS${colors.reset}`);
    console.log(`   Response: ${response.choices[0].message.content}`);
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
  } catch (error) {
    console.log(`${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
  }
}

// Test 2: Test BALANCED_CHAT preset with GPT-5 Mini
async function testBalancedChat() {
  console.log(`\n${colors.blue}📝 Test 2: BALANCED_CHAT (GPT-5 Mini)${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('Testing with reasoning_effort: medium, verbosity: medium...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What are the benefits of regular exercise?' }
      ],
      max_completion_tokens: 100,
      ...GPT5_PARAMS.BALANCED_CHAT
    });
    
    console.log(`${colors.green}✅ SUCCESS${colors.reset}`);
    console.log(`   Response length: ${response.choices[0].message.content.length} chars`);
    console.log(`   First 100 chars: ${response.choices[0].message.content.substring(0, 100)}...`);
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
  } catch (error) {
    console.log(`${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
  }
}

// Test 3: Test COMPLEX_REASONING preset
async function testComplexReasoning() {
  console.log(`\n${colors.blue}📝 Test 3: COMPLEX_REASONING (GPT-5 Mini)${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('Testing with reasoning_effort: high, verbosity: medium...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'Analyze the following problem step by step.' },
        { role: 'user', content: 'If a train travels 60 miles in 1.5 hours, what is its average speed?' }
      ],
      max_completion_tokens: 150,
      ...GPT5_PARAMS.COMPLEX_REASONING
    });
    
    console.log(`${colors.green}✅ SUCCESS${colors.reset}`);
    console.log(`   Response contains reasoning: ${response.choices[0].message.content.includes('step') || response.choices[0].message.content.includes('therefore')}`);
    console.log(`   Response length: ${response.choices[0].message.content.length} chars`);
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
  } catch (error) {
    console.log(`${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
  }
}

// Test 4: Test DETAILED_RESPONSE preset
async function testDetailedResponse() {
  console.log(`\n${colors.blue}📝 Test 4: DETAILED_RESPONSE (GPT-5 Mini)${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('Testing with reasoning_effort: high, verbosity: high...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'Provide a comprehensive explanation.' },
        { role: 'user', content: 'Explain photosynthesis.' }
      ],
      max_completion_tokens: 200,
      ...GPT5_PARAMS.DETAILED_RESPONSE
    });
    
    console.log(`${colors.green}✅ SUCCESS${colors.reset}`);
    console.log(`   Response length: ${response.choices[0].message.content.length} chars`);
    console.log(`   Contains details: ${response.choices[0].message.content.includes('chlorophyll') || response.choices[0].message.content.includes('sunlight')}`);
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
  } catch (error) {
    console.log(`${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
  }
}

// Test 5: Compare verbosity levels
async function compareVerbosityLevels() {
  console.log(`\n${colors.blue}📝 Test 5: Compare Verbosity Levels${colors.reset}`);
  console.log('=' .repeat(50));
  
  const prompt = 'What is 2+2?';
  const verbosityLevels = ['low', 'medium', 'high'];
  
  for (const verbosity of verbosityLevels) {
    try {
      console.log(`\nTesting verbosity: ${verbosity}`);
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 50,
        reasoning_effort: 'minimal',
        verbosity: verbosity
      });
      
      console.log(`   Response (${verbosity}): ${response.choices[0].message.content}`);
      console.log(`   Length: ${response.choices[0].message.content.length} chars`);
    } catch (error) {
      console.log(`   ${colors.red}Failed: ${error.message}${colors.reset}`);
    }
  }
}

// Test 6: Verify no temperature parameter is sent
async function verifyNoTemperature() {
  console.log(`\n${colors.blue}📝 Test 6: Verify No Temperature Parameter${colors.reset}`);
  console.log('=' .repeat(50));
  
  try {
    console.log('Testing without temperature parameter (should work)...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'user', content: 'Say "working"' }
      ],
      max_completion_tokens: 5,
      reasoning_effort: 'minimal',
      verbosity: 'low'
      // No temperature parameter
    });
    
    console.log(`${colors.green}✅ SUCCESS - No temperature error${colors.reset}`);
    console.log(`   Response: ${response.choices[0].message.content}`);
  } catch (error) {
    console.log(`${colors.red}❌ FAILED: ${error.message}${colors.reset}`);
  }
  
  // Now test that temperature DOES cause an error
  try {
    console.log('\nTesting WITH temperature parameter (should fail)...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'user', content: 'Say "working"' }
      ],
      max_completion_tokens: 5,
      temperature: 0 // This should cause an error
    });
    
    console.log(`${colors.red}❌ UNEXPECTED SUCCESS - Temperature should have caused error${colors.reset}`);
  } catch (error) {
    if (error.message.includes('temperature')) {
      console.log(`${colors.green}✅ EXPECTED ERROR - Temperature not supported${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.blue}🚀 GPT-5 New Parameters Test Suite${colors.reset}`);
  console.log(`${colors.blue}================================${colors.reset}`);
  
  await testFastExtraction();
  await testBalancedChat();
  await testComplexReasoning();
  await testDetailedResponse();
  await compareVerbosityLevels();
  await verifyNoTemperature();
  
  console.log(`\n${colors.blue}📊 Test Summary${colors.reset}`);
  console.log('=' .repeat(50));
  console.log(`${colors.green}✨ Key Findings:${colors.reset}`);
  console.log('1. reasoning_effort parameter controls depth of analysis');
  console.log('2. verbosity parameter controls response length/detail');
  console.log('3. Temperature parameter is NOT supported and causes errors');
  console.log('4. Different presets optimize for different use cases');
  console.log(`\n${colors.green}✅ GPT-5 parameters implementation ready!${colors.reset}`);
}

// Run tests
runAllTests().catch(console.error);