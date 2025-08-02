const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[Browser Error]', msg.text());
    }
  });

  // Enable request/response logging for handoff endpoint
  page.on('response', response => {
    if (response.url().includes('/handoff')) {
      console.log('[Handoff Response]', response.status(), response.url());
      if (response.status() >= 400) {
        response.text().then(text => {
          console.log('[Handoff Error Body]', text);
        }).catch(() => {});
      }
    }
  });

  page.on('requestfailed', request => {
    if (request.url().includes('/handoff')) {
      console.log('[Handoff Request Failed]', request.url(), request.failure());
    }
  });

  try {
    console.log('1. Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('2. Logging in...');
    // Look for email input by ID or placeholder
    const emailInput = await page.locator('#signin-email');
    await emailInput.fill('marwie0904@gmail.com');
    
    // Look for password input by ID or placeholder  
    const passwordInput = await page.locator('#signin-password');
    await passwordInput.fill('ayokonga123');
    
    // Click Sign In button - it's a submit button within signin tab
    const signInButton = await page.locator('button[type="submit"]:has-text("Sign In")');
    await signInButton.click();
    
    // Wait for navigation to dashboard or conversations
    await page.waitForURL((url) => {
      const pathname = new URL(url).pathname;
      return pathname.includes('/dashboard') || pathname.includes('/conversations') || pathname.includes('/organization');
    }, { timeout: 10000 });
    console.log('3. Login successful, navigated to:', page.url());
    
    // Wait a bit for auth to settle
    await page.waitForTimeout(2000);
    
    console.log('4. Navigating to agents page to find an agent...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForLoadState('networkidle');
    
    // Find the first agent card with View Chat button
    const viewChatButton = await page.locator('button:has-text("View Chat")').first();
    const hasAgent = await viewChatButton.count() > 0;
    
    if (!hasAgent) {
      console.log('No agents found. Please create an agent first.');
      await browser.close();
      return;
    }
    
    console.log('5. Opening chat preview for first agent...');
    await viewChatButton.click();
    
    // Wait for chat modal to open
    await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
    console.log('6. Chat modal opened');
    
    // Send a message to create a conversation
    const messageInput = await page.locator('input[placeholder*="Type your message"]');
    await messageInput.fill('Hello, I need help with property valuation');
    
    // Send the message
    const sendButton = await page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();
    
    console.log('7. Message sent, waiting for response...');
    // Wait for AI response
    await page.waitForTimeout(3000);
    
    // Now check if handoff button appears
    const handoffButton = page.locator('button:has-text("Handoff")');
    const handoffButtonExists = await handoffButton.count() > 0;
    
    if (handoffButtonExists) {
      console.log('8. Found handoff button, clicking it...');
      await handoffButton.click();
      
      // Wait for dialog to open
      await page.waitForSelector('div[role="dialog"]:has-text("Request Human Agent")', { timeout: 5000 });
      console.log('9. Handoff dialog opened');
      
      // Fill in reason
      await page.fill('textarea[placeholder*="describe why"]', 'Testing handoff functionality');
      
      // Select priority
      const prioritySelect = await page.locator('button[role="combobox"]').first();
      await prioritySelect.click();
      await page.locator('span:has-text("High - Urgent assistance needed")').click();
      
      // Click request button
      await page.click('button:has-text("Request Human Agent")');
      
      console.log('10. Clicked request button, waiting for response...');
      
      // Wait for either success or error
      try {
        // Wait for success toast or error alert
        const result = await Promise.race([
          page.waitForSelector('div:has-text("Human agent")', { timeout: 10000 }),
          page.waitForSelector('[role="alert"]:has-text("Failed")', { timeout: 10000 })
        ]);
        
        const text = await result.textContent();
        console.log('11. Result:', text);
        
        // Check if it's an error
        if (text.includes('Failed') || text.includes('Error')) {
          console.error('Handoff failed:', text);
          
          // Check console for errors
          await page.evaluate(() => {
            const errors = window.performance.getEntries()
              .filter(entry => entry.name.includes('/api/conversations') && entry.name.includes('/handoff'));
            console.log('Network entries:', errors);
          });
        } else {
          console.log('Handoff successful!');
        }
      } catch (timeoutError) {
        console.error('Timeout waiting for response');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'handoff-timeout.png' });
      }
    } else {
      console.log('No handoff button found - the conversation might not have been created properly');
      
      // Check for conversation ID in the modal
      const badges = await page.locator('span.text-xs').allTextContents();
      console.log('Modal badges:', badges);
    }
    
    // Take a final screenshot
    await page.screenshot({ path: 'handoff-test-final.png' });
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'handoff-test-error.png' });
  } finally {
    // Keep browser open for manual inspection
    console.log('\nTest completed. Press Ctrl+C to close the browser.');
    await new Promise(() => {}); // Keep running
  }
})();