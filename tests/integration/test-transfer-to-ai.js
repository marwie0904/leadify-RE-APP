const { chromium } = require('playwright');

async function testTransferToAI() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    
    // Wait a bit for any redirects
    await page.waitForTimeout(3000);
    
    // Take screenshot to debug
    await page.screenshot({ path: 'current-page-debug.png' });
    
    // Check current URL
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    // Check page content
    const pageContent = await page.content();
    const hasLoginForm = pageContent.includes('email') && pageContent.includes('password');
    const hasDashboard = pageContent.includes('Dashboard') || pageContent.includes('dashboard');
    
    console.log('   Has login form:', hasLoginForm);
    console.log('   Has dashboard:', hasDashboard);
    
    // If we're already on dashboard, skip login
    if (currentUrl.includes('/dashboard') || hasDashboard) {
      console.log('2. Already logged in, on dashboard');
    } else if (currentUrl.includes('/login') || hasLoginForm) {
      // Take screenshot to see what's on the page
      await page.screenshot({ path: 'login-page-debug.png' });
      console.log('   Login page screenshot saved');
      
      // Try different selectors for login
      console.log('2. Logging in...');
      
      // Wait for form to load
      await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 5000 });
      
      // Check what's on the page
      const emailInput = await page.locator('input[type="email"], input[name="email"], #email').first();
      const passwordInput = await page.locator('input[type="password"], input[name="password"], #password').first();
      
      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill('marwie0904@gmail.com');
        await passwordInput.fill('ayokonga123');
        
        // Find and click submit button
        const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
        await submitButton.click();
        
        // Wait for login to complete
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('3. Login successful, on dashboard');
      } else {
        console.log('   Could not find login inputs');
        throw new Error('Login form not found');
      }
    } else {
      console.log('   Not on login or dashboard page');
      throw new Error('Unexpected page state');
    }
    
    // Navigate to human handoff page directly
    console.log('4. Navigating to human handoff page...');
    
    // Take screenshot of current page
    await page.screenshot({ path: 'dashboard-debug.png' });
    
    // Navigate directly to the handoff page
    await page.goto('http://localhost:3000/human-handoff');
    await page.waitForLoadState('networkidle');
    
    // Check if we need to wait for data to load
    await page.waitForTimeout(2000);
    
    // Look for any conversations with handoff status
    console.log('5. Looking for handoff conversations...');
    
    // Check if there are any handoff conversations
    const handoffCards = await page.locator('.space-y-4 > div').count();
    console.log(`   Found ${handoffCards} handoff conversation cards`);
    
    if (handoffCards > 0) {
      // Get details of first handoff conversation
      const firstCard = page.locator('.space-y-4 > div').first();
      const conversationId = await firstCard.locator('text=/Conversation ID:.*/ >> text=/[a-f0-9-]+/').textContent();
      console.log(`   First conversation ID: ${conversationId}`);
      
      // Look for Transfer to AI button
      console.log('6. Looking for Transfer to AI button...');
      const transferButton = firstCard.locator('button:has-text("Transfer to AI")');
      const buttonExists = await transferButton.count() > 0;
      
      if (buttonExists) {
        console.log('   Transfer to AI button found!');
        
        // Check if button is disabled
        const isDisabled = await transferButton.isDisabled();
        console.log(`   Button disabled: ${isDisabled}`);
        
        if (!isDisabled) {
          console.log('7. Clicking Transfer to AI button...');
          await transferButton.click();
          
          // Wait for response
          await page.waitForTimeout(2000);
          
          // Check for success toast or error
          const toastMessage = await page.locator('.sonner-toast').textContent().catch(() => null);
          if (toastMessage) {
            console.log(`   Toast message: ${toastMessage}`);
          }
          
          // Check if button text changed or card was removed
          const cardStillExists = await firstCard.isVisible();
          console.log(`   Card still visible: ${cardStillExists}`);
          
          if (!cardStillExists) {
            console.log('   ✅ Transfer successful - card removed from handoff list');
          } else {
            // Check if mode changed
            const modeIndicator = await firstCard.locator('text=/Mode:.*AI/').count();
            if (modeIndicator > 0) {
              console.log('   ✅ Transfer successful - mode changed to AI');
            } else {
              console.log('   ❌ Transfer may have failed - card still in handoff state');
            }
          }
        } else {
          console.log('   ❌ Transfer to AI button is disabled');
          
          // Check for any error messages
          const errorText = await firstCard.locator('.text-red-500, .text-destructive').textContent().catch(() => null);
          if (errorText) {
            console.log(`   Error message: ${errorText}`);
          }
        }
      } else {
        console.log('   ❌ No Transfer to AI button found');
        
        // Check what buttons are available
        const availableButtons = await firstCard.locator('button').allTextContents();
        console.log('   Available buttons:', availableButtons);
      }
    } else {
      console.log('   No handoff conversations found');
      
      // Check for empty state message
      const emptyMessage = await page.locator('text=/No.*handoff.*conversations/i').textContent().catch(() => null);
      if (emptyMessage) {
        console.log(`   Empty state: ${emptyMessage}`);
      }
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'transfer-to-ai-debug.png' });
    console.log('8. Screenshot saved to transfer-to-ai-debug.png');
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'transfer-to-ai-error.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testTransferToAI().catch(console.error);