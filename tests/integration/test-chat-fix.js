const { chromium } = require('playwright');

async function testChatFunctionality() {
  console.log('🧪 Testing chat functionality after OpenAI API fix...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Login with test credentials
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', 'test@leadify.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    console.log('⏳ Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Navigate to agents page
    console.log('🤖 Navigating to agents page...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForLoadState('networkidle');
    
    // Click on the first agent to view details
    console.log('👆 Clicking on first agent...');
    const firstAgent = await page.locator('div[role="button"]').first();
    await firstAgent.click();
    
    // Wait for agent page to load
    await page.waitForTimeout(2000);
    
    // Find and click the chat preview button/section
    console.log('💬 Looking for chat preview...');
    const chatPreview = await page.locator('text=/Chat Preview|Test Your Agent/i').first();
    if (await chatPreview.isVisible()) {
      await chatPreview.click();
      await page.waitForTimeout(1000);
    }
    
    // Find the chat input
    console.log('✍️ Finding chat input...');
    const chatInput = await page.locator('textarea[placeholder*="Type your message"], input[placeholder*="Type your message"], textarea[placeholder*="Send a message"], input[placeholder*="Send a message"]').first();
    
    if (!await chatInput.isVisible()) {
      console.log('❌ Chat input not found. Looking for alternative selectors...');
      const alternativeInput = await page.locator('textarea, input[type="text"]').filter({ hasText: '' }).last();
      if (await alternativeInput.isVisible()) {
        await alternativeInput.fill('Hello, I need help finding a property');
      }
    } else {
      await chatInput.fill('Hello, I need help finding a property');
    }
    
    // Send the message
    console.log('📤 Sending test message...');
    const sendButton = await page.locator('button').filter({ hasText: /send/i }).first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      // Try pressing Enter
      await page.keyboard.press('Enter');
    }
    
    // Wait for response
    console.log('⏳ Waiting for AI response...');
    await page.waitForTimeout(5000);
    
    // Check for response
    const messages = await page.locator('.message, [class*="message"], [class*="chat"]').count();
    console.log(`📊 Found ${messages} message elements`);
    
    // Check for any error messages
    const errorElement = await page.locator('text=/error|failed/i').first();
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log(`❌ Error found: ${errorText}`);
      
      // Take screenshot of error
      await page.screenshot({ path: 'chat-error-screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved as chat-error-screenshot.png');
      
      return false;
    }
    
    // Look for AI response
    const aiResponse = await page.locator('text=/hello|hi|welcome|help|property|glad/i').first();
    if (await aiResponse.isVisible({ timeout: 5000 }).catch(() => false)) {
      const responseText = await aiResponse.textContent();
      console.log(`✅ AI responded: "${responseText.substring(0, 100)}..."`);
      
      // Take success screenshot
      await page.screenshot({ path: 'chat-success-screenshot.png', fullPage: true });
      console.log('📸 Success screenshot saved as chat-success-screenshot.png');
      
      return true;
    } else {
      console.log('⚠️ No AI response detected');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'chat-no-response-screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved as chat-no-response-screenshot.png');
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testChatFunctionality().then(success => {
  if (success) {
    console.log('✅ Chat functionality test PASSED!');
    process.exit(0);
  } else {
    console.log('❌ Chat functionality test FAILED!');
    process.exit(1);
  }
});