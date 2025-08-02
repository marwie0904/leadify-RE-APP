const { chromium } = require('playwright');

async function testTransferToAIComprehensive() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('=== COMPREHENSIVE TRANSFER TO AI TEST ===\n');
    
    // Step 1: Navigate and login
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    // Check if we need to login
    if (currentUrl.includes('/login')) {
      console.log('2. Logging in...');
      await page.fill('input[type="email"]', 'marwie0904@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('   Login successful');
    }
    
    // Step 2: First, let's check if there are any existing handoff conversations
    console.log('\n3. Checking for existing handoff conversations...');
    try {
      await page.goto('http://localhost:3000/human-handoff');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } catch (navError) {
      console.log('   Navigation error:', navError.message);
      // Try direct navigation without waiting for login redirect
      await page.goto('http://localhost:3000/human-handoff', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }
    
    // Check for handoff conversations
    const handoffCards = await page.locator('.space-y-4 > div').count();
    console.log(`   Found ${handoffCards} existing handoff conversations`);
    
    if (handoffCards === 0) {
      // No handoffs exist, let's create one
      console.log('\n4. No handoff conversations found. Creating one...');
      
      // Go to conversations page
      await page.goto('http://localhost:3000/conversations');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check if there are any conversations
      const conversationCount = await page.locator('.space-y-2 > div').count();
      console.log(`   Found ${conversationCount} conversations`);
      
      if (conversationCount === 0) {
        console.log('   No conversations found. Creating a new one...');
        
        // Go to agents page to start a new conversation
        await page.goto('http://localhost:3000/agents');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Look for an agent
        const agentCards = await page.locator('.grid > div').count();
        console.log(`   Found ${agentCards} agents`);
        
        if (agentCards > 0) {
          // Click on Chat Preview for the first agent
          const chatPreviewButton = page.locator('button:has-text("Chat Preview")').first();
          if (await chatPreviewButton.count() > 0) {
            console.log('   Opening chat preview...');
            await chatPreviewButton.click();
            await page.waitForTimeout(2000);
            
            // Send a message that will trigger handoff
            console.log('   Sending message to trigger handoff...');
            const chatInput = page.locator('input[placeholder*="Type your message"]');
            await chatInput.fill("I need help with something complex that the AI can't handle");
            await chatInput.press('Enter');
            
            // Wait for response
            await page.waitForTimeout(5000);
            
            // Check if handoff was created
            const systemMessage = await page.locator('text=/human agent.*notified/i').count();
            if (systemMessage > 0) {
              console.log('   ✅ Handoff created successfully!');
            } else {
              console.log('   ❌ Handoff may not have been created');
            }
            
            // Close modal
            await page.click('button[aria-label="Close"]');
            await page.waitForTimeout(1000);
          }
        }
      } else {
        // Click on the first conversation
        console.log('   Clicking on first conversation...');
        await page.locator('.space-y-2 > div').first().click();
        await page.waitForTimeout(2000);
        
        // Look for Request Human Handoff button
        const handoffButton = page.locator('button:has-text("Request Human Handoff")');
        if (await handoffButton.count() > 0) {
          console.log('   Clicking Request Human Handoff...');
          await handoffButton.click();
          await page.waitForTimeout(2000);
          
          // Check for success
          const toastMessage = await page.locator('.sonner-toast').textContent().catch(() => null);
          if (toastMessage) {
            console.log(`   Toast: ${toastMessage}`);
          }
        } else {
          console.log('   Conversation might already be in handoff mode');
        }
      }
      
      // Go back to handoff page
      console.log('\n5. Navigating back to handoff page...');
      await page.goto('http://localhost:3000/human-handoff');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Now test Transfer to AI
    console.log('\n6. Testing Transfer to AI functionality...');
    
    // Re-check for handoff conversations
    const finalHandoffCount = await page.locator('.space-y-4 > div').count();
    console.log(`   Found ${finalHandoffCount} handoff conversations`);
    
    if (finalHandoffCount > 0) {
      // Click on the first handoff conversation
      const firstCard = page.locator('.space-y-4 > div').first();
      console.log('   Clicking on first handoff conversation...');
      await firstCard.click();
      await page.waitForTimeout(2000);
      
      // Look for Transfer to AI button
      console.log('   Looking for Transfer to AI button...');
      const transferButton = page.locator('button:has-text("Transfer to AI")');
      const buttonCount = await transferButton.count();
      console.log(`   Found ${buttonCount} Transfer to AI button(s)`);
      
      if (buttonCount > 0) {
        // Check if button is disabled
        const isDisabled = await transferButton.isDisabled();
        console.log(`   Button disabled: ${isDisabled}`);
        
        // Get button's parent element for more context
        const buttonParent = await transferButton.locator('..').innerHTML();
        console.log('   Button context:', buttonParent.substring(0, 200) + '...');
        
        if (!isDisabled) {
          console.log('\n7. Clicking Transfer to AI button...');
          await transferButton.click();
          
          // Wait for response
          await page.waitForTimeout(3000);
          
          // Check for toast message
          const transferToast = await page.locator('.sonner-toast').textContent().catch(() => null);
          if (transferToast) {
            console.log(`   Toast message: ${transferToast}`);
            
            if (transferToast.includes('successfully')) {
              console.log('   ✅ Transfer to AI successful!');
              
              // Check if card was removed
              const cardStillExists = await firstCard.isVisible().catch(() => false);
              console.log(`   Card still visible: ${cardStillExists}`);
            } else {
              console.log('   ❌ Transfer may have failed');
            }
          }
        } else {
          console.log('   ❌ Transfer to AI button is disabled');
          
          // Try to understand why it's disabled
          const assignedText = await firstCard.locator('text=/Assigned to/').textContent().catch(() => null);
          if (assignedText) {
            console.log(`   Assignment status: ${assignedText}`);
          }
          
          const statusBadge = await firstCard.locator('.text-xs').first().textContent().catch(() => null);
          if (statusBadge) {
            console.log(`   Status: ${statusBadge}`);
          }
        }
      } else {
        console.log('   ❌ No Transfer to AI button found');
        
        // Debug: Check what's in the card header
        const cardHeader = await page.locator('.md\\:col-span-2 .card-header').innerHTML().catch(() => '');
        console.log('   Card header content:', cardHeader.substring(0, 300) + '...');
      }
    } else {
      console.log('   ❌ Still no handoff conversations found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'transfer-to-ai-comprehensive.png' });
    console.log('\n8. Screenshot saved to transfer-to-ai-comprehensive.png');
    
  } catch (error) {
    console.error('\nError during test:', error);
    await page.screenshot({ path: 'transfer-to-ai-error.png' });
  } finally {
    console.log('\n=== TEST COMPLETE ===');
    await browser.close();
  }
}

// Run the test
testTransferToAIComprehensive().catch(console.error);