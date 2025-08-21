require('dotenv').config();

async function testBANTWithPlaywright() {
  console.log('🎭 Testing BANT extraction with Playwright');
  console.log('=' .repeat(80));
  
  try {
    // Navigate to the frontend
    console.log('\n📱 Opening frontend application...');
    await mcp__playwright__browser_navigate({ url: 'http://localhost:3000' });
    
    // Wait for page to load
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    // Take a screenshot of the initial state
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'bant-test-01-initial.png',
      fullPage: false 
    });
    
    // Get page structure
    console.log('\n🔍 Analyzing page structure...');
    const snapshot = await mcp__playwright__browser_snapshot();
    console.log('Page loaded successfully');
    
    // Login with michael.brown@homes.com
    console.log('\n🔐 Logging in as michael.brown@homes.com...');
    
    // Look for email input
    const emailInput = snapshot.find(el => 
      el.type === 'textbox' && 
      (el.name?.toLowerCase().includes('email') || el.description?.toLowerCase().includes('email'))
    );
    
    if (emailInput) {
      await mcp__playwright__browser_type({
        element: 'Email input field',
        ref: emailInput.ref,
        text: 'michael.brown@homes.com',
        submit: false
      });
    }
    
    // Look for password input
    const passwordInput = snapshot.find(el => 
      el.type === 'textbox' && 
      (el.name?.toLowerCase().includes('password') || el.description?.toLowerCase().includes('password'))
    );
    
    if (passwordInput) {
      await mcp__playwright__browser_type({
        element: 'Password input field',
        ref: passwordInput.ref,
        text: 'Micha-homes-321',
        submit: false
      });
    }
    
    // Look for login button
    const loginButton = snapshot.find(el => 
      el.type === 'button' && 
      (el.name?.toLowerCase().includes('sign in') || el.name?.toLowerCase().includes('login'))
    );
    
    if (loginButton) {
      await mcp__playwright__browser_click({
        element: 'Login button',
        ref: loginButton.ref
      });
    }
    
    // Wait for login to complete
    await mcp__playwright__browser_wait_for({ time: 3 });
    
    // Navigate to agents page or chat preview
    console.log('\n🤖 Navigating to agents/chat preview...');
    await mcp__playwright__browser_navigate({ url: 'http://localhost:3000/agents' });
    await mcp__playwright__browser_wait_for({ time: 2 });
    
    // Take screenshot of agents page
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'bant-test-02-agents.png',
      fullPage: false 
    });
    
    // Get updated snapshot
    const agentsSnapshot = await mcp__playwright__browser_snapshot();
    
    // Look for chat preview or test chat button
    const chatButton = agentsSnapshot.find(el => 
      el.type === 'button' && 
      (el.name?.toLowerCase().includes('chat') || 
       el.name?.toLowerCase().includes('preview') ||
       el.name?.toLowerCase().includes('test'))
    );
    
    if (chatButton) {
      console.log('✅ Found chat button:', chatButton.name);
      await mcp__playwright__browser_click({
        element: 'Chat preview button',
        ref: chatButton.ref
      });
      
      await mcp__playwright__browser_wait_for({ time: 2 });
    }
    
    // Take screenshot of chat interface
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'bant-test-03-chat-interface.png',
      fullPage: false 
    });
    
    // Get chat interface snapshot
    const chatSnapshot = await mcp__playwright__browser_snapshot();
    
    // Find message input
    const messageInput = chatSnapshot.find(el => 
      el.type === 'textbox' && 
      (el.name?.toLowerCase().includes('message') || 
       el.name?.toLowerCase().includes('type') ||
       el.placeholder?.toLowerCase().includes('message'))
    );
    
    if (messageInput) {
      console.log('\n💬 Testing BANT extraction...');
      
      // First message: greeting
      console.log('  Sending: "hello"');
      await mcp__playwright__browser_type({
        element: 'Message input',
        ref: messageInput.ref,
        text: 'hello',
        submit: true
      });
      
      await mcp__playwright__browser_wait_for({ time: 3 });
      
      // Second message: ask about properties
      console.log('  Sending: "what properties do you have"');
      await mcp__playwright__browser_type({
        element: 'Message input',
        ref: messageInput.ref,
        text: 'what properties do you have',
        submit: true
      });
      
      await mcp__playwright__browser_wait_for({ time: 3 });
      
      // Third message: provide budget (THE KEY TEST)
      console.log('  🎯 Sending: "35M" (budget answer)');
      await mcp__playwright__browser_type({
        element: 'Message input',
        ref: messageInput.ref,
        text: '35M',
        submit: true
      });
      
      await mcp__playwright__browser_wait_for({ time: 5 });
      
      // Take screenshot of conversation
      await mcp__playwright__browser_take_screenshot({ 
        filename: 'bant-test-04-after-35M.png',
        fullPage: false 
      });
      
      // Get final snapshot to check response
      const finalSnapshot = await mcp__playwright__browser_snapshot();
      
      // Look for AI response
      const messages = finalSnapshot.filter(el => 
        el.type === 'text' && 
        el.level > 0 &&
        (el.name?.includes('budget') || 
         el.name?.includes('authority') ||
         el.name?.includes('decision'))
      );
      
      console.log('\n📊 Chat Analysis:');
      console.log('  Total elements:', finalSnapshot.length);
      console.log('  Message-like elements:', messages.length);
      
      // Check if AI asked about authority (next BANT question)
      const askedAuthority = messages.some(msg => 
        msg.name?.toLowerCase().includes('decision') ||
        msg.name?.toLowerCase().includes('authority') ||
        msg.name?.toLowerCase().includes('sole')
      );
      
      const askedBudgetAgain = messages.some(msg => 
        msg.name?.toLowerCase().includes('budget range') ||
        msg.name?.toLowerCase().includes('your budget')
      );
      
      console.log('\n✅ BANT Test Results:');
      console.log('  Budget "35M" sent: YES');
      console.log('  AI asked about authority (next step): ' + (askedAuthority ? '✅ YES' : '❌ NO'));
      console.log('  AI asked about budget again (error): ' + (askedBudgetAgain ? '❌ YES (BAD)' : '✅ NO (GOOD)'));
      
      if (askedBudgetAgain && !askedAuthority) {
        console.log('\n❌ BANT EXTRACTION FAILED - Budget not recognized!');
        console.log('The AI is still asking for budget instead of moving to authority.');
      } else if (askedAuthority) {
        console.log('\n✅ BANT EXTRACTION WORKING - Moved to authority question!');
      }
      
    } else {
      console.log('❌ Could not find message input field');
    }
    
    // Close browser
    await mcp__playwright__browser_close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    // Try to take error screenshot
    try {
      await mcp__playwright__browser_take_screenshot({ 
        filename: 'bant-test-error.png',
        fullPage: false 
      });
    } catch (e) {
      // Ignore screenshot error
    }
    await mcp__playwright__browser_close();
  }
}

// Run the test
testBANTWithPlaywright().then(() => {
  console.log('\n✅ Playwright test complete');
}).catch(err => {
  console.error('Fatal error:', err);
});