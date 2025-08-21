#!/usr/bin/env node

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const TEST_ACCOUNT = {
  email: process.env.TEST_EMAIL || 'marwie.ang.0904@gmail.com',
  password: process.env.TEST_PASSWORD || 'ayokonga123'
};

async function diagnoseAgentsPage() {
  console.log('🔍 DIAGNOSING AGENTS PAGE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    
    // Navigate to dashboard first
    console.log('\n📍 Going to dashboard...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if authenticated
    if (page.url().includes('/auth')) {
      console.log('  Need to login first...');
      // Quick login
      const emailInput = await page.locator('input[type="email"]').first();
      const passwordInput = await page.locator('input[type="password"]').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        await emailInput.fill(TEST_ACCOUNT.email);
        await passwordInput.fill(TEST_ACCOUNT.password);
        await passwordInput.press('Enter');
        await page.waitForTimeout(5000);
      }
    }
    
    // Navigate to agents page
    console.log('\n🤖 Navigating to Agents page...');
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Extra wait for data loading
    
    console.log('  Current URL:', page.url());
    
    // Take screenshot
    await page.screenshot({ path: 'diagnostic-agents-page.png', fullPage: true });
    console.log('  ✅ Screenshot saved: diagnostic-agents-page.png');
    
    // Get all visible text
    const visibleText = await page.locator('body').innerText();
    console.log('\n📝 Page Content Analysis:');
    
    // Check for common agent-related terms
    const agentTerms = ['ResidentialBot', 'CommercialAssist', 'LuxuryAdvisor', 'RentalHelper', 
                        'Agent', 'Bot', 'AI', 'Chat', 'Preview', 'Test'];
    
    for (const term of agentTerms) {
      if (visibleText.includes(term)) {
        console.log(`  ✅ Found: "${term}"`);
      }
    }
    
    // Look for any cards or agent containers
    console.log('\n🔍 Looking for agent elements...');
    
    const selectors = [
      '[class*="agent"]',
      '[class*="card"]',
      '[data-testid*="agent"]',
      'div[role="button"]',
      'button',
      '[class*="grid"] > div',
      'article',
      'section > div'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`  Found ${count} elements matching: ${selector}`);
        
        // Get text from first few elements
        const elements = await page.locator(selector).all();
        for (let i = 0; i < Math.min(3, count); i++) {
          const text = await elements[i].innerText().catch(() => '');
          if (text && text.length < 100) {
            console.log(`    - "${text.replace(/\n/g, ' ').substring(0, 50)}"`);
          }
        }
      }
    }
    
    // Check for "Create Agent" or "Add Agent" button
    console.log('\n🔍 Looking for create/add agent button...');
    const createButtons = await page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').all();
    for (const button of createButtons) {
      const text = await button.innerText();
      console.log(`  Found button: "${text}"`);
    }
    
    // Check if there's a message about no agents
    if (visibleText.includes('No agents') || visibleText.includes('no agents') || 
        visibleText.includes('Create your first') || visibleText.includes('Get started')) {
      console.log('\n⚠️  Page might not have any agents created yet');
      console.log('  Message found suggesting no agents exist');
    }
    
    // Try to find chat preview functionality
    console.log('\n💬 Looking for chat functionality...');
    const chatElements = await page.locator('button:has-text("Chat"), button:has-text("Preview"), button:has-text("Test")').count();
    console.log(`  Found ${chatElements} chat-related buttons`);
    
    await context.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Diagnostic complete. Check screenshot: diagnostic-agents-page.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  diagnoseAgentsPage()
    .then(() => {
      console.log('\n✅ Diagnostic completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}