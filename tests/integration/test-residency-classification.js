const { chromium } = require('playwright');

// Test configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3000',
  testEmail: 'michael.brown@homes.com',
  testPassword: 'Test123!'  // Update with actual password
};

async function testResidencyClassification() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Slow down actions for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🚀 Testing BANT Classification for "residency" answer');
    console.log('=' . repeat(60));
    
    // Navigate to the frontend
    console.log('\n1️⃣ Navigating to frontend...');
    await page.goto(CONFIG.frontendUrl);
    await page.waitForTimeout(2000);
    
    // Login
    console.log('2️⃣ Logging in as:', CONFIG.testEmail);
    await page.fill('input[type="email"]', CONFIG.testEmail);
    await page.fill('input[type="password"]', CONFIG.testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to agents
    console.log('3️⃣ Navigating to Agents page...');
    await page.click('text=Agents');
    await page.waitForTimeout(2000);
    
    // Click on chat preview
    console.log('4️⃣ Opening Chat Preview...');
    const chatPreviewButton = await page.locator('button:has-text("Chat Preview")').first();
    await chatPreviewButton.click();
    await page.waitForTimeout(2000);
    
    // Start conversation
    console.log('5️⃣ Starting BANT conversation...');
    
    // Send initial message to trigger BANT
    console.log('\n📝 Sending: "I am looking for a property"');
    const chatInput = await page.locator('textarea[placeholder*="Type"], input[placeholder*="Type"]').first();
    await chatInput.fill('I am looking for a property');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    
    // AI should ask about budget
    console.log('⏳ Waiting for AI to ask about budget...');
    
    // Answer with budget
    console.log('\n📝 Sending: "30M"');
    await chatInput.fill('30M');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    
    // AI should ask about authority
    console.log('⏳ Waiting for AI to ask about authority...');
    
    // Answer with authority
    console.log('\n📝 Sending: "yes"');
    await chatInput.fill('yes');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);
    
    // AI should ask about need/purpose
    console.log('⏳ Waiting for AI to ask about need/purpose...');
    
    // THIS IS THE KEY TEST - Answer with "residency"
    console.log('\n🎯 KEY TEST - Sending: "residency"');
    await chatInput.fill('residency');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    
    // Check the response
    const messages = await page.locator('.message, [class*="message"]').allTextContents();
    const lastAIMessage = messages[messages.length - 1] || '';
    
    console.log('\n📊 RESULTS:');
    console.log('=' . repeat(60));
    
    if (lastAIMessage.toLowerCase().includes('unfortunately') || 
        lastAIMessage.toLowerCase().includes('not trained') ||
        lastAIMessage.toLowerCase().includes('cannot')) {
      console.log('❌ FAILED: "residency" was classified as Embeddings');
      console.log('   AI responded with:', lastAIMessage);
      console.log('\n🔍 ISSUE: Intent classifier is not recognizing "residency" as a BANT answer');
    } else if (lastAIMessage.toLowerCase().includes('timeline') || 
               lastAIMessage.toLowerCase().includes('when') ||
               lastAIMessage.toLowerCase().includes('purchase')) {
      console.log('✅ SUCCESS: "residency" was correctly classified as BANT');
      console.log('   AI proceeded to timeline question:', lastAIMessage);
    } else {
      console.log('⚠️ UNCLEAR: Response not definitive');
      console.log('   AI responded with:', lastAIMessage);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'test-residency-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved as: test-residency-result.png');
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'test-residency-error.png', fullPage: true });
  } finally {
    console.log('\n🏁 Test completed');
    await page.waitForTimeout(5000);  // Keep browser open to see results
    await browser.close();
  }
}

// Run the test
testResidencyClassification().catch(console.error);