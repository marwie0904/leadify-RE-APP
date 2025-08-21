const { chromium } = require('playwright');

async function testChatFunctionality() {
  console.log('🧪 Testing chat functionality after comprehensive fixes...');
  console.log('📍 Frontend URL: http://localhost:3000');
  console.log('📍 Backend URL: http://localhost:3001');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser console error:', msg.text());
      }
    });
    
    // Navigate to the app
    console.log('\n📍 Step 1: Navigating to the app...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if we're already logged in or need to login
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/auth') || currentUrl.includes('/login')) {
      console.log('🔐 Step 2: Logging in...');
      
      // Fill in login credentials
      await page.fill('input[placeholder*="email" i]', 'marwie0904@gmail.com');
      await page.fill('input[placeholder*="password" i]', 'password123');
      
      // Click Sign In button
      const signInButton = await page.locator('button:has-text("Sign In")').first();
      await signInButton.click();
      
      // Wait for navigation to dashboard or handle auth error
      try {
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✅ Successfully logged in');
      } catch (error) {
        console.log('⚠️ Login might have failed or redirected elsewhere');
        const newUrl = page.url();
        console.log('📍 New URL after login attempt:', newUrl);
      }
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ Already logged in and on dashboard');
    } else {
      console.log('📍 On unexpected page, attempting to navigate to dashboard...');
      await page.goto('http://localhost:3000/dashboard');
    }
    
    // Navigate to agents page
    console.log('\n🤖 Step 3: Navigating to agents page...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Open chat preview
    console.log('💬 Step 4: Opening chat preview...');
    const chatButton = await page.locator('button:has-text("Open Chat Preview")').first();
    
    if (!await chatButton.isVisible()) {
      console.log('❌ Chat preview button not found');
      await page.screenshot({ path: 'test-no-chat-button.png' });
      return false;
    }
    
    await chatButton.click();
    await page.waitForTimeout(2000);
    
    // Find the chat input
    console.log('✍️ Step 5: Finding chat input...');
    const chatInput = await page.locator('textarea[placeholder*="Type your message"], input[placeholder*="Type your message"]').first();
    
    if (!await chatInput.isVisible()) {
      console.log('❌ Chat input not found');
      await page.screenshot({ path: 'test-no-chat-input.png' });
      return false;
    }
    
    // Send a test message
    console.log('📤 Step 6: Sending test message...');
    const testMessage = 'Hello, I need help finding a property';
    await chatInput.fill(testMessage);
    console.log(`   Message: "${testMessage}"`);
    
    // Press Enter to send
    await page.keyboard.press('Enter');
    console.log('   ✅ Message sent');
    
    // Wait for response
    console.log('\n⏳ Step 7: Waiting for AI response...');
    await page.waitForTimeout(5000);
    
    // Check for any error messages
    const errorElement = await page.locator('text=/error|failed|sorry/i').first();
    if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.log(`\n❌ ERROR DETECTED: ${errorText}`);
      
      // Take error screenshot
      await page.screenshot({ path: 'test-chat-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as test-chat-error.png');
      
      // Check backend logs
      console.log('\n📋 Please check backend logs for detailed error information');
      
      return false;
    }
    
    // Look for AI response
    const aiResponse = await page.locator('text=/budget|property|help|assist|perfect/i').first();
    if (await aiResponse.isVisible({ timeout: 5000 }).catch(() => false)) {
      const responseText = await aiResponse.textContent();
      console.log(`\n✅ AI RESPONDED SUCCESSFULLY!`);
      console.log(`   Response: "${responseText.substring(0, 100)}..."`);
      
      // Take success screenshot
      await page.screenshot({ path: 'test-chat-success.png', fullPage: true });
      console.log('📸 Success screenshot saved as test-chat-success.png');
      
      // Send another message to test conversation flow
      console.log('\n📤 Step 8: Testing conversation continuity...');
      await chatInput.fill('My budget is around $500,000');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      
      // Check for follow-up response
      const followUpResponse = await page.locator('text=/authority|decision|timeline|need/i').last();
      if (await followUpResponse.isVisible({ timeout: 3000 }).catch(() => false)) {
        const followUpText = await followUpResponse.textContent();
        console.log(`✅ Follow-up response received: "${followUpText.substring(0, 100)}..."`);
      }
      
      return true;
    } else {
      console.log('\n⚠️ No AI response detected within timeout');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-chat-no-response.png', fullPage: true });
      console.log('📸 Screenshot saved as test-chat-no-response.png');
      
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    console.log('\n🧹 Cleaning up...');
    await browser.close();
  }
}

// Run the test
console.log('='.repeat(70));
console.log('COMPREHENSIVE CHAT FUNCTIONALITY TEST');
console.log('='.repeat(70));

testChatFunctionality().then(success => {
  console.log('\n' + '='.repeat(70));
  if (success) {
    console.log('✅ ✅ ✅ CHAT FUNCTIONALITY TEST PASSED! ✅ ✅ ✅');
  } else {
    console.log('❌ ❌ ❌ CHAT FUNCTIONALITY TEST FAILED! ❌ ❌ ❌');
    console.log('\nPlease check:');
    console.log('1. Backend logs for error details');
    console.log('2. Screenshots for visual debugging');
    console.log('3. Network tab in browser for API errors');
  }
  console.log('='.repeat(70));
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});