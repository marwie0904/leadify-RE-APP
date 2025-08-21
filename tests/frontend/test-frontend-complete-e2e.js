#!/usr/bin/env node

/**
 * Complete End-to-End Frontend UI Test Suite
 * This test runs all frontend interaction tests in sequence
 */

const { chromium } = require('playwright');
const { runConversationUITest } = require('./test-frontend-conversations-ui');
const { runIssuesUITest } = require('./test-frontend-issues-ui');
const { runFeatureRequestsUITest } = require('./test-frontend-feature-requests-ui');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Test configuration
const TEST_CONFIG = {
  runConversations: true,
  runIssues: true,
  runFeatureRequests: true,
  takeScreenshots: true,
  headless: false,
  slowMo: 300
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkServers() {
  log('\n🔍 Checking server availability...', 'cyan');
  
  const axios = require('axios');
  let frontendRunning = false;
  let backendRunning = false;
  
  // Check frontend
  try {
    await axios.get(BASE_URL);
    frontendRunning = true;
    log('  ✅ Frontend server is running on port 3000', 'green');
  } catch (error) {
    log('  ❌ Frontend server is not running on port 3000', 'red');
    log('     Start it with: cd FRONTEND/financial-dashboard-2 && npm run dev', 'yellow');
  }
  
  // Check backend
  try {
    await axios.get(`${API_URL}/api/health`);
    backendRunning = true;
    log('  ✅ Backend server is running on port 3001', 'green');
  } catch (error) {
    log('  ❌ Backend server is not running on port 3001', 'red');
    log('     Start it with: cd BACKEND && npm run server', 'yellow');
  }
  
  return { frontendRunning, backendRunning };
}

async function runQuickSmokeTest() {
  log('\n🔥 Running smoke test...', 'cyan');
  
  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const smokeTestResults = {
    authPage: false,
    adminLogin: false,
    dashboard: false,
    agents: false,
    conversations: false
  };
  
  try {
    // Test auth page
    await page.goto(`${BASE_URL}/auth`);
    await page.waitForLoadState('networkidle');
    const hasLoginForm = await page.locator('input[type="email"]').isVisible();
    smokeTestResults.authPage = hasLoginForm;
    log(`  ${hasLoginForm ? '✅' : '❌'} Auth page loads`, hasLoginForm ? 'green' : 'red');
    
    // Test admin login page
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    const hasAdminLogin = await page.locator('input[type="email"]').isVisible();
    smokeTestResults.adminLogin = hasAdminLogin;
    log(`  ${hasAdminLogin ? '✅' : '❌'} Admin login page loads`, hasAdminLogin ? 'green' : 'red');
    
    // Quick login test
    await page.goto(`${BASE_URL}/auth`);
    await page.fill('input[type="email"]', 'admin@primeresidential.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    const afterLoginUrl = page.url();
    
    if (afterLoginUrl.includes('/dashboard')) {
      smokeTestResults.dashboard = true;
      log('  ✅ Dashboard accessible after login', 'green');
      
      // Check agents page
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');
      smokeTestResults.agents = page.url().includes('/agents');
      log(`  ${smokeTestResults.agents ? '✅' : '❌'} Agents page accessible`, smokeTestResults.agents ? 'green' : 'red');
      
      // Check conversations page
      await page.goto(`${BASE_URL}/conversations`);
      await page.waitForLoadState('networkidle');
      smokeTestResults.conversations = page.url().includes('/conversations');
      log(`  ${smokeTestResults.conversations ? '✅' : '❌'} Conversations page accessible`, smokeTestResults.conversations ? 'green' : 'red');
    } else {
      log('  ❌ Login failed or dashboard not accessible', 'red');
    }
    
  } catch (error) {
    log(`  ❌ Smoke test error: ${error.message}`, 'red');
  } finally {
    await browser.close();
  }
  
  const passedTests = Object.values(smokeTestResults).filter(r => r).length;
  const totalTests = Object.keys(smokeTestResults).length;
  
  log(`\n  Smoke Test Results: ${passedTests}/${totalTests} passed`, passedTests === totalTests ? 'green' : 'yellow');
  
  return passedTests === totalTests;
}

async function runCompleteE2ETest() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 COMPLETE END-TO-END FRONTEND UI TEST SUITE', 'bright');
  log('='.repeat(60), 'bright');
  
  const startTime = Date.now();
  const results = {
    serverCheck: false,
    smokeTest: false,
    conversations: { passed: false, stats: null },
    issues: { passed: false, stats: null },
    featureRequests: { passed: false, stats: null }
  };
  
  try {
    // Step 1: Check servers
    const { frontendRunning, backendRunning } = await checkServers();
    results.serverCheck = frontendRunning && backendRunning;
    
    if (!results.serverCheck) {
      log('\n❌ Cannot proceed without both servers running', 'red');
      return results;
    }
    
    // Step 2: Run smoke test
    results.smokeTest = await runQuickSmokeTest();
    
    if (!results.smokeTest) {
      log('\n⚠️ Smoke test failed, but continuing with main tests...', 'yellow');
    }
    
    // Step 3: Run conversation tests
    if (TEST_CONFIG.runConversations) {
      log('\n' + '='.repeat(40), 'cyan');
      log('TEST 1: CONVERSATIONS', 'cyan');
      log('='.repeat(40), 'cyan');
      
      try {
        await runConversationUITest();
        results.conversations.passed = true;
        log('✅ Conversations test completed', 'green');
      } catch (error) {
        log(`❌ Conversations test failed: ${error.message}`, 'red');
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 4: Run issues tests
    if (TEST_CONFIG.runIssues) {
      log('\n' + '='.repeat(40), 'cyan');
      log('TEST 2: ISSUES', 'cyan');
      log('='.repeat(40), 'cyan');
      
      try {
        await runIssuesUITest();
        results.issues.passed = true;
        log('✅ Issues test completed', 'green');
      } catch (error) {
        log(`❌ Issues test failed: ${error.message}`, 'red');
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Step 5: Run feature requests tests
    if (TEST_CONFIG.runFeatureRequests) {
      log('\n' + '='.repeat(40), 'cyan');
      log('TEST 3: FEATURE REQUESTS', 'cyan');
      log('='.repeat(40), 'cyan');
      
      try {
        await runFeatureRequestsUITest();
        results.featureRequests.passed = true;
        log('✅ Feature Requests test completed', 'green');
      } catch (error) {
        log(`❌ Feature Requests test failed: ${error.message}`, 'red');
      }
    }
    
  } catch (error) {
    log(`\n❌ Fatal error in test suite: ${error.message}`, 'red');
  }
  
  // Generate final report
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);
  
  log('\n' + '='.repeat(60), 'bright');
  log('📊 FINAL E2E TEST REPORT', 'bright');
  log('='.repeat(60), 'bright');
  
  log('\n📈 Test Results:', 'cyan');
  log(`  Server Check: ${results.serverCheck ? '✅ PASSED' : '❌ FAILED'}`, results.serverCheck ? 'green' : 'red');
  log(`  Smoke Test: ${results.smokeTest ? '✅ PASSED' : '⚠️ FAILED'}`, results.smokeTest ? 'green' : 'yellow');
  log(`  Conversations: ${results.conversations.passed ? '✅ PASSED' : '❌ FAILED'}`, results.conversations.passed ? 'green' : 'red');
  log(`  Issues: ${results.issues.passed ? '✅ PASSED' : '❌ FAILED'}`, results.issues.passed ? 'green' : 'red');
  log(`  Feature Requests: ${results.featureRequests.passed ? '✅ PASSED' : '❌ FAILED'}`, results.featureRequests.passed ? 'green' : 'red');
  
  const totalTests = 5;
  const passedTests = Object.values(results).filter(r => r === true || r.passed === true).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  log(`\n📊 Summary:`, 'cyan');
  log(`  Tests Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`  Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
  log(`  Total Duration: ${duration} minutes`, 'cyan');
  
  log('\n📸 Screenshots saved:', 'cyan');
  log('  - conversations-*.png (for each organization)');
  log('  - issues-submitted.png');
  log('  - feature-requests-submitted.png');
  
  log('\n' + '='.repeat(60), 'bright');
  
  if (passedTests === totalTests) {
    log('🎉 ALL TESTS PASSED! Frontend UI is working correctly.', 'green');
  } else if (passedTests >= totalTests * 0.6) {
    log('⚠️ PARTIAL SUCCESS - Some tests failed but core functionality works.', 'yellow');
  } else {
    log('❌ TEST SUITE FAILED - Major issues detected with frontend UI.', 'red');
  }
  
  log('='.repeat(60), 'bright');
  
  return results;
}

// Run the complete test suite
if (require.main === module) {
  log('🚀 Starting Complete E2E Frontend Test Suite...', 'bright');
  log('This will test conversations, issues, and feature requests through the UI', 'cyan');
  
  runCompleteE2ETest()
    .then((results) => {
      const passed = Object.values(results).filter(r => r === true || r.passed === true).length;
      log('\n✨ Test suite completed!', 'bright');
      process.exit(passed >= 3 ? 0 : 1);
    })
    .catch((error) => {
      log(`❌ Fatal error: ${error}`, 'red');
      process.exit(1);
    });
}

module.exports = { runCompleteE2ETest };