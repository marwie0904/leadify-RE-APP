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

  // Enable request/response logging
  page.on('requestfailed', request => {
    console.log('[Request Failed]', request.url(), request.failure());
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('[Response Error]', response.status(), response.url());
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
    
    console.log('4. Navigating to conversations page...');
    await page.goto('http://localhost:3000/conversations');
    await page.waitForLoadState('networkidle');
    
    // Check if there are any conversations
    const conversationCount = await page.locator('[role="button"]').filter({ hasText: /Untitled Conversation|Unknown Lead/ }).count();
    console.log(`5. Found ${conversationCount} conversations`);
    
    if (conversationCount > 0) {
      console.log('6. Clicking on first conversation...');
      await page.locator('[role="button"]').filter({ hasText: /Untitled Conversation|Unknown Lead/ }).first().click();
      
      // Wait for chat interface to load
      await page.waitForTimeout(2000);
      
      // Check if handoff button exists
      const handoffButton = page.locator('button').filter({ hasText: 'Handoff' });
      const handoffButtonExists = await handoffButton.count() > 0;
      
      if (handoffButtonExists) {
        console.log('7. Found handoff button, clicking it...');
        await handoffButton.click();
        
        // Wait for dialog to open
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
        console.log('8. Handoff dialog opened');
        
        // Fill in reason
        await page.fill('textarea[placeholder*="describe why"]', 'Testing handoff functionality');
        
        // Click request button
        await page.click('button:has-text("Request Human Agent")');
        
        console.log('9. Clicked request button, waiting for response...');
        
        // Wait for either success or error
        try {
          // Wait for success toast or error alert
          const result = await Promise.race([
            page.waitForSelector('div:has-text("Human agent")', { timeout: 10000 }),
            page.waitForSelector('[role="alert"]', { timeout: 10000 })
          ]);
          
          const text = await result.textContent();
          console.log('10. Result:', text);
          
          // Check if it's an error
          if (text.includes('Failed') || text.includes('Error')) {
            console.error('Handoff failed:', text);
            
            // Check network tab for API errors
            const failedRequests = await page.evaluate(() => {
              return window.performance.getEntries()
                .filter(entry => entry.name.includes('/api/conversations') && entry.name.includes('/handoff'))
                .map(entry => ({ url: entry.name, status: entry.responseStatus }));
            });
            console.log('Failed API requests:', failedRequests);
          } else {
            console.log('Handoff successful!');
          }
        } catch (timeoutError) {
          console.error('Timeout waiting for response');
          
          // Take screenshot for debugging
          await page.screenshot({ path: 'handoff-timeout.png' });
        }
      } else {
        console.log('No handoff button found - checking if conversation is already in handoff mode');
        
        // Check for existing handoff status
        const handoffStatus = await page.locator('text=/Human Agent|Chatting with human/').count();
        if (handoffStatus > 0) {
          console.log('Conversation is already in handoff mode');
        }
      }
    } else {
      console.log('No conversations found to test handoff');
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