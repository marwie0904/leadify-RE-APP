#!/usr/bin/env node

/**
 * Final Conversation Creation Test
 * Creates 20 conversations for each of the 4 organizations (80 total)
 * Uses actual user accounts and their AI agents
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Test accounts for each organization with their agents
const ORGANIZATIONS = [
  {
    name: 'Prime Residential Realty',
    email: 'admin@primeresidential.com',
    password: 'TestPassword123!',
    agentId: 'aa96e5dc-cdcb-4bf3-9d9f-f436b0502e72',
    agentName: 'ResidentialBot'
  },
  {
    name: 'Commercial Property Experts',
    email: 'admin@commercialproperty.com',
    password: 'TestPassword123!',
    agentId: '8f29c91b-a45f-4d82-bc8b-9b8a95e4c0e9',
    agentName: 'CommercialAssist'
  },
  {
    name: 'Luxury Estate Partners',
    email: 'admin@luxuryestates.com',
    password: 'TestPassword123!',
    agentId: 'f69ca6d2-3731-4ff9-b322-b2c34e3a9999',
    agentName: 'LuxuryAdvisor'
  },
  {
    name: 'Urban Rental Solutions',
    email: 'admin@urbanrentals.com',
    password: 'TestPassword123!',
    agentId: 'a50e0bf2-c965-4f6f-acef-eb4dde388d33',
    agentName: 'RentalHelper'
  }
];

// Messages for different BANT scores
const CONVERSATION_TEMPLATES = {
  hot: [
    "I need to buy a property immediately. Budget is $800,000 cash. Decision maker here.",
    "Ready to purchase now. Have $1.5M approved financing. Must close within 30 days.",
    "Urgent: Need commercial space ASAP. Budget $2M. Ready to sign this week.",
    "Cash buyer, $600K budget. Need to move in next month. Ready to make offer.",
    "We're expanding and need office space now. $3M budget approved by board."
  ],
  warm: [
    "Looking to buy in Q2. Budget around $500K. Checking what's available.",
    "Interested in investment property. Have about $750K to spend in coming months.",
    "Considering a new home purchase. Budget flexible around $400K.",
    "We might need a larger office. Budget pending but likely $1M range.",
    "Exploring rental properties to purchase. Could invest up to $650K."
  ],
  cold: [
    "Just browsing to see what's available. No immediate plans.",
    "Checking property prices for future reference. Maybe next year.",
    "Window shopping homes. Not ready to buy yet.",
    "Curious about market prices. Just looking around.",
    "Research phase only. Want to understand the market better."
  ],
  questions: [
    "What areas do you recommend for families with children?",
    "Can you tell me about property taxes in this area?",
    "Do you offer virtual property tours?",
    "What's the average price per square foot here?",
    "Are there any upcoming developments in the area?"
  ]
};

async function loginToOrganization(page, org) {
  console.log(`\n🔐 Logging in to ${org.name}...`);
  
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Fill credentials
  await page.fill('input[type="email"]', org.email);
  await page.fill('input[type="password"]', org.password);
  
  // Submit
  await page.click('button:has-text("Sign In")');
  
  // Wait for navigation
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard') || currentUrl.includes('/agents')) {
    console.log('   ✅ Login successful');
    return true;
  }
  
  console.log('   ❌ Login failed');
  return false;
}

async function navigateToAgent(page, org) {
  console.log(`   📍 Navigating to agent: ${org.agentName}...`);
  
  // Go to agents page
  await page.goto(`${BASE_URL}/agents`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Try to find and click on the agent
  const agentCard = page.locator(`text="${org.agentName}"`).first();
  if (await agentCard.isVisible()) {
    await agentCard.click();
    await page.waitForTimeout(2000);
    console.log('      ✅ Agent page opened');
    return true;
  }
  
  // Alternative: Direct navigation
  await page.goto(`${BASE_URL}/agents/${org.agentId}`);
  await page.waitForTimeout(2000);
  console.log('      ✅ Direct navigation to agent');
  return true;
}

async function createConversation(page, message, conversationNumber) {
  console.log(`   💬 Conversation #${conversationNumber}: "${message.substring(0, 40)}..."`);
  
  try {
    // Look for chat input
    const chatInputSelectors = [
      'textarea[placeholder*="Type"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Message"]',
      'input[placeholder*="Type"]',
      'input[placeholder*="message"]',
      'textarea'
    ];
    
    let inputField = null;
    for (const selector of chatInputSelectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible()) {
        inputField = field;
        break;
      }
    }
    
    if (!inputField) {
      console.log('      ❌ No chat input found');
      return false;
    }
    
    // Clear and type message
    await inputField.clear();
    await inputField.fill(message);
    
    // Send message (try Enter first, then button)
    await inputField.press('Enter');
    
    // Alternative: Click send button
    const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    }
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    console.log('      ✅ Message sent');
    return true;
    
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
    return false;
  }
}

async function createConversationsForOrganization(browser, org) {
  console.log('\n' + '='.repeat(60));
  console.log(`🏢 Organization: ${org.name}`);
  console.log('='.repeat(60));
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const stats = {
    attempted: 0,
    successful: 0,
    failed: 0
  };
  
  try {
    // Login
    const loginSuccess = await loginToOrganization(page, org);
    if (!loginSuccess) {
      console.log('   Skipping organization due to login failure');
      await context.close();
      return stats;
    }
    
    // Navigate to agent
    await navigateToAgent(page, org);
    
    // Create 20 conversations (5 of each type)
    let conversationCount = 0;
    
    for (const [type, messages] of Object.entries(CONVERSATION_TEMPLATES)) {
      console.log(`\n   📊 Creating ${type.toUpperCase()} conversations...`);
      
      for (let i = 0; i < 5; i++) {
        conversationCount++;
        stats.attempted++;
        
        const message = messages[i % messages.length];
        const success = await createConversation(page, message, conversationCount);
        
        if (success) {
          stats.successful++;
        } else {
          stats.failed++;
        }
        
        // Small delay between messages
        await page.waitForTimeout(2000);
        
        // Refresh page every 5 conversations to start fresh
        if (conversationCount % 5 === 0) {
          await page.reload();
          await page.waitForTimeout(3000);
        }
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: `conversations-${org.name.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true 
    });
    console.log(`\n   📸 Screenshot saved`);
    
  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`);
  } finally {
    await context.close();
  }
  
  // Report for this organization
  console.log(`\n   📊 Results for ${org.name}:`);
  console.log(`      Attempted: ${stats.attempted}`);
  console.log(`      Successful: ${stats.successful}`);
  console.log(`      Failed: ${stats.failed}`);
  if (stats.attempted > 0) {
    const successRate = ((stats.successful / stats.attempted) * 100).toFixed(1);
    console.log(`      Success Rate: ${successRate}%`);
  }
  
  return stats;
}

async function runTest() {
  console.log('🚀 FINAL CONVERSATION CREATION TEST');
  console.log('=====================================');
  console.log('Creating 20 conversations per organization (80 total)');
  console.log('This will test token tracking across all organizations\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });
  
  const globalStats = {
    totalOrganizations: 0,
    totalAttempted: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    byOrganization: {}
  };
  
  try {
    for (const org of ORGANIZATIONS) {
      globalStats.totalOrganizations++;
      
      const orgStats = await createConversationsForOrganization(browser, org);
      
      globalStats.totalAttempted += orgStats.attempted;
      globalStats.totalSuccessful += orgStats.successful;
      globalStats.totalFailed += orgStats.failed;
      globalStats.byOrganization[org.name] = orgStats;
      
      // Break between organizations
      console.log('\n⏳ Waiting before next organization...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
  } finally {
    await browser.close();
  }
  
  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 Overall Statistics:');
  console.log(`   Organizations Tested: ${globalStats.totalOrganizations}`);
  console.log(`   Total Conversations Attempted: ${globalStats.totalAttempted}`);
  console.log(`   Total Successful: ${globalStats.totalSuccessful}`);
  console.log(`   Total Failed: ${globalStats.totalFailed}`);
  
  if (globalStats.totalAttempted > 0) {
    const overallSuccessRate = ((globalStats.totalSuccessful / globalStats.totalAttempted) * 100).toFixed(1);
    console.log(`   Overall Success Rate: ${overallSuccessRate}%`);
  }
  
  console.log('\n📊 By Organization:');
  for (const [orgName, stats] of Object.entries(globalStats.byOrganization)) {
    const successRate = stats.attempted > 0 
      ? ((stats.successful / stats.attempted) * 100).toFixed(1)
      : '0.0';
    console.log(`   ${orgName}: ${stats.successful}/${stats.attempted} (${successRate}%)`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Final verdict
  const targetConversations = 80;
  const successPercentage = (globalStats.totalSuccessful / targetConversations) * 100;
  
  if (globalStats.totalSuccessful >= targetConversations * 0.8) {
    console.log(`✅ TEST PASSED! Created ${globalStats.totalSuccessful}/${targetConversations} conversations`);
  } else if (globalStats.totalSuccessful >= targetConversations * 0.5) {
    console.log(`⚠️ TEST PARTIALLY PASSED. Created ${globalStats.totalSuccessful}/${targetConversations} conversations`);
  } else {
    console.log(`❌ TEST FAILED. Only created ${globalStats.totalSuccessful}/${targetConversations} conversations`);
  }
  
  console.log('='.repeat(60));
  console.log('\n✨ Test completed!');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});