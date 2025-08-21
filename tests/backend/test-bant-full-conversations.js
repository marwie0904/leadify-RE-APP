const { chromium } = require('playwright');
const fs = require('fs');

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  testEmail: 'michael.brown@homes.com',
  testPassword: 'Test123!' // Update with actual password
};

// 5 Different BANT conversation scenarios
const CONVERSATIONS = [
  {
    name: 'Standard Residency Flow',
    messages: [
      { input: 'Hi, I am looking for a property', expectedNext: 'budget' },
      { input: '35M', expectedNext: 'authority' },
      { input: 'yes', expectedNext: 'need' },
      { input: 'residency', expectedNext: 'timeline' },
      { input: 'next month', expectedNext: 'contact' },
      { input: 'John Smith, 555-1234, john@email.com', expectedNext: 'complete' }
    ]
  },
  {
    name: 'Investment Property Flow',
    messages: [
      { input: 'Looking to invest in real estate', expectedNext: 'budget' },
      { input: '20 Million', expectedNext: 'authority' },
      { input: "I'm the decision maker", expectedNext: 'need' },
      { input: 'investment', expectedNext: 'timeline' },
      { input: 'Q1 2025', expectedNext: 'contact' },
      { input: 'Sarah Johnson, sarah@company.com', expectedNext: 'complete' }
    ]
  },
  {
    name: 'Rental Property with Range Budget',
    messages: [
      { input: 'I want to buy a property', expectedNext: 'budget' },
      { input: '10M to 15M', expectedNext: 'authority' },
      { input: 'my company decides', expectedNext: 'need' },
      { input: 'rental income', expectedNext: 'timeline' },
      { input: '3 months', expectedNext: 'contact' },
      { input: 'Mike Brown 09171234567', expectedNext: 'complete' }
    ]
  },
  {
    name: 'Personal Use with Joint Decision',
    messages: [
      { input: 'Interested in properties', expectedNext: 'budget' },
      { input: 'around 25 million', expectedNext: 'authority' },
      { input: 'me and my spouse', expectedNext: 'need' },
      { input: 'for living', expectedNext: 'timeline' },
      { input: 'ASAP', expectedNext: 'contact' },
      { input: 'contact me at 555-9876', expectedNext: 'complete' }
    ]
  },
  {
    name: 'Mixed Answers and Edge Cases',
    messages: [
      { input: 'show me properties', expectedNext: 'budget' },
      { input: '$15Mil', expectedNext: 'authority' },
      { input: 'no, need approval', expectedNext: 'need' },
      { input: 'personal residence', expectedNext: 'timeline' },
      { input: 'within 6 months', expectedNext: 'contact' },
      { input: 'Anna Lee, anna.lee@gmail.com, +639181234567', expectedNext: 'complete' }
    ]
  }
];

async function testFullBANTConversations() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext();
  const results = [];
  
  try {
    console.log('🚀 Testing 5 Full BANT Conversations');
    console.log('=' . repeat(60));
    
    // Login once
    const loginPage = await context.newPage();
    console.log('\n📝 Logging in as:', CONFIG.testEmail);
    await loginPage.goto(CONFIG.frontendUrl);
    await loginPage.waitForTimeout(2000);
    
    // Check if we need to login
    if (await loginPage.locator('input[type="email"]').isVisible()) {
      await loginPage.fill('input[type="email"]', CONFIG.testEmail);
      await loginPage.fill('input[type="password"]', CONFIG.testPassword);
      await loginPage.click('button[type="submit"]');
      await loginPage.waitForTimeout(3000);
    }
    
    // Navigate to conversations page
    await loginPage.click('text=Conversations');
    await loginPage.waitForTimeout(2000);
    
    // Test each conversation scenario
    for (let convIndex = 0; convIndex < CONVERSATIONS.length; convIndex++) {
      const conversation = CONVERSATIONS[convIndex];
      const convResult = {
        name: conversation.name,
        messages: [],
        success: true,
        errors: []
      };
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 CONVERSATION ${convIndex + 1}: ${conversation.name}`);
      console.log(`${'='.repeat(60)}`);
      
      // Open a new page for each conversation
      const page = await context.newPage();
      await page.goto(`${CONFIG.frontendUrl}/conversations`);
      await page.waitForTimeout(2000);
      
      // Look for existing conversation or start new one
      const hasConversations = await page.locator('.conversation-item, [class*="conversation"]').count() > 0;
      
      if (hasConversations) {
        // Click on first conversation
        await page.locator('.conversation-item, [class*="conversation"]').first().click();
        await page.waitForTimeout(1000);
      }
      
      // Find chat input
      const chatInput = page.locator('textarea[placeholder*="Type"], input[placeholder*="Type"], input[placeholder*="message"], textarea[placeholder*="message"]').first();
      
      if (!await chatInput.isVisible()) {
        console.log('❌ Chat input not found, trying alternative selector...');
        // Try to find any input/textarea in the conversation area
        const alternativeInput = page.locator('.conversation-input input, .chat-input input, textarea').first();
        if (await alternativeInput.isVisible()) {
          console.log('✅ Found alternative input');
        } else {
          console.log('❌ No chat input found, skipping conversation');
          convResult.success = false;
          convResult.errors.push('No chat input found');
          results.push(convResult);
          await page.close();
          continue;
        }
      }
      
      // Send each message in the conversation
      for (let msgIndex = 0; msgIndex < conversation.messages.length; msgIndex++) {
        const message = conversation.messages[msgIndex];
        const messageResult = {
          input: message.input,
          expectedNext: message.expectedNext,
          actualResponse: '',
          classification: '',
          success: false
        };
        
        console.log(`\n  💬 Message ${msgIndex + 1}: "${message.input}"`);
        console.log(`     Expected next: ${message.expectedNext}`);
        
        try {
          // Type and send message
          await chatInput.fill(message.input);
          await page.keyboard.press('Enter');
          
          // Wait for response
          await page.waitForTimeout(4000);
          
          // Get the AI response (last message that's not from user)
          const messages = await page.locator('.message, [class*="message-content"]').allTextContents();
          const aiResponse = messages[messages.length - 1] || '';
          messageResult.actualResponse = aiResponse.substring(0, 100) + '...';
          
          // Check response for expected patterns
          const responsePatterns = {
            budget: /budget|how much|price range|afford/i,
            authority: /decision|authority|who.*making|approval/i,
            need: /purpose|need|looking for|type.*property|residence|investment/i,
            timeline: /when|timeline|purchase|move|buy/i,
            contact: /contact|phone|email|name|reach/i,
            complete: /thank|information.*need|prepare|options|contact.*soon/i
          };
          
          // Determine what the AI is asking for or saying
          let detectedNext = 'unknown';
          for (const [key, pattern] of Object.entries(responsePatterns)) {
            if (pattern.test(aiResponse)) {
              detectedNext = key;
              break;
            }
          }
          
          messageResult.classification = detectedNext;
          messageResult.success = (detectedNext === message.expectedNext);
          
          if (messageResult.success) {
            console.log(`     ✅ SUCCESS: AI responded correctly (${detectedNext})`);
          } else {
            console.log(`     ❌ FAILED: AI response indicates ${detectedNext}, expected ${message.expectedNext}`);
            convResult.success = false;
            convResult.errors.push(`Message ${msgIndex + 1} failed`);
          }
          
        } catch (error) {
          console.log(`     ⚠️ ERROR: ${error.message}`);
          messageResult.actualResponse = error.message;
          convResult.success = false;
          convResult.errors.push(error.message);
        }
        
        convResult.messages.push(messageResult);
      }
      
      // Take screenshot of final conversation
      await page.screenshot({ 
        path: `test-bant-conversation-${convIndex + 1}.png`,
        fullPage: true 
      });
      console.log(`\n  📸 Screenshot saved: test-bant-conversation-${convIndex + 1}.png`);
      
      results.push(convResult);
      await page.close();
    }
    
    // Close login page
    await loginPage.close();
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    results.forEach((conv, index) => {
      console.log(`\n${index + 1}. ${conv.name}:`);
      if (conv.success) {
        console.log('   ✅ All messages classified correctly');
        totalSuccess++;
      } else {
        console.log(`   ❌ Failed with errors: ${conv.errors.join(', ')}`);
        totalFailed++;
      }
      
      // Show message details
      conv.messages.forEach((msg, msgIndex) => {
        if (!msg.success) {
          console.log(`      Message ${msgIndex + 1}: "${msg.input}"`);
          console.log(`        Expected: ${msg.expectedNext}, Got: ${msg.classification}`);
        }
      });
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`OVERALL: ${totalSuccess}/${CONVERSATIONS.length} conversations passed`);
    console.log(`Success Rate: ${(totalSuccess / CONVERSATIONS.length * 100).toFixed(1)}%`);
    
    if (totalSuccess === CONVERSATIONS.length) {
      console.log('🎉 EXCELLENT: All BANT conversations working perfectly!');
    } else if (totalSuccess >= 3) {
      console.log('⚠️ GOOD: Most conversations working, some issues to fix');
    } else {
      console.log('❌ NEEDS WORK: Multiple conversation failures detected');
    }
    
    // Save detailed results to file
    fs.writeFileSync('test-bant-results.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Detailed results saved to: test-bant-results.json');
    
    // Check server logs
    console.log('\n💡 Check server-new.log for classification details');
    console.log('   grep "MASTER INTENT" server-new.log | tail -50');
    
    await browser.close();
  }
}

// Run the test
testFullBANTConversations().catch(console.error);