#!/usr/bin/env node

/**
 * COMPREHENSIVE BANT TESTING SUITE
 * 30+ diverse scenarios to stress test the AI's BANT recognition
 * Iteratively improves until 100% success rate
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';
const DELAY_BETWEEN_MESSAGES = 2000; // 2 seconds between messages
const MAX_ITERATIONS = 10; // Maximum improvement iterations
const TRANSCRIPT_DIR = './test-transcripts';

// Create transcript directory
if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR);
}

// UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Test client class
class TestClient {
  constructor() {
    this.conversationId = null;
    this.transcript = [];
    this.errors = [];
  }

  async sendMessage(message) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const payload = JSON.stringify({
        message,
        agentId: AGENT_ID,
        conversationId: this.conversationId,
        userId: 'test-user-' + generateUUID().slice(0, 8),
        source: 'web'
      });
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      };
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          try {
            const response = JSON.parse(data);
            const result = {
              message,
              response: response.response || 'No response',
              intent: response.intent || 'Unknown',
              conversationId: response.conversationId || this.conversationId,
              responseTime,
              success: true,
              timestamp: new Date().toISOString()
            };
            
            if (response.conversationId && !this.conversationId) {
              this.conversationId = response.conversationId;
            }
            
            this.transcript.push({
              timestamp: result.timestamp,
              user: message,
              ai: result.response,
              intent: result.intent,
              responseTime: `${responseTime}ms`
            });
            
            resolve(result);
          } catch (e) {
            const result = {
              message,
              error: data || e.message,
              responseTime,
              success: false,
              timestamp: new Date().toISOString()
            };
            
            this.transcript.push({
              timestamp: result.timestamp,
              user: message,
              error: result.error,
              responseTime: `${responseTime}ms`
            });
            
            this.errors.push({
              scenario: 'Message Parse Error',
              message,
              error: result.error,
              timestamp: result.timestamp
            });
            
            resolve(result);
          }
        });
      });
      
      req.on('error', (e) => {
        const responseTime = Date.now() - startTime;
        const result = {
          message,
          error: e.message,
          responseTime,
          success: false,
          timestamp: new Date().toISOString()
        };
        
        this.transcript.push({
          timestamp: result.timestamp,
          user: message,
          error: result.error,
          responseTime: `${responseTime}ms`
        });
        
        this.errors.push({
          scenario: 'Request Error',
          message,
          error: result.error,
          timestamp: result.timestamp
        });
        
        resolve(result);
      });
      
      req.write(payload);
      req.end();
    });
  }

  reset() {
    this.conversationId = null;
    this.transcript = [];
    this.errors = [];
  }
}

// Test scenarios - 30+ diverse cases
const TEST_SCENARIOS = [
  // === BASIC BANT FLOWS (1-5) ===
  {
    id: 'basic-1',
    name: 'Standard BANT Flow',
    messages: [
      { user: 'Hi, I am looking for a condo in BGC', expectBantStart: true },
      { user: '10-15M', expectNext: 'authority' },
      { user: 'Yes, I am the sole decision maker', expectNext: 'need' },
      { user: 'For personal residence', expectNext: 'timeline' },
      { user: '3-6 months', expectNext: 'contact' },
      { user: 'John Doe, 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'basic-2',
    name: 'BANT with Price Request First',
    messages: [
      { user: 'How much is a 2BR condo in Makati?', expectBantRedirect: true },
      { user: 'Around 20 million pesos', expectNext: 'authority' },
      { user: 'Me and my wife decide together', expectNext: 'need' },
      { user: 'Investment property', expectNext: 'timeline' },
      { user: 'ASAP', expectNext: 'contact' },
      { user: 'Maria Santos 0917-123-4567 maria@email.com', expectComplete: true }
    ]
  },
  {
    id: 'basic-3',
    name: 'BANT with Casual Language',
    messages: [
      { user: 'yo, need a place in fort', expectBantStart: true },
      { user: 'bout 5M', expectNext: 'authority' },
      { user: 'just me', expectNext: 'need' },
      { user: 'gonna live there', expectNext: 'timeline' },
      { user: 'next month', expectNext: 'contact' },
      { user: 'call me at 09161234567', expectComplete: true }
    ]
  },
  {
    id: 'basic-4',
    name: 'BANT with Formal Language',
    messages: [
      { user: 'Good day. I would like to inquire about properties in Ortigas.', expectBantStart: true },
      { user: 'My budget allocation is between 25 to 30 million pesos', expectNext: 'authority' },
      { user: 'I will be consulting with my business partners', expectNext: 'need' },
      { user: 'This will be for our company office', expectNext: 'timeline' },
      { user: 'We plan to acquire within Q1 2025', expectNext: 'contact' },
      { user: 'Dr. Juan Cruz, +639171234567, jcruz@company.com', expectComplete: true }
    ]
  },
  {
    id: 'basic-5',
    name: 'BANT with Mixed Languages',
    messages: [
      { user: 'Naghahanap ako ng bahay sa Quezon City', expectBantStart: true },
      { user: 'Mga 8-10M lang', expectNext: 'authority' },
      { user: 'Ako lang mag-decide', expectNext: 'need' },
      { user: 'Titirahan namin', expectNext: 'timeline' },
      { user: 'Within the year', expectNext: 'contact' },
      { user: 'Pedro Reyes 0906-123-4567', expectComplete: true }
    ]
  },

  // === EDGE CASES - BUDGET ANSWERS (6-10) ===
  {
    id: 'edge-budget-1',
    name: 'Budget as Pure Number',
    messages: [
      { user: 'Looking for property', expectBantStart: true },
      { user: '50000000', expectNext: 'authority' },
      { user: 'yes', expectNext: 'need' },
      { user: 'home', expectNext: 'timeline' },
      { user: 'soon', expectNext: 'contact' },
      { user: 'Juan 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'edge-budget-2',
    name: 'Budget with Currency Symbols',
    messages: [
      { user: 'I want to buy a house', expectBantStart: true },
      { user: '₱15,000,000 - ₱20,000,000', expectNext: 'authority' },
      { user: 'correct', expectNext: 'need' },
      { user: 'residence', expectNext: 'timeline' },
      { user: '90 days', expectNext: 'contact' },
      { user: 'test@email.com', expectComplete: true }
    ]
  },
  {
    id: 'edge-budget-3',
    name: 'Budget in Words',
    messages: [
      { user: 'Need a condo unit', expectBantStart: true },
      { user: 'five to seven million pesos', expectNext: 'authority' },
      { user: 'absolutely', expectNext: 'need' },
      { user: 'for rental income', expectNext: 'timeline' },
      { user: 'Q2 next year', expectNext: 'contact' },
      { user: 'Ana Cruz, 917-123-4567', expectComplete: true }
    ]
  },
  {
    id: 'edge-budget-4',
    name: 'Budget with Conditions',
    messages: [
      { user: 'searching for investment property', expectBantStart: true },
      { user: 'maximum 12M but prefer around 10M', expectNext: 'authority' },
      { user: 'with my spouse', expectNext: 'need' },
      { user: 'purely investment', expectNext: 'timeline' },
      { user: 'flexible, when right property comes', expectNext: 'contact' },
      { user: 'Jose and Maria Santos 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'edge-budget-5',
    name: 'Very Large Budget',
    messages: [
      { user: 'I need luxury property', expectBantStart: true },
      { user: '100-150M', expectNext: 'authority' },
      { user: 'board approval needed', expectNext: 'need' },
      { user: 'corporate housing', expectNext: 'timeline' },
      { user: 'end of fiscal year', expectNext: 'contact' },
      { user: 'Corporate Secretary, corporate@bigcompany.ph', expectComplete: true }
    ]
  },

  // === EDGE CASES - AUTHORITY ANSWERS (11-15) ===
  {
    id: 'edge-authority-1',
    name: 'Authority with Explanation',
    messages: [
      { user: 'want to get a house', expectBantStart: true },
      { user: 'PHP 6-8 million', expectNext: 'authority' },
      { user: 'Well, I make the final decision but I discuss with family', expectNext: 'need' },
      { user: 'family home', expectNext: 'timeline' },
      { user: 'after wedding in June', expectNext: 'contact' },
      { user: 'Mark Santos (0917) 123-4567', expectComplete: true }
    ]
  },
  {
    id: 'edge-authority-2',
    name: 'Negative Authority',
    messages: [
      { user: 'help me find condo', expectBantStart: true },
      { user: '3.5 to 4 million', expectNext: 'authority' },
      { user: 'no, need to ask my parents', expectNext: 'need' },
      { user: 'to live in while studying', expectNext: 'timeline' },
      { user: 'before school starts', expectNext: 'contact' },
      { user: 'Student Name 09061234567', expectComplete: true }
    ]
  },
  {
    id: 'edge-authority-3',
    name: 'Complex Authority Structure',
    messages: [
      { user: 'Company looking for office space', expectBantStart: true },
      { user: '30000000', expectNext: 'authority' },
      { user: 'I recommend but CEO and CFO approve', expectNext: 'need' },
      { user: 'main headquarters', expectNext: 'timeline' },
      { user: 'fiscal year 2025', expectNext: 'contact' },
      { user: 'Procurement Officer, proc@company.com, +632-8123-4567', expectComplete: true }
    ]
  },
  {
    id: 'edge-authority-4',
    name: 'Ambiguous Authority',
    messages: [
      { user: 'thinking about buying property', expectBantStart: true },
      { user: 'maybe 10-12M', expectNext: 'authority' },
      { user: 'depends on the property', expectNext: 'need' },
      { user: 'probably for living', expectNext: 'timeline' },
      { user: 'not sure yet', expectNext: 'contact' },
      { user: 'Just call me Tony 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'edge-authority-5',
    name: 'Single Word Authority',
    messages: [
      { user: 'buy house now', expectBantStart: true },
      { user: '7000000', expectNext: 'authority' },
      { user: 'me', expectNext: 'need' },
      { user: 'living', expectNext: 'timeline' },
      { user: 'immediately', expectNext: 'contact' },
      { user: '09171234567', expectComplete: true }
    ]
  },

  // === STRESS TEST - INTERRUPTIONS (16-20) ===
  {
    id: 'stress-interrupt-1',
    name: 'Price Interruption During BANT',
    messages: [
      { user: 'I need a condo', expectBantStart: true },
      { user: 'wait, how much do condos cost first?', expectContinueBant: true },
      { user: 'ok my budget is 8-10M', expectNext: 'authority' },
      { user: 'I decide alone', expectNext: 'need' },
      { user: 'for living', expectNext: 'timeline' },
      { user: '6 months', expectNext: 'contact' },
      { user: 'Robert Lee 0917-123-4567', expectComplete: true }
    ]
  },
  {
    id: 'stress-interrupt-2',
    name: 'Question Interruption',
    messages: [
      { user: 'looking for house in Alabang', expectBantStart: true },
      { user: '15 million', expectNext: 'authority' },
      { user: 'what areas do you cover?', expectContinueBant: true },
      { user: 'ok, yes I am sole decision maker', expectNext: 'need' },
      { user: 'personal residence', expectNext: 'timeline' },
      { user: 'within this year', expectNext: 'contact' },
      { user: 'Grace Tan, grace@email.com, 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'stress-interrupt-3',
    name: 'Multiple Interruptions',
    messages: [
      { user: 'Hi there!', expectGreeting: true },
      { user: 'I want to know about properties', expectBantStart: true },
      { user: 'How does this work?', expectContinueBant: true },
      { user: 'My budget is around 12M', expectNext: 'authority' },
      { user: 'Can you show me some options first?', expectContinueBant: true },
      { user: 'Fine, I make decisions with my wife', expectNext: 'need' },
      { user: 'investment and vacation home', expectNext: 'timeline' },
      { user: 'no rush really', expectNext: 'contact' },
      { user: 'Michael and Susan Chen, 0917-123-4567', expectComplete: true }
    ]
  },
  {
    id: 'stress-interrupt-4',
    name: 'Clarification Requests',
    messages: [
      { user: 'need property', expectBantStart: true },
      { user: 'what do you mean by budget?', expectClarification: true },
      { user: 'oh ok, around 9M', expectNext: 'authority' },
      { user: 'why do you need to know who decides?', expectClarification: true },
      { user: 'I see, yes just me', expectNext: 'need' },
      { user: 'residence', expectNext: 'timeline' },
      { user: 'next quarter', expectNext: 'contact' },
      { user: 'David 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'stress-interrupt-5',
    name: 'Topic Change Mid-BANT',
    messages: [
      { user: 'Looking for investment property', expectBantStart: true },
      { user: '20-25 million', expectNext: 'authority' },
      { user: 'Actually, tell me about BGC first', expectRedirectBack: true },
      { user: 'Interesting, I decide with partners', expectNext: 'need' },
      { user: 'rental business', expectNext: 'timeline' },
      { user: 'Q3 2025', expectNext: 'contact' },
      { user: 'Investment Group, invest@group.com', expectComplete: true }
    ]
  },

  // === STRESS TEST - UNUSUAL FORMATS (21-25) ===
  {
    id: 'format-unusual-1',
    name: 'All Caps Responses',
    messages: [
      { user: 'NEED HOUSE ASAP', expectBantStart: true },
      { user: 'BUDGET IS 10 MILLION', expectNext: 'authority' },
      { user: 'YES ONLY ME', expectNext: 'need' },
      { user: 'FOR MY FAMILY', expectNext: 'timeline' },
      { user: 'RIGHT NOW', expectNext: 'contact' },
      { user: 'JOHN 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'format-unusual-2',
    name: 'Emoji and Special Characters',
    messages: [
      { user: 'Hey! 👋 Looking for a nice place 🏠', expectBantStart: true },
      { user: '💰 8-10M PHP', expectNext: 'authority' },
      { user: '✓ Yes, solo decision', expectNext: 'need' },
      { user: '🏡 Family residence', expectNext: 'timeline' },
      { user: '📅 3 months', expectNext: 'contact' },
      { user: '📱 09171234567 - James', expectComplete: true }
    ]
  },
  {
    id: 'format-unusual-3',
    name: 'Very Long Responses',
    messages: [
      { user: 'Well, I have been thinking about this for a while now and I really think it is time for me to finally buy my own property because I have been renting for so long', expectBantStart: true },
      { user: 'So I have saved up quite a bit over the years and I think I can afford something in the range of 7 to 9 million pesos, maybe 10 if it is really perfect', expectNext: 'authority' },
      { user: 'It is just me making this decision, I mean I might ask friends for advice but ultimately I will decide', expectNext: 'need' },
      { user: 'I want to live there myself, tired of renting', expectNext: 'timeline' },
      { user: 'Hoping to move by end of year', expectNext: 'contact' },
      { user: 'Jennifer Lopez (not the singer lol) 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'format-unusual-4',
    name: 'Multiple Answers in One',
    messages: [
      { user: 'I need a 2BR condo, budget 5-7M, deciding alone, for living, ASAP', expectExtractAll: true },
      { user: 'Lisa Wong, 09171234567, lisa@email.com', expectComplete: true }
    ]
  },
  {
    id: 'format-unusual-5',
    name: 'Typos and Misspellings',
    messages: [
      { user: 'lokking for condp in bgx', expectBantStart: true },
      { user: 'budjet is 10 milion', expectNext: 'authority' },
      { user: 'yess, only mee', expectNext: 'need' },
      { user: 'for livinng', expectNext: 'timeline' },
      { user: '3 monthss', expectNext: 'contact' },
      { user: 'Jonh Smith 091712345567', expectComplete: true }
    ]
  },

  // === EXTREME EDGE CASES (26-30+) ===
  {
    id: 'extreme-1',
    name: 'Non-Cooperative User',
    messages: [
      { user: 'show me properties', expectBantStart: true },
      { user: 'why?', expectExplanation: true },
      { user: 'none of your business', expectPersist: true },
      { user: 'fine, 10M', expectNext: 'authority' },
      { user: 'whatever', expectPersist: true },
      { user: 'me', expectNext: 'need' },
      { user: 'living', expectNext: 'timeline' },
      { user: 'dunno', expectNext: 'contact' },
      { user: 'just email me info@test.com', expectComplete: true }
    ]
  },
  {
    id: 'extreme-2',
    name: 'Indecisive User',
    messages: [
      { user: 'maybe looking for property, not sure', expectBantStart: true },
      { user: 'could be 5M, could be 15M, depends', expectNext: 'authority' },
      { user: 'sometimes me, sometimes with family', expectNext: 'need' },
      { user: 'either living or investment', expectNext: 'timeline' },
      { user: 'maybe this year, maybe next', expectNext: 'contact' },
      { user: 'here 09171234567 but might change', expectComplete: true }
    ]
  },
  {
    id: 'extreme-3',
    name: 'Technical User',
    messages: [
      { user: 'SELECT * FROM properties WHERE location="BGC"', expectBantStart: true },
      { user: 'BUDGET >= 10000000 AND BUDGET <= 15000000', expectNext: 'authority' },
      { user: 'user.role == "decision_maker"', expectNext: 'need' },
      { user: 'purpose = "residential"', expectNext: 'timeline' },
      { user: 'timeline.months = 3', expectNext: 'contact' },
      { user: 'Developer Dan, dev@techco.com, +639171234567', expectComplete: true }
    ]
  },
  {
    id: 'extreme-4',
    name: 'Context Switching',
    messages: [
      { user: 'I want to rent first', expectBantStart: true },
      { user: 'Actually no, buying is better, 8M budget', expectNext: 'authority' },
      { user: 'Let me think... yes I decide', expectNext: 'need' },
      { user: 'Wait, is this for sale or rent?', expectClarification: true },
      { user: 'Ok for living then', expectNext: 'timeline' },
      { user: 'After I sell my current place, maybe 6 months', expectNext: 'contact' },
      { user: 'Carlos 09171234567', expectComplete: true }
    ]
  },
  {
    id: 'extreme-5',
    name: 'Maximum Stress Test',
    messages: [
      { user: '你好, necesito una casa, budget 5-10M PHP, can you help? 🏠', expectBantStart: true },
      { user: '8888888', expectNext: 'authority' },
      { user: 'Yep!!!', expectNext: 'need' },
      { user: '4 investment + living', expectNext: 'timeline' },
      { user: 'Jan-Feb 2025', expectNext: 'contact' },
      { user: 'MR. X (0917) 123-4567 / mrx@secret.com', expectComplete: true }
    ]
  }
];

// Test validator
class TestValidator {
  validateResponse(response, expectation, context) {
    const errors = [];
    const warnings = [];
    const aiResponse = response.response?.toLowerCase() || '';
    
    // Check for duplicate BANT questions
    if (context.lastQuestion && aiResponse.includes(context.lastQuestion)) {
      errors.push({
        type: 'DUPLICATE_QUESTION',
        message: `AI repeated the same question: "${context.lastQuestion}"`,
        severity: 'HIGH'
      });
    }
    
    // Check expectations
    if (expectation.expectBantStart) {
      if (!aiResponse.includes('budget') && !aiResponse.includes('how much')) {
        errors.push({
          type: 'MISSING_BANT_START',
          message: 'AI should ask for budget when BANT starts',
          severity: 'MEDIUM'
        });
      }
    }
    
    if (expectation.expectNext) {
      const expectedPatterns = {
        authority: ['decision', 'sole', 'who else', 'approve'],
        need: ['purpose', 'use', 'living', 'investment', 'residence'],
        timeline: ['when', 'timeline', 'move', 'purchase', 'planning'],
        contact: ['name', 'contact', 'phone', 'email', 'reach']
      };
      
      const patterns = expectedPatterns[expectation.expectNext] || [];
      const found = patterns.some(p => aiResponse.includes(p));
      
      if (!found) {
        errors.push({
          type: 'WRONG_NEXT_QUESTION',
          message: `Expected ${expectation.expectNext} question, but got: "${aiResponse.substring(0, 100)}..."`,
          severity: 'HIGH'
        });
      }
    }
    
    if (expectation.expectComplete) {
      if (!aiResponse.includes('thank') && !aiResponse.includes('complete') && !aiResponse.includes('contact')) {
        warnings.push({
          type: 'INCOMPLETE_BANT',
          message: 'BANT might not be properly completed',
          severity: 'LOW'
        });
      }
    }
    
    // Check for estimation given before BANT complete
    if (!context.bantComplete && (aiResponse.includes('price') || aiResponse.includes('cost') || aiResponse.includes('₱'))) {
      if (!expectation.expectEstimation) {
        errors.push({
          type: 'PREMATURE_ESTIMATION',
          message: 'AI gave price information before completing BANT',
          severity: 'HIGH'
        });
      }
    }
    
    return { errors, warnings };
  }
}

// Main test runner
class ComprehensiveTestRunner {
  constructor() {
    this.client = new TestClient();
    this.validator = new TestValidator();
    this.results = [];
    this.iteration = 0;
  }
  
  async runScenario(scenario) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Scenario: ${scenario.name} (${scenario.id})`);
    console.log(`${'='.repeat(60)}`);
    
    this.client.reset();
    const scenarioResult = {
      id: scenario.id,
      name: scenario.name,
      success: true,
      errors: [],
      warnings: [],
      transcript: []
    };
    
    const context = {
      lastQuestion: null,
      bantComplete: false,
      currentStep: 'initial'
    };
    
    for (let i = 0; i < scenario.messages.length; i++) {
      const msg = scenario.messages[i];
      console.log(`\n[${i + 1}/${scenario.messages.length}] User: "${msg.user}"`);
      
      const response = await this.client.sendMessage(msg.user);
      
      if (response.success) {
        console.log(`    AI: "${response.response?.substring(0, 100)}..."`);
        console.log(`    Intent: ${response.intent}`);
        
        // Validate response
        const validation = this.validator.validateResponse(response, msg, context);
        
        if (validation.errors.length > 0) {
          scenarioResult.success = false;
          scenarioResult.errors.push(...validation.errors);
          validation.errors.forEach(err => {
            console.log(`    ❌ ERROR: ${err.message}`);
          });
        }
        
        if (validation.warnings.length > 0) {
          scenarioResult.warnings.push(...validation.warnings);
          validation.warnings.forEach(warn => {
            console.log(`    ⚠️  WARNING: ${warn.message}`);
          });
        }
        
        // Update context
        if (response.response?.toLowerCase().includes('budget')) {
          context.lastQuestion = 'budget';
        } else if (response.response?.toLowerCase().includes('decision')) {
          context.lastQuestion = 'authority';
        } else if (response.response?.toLowerCase().includes('purpose') || response.response?.toLowerCase().includes('use')) {
          context.lastQuestion = 'need';
        } else if (response.response?.toLowerCase().includes('when') || response.response?.toLowerCase().includes('timeline')) {
          context.lastQuestion = 'timeline';
        } else if (response.response?.toLowerCase().includes('contact') || response.response?.toLowerCase().includes('name')) {
          context.lastQuestion = 'contact';
        }
        
        if (msg.expectComplete) {
          context.bantComplete = true;
        }
      } else {
        scenarioResult.success = false;
        scenarioResult.errors.push({
          type: 'REQUEST_FAILED',
          message: response.error,
          severity: 'CRITICAL'
        });
        console.log(`    ❌ ERROR: ${response.error}`);
      }
      
      // Add delay between messages
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MESSAGES));
    }
    
    // Save transcript
    scenarioResult.transcript = this.client.transcript;
    
    // Save to file
    const filename = `${TRANSCRIPT_DIR}/scenario-${scenario.id}-iter${this.iteration}.json`;
    fs.writeFileSync(filename, JSON.stringify(scenarioResult, null, 2));
    
    console.log(`\n📝 Transcript saved: ${filename}`);
    console.log(`Result: ${scenarioResult.success ? '✅ PASS' : '❌ FAIL'}`);
    
    return scenarioResult;
  }
  
  async runAllScenarios() {
    const results = [];
    
    for (const scenario of TEST_SCENARIOS) {
      const result = await this.runScenario(scenario);
      results.push(result);
      
      // Add delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return results;
  }
  
  analyzeResults(results) {
    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: 0,
      commonErrors: {},
      iteration: this.iteration
    };
    
    summary.successRate = (summary.passed / summary.total * 100).toFixed(1);
    
    // Analyze common errors
    results.forEach(result => {
      result.errors.forEach(error => {
        if (!summary.commonErrors[error.type]) {
          summary.commonErrors[error.type] = {
            count: 0,
            severity: error.severity,
            examples: []
          };
        }
        summary.commonErrors[error.type].count++;
        if (summary.commonErrors[error.type].examples.length < 3) {
          summary.commonErrors[error.type].examples.push({
            scenario: result.id,
            message: error.message
          });
        }
      });
    });
    
    return summary;
  }
  
  async saveReport(results, summary) {
    const report = {
      timestamp: new Date().toISOString(),
      iteration: this.iteration,
      summary,
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        success: r.success,
        errors: r.errors.length,
        warnings: r.warnings.length
      }))
    };
    
    const filename = `${TRANSCRIPT_DIR}/report-iter${this.iteration}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Report saved: ${filename}`);
  }
  
  async run() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 COMPREHENSIVE BANT TEST SUITE');
    console.log('='.repeat(80));
    console.log(`Total Scenarios: ${TEST_SCENARIOS.length}`);
    console.log(`Max Iterations: ${MAX_ITERATIONS}`);
    console.log('='.repeat(80));
    
    let currentSuccessRate = 0;
    
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      this.iteration = iter + 1;
      
      console.log('\n' + '='.repeat(80));
      console.log(`📍 ITERATION ${this.iteration}/${MAX_ITERATIONS}`);
      console.log('='.repeat(80));
      
      const results = await this.runAllScenarios();
      const summary = this.analyzeResults(results);
      
      await this.saveReport(results, summary);
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 ITERATION SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Passed: ${summary.passed}/${summary.total}`);
      console.log(`❌ Failed: ${summary.failed}/${summary.total}`);
      console.log(`📈 Success Rate: ${summary.successRate}%`);
      
      if (Object.keys(summary.commonErrors).length > 0) {
        console.log('\n🔍 Common Errors:');
        Object.entries(summary.commonErrors).forEach(([type, data]) => {
          console.log(`  ${type}: ${data.count} occurrences (${data.severity})`);
          data.examples.forEach(ex => {
            console.log(`    - ${ex.scenario}: ${ex.message.substring(0, 60)}...`);
          });
        });
      }
      
      currentSuccessRate = parseFloat(summary.successRate);
      
      if (currentSuccessRate === 100) {
        console.log('\n🎉 SUCCESS! 100% success rate achieved!');
        break;
      } else {
        console.log(`\n⚠️  Success rate: ${currentSuccessRate}% - Fixes needed`);
        
        // Implement fixes would go here
        // For now, we'll document what needs to be fixed
        const fixesNeeded = this.identifyFixes(summary);
        console.log('\n📝 Fixes Needed:');
        fixesNeeded.forEach(fix => {
          console.log(`  - ${fix}`);
        });
      }
      
      // Add delay before next iteration
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✨ TEST SUITE COMPLETE');
    console.log(`Final Success Rate: ${currentSuccessRate}%`);
    console.log('='.repeat(80));
  }
  
  identifyFixes(summary) {
    const fixes = [];
    
    if (summary.commonErrors['DUPLICATE_QUESTION']) {
      fixes.push('Improve BANT answer recognition to prevent duplicate questions');
    }
    
    if (summary.commonErrors['WRONG_NEXT_QUESTION']) {
      fixes.push('Fix BANT flow progression logic');
    }
    
    if (summary.commonErrors['PREMATURE_ESTIMATION']) {
      fixes.push('Strengthen estimation gating to require BANT completion');
    }
    
    if (summary.commonErrors['MISSING_BANT_START']) {
      fixes.push('Ensure BANT starts with budget question');
    }
    
    return fixes;
  }
}

// Check server availability
async function checkServer() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Main execution
async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on port 3001');
    console.log('Please start the server with: node server.js');
    process.exit(1);
  }
  
  console.log('✅ Server is running');
  
  const runner = new ComprehensiveTestRunner();
  await runner.run();
}

// Run the test suite
main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});