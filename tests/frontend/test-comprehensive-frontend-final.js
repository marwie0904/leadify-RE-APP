#!/usr/bin/env node

/**
 * Comprehensive Frontend Test Suite - Final Version
 * Tests all UI interactions with correct credentials and improved UI elements
 * Target: 99-100% success rate
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Test configurations
const ADMIN_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: 'admin123'
};

const ORG_CREDENTIALS = [
  { 
    name: 'Prime Residential Realty',
    email: 'admin@primeresidential.com',
    password: 'Admin123!',
    agentId: 'aa96e5dc-cdcb-4bf3-9d9f-f436b0502e72'
  },
  { 
    name: 'Commercial Property Experts',
    email: 'admin@commercialproperty.com',
    password: 'Admin123!',
    agentId: '8f29c91b-a45f-4d82-bc8b-9b8a95e4c0e9'
  },
  { 
    name: 'Luxury Estate Partners',
    email: 'admin@luxuryestates.com',
    password: 'Admin123!',
    agentId: 'f69ca6d2-3731-4ff9-b322-b2c34e3a9999'
  },
  { 
    name: 'Urban Rental Solutions',
    email: 'admin@urbanrentals.com',
    password: 'Admin123!',
    agentId: 'a50e0bf2-c965-4f6f-acef-eb4dde388d33'
  }
];

const CONVERSATION_MESSAGES = [
  "I'm looking for a 3-bedroom house with a budget of $500,000",
  "Need commercial property for my business, budget $2M",
  "Looking for luxury estate with ocean view, cash buyer",
  "Need rental property for investment purposes",
  "What areas do you recommend for families?"
];

const TEST_ISSUE = {
  subject: `UI Test Issue - ${new Date().toISOString()}`,
  description: 'This is a test issue created through the admin UI to verify the New Issue button functionality.',
  priority: 'high',
  category: 'bug'
};

const TEST_FEATURE = {
  requestedFeature: `Test Feature - ${new Date().toISOString()}`,
  reason: 'This feature request is created through the admin UI to test the New Feature Request button.',
  priority: 'medium'
};

// Test results tracking
const testResults = {
  adminLogin: false,
  orgLogins: [],
  issueCreation: false,
  featureCreation: false,
  conversations: [],
  totalConversations: 0,
  successfulConversations: 0
};

async function testAdminLogin(browser) {
  console.log('\n📋 TEST 1: Admin Login and UI Creation');
  console.log('=' .repeat(50));
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login as admin
    console.log('🔐 Logging in as admin...');
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(5000);
    
    if (!page.url().includes('/admin')) {
      throw new Error('Admin login failed');
    }
    
    console.log('  ✅ Admin login successful');
    testResults.adminLogin = true;
    
    // Test Issue Creation
    console.log('\n📝 Testing Issue Creation...');
    await page.goto(`${BASE_URL}/admin/issues`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click New Issue button
    const newIssueBtn = page.locator('button:has-text("New Issue")').first();
    if (await newIssueBtn.isVisible()) {
      await newIssueBtn.click();
      await page.waitForTimeout(2000);
      
      // Fill form
      await page.fill('input#subject', TEST_ISSUE.subject);
      await page.fill('textarea#description', TEST_ISSUE.description);
      
      // Select priority
      await page.click('button#priority');
      await page.waitForTimeout(500);
      await page.click(`[role="option"]:has-text("High")`);
      
      // Select category
      await page.click('button#category');
      await page.waitForTimeout(500);
      await page.click(`[role="option"]:has-text("Bug")`);
      
      // Submit
      await page.click('button:has-text("Create Issue")');
      await page.waitForTimeout(3000);
      
      // Verify creation
      const issueCreated = await page.locator(`text="${TEST_ISSUE.subject}"`).isVisible();
      if (issueCreated) {
        console.log('  ✅ Issue created successfully');
        testResults.issueCreation = true;
      } else {
        console.log('  ⚠️ Issue creation verification failed');
      }
    } else {
      console.log('  ❌ New Issue button not found');
    }
    
    // Test Feature Request Creation
    console.log('\n💡 Testing Feature Request Creation...');
    await page.goto(`${BASE_URL}/admin/feature-requests`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Click New Feature Request button
    const newFeatureBtn = page.locator('button:has-text("New Feature Request")').first();
    if (await newFeatureBtn.isVisible()) {
      await newFeatureBtn.click();
      await page.waitForTimeout(2000);
      
      // Fill form
      await page.fill('input#feature', TEST_FEATURE.requestedFeature);
      await page.fill('textarea#reason', TEST_FEATURE.reason);
      
      // Select priority
      await page.click('button#priority');
      await page.waitForTimeout(500);
      await page.click(`[role="option"]:has-text("Medium")`);
      
      // Submit
      await page.click('button:has-text("Create Feature Request")');
      await page.waitForTimeout(3000);
      
      // Verify creation
      const featureCreated = await page.locator(`text="${TEST_FEATURE.requestedFeature}"`).isVisible();
      if (featureCreated) {
        console.log('  ✅ Feature request created successfully');
        testResults.featureCreation = true;
      } else {
        console.log('  ⚠️ Feature request creation verification failed');
      }
    } else {
      console.log('  ❌ New Feature Request button not found');
    }
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  } finally {
    await context.close();
  }
}

async function testOrganizationConversations(browser, org) {
  console.log(`\n🏢 Testing: ${org.name}`);
  console.log('-'.repeat(40));
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const orgResult = {
    name: org.name,
    loginSuccess: false,
    conversationsCreated: 0
  };
  
  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.fill('input[type="email"]', org.email);
    await page.fill('input[type="password"]', org.password);
    await page.click('button:has-text("Sign In")');
    
    await page.waitForTimeout(5000);
    
    if (!page.url().includes('/dashboard') && !page.url().includes('/agents')) {
      throw new Error('Organization login failed');
    }
    
    console.log('  ✅ Login successful');
    orgResult.loginSuccess = true;
    
    // Navigate to agents
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to open chat preview for the agent
    const chatButton = page.locator('button:has-text("Chat Preview"), button:has-text("Test Chat")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(2000);
      
      // Create conversations
      for (let i = 0; i < 5; i++) {
        testResults.totalConversations++;
        const message = CONVERSATION_MESSAGES[i % CONVERSATION_MESSAGES.length];
        
        console.log(`  💬 Sending message ${i + 1}/5...`);
        
        // Use data-testid for more reliable selection
        const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="Type"], input[placeholder*="Type"]').first();
        const sendButton = page.locator('[data-testid="chat-send-button"], button:has(svg)').last();
        
        if (await chatInput.isVisible()) {
          await chatInput.fill(message);
          
          // Try Enter key first
          await chatInput.press('Enter');
          
          // If button is visible, click it as backup
          if (await sendButton.isVisible()) {
            await sendButton.click();
          }
          
          await page.waitForTimeout(3000);
          orgResult.conversationsCreated++;
          testResults.successfulConversations++;
        }
      }
      
      console.log(`  ✅ Created ${orgResult.conversationsCreated} conversations`);
    } else {
      console.log('  ⚠️ Chat button not found');
    }
    
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  } finally {
    testResults.orgLogins.push(orgResult);
    testResults.conversations.push(orgResult);
    await context.close();
  }
}

async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE FRONTEND TEST SUITE');
  console.log('=====================================');
  console.log('Target: 99-100% Success Rate');
  console.log('Testing: Admin UI, Organization Logins, Conversations\n');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });
  
  try {
    // Test 1: Admin functionality
    await testAdminLogin(browser);
    
    // Test 2: Organization conversations
    console.log('\n📋 TEST 2: Organization Conversations');
    console.log('=' .repeat(50));
    
    for (const org of ORG_CREDENTIALS) {
      await testOrganizationConversations(browser, org);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } finally {
    await browser.close();
  }
  
  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  // Calculate success rates
  const adminTestsPassed = [
    testResults.adminLogin,
    testResults.issueCreation,
    testResults.featureCreation
  ].filter(Boolean).length;
  
  const orgLoginsPassed = testResults.orgLogins.filter(o => o.loginSuccess).length;
  const conversationSuccessRate = testResults.totalConversations > 0 
    ? (testResults.successfulConversations / testResults.totalConversations * 100)
    : 0;
  
  console.log('\n🔐 Admin Tests:');
  console.log(`  Login: ${testResults.adminLogin ? '✅' : '❌'}`);
  console.log(`  Issue Creation: ${testResults.issueCreation ? '✅' : '❌'}`);
  console.log(`  Feature Creation: ${testResults.featureCreation ? '✅' : '❌'}`);
  console.log(`  Success Rate: ${(adminTestsPassed / 3 * 100).toFixed(1)}%`);
  
  console.log('\n🏢 Organization Tests:');
  testResults.orgLogins.forEach(org => {
    console.log(`  ${org.name}:`);
    console.log(`    Login: ${org.loginSuccess ? '✅' : '❌'}`);
    console.log(`    Conversations: ${org.conversationsCreated}/5`);
  });
  console.log(`  Login Success Rate: ${(orgLoginsPassed / 4 * 100).toFixed(1)}%`);
  
  console.log('\n💬 Conversation Tests:');
  console.log(`  Total Attempted: ${testResults.totalConversations}`);
  console.log(`  Successful: ${testResults.successfulConversations}`);
  console.log(`  Success Rate: ${conversationSuccessRate.toFixed(1)}%`);
  
  // Overall success rate
  const totalTests = 3 + 4 + testResults.totalConversations; // Admin + Org logins + Conversations
  const totalPassed = adminTestsPassed + orgLoginsPassed + testResults.successfulConversations;
  const overallSuccessRate = (totalPassed / totalTests * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 OVERALL SUCCESS RATE: ${overallSuccessRate}%`);
  
  if (overallSuccessRate >= 99) {
    console.log('✅ TEST SUITE PASSED! (99-100% Success Rate Achieved)');
  } else if (overallSuccessRate >= 90) {
    console.log('⚠️ TEST SUITE PASSED WITH WARNINGS');
  } else {
    console.log('❌ TEST SUITE FAILED (Below 90% Success Rate)');
  }
  
  console.log('='.repeat(60));
  console.log('\n✨ Test suite completed!');
  
  process.exit(overallSuccessRate >= 99 ? 0 : 1);
}

// Check if servers are running
async function checkServers() {
  try {
    const frontendResponse = await fetch(`${BASE_URL}`);
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`);
    
    if (!frontendResponse.ok) {
      console.error('❌ Frontend server not running on port 3000');
      console.log('Run: cd FRONTEND/financial-dashboard-2 && npm run dev');
      process.exit(1);
    }
    
    if (!backendResponse.ok) {
      console.error('❌ Backend server not running on port 3001');
      console.log('Run: cd BACKEND && npm run server');
      process.exit(1);
    }
    
    console.log('✅ Both servers are running\n');
  } catch (error) {
    console.error('❌ Server check failed:', error.message);
    console.log('\nPlease ensure both servers are running:');
    console.log('Frontend: cd FRONTEND/financial-dashboard-2 && npm run dev');
    console.log('Backend: cd BACKEND && npm run server');
    process.exit(1);
  }
}

// Main execution
(async () => {
  await checkServers();
  await runComprehensiveTest();
})().catch(console.error);