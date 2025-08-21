const { chromium } = require('playwright');
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:3000';

// Use the test account from .env
const TEST_ACCOUNT = {
  email: process.env.TEST_EMAIL || 'marwie.ang.0904@gmail.com',
  password: process.env.TEST_PASSWORD || 'ayokonga123'
};

async function testQuickLogin() {
  console.log('🎭 QUICK LOGIN TEST');
  console.log('=' .repeat(60));
  console.log(`Testing with: ${TEST_ACCOUNT.email}`);
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to auth page
    console.log('\n📍 Navigating to auth page...');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    
    // Check current URL
    const startUrl = page.url();
    console.log(`  Current URL: ${startUrl}`);
    
    // Take screenshot
    await page.screenshot({ path: 'quick-test-01-auth.png' });
    
    // Check if already logged in
    if (startUrl.includes('/dashboard')) {
      console.log('  ✅ Already logged in!');
      await page.screenshot({ path: 'quick-test-02-dashboard.png' });
    } else {
      // Find and fill login form
      console.log('\n🔐 Attempting login...');
      
      // Check for tabs (Sign In / Sign Up)
      const signInTab = await page.locator('button:has-text("Sign in"), button:has-text("Sign In"), div[role="tab"]:has-text("Sign")').first();
      if (await signInTab.isVisible()) {
        await signInTab.click();
        console.log('  ✅ Clicked Sign In tab');
        await page.waitForTimeout(1000);
      }
      
      const emailInput = await page.locator('input[type="email"]').first();
      const passwordInput = await page.locator('input[type="password"]').first();
      
      console.log(`  Email input visible: ${await emailInput.isVisible()}`);
      console.log(`  Password input visible: ${await passwordInput.isVisible()}`);
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        console.log('  ✅ Found login form');
        
        await emailInput.fill(TEST_ACCOUNT.email);
        await passwordInput.fill(TEST_ACCOUNT.password);
        console.log('  ✅ Filled credentials');
        
        // Click sign in
        const signInButton = await page.locator('button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Login")').first();
        
        if (await signInButton.isVisible()) {
          await signInButton.click();
          console.log('  ✅ Clicked sign in button');
          
          // Wait for navigation
          await page.waitForTimeout(5000);
          
          const afterLoginUrl = page.url();
          console.log(`\n📍 After login URL: ${afterLoginUrl}`);
          
          if (afterLoginUrl.includes('/dashboard')) {
            console.log('  ✅ Successfully logged in to dashboard!');
            await page.screenshot({ path: 'quick-test-02-dashboard.png' });
          } else if (afterLoginUrl.includes('/organization')) {
            console.log('  ✅ Logged in, on organization page');
            await page.screenshot({ path: 'quick-test-02-organization.png' });
          } else if (afterLoginUrl === startUrl) {
            console.log('  ❌ Login failed - still on auth page');
            
            // Check for error messages
            const errorMessage = await page.locator('text=/error|invalid|incorrect/i').first();
            if (await errorMessage.isVisible()) {
              const errorText = await errorMessage.textContent();
              console.log(`  Error message: ${errorText}`);
            }
          } else {
            console.log('  ℹ️  Navigated to unexpected page');
          }
        } else {
          console.log('  ❌ Sign in button not found');
        }
      } else {
        console.log('  ❌ Login form not visible');
      }
    }
    
    // Test navigation if logged in
    if (!page.url().includes('/auth')) {
      console.log('\n🧭 Testing navigation...');
      
      const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Agents', href: '/agents' },
        { name: 'Conversations', href: '/conversations' },
        { name: 'Leads', href: '/leads' }
      ];
      
      for (const link of navLinks) {
        const element = await page.locator(`a[href="${link.href}"]`).first();
        const isVisible = await element.isVisible().catch(() => false);
        console.log(`  ${isVisible ? '✅' : '❌'} ${link.name} link`);
      }
      
      // Try navigating to agents page
      console.log('\n🤖 Navigating to Agents page...');
      const agentsLink = await page.locator('a[href="/agents"]').first();
      
      if (await agentsLink.isVisible()) {
        await agentsLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('  ✅ On Agents page');
        await page.screenshot({ path: 'quick-test-03-agents.png' });
        
        // Look for agents
        const agentElements = await page.locator('text=/ResidentialBot|CommercialAssist|LuxuryAdvisor|RentalHelper|Agent|Bot/i').count();
        console.log(`  📊 Found ${agentElements} agent-related elements`);
      }
    }
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Test completed. Check screenshots: quick-test-*.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  testQuickLogin()
    .then(() => {
      console.log('\n✅ Quick test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}