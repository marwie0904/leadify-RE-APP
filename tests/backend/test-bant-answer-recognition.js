#!/usr/bin/env node

/**
 * Test Suite: BANT Answer Recognition
 * Purpose: Comprehensive tests for recognizing various BANT answer formats
 * Approach: Test-Driven Development (TDD)
 */

const assert = require('assert');

// Test data for various BANT answer formats
const TEST_CASES = {
  // Budget answer patterns
  budget: {
    numeric: [
      { input: '50', expectedType: 'budget', description: 'Pure number' },
      { input: '100000', expectedType: 'budget', description: 'Large number' },
      { input: '5M', expectedType: 'budget', description: 'Number with M' },
      { input: '10m', expectedType: 'budget', description: 'Number with lowercase m' },
      { input: '5.5M', expectedType: 'budget', description: 'Decimal with M' },
    ],
    ranges: [
      { input: '50-60M', expectedType: 'budget', description: 'Range with dash' },
      { input: '10 to 20 million', expectedType: 'budget', description: 'Range with "to"' },
      { input: 'between 5 and 10M', expectedType: 'budget', description: 'Range with "between"' },
      { input: '5M - 10M', expectedType: 'budget', description: 'Range with spaces' },
      { input: '₱10M-₱20M', expectedType: 'budget', description: 'Range with currency' },
    ],
    approximate: [
      { input: 'around 5M', expectedType: 'budget', description: 'Around X' },
      { input: 'about 10 million', expectedType: 'budget', description: 'About X' },
      { input: 'roughly 20M', expectedType: 'budget', description: 'Roughly X' },
      { input: 'approximately 15 million', expectedType: 'budget', description: 'Approximately X' },
      { input: 'more or less 8M', expectedType: 'budget', description: 'More or less X' },
    ],
    currency: [
      { input: 'PHP 5M', expectedType: 'budget', description: 'PHP currency' },
      { input: '$100k', expectedType: 'budget', description: 'Dollar with k' },
      { input: '₱10 million', expectedType: 'budget', description: 'Peso symbol' },
      { input: 'P5,000,000', expectedType: 'budget', description: 'P with commas' },
      { input: '€2M', expectedType: 'budget', description: 'Euro symbol' },
    ],
    words: [
      { input: 'five million', expectedType: 'budget', description: 'Words only' },
      { input: 'ten mil', expectedType: 'budget', description: 'Abbreviated million' },
      { input: 'fifty million pesos', expectedType: 'budget', description: 'Words with currency' },
      { input: 'twenty five million', expectedType: 'budget', description: 'Compound number' },
      { input: 'one point five million', expectedType: 'budget', description: 'Decimal in words' },
    ],
    complex: [
      { input: 'My budget is 50-60M', expectedType: 'budget', description: 'Full sentence' },
      { input: 'I have around 10 million', expectedType: 'budget', description: 'Conversational' },
      { input: 'Can do up to 15M', expectedType: 'budget', description: 'Informal' },
      { input: 'Maximum 20 million pesos', expectedType: 'budget', description: 'Maximum specified' },
      { input: 'Minimum 5M, max 10M', expectedType: 'budget', description: 'Min and max' },
    ]
  },

  // Authority answer patterns
  authority: {
    affirmative: [
      { input: 'yes', expectedType: 'authority', description: 'Simple yes' },
      { input: 'yep', expectedType: 'authority', description: 'Casual yes' },
      { input: 'yeah', expectedType: 'authority', description: 'Informal yes' },
      { input: 'Yes I am', expectedType: 'authority', description: 'Yes I am' },
      { input: 'correct', expectedType: 'authority', description: 'Correct' },
      { input: "that's right", expectedType: 'authority', description: 'Confirmation' },
      { input: 'absolutely', expectedType: 'authority', description: 'Strong yes' },
      { input: 'definitely', expectedType: 'authority', description: 'Definite yes' },
    ],
    sole: [
      { input: 'sole decision maker', expectedType: 'authority', description: 'Explicit sole' },
      { input: 'just me', expectedType: 'authority', description: 'Just me' },
      { input: 'I decide', expectedType: 'authority', description: 'I decide' },
      { input: 'my decision', expectedType: 'authority', description: 'My decision' },
      { input: "I'm the only one", expectedType: 'authority', description: 'Only one' },
      { input: 'I make the decisions', expectedType: 'authority', description: 'Decision maker' },
    ],
    joint: [
      { input: 'with my spouse', expectedType: 'authority', description: 'With spouse' },
      { input: 'family decision', expectedType: 'authority', description: 'Family' },
      { input: 'we decide together', expectedType: 'authority', description: 'Together' },
      { input: 'me and my wife', expectedType: 'authority', description: 'Me and wife' },
      { input: 'consulting with partner', expectedType: 'authority', description: 'With partner' },
      { input: 'board approval needed', expectedType: 'authority', description: 'Board approval' },
    ],
    negative: [
      { input: 'no', expectedType: 'authority', description: 'Simple no' },
      { input: 'not alone', expectedType: 'authority', description: 'Not alone' },
      { input: 'with others', expectedType: 'authority', description: 'With others' },
      { input: 'need approval', expectedType: 'authority', description: 'Need approval' },
      { input: 'not just me', expectedType: 'authority', description: 'Not just me' },
    ]
  },

  // Need answer patterns
  need: {
    residence: [
      { input: 'for living', expectedType: 'need', description: 'For living' },
      { input: 'personal use', expectedType: 'need', description: 'Personal use' },
      { input: 'home', expectedType: 'need', description: 'Home' },
      { input: 'residence', expectedType: 'need', description: 'Residence' },
      { input: 'to live in', expectedType: 'need', description: 'To live in' },
      { input: 'primary residence', expectedType: 'need', description: 'Primary residence' },
      { input: 'family home', expectedType: 'need', description: 'Family home' },
    ],
    investment: [
      { input: 'investment', expectedType: 'need', description: 'Investment' },
      { input: 'rental', expectedType: 'need', description: 'Rental' },
      { input: 'for income', expectedType: 'need', description: 'For income' },
      { input: 'business', expectedType: 'need', description: 'Business' },
      { input: 'ROI', expectedType: 'need', description: 'ROI' },
      { input: 'passive income', expectedType: 'need', description: 'Passive income' },
      { input: 'rental property', expectedType: 'need', description: 'Rental property' },
    ],
    mixed: [
      { input: 'both', expectedType: 'need', description: 'Both' },
      { input: 'investment and living', expectedType: 'need', description: 'Mixed use' },
      { input: 'primarily residence', expectedType: 'need', description: 'Primarily residence' },
      { input: 'live then rent', expectedType: 'need', description: 'Live then rent' },
      { input: 'vacation home', expectedType: 'need', description: 'Vacation home' },
    ]
  },

  // Timeline answer patterns
  timeline: {
    specific: [
      { input: '3 months', expectedType: 'timeline', description: 'X months' },
      { input: 'next month', expectedType: 'timeline', description: 'Next month' },
      { input: 'January', expectedType: 'timeline', description: 'Month name' },
      { input: 'Q1 2025', expectedType: 'timeline', description: 'Quarter year' },
      { input: 'end of year', expectedType: 'timeline', description: 'End of year' },
      { input: 'this month', expectedType: 'timeline', description: 'This month' },
      { input: 'within 30 days', expectedType: 'timeline', description: 'Within X days' },
    ],
    ranges: [
      { input: '3-6 months', expectedType: 'timeline', description: 'Month range' },
      { input: 'within a year', expectedType: 'timeline', description: 'Within a year' },
      { input: '6 to 12 months', expectedType: 'timeline', description: 'X to Y months' },
      { input: 'next 2 quarters', expectedType: 'timeline', description: 'Quarters' },
      { input: 'before December', expectedType: 'timeline', description: 'Before X' },
    ],
    urgent: [
      { input: 'ASAP', expectedType: 'timeline', description: 'ASAP' },
      { input: 'immediately', expectedType: 'timeline', description: 'Immediately' },
      { input: 'right away', expectedType: 'timeline', description: 'Right away' },
      { input: 'urgent', expectedType: 'timeline', description: 'Urgent' },
      { input: 'as soon as possible', expectedType: 'timeline', description: 'As soon as possible' },
      { input: 'now', expectedType: 'timeline', description: 'Now' },
    ],
    flexible: [
      { input: 'no rush', expectedType: 'timeline', description: 'No rush' },
      { input: 'flexible', expectedType: 'timeline', description: 'Flexible' },
      { input: 'when right property comes', expectedType: 'timeline', description: 'Conditional' },
      { input: 'not in a hurry', expectedType: 'timeline', description: 'Not in hurry' },
      { input: 'depends', expectedType: 'timeline', description: 'Depends' },
    ]
  },

  // Contact answer patterns
  contact: {
    names: [
      { input: 'John Doe', expectedType: 'contact', description: 'Full name' },
      { input: 'Maria Santos', expectedType: 'contact', description: 'Full name 2' },
      { input: 'Juan', expectedType: 'contact', description: 'First name only' },
      { input: 'Mr. Smith', expectedType: 'contact', description: 'Title and name' },
      { input: 'Dr. Jane Cruz', expectedType: 'contact', description: 'Title full name' },
    ],
    phones: [
      { input: '09171234567', expectedType: 'contact', description: 'PH mobile' },
      { input: '+639171234567', expectedType: 'contact', description: 'PH mobile with code' },
      { input: '(02) 8123-4567', expectedType: 'contact', description: 'Landline' },
      { input: '917-123-4567', expectedType: 'contact', description: 'Formatted' },
      { input: '0917 123 4567', expectedType: 'contact', description: 'Spaced' },
    ],
    emails: [
      { input: 'john@example.com', expectedType: 'contact', description: 'Email' },
      { input: 'user.name@domain.co', expectedType: 'contact', description: 'Email with dot' },
      { input: 'test123@gmail.com', expectedType: 'contact', description: 'Gmail' },
      { input: 'info@company.ph', expectedType: 'contact', description: 'PH domain' },
    ],
    combined: [
      { input: 'John Doe, 09171234567', expectedType: 'contact', description: 'Name and phone' },
      { input: 'Maria Cruz 0917-123-4567 maria@email.com', expectedType: 'contact', description: 'Full contact' },
      { input: 'Juan Santos | +639171234567', expectedType: 'contact', description: 'Pipe separator' },
      { input: 'Call me at 09171234567', expectedType: 'contact', description: 'With text' },
      { input: 'My email is john@test.com', expectedType: 'contact', description: 'Email with text' },
    ]
  }
};

// Mock functions to test (these will be implemented in server.js)
const mockFunctions = {
  isLikelyBANTAnswer: (message, lastAIMessage) => {
    const msg = message.toLowerCase();
    
    // Budget patterns
    if (/\d+[\s-]*(m|million|mil|k|thousand)/i.test(message) ||
        /^[\d,]+$/.test(message) ||
        /\₱|php|\$|€/i.test(message) ||
        /(around|about|roughly|approximately|between|to|max|min)/i.test(msg) && /\d/i.test(msg)) {
      return { isBant: true, type: 'budget' };
    }
    
    // Authority patterns
    if (/^(yes|yep|yeah|no|nope|correct|absolutely|definitely)/i.test(msg) ||
        /(sole|decision|maker|spouse|family|together|alone|approve)/i.test(msg)) {
      return { isBant: true, type: 'authority' };
    }
    
    // Need patterns
    if (/(living|residence|home|investment|rental|income|business|roi|both)/i.test(msg)) {
      return { isBant: true, type: 'need' };
    }
    
    // Timeline patterns
    if (/(month|year|quarter|asap|immediately|urgent|flexible|rush|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(msg) ||
        /q[1-4]\s*\d{4}/i.test(msg) ||
        /\d+\s*(days|weeks|months|years)/i.test(msg)) {
      return { isBant: true, type: 'timeline' };
    }
    
    // Contact patterns
    if (/\d{10,11}/.test(msg) ||
        /\+63/.test(msg) ||
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(msg) ||
        /^[a-zA-Z]+ [a-zA-Z]+/.test(msg) && msg.length < 50) {
      return { isBant: true, type: 'contact' };
    }
    
    return { isBant: false, type: null };
  },

  wasLastAIMessageBANTQuestion: (lastAIMessage) => {
    if (!lastAIMessage) return null;
    
    const msg = lastAIMessage.toLowerCase();
    
    if (/(budget|investment|spend|afford|price range|financial)/i.test(msg)) {
      return 'budget';
    }
    if (/(decision|sole|authority|approve|who else|consulting)/i.test(msg)) {
      return 'authority';
    }
    if (/(purpose|need|use|living|investment|residence|rental)/i.test(msg)) {
      return 'need';
    }
    if (/(when|timeline|move|purchase|buy|planning|soon)/i.test(msg)) {
      return 'timeline';
    }
    if (/(name|contact|phone|email|number|reach)/i.test(msg)) {
      return 'contact';
    }
    
    return null;
  }
};

// Test runner
class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.results = [];
  }

  runTest(testCase, category) {
    this.totalTests++;
    const result = mockFunctions.isLikelyBANTAnswer(testCase.input);
    const passed = result.isBant && result.type === testCase.expectedType;
    
    if (passed) {
      this.passedTests++;
      this.results.push({
        status: 'PASS',
        category,
        input: testCase.input,
        description: testCase.description,
        expected: testCase.expectedType,
        actual: result.type
      });
    } else {
      this.failedTests++;
      this.results.push({
        status: 'FAIL',
        category,
        input: testCase.input,
        description: testCase.description,
        expected: testCase.expectedType,
        actual: result.type || 'not recognized'
      });
    }
    
    return passed;
  }

  printResults() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.failedTests}`);
    console.log(`📈 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
    
    if (this.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - [${r.category}] "${r.input}" - Expected: ${r.expected}, Got: ${r.actual}`);
      });
    }
    
    console.log('\n📊 Category Breakdown:');
    const categories = ['budget', 'authority', 'need', 'timeline', 'contact'];
    categories.forEach(cat => {
      const catTests = this.results.filter(r => r.expected === cat);
      const catPassed = catTests.filter(r => r.status === 'PASS').length;
      const catTotal = catTests.length;
      console.log(`  ${cat}: ${catPassed}/${catTotal} (${catTotal > 0 ? ((catPassed/catTotal)*100).toFixed(1) : 0}%)`);
    });
  }
}

// Main test execution
async function runTests() {
  console.log('═'.repeat(80));
  console.log('🧪 BANT ANSWER RECOGNITION TEST SUITE');
  console.log('═'.repeat(80));
  console.log('Testing comprehensive BANT answer pattern recognition\n');

  const runner = new TestRunner();

  // Test all categories
  Object.entries(TEST_CASES).forEach(([category, subcategories]) => {
    console.log(`\n📝 Testing ${category.toUpperCase()} answers:`);
    console.log('-'.repeat(60));
    
    Object.entries(subcategories).forEach(([subcat, tests]) => {
      console.log(`  ${subcat}:`);
      tests.forEach(test => {
        const passed = runner.runTest(test, `${category}/${subcat}`);
        const icon = passed ? '✅' : '❌';
        console.log(`    ${icon} "${test.input}" - ${test.description}`);
      });
    });
  });

  // Test context awareness
  console.log('\n📝 Testing Context Awareness:');
  console.log('-'.repeat(60));
  
  const contextTests = [
    {
      lastAI: "What's your budget range for this property?",
      userInput: "50-60M",
      expectedStep: 'budget',
      description: 'Budget question context'
    },
    {
      lastAI: "Are you the sole decision maker?",
      userInput: "Yes I am",
      expectedStep: 'authority',
      description: 'Authority question context'
    },
    {
      lastAI: "Will this be for personal use or investment?",
      userInput: "for living",
      expectedStep: 'need',
      description: 'Need question context'
    }
  ];

  contextTests.forEach(test => {
    const bantStep = mockFunctions.wasLastAIMessageBANTQuestion(test.lastAI);
    const passed = bantStep === test.expectedStep;
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${test.description}: ${passed ? 'Correct' : `Expected ${test.expectedStep}, got ${bantStep}`}`);
  });

  runner.printResults();

  // Test coverage calculation
  const coverage = {
    budgetPatterns: Object.values(TEST_CASES.budget).flat().length,
    authorityPatterns: Object.values(TEST_CASES.authority).flat().length,
    needPatterns: Object.values(TEST_CASES.need).flat().length,
    timelinePatterns: Object.values(TEST_CASES.timeline).flat().length,
    contactPatterns: Object.values(TEST_CASES.contact).flat().length
  };

  console.log('\n📊 Test Coverage:');
  console.log(`  Budget patterns tested: ${coverage.budgetPatterns}`);
  console.log(`  Authority patterns tested: ${coverage.authorityPatterns}`);
  console.log(`  Need patterns tested: ${coverage.needPatterns}`);
  console.log(`  Timeline patterns tested: ${coverage.timelinePatterns}`);
  console.log(`  Contact patterns tested: ${coverage.contactPatterns}`);
  console.log(`  Total patterns tested: ${Object.values(coverage).reduce((a,b) => a+b, 0)}`);

  console.log('\n═'.repeat(80));
  console.log('✨ Test suite complete!');
  console.log('═'.repeat(80));

  // Exit with appropriate code
  process.exit(runner.failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);