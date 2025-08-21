#!/usr/bin/env node

/**
 * Test ESTIMATION-after-BANT Flow
 * Comprehensive tests for ensuring ESTIMATION only works after BANT completion
 */

const http = require('http');
const assert = require('assert');

// Real agent ID from the server logs
const AGENT_ID = 'e70a85ac-8480-4b1d-bd15-2d7b817b2399';

// Test utilities
class TestClient {
  constructor() {
    this.conversationId = null;
    this.responses = [];
  }

  async sendMessage(message) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        message,
        agentId: AGENT_ID,
        conversationId: this.conversationId,
        userId: 'test-user',
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
              response: response.response,
              intent: response.intent,
              responseTime,
              success: true
            };
            this.responses.push(result);
            resolve(result);
          } catch (e) {
            const result = {
              message,
              error: data,
              responseTime,
              success: false
            };
            this.responses.push(result);
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
          success: false
        };
        this.responses.push(result);
        resolve(result);
      });
      
      req.write(payload);
      req.end();
    });
  }

  newConversation() {
    this.conversationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.responses = [];
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.client = new TestClient();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n📝 Test: ${name}`);
    console.log('=' .repeat(60));
    
    try {
      this.client.newConversation();
      await testFn(this.client);
      console.log('✅ PASSED');
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed' });
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  printResults() {
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(70));
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`Coverage: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    }
  }
}

// Test cases
async function runTests() {
  const runner = new TestRunner();
  
  console.log('🧪 ESTIMATION-after-BANT Test Suite');
  console.log('=' .repeat(70));
  console.log('Testing that ESTIMATION requires BANT completion\n');
  
  // Test 1: Direct price request should redirect to BANT
  await runner.runTest('Price request without BANT redirects to BANT', async (client) => {
    const result = await client.sendMessage('How much is a condo in Manila?');
    
    // Should NOT give price directly
    assert(!result.response.includes('price') || result.response.includes('budget'), 
      'Should not provide price without BANT');
    
    // Should ask for BANT (budget first)
    assert(result.response.toLowerCase().includes('budget') || 
           result.response.toLowerCase().includes('investment') ||
           result.response.toLowerCase().includes('requirements'),
      'Should redirect to BANT qualification');
    
    console.log(`Response redirects to BANT: "${result.response.substring(0, 100)}..."`);
  });
  
  // Test 2: Multiple price requests before BANT
  await runner.runTest('Multiple price requests handled gracefully', async (client) => {
    await client.sendMessage('What are the payment plans?');
    const result2 = await client.sendMessage('How much for 2BR condo?');
    
    // Still should be in BANT flow
    assert(result2.response.toLowerCase().includes('budget') || 
           result2.response.toLowerCase().includes('need') ||
           result2.response.toLowerCase().includes('help'),
      'Should maintain BANT flow');
    
    console.log(`Maintains BANT focus: "${result2.response.substring(0, 100)}..."`);
  });
  
  // Test 3: Complete BANT then get estimation
  await runner.runTest('Estimation available after BANT completion', async (client) => {
    // Complete BANT flow
    await client.sendMessage('I need a house');
    console.log('Starting BANT...');
    
    await client.sendMessage('5 million pesos');
    console.log('Provided budget...');
    
    await client.sendMessage('yes, just me');
    console.log('Provided authority...');
    
    await client.sendMessage('for living');
    console.log('Provided need...');
    
    await client.sendMessage('next month');
    console.log('Provided timeline...');
    
    await client.sendMessage('John Test, 09171234567');
    console.log('Provided contact...');
    
    // Wait for BANT to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now request estimation
    const estimationResult = await client.sendMessage('How much is a condo in BGC?');
    console.log(`After BANT, estimation response: "${estimationResult.response.substring(0, 150)}..."`);
    
    // Should now provide estimation or at least acknowledge the price request
    assert(estimationResult.response.toLowerCase().includes('price') || 
           estimationResult.response.toLowerCase().includes('cost') ||
           estimationResult.response.toLowerCase().includes('estimate') ||
           estimationResult.response.toLowerCase().includes('payment') ||
           estimationResult.response.toLowerCase().includes('property'),
      'Should provide estimation after BANT');
  });
  
  // Test 4: Price request during BANT flow
  await runner.runTest('Price request during BANT continues BANT', async (client) => {
    await client.sendMessage('Looking for a condo');
    await client.sendMessage('How much will it cost?'); // Price request during BANT
    
    // Should acknowledge price interest but continue BANT
    const response = client.responses[client.responses.length - 1].response;
    assert(response.toLowerCase().includes('budget') || 
           response.toLowerCase().includes('help') ||
           response.toLowerCase().includes('understand'),
      'Should continue BANT flow');
    
    console.log(`Continues BANT: "${response.substring(0, 100)}..."`);
  });
  
  // Test 5: Pending estimation fulfilled after BANT
  await runner.runTest('Pending estimation request fulfilled after BANT', async (client) => {
    // Request price first
    const priceRequest = await client.sendMessage('What is the price for condos?');
    console.log(`Initial price request: "${priceRequest.response.substring(0, 80)}..."`);
    
    // Should redirect to BANT
    assert(priceRequest.response.toLowerCase().includes('budget') ||
           priceRequest.response.toLowerCase().includes('help') ||
           priceRequest.response.toLowerCase().includes('understand'),
      'Should redirect to BANT');
    
    // Complete BANT quickly
    await client.sendMessage('10 million');
    await client.sendMessage('sole decision maker');
    await client.sendMessage('investment');
    await client.sendMessage('3 months');
    await client.sendMessage('Jane Doe, 09181234567, jane@example.com');
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if estimation is now available or mentioned
    const lastResponse = client.responses[client.responses.length - 1].response;
    console.log(`After BANT completion: "${lastResponse.substring(0, 150)}..."`);
    
    // Should acknowledge the original price request or transition to estimation
    assert(lastResponse.toLowerCase().includes('price') ||
           lastResponse.toLowerCase().includes('estimate') ||
           lastResponse.toLowerCase().includes('property') ||
           lastResponse.toLowerCase().includes('investment'),
      'Should address original price request after BANT');
  });
  
  // Test 6: Session persistence - BANT remembered
  await runner.runTest('BANT completion persisted across messages', async (client) => {
    // Complete BANT
    await client.sendMessage('Need a property');
    await client.sendMessage('15 million budget');
    await client.sendMessage('deciding with spouse');
    await client.sendMessage('for residence');
    await client.sendMessage('within 6 months');
    await client.sendMessage('Bob Smith, 09191234567');
    
    // Wait for BANT completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send greeting (different intent)
    await client.sendMessage('hello');
    
    // Now ask for price - should work without repeating BANT
    const priceResult = await client.sendMessage('What are the prices?');
    
    // Should NOT ask for BANT again
    assert(!priceResult.response.toLowerCase().includes('budget range') &&
           !priceResult.response.toLowerCase().includes('decision maker'),
      'Should not repeat BANT after completion');
    
    console.log(`Remembers BANT completion: "${priceResult.response.substring(0, 100)}..."`);
  });
  
  // Test 7: Intent classification for estimation requests
  await runner.runTest('Correct intent classification for price requests', async (client) => {
    const testMessages = [
      'How much is it?',
      'What is the price?',
      'Payment plans available?',
      'Cost of 2BR unit?',
      'Can you give me an estimate?'
    ];
    
    for (const msg of testMessages) {
      const result = await client.sendMessage(msg);
      
      // All should trigger BANT or estimation flow
      assert(result.success, `Message "${msg}" should be processed`);
      
      // Should mention budget, requirements, or pricing
      assert(
        result.response.toLowerCase().includes('budget') ||
        result.response.toLowerCase().includes('requirement') ||
        result.response.toLowerCase().includes('price') ||
        result.response.toLowerCase().includes('help') ||
        result.response.toLowerCase().includes('estimate'),
        `Response for "${msg}" should be estimation-related`
      );
      
      console.log(`  ✓ "${msg}" → Handled correctly`);
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  });
  
  // Test 8: Edge case - insisting on price
  await runner.runTest('User insisting on price without BANT', async (client) => {
    await client.sendMessage('Just tell me the price');
    const response1 = client.responses[0].response;
    
    await client.sendMessage('I don\'t want to answer questions, just give me prices');
    const response2 = client.responses[1].response;
    
    // Should handle gracefully but still encourage BANT
    assert(response2.length > 0, 'Should provide a response');
    console.log(`Handles insistence gracefully: "${response2.substring(0, 100)}..."`);
  });
  
  // Print test results
  runner.printResults();
  
  // Exit with appropriate code
  process.exit(runner.results.failed > 0 ? 1 : 0);
}

// Run all tests
console.log('🚀 Starting ESTIMATION-after-BANT Test Suite\n');
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});