#!/usr/bin/env node

/**
 * Test pattern detection directly
 */

// Copy the isLikelyBANTAnswer function from server.js
function isLikelyBANTAnswer(message, lastBANTStep = null) {
  if (!message) return { isBant: false, type: null, confidence: 0 };
  
  const msg = message.toLowerCase().trim();
  let confidence = 0;
  let detectedType = null;
  
  // Budget answer patterns - very comprehensive
  const budgetPatterns = {
    numeric: /^\d+[\s]*[kmb]?$/i,  // Just numbers with optional K/M/B
    withM: /\d+[\s-]*m(illion)?/i,  // Numbers with M or million
    withK: /\d+[\s-]*k/i,  // Numbers with K
    ranges: /\d+[\s]*(-|to|and)[\s]*\d+/i,  // Number ranges
    currency: /[₱\$€£¥][\s]*[\d,]+/i,  // Currency symbols
    php: /php[\s]*[\d,]+/i,  // PHP currency
    approximate: /(around|about|roughly|approximately|more or less)[\s]*\d+/i,
    maxMin: /(max|maximum|min|minimum|up to|at least)[\s]*\d+/i,
    millions: /(million|mil)\b/i,
    thousands: /(thousand|k)\b/i,
    wordNumbers: /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred)\s*(million|thousand|mil|k)/i,
    commas: /^\d{1,3}(,\d{3})+$/  // Numbers with commas
  };
  
  // Check budget patterns
  for (const [key, pattern] of Object.entries(budgetPatterns)) {
    if (pattern.test(msg)) {
      detectedType = 'budget';
      confidence = Math.max(confidence, 0.8);
      
      // Higher confidence for certain patterns
      if (key === 'withM' || key === 'ranges' || key === 'currency') {
        confidence = 0.95;
      }
      break;
    }
  }
  
  // Authority answer patterns
  const authorityPatterns = {
    affirmative: /^(yes|yep|yeah|yup|correct|right|absolutely|definitely|certainly|sure|of course|indeed)[\s!.,]*$/i,
    iAm: /^(i am|i'm|yes i am|yeah i am|yep i am)[\s!.,]*$/i,
    sole: /(sole|only|just me|my decision|i decide|i make|i'm the)/i,
    joint: /(spouse|wife|husband|partner|family|together|both|we|us|consulting)/i,
    negative: /^(no|nope|not|nah)[\s!.,]*$/i,
    withOthers: /(with|need|approval|others|board|committee)/i
  };
  
  if (!detectedType) {
    for (const [key, pattern] of Object.entries(authorityPatterns)) {
      if (pattern.test(msg)) {
        detectedType = 'authority';
        confidence = 0.85;
        
        // Higher confidence for clear patterns
        if (key === 'affirmative' || key === 'iAm' || key === 'sole') {
          confidence = 0.95;
        }
        break;
      }
    }
  }
  
  return {
    isBant: detectedType !== null,
    type: detectedType,
    confidence: confidence
  };
}

// Test various inputs
const testCases = [
  // Budget tests
  { input: '10M', expected: 'budget' },
  { input: '10-15M', expected: 'budget' },
  { input: '50-60M', expected: 'budget' },
  { input: 'My budget is 15 million pesos', expected: 'budget' },
  { input: 'Around 20M', expected: 'budget' },
  
  // Authority tests
  { input: 'yes', expected: 'authority' },
  { input: 'Yes I am', expected: 'authority' },
  { input: 'I am the sole decision maker', expected: 'authority' },
  { input: 'Yes, I am the sole decision maker', expected: 'authority' },
  { input: 'just me', expected: 'authority' },
  { input: 'I decide', expected: 'authority' },
  { input: 'sole decision maker', expected: 'authority' },
];

console.log('🧪 PATTERN DETECTION TEST\n');

testCases.forEach(test => {
  const result = isLikelyBANTAnswer(test.input);
  const icon = (result.type === test.expected) ? '✅' : '❌';
  
  console.log(`${icon} "${test.input}"`);
  console.log(`   Expected: ${test.expected}, Got: ${result.type || 'not detected'}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log();
});