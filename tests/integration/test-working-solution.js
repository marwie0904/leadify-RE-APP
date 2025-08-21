#!/usr/bin/env node

const { chromium } = require('playwright');
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Use test account from .env
const TEST_ACCOUNT = {
  email: process.env.TEST_EMAIL || 'marwie.ang.0904@gmail.com',
  password: process.env.TEST_PASSWORD || 'ayokonga123'
};

async function testWorkingFlow() {
  console.log('🎭 TESTING REAL ESTATE AI AGENT');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    // Create a fresh context (no cookies/session)
    console.log('\n📱 Creating fresh browser context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Go directly to dashboard to check if we need to login
    console.log('\n🏠 Navigating to dashboard...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);
    
    // Check if we're redirected to auth (need to login)
    if (currentUrl.includes('/auth')) {
      console.log('  📝 Redirected to auth page - need to login');
      
      // Wait for page to fully load
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'working-01-auth.png' });
      
      // Try to find the sign in tab if there are tabs
      const signInTab = await page.getByRole('tab', { name: /sign in/i }).first();
      if (await signInTab.isVisible().catch(() => false)) {
        await signInTab.click();
        console.log('  ✅ Clicked Sign In tab');
        await page.waitForTimeout(1000);
      }
      
      // Try multiple methods to find inputs
      console.log('\n🔍 Looking for login form...');
      
      // Method 1: By placeholder
      let emailInput = await page.getByPlaceholder(/email/i).first();
      let passwordInput = await page.getByPlaceholder(/password/i).first();
      
      // Method 2: By type
      if (!await emailInput.isVisible().catch(() => false)) {
        emailInput = await page.locator('input[type="email"]').first();
      }
      if (!await passwordInput.isVisible().catch(() => false)) {
        passwordInput = await page.locator('input[type="password"]').first();
      }
      
      // Method 3: By label
      if (!await emailInput.isVisible().catch(() => false)) {
        emailInput = await page.getByLabel(/email/i).first();
      }
      if (!await passwordInput.isVisible().catch(() => false)) {
        passwordInput = await page.getByLabel(/password/i).first();
      }
      
      // Check if we found inputs
      const emailVisible = await emailInput.isVisible().catch(() => false);
      const passwordVisible = await passwordInput.isVisible().catch(() => false);
      
      console.log(`  Email input visible: ${emailVisible}`);
      console.log(`  Password input visible: ${passwordVisible}`);
      
      if (emailVisible && passwordVisible) {
        console.log('\n🔐 Logging in...');
        await emailInput.fill(TEST_ACCOUNT.email);
        await passwordInput.fill(TEST_ACCOUNT.password);
        console.log(`  ✅ Filled credentials`);
        
        // Find and click submit
        const submitButton = await page.getByRole('button', { name: /sign in|login/i }).first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          console.log('  ✅ Clicked submit button');
        } else {
          await passwordInput.press('Enter');
          console.log('  ✅ Pressed Enter to submit');
        }
        
        // Wait for navigation
        await page.waitForTimeout(5000);
        
        const afterLoginUrl = page.url();
        console.log(`  After login URL: ${afterLoginUrl}`);
        
        if (!afterLoginUrl.includes('/auth')) {
          console.log('  ✅ Successfully logged in!');
        } else {
          console.log('  ❌ Login failed - still on auth page');
          await page.screenshot({ path: 'working-02-login-failed.png' });
        }
      } else {
        console.log('  ❌ Could not find login form');
        console.log('\n  🔄 Trying to inspect page structure...');
        
        // Get all visible text on page
        const visibleText = await page.locator('body').innerText();
        console.log('  Visible text includes:');
        if (visibleText.includes('Sign')) console.log('    - "Sign" text found');
        if (visibleText.includes('Email')) console.log('    - "Email" text found');
        if (visibleText.includes('Password')) console.log('    - "Password" text found');
        
        // Count input elements
        const inputCount = await page.locator('input').count();
        console.log(`  Total input elements: ${inputCount}`);
        
        // Check for forms
        const formCount = await page.locator('form').count();
        console.log(`  Total form elements: ${formCount}`);
      }
    } else if (currentUrl.includes('/dashboard') || currentUrl.includes('/organization')) {
      console.log('  ✅ Already on dashboard/organization - authenticated!');
      await page.screenshot({ path: 'working-01-dashboard.png' });
    }
    
    // If we're logged in, test navigation
    if (!page.url().includes('/auth')) {
      console.log('\n🧭 Testing Navigation...');
      
      // Try to find sidebar or navigation
      const navSelectors = [
        'nav',
        '[role="navigation"]',
        '[class*="sidebar"]',
        '[class*="nav"]',
        'aside'
      ];
      
      for (const selector of navSelectors) {
        const nav = await page.locator(selector).first();
        if (await nav.isVisible().catch(() => false)) {
          console.log(`  ✅ Found navigation element: ${selector}`);
          
          // Look for links within navigation
          const links = await nav.locator('a').all();
          console.log(`  Found ${links.length} links in navigation`);
          
          for (const link of links.slice(0, 5)) {
            const text = await link.innerText().catch(() => '');
            const href = await link.getAttribute('href').catch(() => '');
            if (text) {
              console.log(`    - ${text} (${href})`);
            }
          }
          break;
        }
      }
      
      // Try to navigate to Agents page
      console.log('\n🤖 Navigating to Agents page...');
      
      // Try multiple ways to find agents link
      const agentLinkSelectors = [
        'a:has-text("Agents")',
        'a:has-text("AI Agents")',
        'a[href="/agents"]',
        'a[href*="agent"]'
      ];
      
      let foundAgentsLink = false;
      for (const selector of agentLinkSelectors) {
        const link = await page.locator(selector).first();
        if (await link.isVisible().catch(() => false)) {
          await link.click();
          console.log(`  ✅ Clicked agents link: ${selector}`);
          foundAgentsLink = true;
          break;
        }
      }
      
      if (!foundAgentsLink) {
        // Try direct navigation
        console.log('  📍 Navigating directly to /agents...');
        await page.goto(`${BASE_URL}/agents`);
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const agentsUrl = page.url();
      console.log(`  Current URL: ${agentsUrl}`);
      
      if (agentsUrl.includes('/agents')) {
        console.log('  ✅ On Agents page');
        await page.screenshot({ path: 'working-02-agents.png' });
        
        // Look for agent elements
        const agentText = await page.locator('body').innerText();
        if (agentText.includes('ResidentialBot')) console.log('    ✅ Found ResidentialBot');
        if (agentText.includes('CommercialAssist')) console.log('    ✅ Found CommercialAssist');
        if (agentText.includes('LuxuryAdvisor')) console.log('    ✅ Found LuxuryAdvisor');
        if (agentText.includes('RentalHelper')) console.log('    ✅ Found RentalHelper');
        
        // Look for chat preview button
        const chatButtonSelectors = [
          'button:has-text("Chat")',
          'button:has-text("Preview")',
          'button:has-text("Test")',
          'button[aria-label*="chat"]'
        ];
        
        for (const selector of chatButtonSelectors) {
          const button = await page.locator(selector).first();
          if (await button.isVisible().catch(() => false)) {
            console.log(`    ✅ Found chat button: ${selector}`);
            
            // Click it to test
            await button.click();
            console.log('    ✅ Clicked chat button');
            await page.waitForTimeout(3000);
            
            // Check if chat opened
            const chatInput = await page.locator('textarea, input[placeholder*="message"]').first();
            if (await chatInput.isVisible()) {
              console.log('    ✅ Chat interface opened!');
              
              // Send a test message
              await chatInput.fill("Hello, I'm interested in buying a property");
              console.log('    ✅ Typed test message');
              
              // Send it
              const sendButton = await page.locator('button:has-text("Send")').first();
              if (await sendButton.isVisible()) {
                await sendButton.click();
              } else {
                await chatInput.press('Enter');
              }
              console.log('    ✅ Sent message');
              
              await page.waitForTimeout(3000);
              await page.screenshot({ path: 'working-03-chat.png' });
            }
            
            break;
          }
        }
      }
      
      // Test Conversations page
      console.log('\n📜 Testing Conversations page...');
      await page.goto(`${BASE_URL}/conversations`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      if (page.url().includes('/conversations')) {
        console.log('  ✅ On Conversations page');
        await page.screenshot({ path: 'working-04-conversations.png' });
        
        const convText = await page.locator('body').innerText();
        if (convText.includes('interested in buying')) {
          console.log('    ✅ Found our test conversation!');
        }
      }
    }
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ TEST COMPLETED');
  console.log('Check screenshots: working-*.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  testWorkingFlow()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}