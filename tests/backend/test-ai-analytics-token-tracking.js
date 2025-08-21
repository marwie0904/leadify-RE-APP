/**
 * AI Analytics Token Tracking Test
 * Critical test for verifying token usage tracking when AI conversations occur
 */

const { chromium } = require('playwright');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  testUser: {
    email: 'marwryyy@gmail.com',
    password: 'ayokonga123'
  },
  timeout: 60000
};

async function loginFresh(page) {
  console.log('🔐 Logging in with fresh session...');
  
  // Clear any existing session
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.goto(`${CONFIG.baseUrl}/auth`);
  await page.waitForTimeout(1000);
  
  // Fill login form
  await page.fill('input[type="email"]', CONFIG.testUser.email);
  await page.fill('input[type="password"]', CONFIG.testUser.password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✅ Login successful');
  await page.waitForTimeout(2000);
}

async function navigateToAdminAIAnalytics(page) {
  console.log('📊 Navigating to AI Analytics page...');
  
  // First go to admin page
  await page.goto(`${CONFIG.baseUrl}/admin`);
  await page.waitForTimeout(2000);
  
  // Try to find AI Analytics link in sidebar or page
  const aiAnalyticsLink = await page.locator('a:has-text("AI Analytics"), button:has-text("AI Analytics")').first();
  if (await aiAnalyticsLink.count() > 0) {
    await aiAnalyticsLink.click();
    await page.waitForTimeout(2000);
  } else {
    // Direct navigation
    await page.goto(`${CONFIG.baseUrl}/admin/ai-analytics`);
    await page.waitForTimeout(2000);
  }
  
  console.log('✅ On AI Analytics page');
}

async function captureTokenMetrics(page) {
  const metrics = {
    totalTokens: null,
    totalCost: null,
    conversationCount: null,
    modelBreakdown: {}
  };
  
  try {
    // Try multiple selectors for total tokens
    const tokenSelectors = [
      'text=/Total Tokens/i',
      'text=/Tokens Used/i',
      'text=/Token Usage/i',
      ':has-text("Tokens") + *'
    ];
    
    for (const selector of tokenSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        const parent = await element.locator('..');
        const valueElement = await parent.locator('.text-2xl, .text-3xl, .font-bold').first();
        if (await valueElement.count() > 0) {
          const text = await valueElement.textContent();
          const tokenCount = parseInt(text.replace(/[^0-9]/g, '')) || 0;
          metrics.totalTokens = tokenCount;
          console.log(`📈 Found token count: ${tokenCount}`);
          break;
        }
      }
    }
    
    // Try to find cost information
    const costSelectors = [
      'text=/$/',
      'text=/Cost/i',
      'text=/USD/i',
      ':has-text("Cost") + *'
    ];
    
    for (const selector of costSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        metrics.totalCost = text;
        console.log(`💰 Found cost: ${text}`);
        break;
      }
    }
    
    // Try to find conversation count
    const convSelectors = [
      'text=/Conversations/i',
      'text=/Total Conversations/i',
      ':has-text("Conversations") + *'
    ];
    
    for (const selector of convSelectors) {
      const element = await page.locator(selector).first();
      if (await element.count() > 0) {
        const parent = await element.locator('..');
        const valueElement = await parent.locator('.text-2xl, .text-3xl, .font-bold').first();
        if (await valueElement.count() > 0) {
          const text = await valueElement.textContent();
          const count = parseInt(text.replace(/[^0-9]/g, '')) || 0;
          metrics.conversationCount = count;
          console.log(`💬 Found conversation count: ${count}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error capturing metrics:', error.message);
  }
  
  return metrics;
}

async function createAIConversation(page) {
  console.log('🤖 Creating AI conversation to generate tokens...');
  
  // Navigate to agents page
  await page.goto(`${CONFIG.baseUrl}/agents`);
  await page.waitForTimeout(2000);
  
  // Look for an existing agent or create button
  const agentCards = await page.locator('.card, [class*="agent"]').all();
  
  if (agentCards.length > 0) {
    console.log(`Found ${agentCards.length} agents, clicking first one...`);
    await agentCards[0].click();
    await page.waitForTimeout(2000);
    
    // Look for chat interface
    const chatInput = await page.locator('textarea, input[placeholder*="message"], input[placeholder*="chat"]').first();
    if (await chatInput.count() > 0) {
      console.log('📝 Sending test message to AI...');
      
      // Send a message that will generate a reasonable token response
      const testMessage = "Hello! I'm interested in learning about real estate in the area. Can you tell me about the current market conditions, average home prices, and what types of properties are available? I'm looking for a family home with 3-4 bedrooms.";
      
      await chatInput.fill(testMessage);
      
      // Find and click send button
      const sendButton = await page.locator('button:has(svg), button[type="submit"]').last();
      await sendButton.click();
      
      console.log('⏳ Waiting for AI response...');
      await page.waitForTimeout(5000); // Wait for response
      
      // Check if response appeared
      const messages = await page.locator('.message, [class*="message"]').count();
      console.log(`📨 Found ${messages} messages in conversation`);
      
      return true;
    } else {
      console.log('⚠️ No chat interface found');
      return false;
    }
  } else {
    console.log('⚠️ No agents found to test with');
    return false;
  }
}

async function runTokenTrackingTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   AI ANALYTICS TOKEN TRACKING TEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: CONFIG.timeout
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('token') || msg.text().includes('Token')) {
        console.log(`[Browser ${msg.type()}]:`, msg.text());
      }
    });
    
    // Capture API calls
    let tokenApiCalls = [];
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('token') || url.includes('analytics') || url.includes('usage')) {
        tokenApiCalls.push({
          url: url.replace(CONFIG.apiUrl, ''),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Phase 1: Login
    console.log('\n📌 PHASE 1: AUTHENTICATION');
    console.log('─────────────────────────');
    await loginFresh(page);
    
    // Phase 2: Capture baseline metrics
    console.log('\n📌 PHASE 2: BASELINE METRICS');
    console.log('───────────────────────────');
    await navigateToAdminAIAnalytics(page);
    
    const baselineMetrics = await captureTokenMetrics(page);
    console.log('Baseline Metrics:', baselineMetrics);
    
    if (baselineMetrics.totalTokens === null) {
      console.log('⚠️ WARNING: Could not find token count on AI Analytics page');
      console.log('Taking screenshot for debugging...');
      await page.screenshot({ path: 'test-results/ai-analytics-baseline.png', fullPage: true });
    }
    
    // Phase 3: Generate token usage
    console.log('\n📌 PHASE 3: GENERATE TOKEN USAGE');
    console.log('────────────────────────────────');
    const conversationCreated = await createAIConversation(page);
    
    if (!conversationCreated) {
      console.log('⚠️ Could not create conversation, trying alternative method...');
      
      // Alternative: Try to find conversations page
      await page.goto(`${CONFIG.baseUrl}/conversations`);
      await page.waitForTimeout(2000);
      
      // Try to start a new conversation
      const newConvButton = await page.locator('button:has-text("New"), button:has-text("Start")').first();
      if (await newConvButton.count() > 0) {
        await newConvButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Phase 4: Verify token increase
    console.log('\n📌 PHASE 4: VERIFY TOKEN TRACKING');
    console.log('─────────────────────────────────');
    await navigateToAdminAIAnalytics(page);
    await page.waitForTimeout(3000); // Give time for data to update
    
    const updatedMetrics = await captureTokenMetrics(page);
    console.log('Updated Metrics:', updatedMetrics);
    
    // Compare metrics
    console.log('\n📊 METRICS COMPARISON');
    console.log('────────────────────');
    
    if (baselineMetrics.totalTokens !== null && updatedMetrics.totalTokens !== null) {
      const tokenIncrease = updatedMetrics.totalTokens - baselineMetrics.totalTokens;
      if (tokenIncrease > 0) {
        console.log(`✅ SUCCESS: Tokens increased by ${tokenIncrease}`);
        console.log(`   Before: ${baselineMetrics.totalTokens}`);
        console.log(`   After: ${updatedMetrics.totalTokens}`);
      } else {
        console.log(`❌ FAIL: No token increase detected`);
        console.log(`   Before: ${baselineMetrics.totalTokens}`);
        console.log(`   After: ${updatedMetrics.totalTokens}`);
      }
    } else {
      console.log('❌ FAIL: Could not capture token metrics for comparison');
    }
    
    if (baselineMetrics.conversationCount !== null && updatedMetrics.conversationCount !== null) {
      const convIncrease = updatedMetrics.conversationCount - baselineMetrics.conversationCount;
      if (convIncrease > 0) {
        console.log(`✅ Conversation count increased by ${convIncrease}`);
      }
    }
    
    // Phase 5: Cross-page validation
    console.log('\n📌 PHASE 5: CROSS-PAGE VALIDATION');
    console.log('─────────────────────────────────');
    
    // Check if token usage appears on main admin dashboard
    await page.goto(`${CONFIG.baseUrl}/admin`);
    await page.waitForTimeout(2000);
    
    const dashboardTokens = await page.locator('text=/token/i').count();
    console.log(`Found ${dashboardTokens} token-related elements on admin dashboard`);
    
    // Take final screenshots
    await page.screenshot({ path: 'test-results/ai-analytics-final.png', fullPage: true });
    
    // Summary
    console.log('\n📌 TEST SUMMARY');
    console.log('──────────────');
    console.log(`Total API calls tracked: ${tokenApiCalls.length}`);
    console.log('Token-related API calls:', tokenApiCalls.filter(c => c.url.includes('token')).length);
    console.log('Analytics API calls:', tokenApiCalls.filter(c => c.url.includes('analytics')).length);
    
    // Final verdict
    console.log('\n🏁 FINAL VERDICT');
    console.log('────────────────');
    
    if (updatedMetrics.totalTokens > (baselineMetrics.totalTokens || 0)) {
      console.log('✅ TOKEN TRACKING IS WORKING');
    } else {
      console.log('❌ TOKEN TRACKING NEEDS FIXING');
      console.log('\nPotential issues:');
      console.log('1. AI Analytics page may not be displaying token data');
      console.log('2. Token usage may not be updating after conversations');
      console.log('3. Backend may not be tracking tokens correctly');
      console.log('4. There may be a delay in token data propagation');
    }
    
  } catch (error) {
    console.error('Fatal error during test:', error);
  } finally {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`Test completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
    await browser.close();
  }
}

// Run the test
runTokenTrackingTest().catch(console.error);