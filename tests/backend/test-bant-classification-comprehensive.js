const { chromium } = require('playwright');
require('dotenv').config();

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  testEmail: 'michael.brown@homes.com',
  testPassword: process.env.TEST_PASSWORD || 'your-password-here'
};

// Test cases for BANT classification
const BANT_TEST_CASES = [
  // Budget variations
  { input: '35M', expected: 'BANT', type: 'budget', description: 'Short budget format' },
  { input: '30 Million', expected: 'BANT', type: 'budget', description: 'Full million format' },
  { input: '15Mil', expected: 'BANT', type: 'budget', description: 'Abbreviated million' },
  { input: 'around 10m', expected: 'BANT', type: 'budget', description: 'Approximate budget' },
  { input: '$20M', expected: 'BANT', type: 'budget', description: 'Currency symbol' },
  { input: '5 to 10 million', expected: 'BANT', type: 'budget', description: 'Budget range' },
  
  // Authority variations
  { input: 'yes', expected: 'BANT', type: 'authority', description: 'Simple yes' },
  { input: 'I am', expected: 'BANT', type: 'authority', description: 'I am confirmation' },
  { input: "I'm the owner", expected: 'BANT', type: 'authority', description: 'Owner statement' },
  { input: 'my company decides', expected: 'BANT', type: 'authority', description: 'Company authority' },
  { input: 'no', expected: 'BANT', type: 'authority', description: 'Negative authority' },
  
  // Need variations
  { input: 'residence', expected: 'BANT', type: 'need', description: 'Residence need' },
  { input: 'residency', expected: 'BANT', type: 'need', description: 'Residency variation' },
  { input: 'investment', expected: 'BANT', type: 'need', description: 'Investment need' },
  { input: 'rental', expected: 'BANT', type: 'need', description: 'Rental property' },
  { input: 'for living', expected: 'BANT', type: 'need', description: 'Living purpose' },
  { input: 'personal use', expected: 'BANT', type: 'need', description: 'Personal use' },
  
  // Timeline variations
  { input: 'next month', expected: 'BANT', type: 'timeline', description: 'Next month' },
  { input: 'Q1', expected: 'BANT', type: 'timeline', description: 'Quarter timeline' },
  { input: 'ASAP', expected: 'BANT', type: 'timeline', description: 'Urgent timeline' },
  { input: '3 months', expected: 'BANT', type: 'timeline', description: 'Months timeline' },
  { input: 'immediately', expected: 'BANT', type: 'timeline', description: 'Immediate need' },
  
  // Non-BANT messages
  { input: 'tell me about amenities', expected: 'EMBEDDINGS', type: 'general', description: 'General question' },
  { input: 'hello', expected: 'GREETING', type: 'greeting', description: 'Greeting' },
  { input: 'speak to human', expected: 'HANDOFF', type: 'handoff', description: 'Human request' },
  { input: "what's the price?", expected: 'ESTIMATION_REQUEST', type: 'estimation', description: 'Price request' }
];

async function testBantClassification() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: [],
    failed: [],
    errors: []
  };
  
  try {
    console.log('🚀 Starting BANT Classification Tests');
    console.log('=====================================\n');
    
    // Navigate to the frontend
    await page.goto(CONFIG.frontendUrl);
    await page.waitForTimeout(2000);
    
    // Login
    console.log('📝 Logging in as:', CONFIG.testEmail);
    await page.fill('input[type="email"]', CONFIG.testEmail);
    await page.fill('input[type="password"]', CONFIG.testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to agent management
    await page.click('text=Agents');
    await page.waitForTimeout(2000);
    
    // Find and click on an agent's chat preview button
    const chatPreviewButton = await page.locator('button:has-text("Chat Preview")').first();
    if (await chatPreviewButton.isVisible()) {
      await chatPreviewButton.click();
      await page.waitForTimeout(2000);
    } else {
      throw new Error('No chat preview button found');
    }
    
    // Test each case
    for (const testCase of BANT_TEST_CASES) {
      console.log(`\n📋 Testing: "${testCase.input}"`);
      console.log(`   Type: ${testCase.type}`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Description: ${testCase.description}`);
      
      try {
        // Type the message
        const chatInput = await page.locator('input[placeholder*="Type"], textarea[placeholder*="Type"]').first();
        await chatInput.fill(testCase.input);
        
        // Send the message
        await page.keyboard.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check server logs for classification result
        const logsResponse = await fetch(`${CONFIG.apiUrl}/api/logs/latest`).catch(() => null);
        let classification = 'UNKNOWN';
        
        if (logsResponse && logsResponse.ok) {
          const logs = await logsResponse.text();
          const match = logs.match(/FINAL CLASSIFICATION: (\w+)/);
          if (match) {
            classification = match[1];
          }
        }
        
        // Check if classification matches expected
        if (classification === testCase.expected) {
          console.log(`   ✅ PASSED: Classified as ${classification}`);
          results.passed.push(testCase);
        } else {
          console.log(`   ❌ FAILED: Classified as ${classification}, expected ${testCase.expected}`);
          results.failed.push({ ...testCase, actual: classification });
        }
        
        // Clear the conversation for next test
        await page.reload();
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.log(`   ⚠️ ERROR: ${error.message}`);
        results.errors.push({ ...testCase, error: error.message });
      }
    }
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}/${BANT_TEST_CASES.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${BANT_TEST_CASES.length}`);
    console.log(`⚠️ Errors: ${results.errors.length}/${BANT_TEST_CASES.length}`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(test => {
        console.log(`   - "${test.input}" (${test.type}): Expected ${test.expected}, Got ${test.actual}`);
      });
    }
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Test Errors:');
      results.errors.forEach(test => {
        console.log(`   - "${test.input}" (${test.type}): ${test.error}`);
      });
    }
    
    const successRate = (results.passed.length / BANT_TEST_CASES.length * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: Classification working well!');
    } else if (successRate >= 70) {
      console.log('⚠️ GOOD: Classification needs some improvement');
    } else {
      console.log('❌ POOR: Classification needs significant fixes');
    }
    
    await browser.close();
  }
}

// Run the test
testBantClassification().catch(console.error);