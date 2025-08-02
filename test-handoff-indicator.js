const { chromium } = require('playwright');

async function testHandoffIndicator() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300 // Slow down to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('=== HANDOFF INDICATOR TEST ===\n');
    
    // Step 1: Navigate to the conversations page
    console.log('1. Navigating to conversations page...');
    await page.goto('http://localhost:3000/conversations');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('2. Logging in...');
      await page.fill('input[type="email"]', 'marwie0904@gmail.com');
      await page.fill('input[type="password"]', 'ayokonga123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation to complete
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Navigate to conversations page
      await page.goto('http://localhost:3000/conversations');
      await page.waitForTimeout(2000);
    }
    
    // Step 2: Look for conversation list
    console.log('\n3. Looking for conversations...');
    const conversationCards = await page.locator('.space-y-2 > button').count();
    console.log(`   Found ${conversationCards} conversations`);
    
    if (conversationCards === 0) {
      console.log('   ❌ No conversations found to test');
      await page.screenshot({ path: 'no-conversations.png' });
      return;
    }
    
    // Step 3: Check for handoff indicators
    console.log('\n4. Looking for handoff indicators...');
    const handoffBadges = await page.locator('text="Handoff"').count();
    console.log(`   Found ${handoffBadges} handoff badge(s)`);
    
    if (handoffBadges > 0) {
      console.log('   ✅ Handoff indicators are displayed!');
      
      // Get details of conversations with handoff
      const handoffConversations = await page.locator('.space-y-2 > button').evaluateAll((buttons) => {
        return buttons.map((button) => {
          const title = button.querySelector('.font-medium')?.textContent || '';
          const hasHandoff = button.querySelector('text="Handoff"') !== null;
          const badges = Array.from(button.querySelectorAll('.badge, [class*="badge"]')).map(badge => badge.textContent);
          return { title, hasHandoff, badges };
        }).filter(conv => conv.hasHandoff);
      });
      
      console.log('\n5. Conversations with handoff:');
      handoffConversations.forEach((conv, index) => {
        console.log(`   ${index + 1}. ${conv.title}`);
        console.log(`      Badges: ${conv.badges.join(', ')}`);
      });
      
      // Step 4: Verify styling
      console.log('\n6. Verifying handoff badge styling...');
      const firstHandoffBadge = page.locator('text="Handoff"').first();
      
      // Check if badge exists
      if (await firstHandoffBadge.count() > 0) {
        // Get computed styles
        const badgeStyles = await firstHandoffBadge.evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontSize: styles.fontSize,
            padding: styles.padding,
            borderRadius: styles.borderRadius,
            display: styles.display
          };
        });
        
        console.log('   Badge styles:');
        console.log(`   - Background: ${badgeStyles.backgroundColor}`);
        console.log(`   - Text color: ${badgeStyles.color}`);
        console.log(`   - Font size: ${badgeStyles.fontSize}`);
        console.log(`   - Padding: ${badgeStyles.padding}`);
        console.log(`   - Border radius: ${badgeStyles.borderRadius}`);
        
        // Check if it has destructive variant styling (red)
        if (badgeStyles.backgroundColor.includes('rgb(239') || badgeStyles.backgroundColor.includes('rgb(220')) {
          console.log('   ✅ Badge has red/destructive styling');
        } else {
          console.log('   ⚠️  Badge might not have destructive variant');
        }
      }
      
      // Step 5: Click on a handoff conversation
      console.log('\n7. Clicking on a handoff conversation...');
      const firstHandoffButton = page.locator('.space-y-2 > button').filter({ has: page.locator('text="Handoff"') }).first();
      await firstHandoffButton.click();
      await page.waitForTimeout(2000);
      
      // Check if chat interface loaded
      const chatInterface = await page.locator('.h-\\[500px\\]').count();
      if (chatInterface > 0) {
        console.log('   ✅ Chat interface loaded for handoff conversation');
        
        // Check if the refresh/new conversation buttons are removed
        const refreshButton = await page.locator('.h-\\[500px\\] button:has([class*="RefreshCw"])').count();
        const newConvButton = await page.locator('.h-\\[500px\\] button:has([class*="Plus"])').count();
        
        if (refreshButton === 0 && newConvButton === 0) {
          console.log('   ✅ Refresh and New Conversation buttons are properly removed from conversations page');
        } else {
          console.log('   ❌ Found refresh/new conversation buttons that should have been removed');
        }
      }
      
    } else {
      console.log('   ℹ️  No conversations currently in handoff state');
      console.log('   To test: Create a handoff conversation first');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'handoff-indicator-test.png' });
    console.log('\n8. Screenshot saved to handoff-indicator-test.png');
    
  } catch (error) {
    console.error('\nError during test:', error);
    await page.screenshot({ path: 'handoff-indicator-error.png' });
  } finally {
    console.log('\n=== TEST COMPLETE ===');
    await browser.close();
  }
}

// Run the test
testHandoffIndicator().catch(console.error);