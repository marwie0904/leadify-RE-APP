const { chromium } = require('playwright');

async function testCreateHandoffAndTransfer() {
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
    
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    // Navigate to conversations page
    console.log('2. Navigating to conversations page...');
    await page.goto('http://localhost:3000/conversations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for conversations
    console.log('3. Looking for conversations...');
    const conversationItems = await page.locator('.space-y-2 > div').count();
    console.log(`   Found ${conversationItems} conversations`);
    
    if (conversationItems > 0) {
      // Click on the first conversation
      console.log('4. Clicking on first conversation...');
      await page.locator('.space-y-2 > div').first().click();
      await page.waitForTimeout(2000);
      
      // Look for the Request Human Handoff button
      console.log('5. Looking for Request Human Handoff button...');
      const handoffButton = await page.locator('button:has-text("Request Human Handoff")');
      
      if (await handoffButton.count() > 0) {
        console.log('   Found Request Human Handoff button');
        
        // Click it to create a handoff
        console.log('6. Clicking Request Human Handoff...');
        await handoffButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success message
        const toastMessage = await page.locator('.sonner-toast').textContent().catch(() => null);
        if (toastMessage) {
          console.log(`   Toast message: ${toastMessage}`);
        }
        
        // Now navigate to human handoff page
        console.log('7. Navigating to human handoff page...');
        await page.goto('http://localhost:3000/human-handoff');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        // Look for handoff conversations
        console.log('8. Looking for handoff conversations...');
        const handoffCards = await page.locator('.space-y-4 > div').count();
        console.log(`   Found ${handoffCards} handoff conversation cards`);
        
        if (handoffCards > 0) {
          // Look for Transfer to AI button
          const firstCard = page.locator('.space-y-4 > div').first();
          console.log('9. Looking for Transfer to AI button...');
          const transferButton = firstCard.locator('button:has-text("Transfer to AI")');
          
          if (await transferButton.count() > 0) {
            console.log('   Transfer to AI button found!');
            
            // Check if button is disabled
            const isDisabled = await transferButton.isDisabled();
            console.log(`   Button disabled: ${isDisabled}`);
            
            if (!isDisabled) {
              console.log('10. Clicking Transfer to AI button...');
              await transferButton.click();
              
              // Wait for response
              await page.waitForTimeout(3000);
              
              // Check for success toast or error
              const transferToast = await page.locator('.sonner-toast').textContent().catch(() => null);
              if (transferToast) {
                console.log(`   Toast message: ${transferToast}`);
              }
              
              // Check if card was removed
              const cardStillExists = await firstCard.isVisible().catch(() => false);
              console.log(`   Card still visible: ${cardStillExists}`);
              
              if (!cardStillExists) {
                console.log('   ✅ Transfer successful - card removed from handoff list');
              } else {
                console.log('   ❌ Transfer may have failed - card still in handoff state');
              }
            } else {
              console.log('   ❌ Transfer to AI button is disabled');
            }
          } else {
            console.log('   ❌ No Transfer to AI button found');
            
            // Check what buttons are available
            const availableButtons = await firstCard.locator('button').allTextContents();
            console.log('   Available buttons:', availableButtons);
          }
        }
      } else {
        console.log('   No Request Human Handoff button found');
        console.log('   This conversation might already be in handoff mode');
      }
    } else {
      console.log('   No conversations found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'handoff-transfer-test.png' });
    console.log('11. Screenshot saved to handoff-transfer-test.png');
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'handoff-transfer-error.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testCreateHandoffAndTransfer().catch(console.error);