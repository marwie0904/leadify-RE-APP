#!/usr/bin/env node

/**
 * Comprehensive Real Backend Test Suite
 * Tests all organization detail pages with real backend data
 * Run after applying database migrations and populating test data
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Test organization ID
const TEST_ORG_ID = '9a24d180-a1fe-4d22-91e2-066d55679888';
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test configuration
const testConfig = {
  timeout: 30000,
  retries: 3,
  headless: true,
  slowMo: 100
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  orgId: TEST_ORG_ID,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    successRate: 0
  }
};

async function setupAuthentication(page) {
  console.log('🔐 Setting up authentication...');
  
  // Navigate to the app first to establish context
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
  
  // Create admin user and token for testing
  const adminUser = {
    id: 'admin-test-user',
    email: 'admin@realestate.ai',
    name: 'Admin User',
    role: 'admin'
  };
  
  const adminToken = 'test-admin-token-' + Date.now();
  
  // Set authentication in localStorage
  await page.evaluate(({ user, token }) => {
    localStorage.setItem('admin_user', JSON.stringify(user));
    localStorage.setItem('admin_token', token);
    localStorage.setItem('test_mode', 'false'); // Use real backend
    console.log('[Test] Authentication configured for real backend');
  }, { user: adminUser, token: adminToken });
  
  console.log('✅ Authentication configured\n');
}

async function testOrganizationsPage(page) {
  console.log('📋 Testing Organizations List Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if organization data loads
    const orgCards = await page.$$('.bg-white.rounded-lg.shadow');
    tests.push({
      name: 'Organizations load from backend',
      passed: orgCards.length > 0,
      details: `Found ${orgCards.length} organization(s)`
    });
    
    // Test 2: Check for real organization data
    const hasRealData = await page.evaluate(() => {
      const cards = document.querySelectorAll('.bg-white.rounded-lg.shadow');
      let realDataCount = 0;
      cards.forEach(card => {
        const name = card.querySelector('h3')?.textContent || '';
        if (name && name !== 'Loading...' && name !== 'Error') {
          realDataCount++;
        }
      });
      return realDataCount;
    });
    
    tests.push({
      name: 'Organization cards display real data',
      passed: hasRealData > 0,
      details: `${hasRealData} cards with real data`
    });
    
  } catch (error) {
    tests.push({
      name: 'Organizations page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Organizations List', tests };
}

async function testAnalyticsPage(page) {
  console.log('📊 Testing Analytics Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if analytics components load
    const analyticsSection = await page.$('.space-y-6');
    tests.push({
      name: 'Analytics page loads',
      passed: analyticsSection !== null,
      details: 'Analytics components rendered'
    });
    
    // Test 2: Check for token usage data
    const tokenData = await page.evaluate(() => {
      const charts = document.querySelectorAll('.recharts-wrapper');
      const titles = Array.from(document.querySelectorAll('h3')).map(h => h.textContent);
      return {
        charts: charts.length,
        hasTokenUsage: titles.some(t => t?.includes('Token Usage'))
      };
    });
    
    tests.push({
      name: 'Token usage graphs display',
      passed: tokenData.hasTokenUsage,
      details: `${tokenData.charts} charts found`
    });
    
    // Test 3: Check for monthly conversation trends
    const conversationTrends = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h3'));
      return titles.some(t => t?.textContent?.includes('Monthly Conversations'));
    });
    
    tests.push({
      name: 'Monthly conversation trends display',
      passed: conversationTrends,
      details: conversationTrends ? 'Chart present' : 'Chart missing'
    });
    
  } catch (error) {
    tests.push({
      name: 'Analytics page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Analytics Dashboard', tests };
}

async function testConversationsPage(page) {
  console.log('💬 Testing Conversations Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/conversations`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if conversations table loads
    const table = await page.$('table');
    tests.push({
      name: 'Conversations table loads',
      passed: table !== null,
      details: 'Table element present'
    });
    
    // Test 2: Check for conversation data
    const conversationData = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      const emails = document.querySelectorAll('td:nth-child(2)');
      const costs = document.querySelectorAll('td:nth-child(5)');
      return {
        rows: rows.length,
        emails: Array.from(emails).filter(e => e.textContent.includes('@')).length,
        costs: Array.from(costs).filter(c => c.textContent.includes('$')).length
      };
    });
    
    tests.push({
      name: 'Conversation data displays',
      passed: conversationData.rows > 0,
      details: `${conversationData.rows} conversations, ${conversationData.emails} emails, ${conversationData.costs} costs`
    });
    
    // Test 3: Check for message dropdown functionality
    if (conversationData.rows > 0) {
      const hasDropdown = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).some(b => b.textContent?.includes('View Messages'));
      });
      
      tests.push({
        name: 'Message dropdown available',
        passed: hasDropdown,
        details: hasDropdown ? 'Dropdown buttons present' : 'No dropdown buttons'
      });
    }
    
  } catch (error) {
    tests.push({
      name: 'Conversations page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Conversations', tests };
}

async function testLeadsPage(page) {
  console.log('🎯 Testing Leads Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/leads`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if leads table loads
    const table = await page.$('table');
    tests.push({
      name: 'Leads table loads',
      passed: table !== null,
      details: 'Table element present'
    });
    
    // Test 2: Check for lead data with BANT scores
    const leadData = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      const scores = document.querySelectorAll('td:nth-child(3)');
      const statuses = document.querySelectorAll('td:nth-child(4) span');
      return {
        rows: rows.length,
        scores: Array.from(scores).filter(s => parseInt(s.textContent) > 0).length,
        statuses: Array.from(statuses).filter(s => ['Hot', 'Warm', 'Cold'].includes(s.textContent)).length
      };
    });
    
    tests.push({
      name: 'Lead data with BANT scores displays',
      passed: leadData.rows > 0 && leadData.scores > 0,
      details: `${leadData.rows} leads, ${leadData.scores} scores, ${leadData.statuses} statuses`
    });
    
    // Test 3: Check for BANT details dropdown
    if (leadData.rows > 0) {
      const hasBANTDropdown = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        return Array.from(buttons).some(b => b.textContent?.includes('BANT'));
      });
      
      tests.push({
        name: 'BANT details dropdown available',
        passed: hasBANTDropdown,
        details: hasBANTDropdown ? 'BANT buttons present' : 'No BANT buttons'
      });
    }
    
  } catch (error) {
    tests.push({
      name: 'Leads page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Leads Management', tests };
}

async function testMembersPage(page) {
  console.log('👥 Testing Members Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/members`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if members table loads
    const table = await page.$('table');
    tests.push({
      name: 'Members table loads',
      passed: table !== null,
      details: 'Table element present'
    });
    
    // Test 2: Check for member data
    const memberData = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      const emails = document.querySelectorAll('td:nth-child(2)');
      const roles = document.querySelectorAll('td:nth-child(3) span');
      return {
        rows: rows.length,
        emails: Array.from(emails).filter(e => e.textContent.includes('@')).length,
        roles: Array.from(roles).filter(r => ['Admin', 'Member', 'Viewer'].includes(r.textContent)).length
      };
    });
    
    tests.push({
      name: 'Member data displays',
      passed: memberData.rows > 0,
      details: `${memberData.rows} members, ${memberData.emails} emails, ${memberData.roles} roles`
    });
    
    // Test 3: Check for action buttons
    if (memberData.rows > 0) {
      const hasActions = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const hasEdit = Array.from(buttons).some(b => b.textContent?.includes('Edit'));
        const hasKick = Array.from(buttons).some(b => b.textContent?.includes('Remove'));
        return { hasEdit, hasKick };
      });
      
      tests.push({
        name: 'Member action buttons available',
        passed: hasActions.hasEdit || hasActions.hasKick,
        details: `Edit: ${hasActions.hasEdit}, Remove: ${hasActions.hasKick}`
      });
    }
    
  } catch (error) {
    tests.push({
      name: 'Members page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Organization Members', tests };
}

async function testAIDetailsPage(page) {
  console.log('🤖 Testing AI Details Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/ai-details`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if AI agents load
    const agentCards = await page.$$('.bg-white.rounded-lg.shadow-sm');
    tests.push({
      name: 'AI agents load',
      passed: agentCards.length > 0,
      details: `${agentCards.length} agent(s) found`
    });
    
    // Test 2: Check for BANT configuration display
    const bantConfig = await page.evaluate(() => {
      const configSections = document.querySelectorAll('.space-y-2');
      const hasWeights = Array.from(document.querySelectorAll('div')).some(d => 
        d.textContent?.includes('Budget Weight') || d.textContent?.includes('Authority Weight')
      );
      const hasThresholds = Array.from(document.querySelectorAll('div')).some(d => 
        d.textContent?.includes('Hot Threshold') || d.textContent?.includes('Qualification Threshold')
      );
      return { sections: configSections.length, hasWeights, hasThresholds };
    });
    
    tests.push({
      name: 'BANT configuration displays',
      passed: bantConfig.hasWeights || bantConfig.hasThresholds,
      details: `Weights: ${bantConfig.hasWeights}, Thresholds: ${bantConfig.hasThresholds}`
    });
    
    // Test 3: Check for agent details
    const agentDetails = await page.evaluate(() => {
      const names = document.querySelectorAll('h3');
      const statuses = document.querySelectorAll('.bg-green-100, .bg-gray-100');
      return {
        names: Array.from(names).filter(n => n.textContent && n.textContent !== 'Loading').length,
        statuses: statuses.length
      };
    });
    
    tests.push({
      name: 'Agent details display',
      passed: agentDetails.names > 0,
      details: `${agentDetails.names} agents with names, ${agentDetails.statuses} status indicators`
    });
    
  } catch (error) {
    tests.push({
      name: 'AI Details page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'AI Agent Details', tests };
}

async function testIssuesPage(page) {
  console.log('🐛 Testing Issues & Features Page...');
  const tests = [];
  
  try {
    await page.goto(`${BASE_URL}/admin/organizations/${TEST_ORG_ID}/issues`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Test 1: Check if issues section loads
    const issuesSection = await page.$('#issues-section');
    tests.push({
      name: 'Issues section loads',
      passed: issuesSection !== null,
      details: 'Issues section present'
    });
    
    // Test 2: Check if features section loads
    const featuresSection = await page.$('#features-section');
    tests.push({
      name: 'Features section loads',
      passed: featuresSection !== null,
      details: 'Features section present'
    });
    
    // Test 3: Check for issue/feature data
    const issueData = await page.evaluate(() => {
      const issueItems = document.querySelectorAll('#issues-section .border-l-4');
      const featureItems = document.querySelectorAll('#features-section .border-l-4');
      const priorities = document.querySelectorAll('.bg-red-100, .bg-yellow-100, .bg-blue-100');
      const statuses = document.querySelectorAll('.bg-green-100, .bg-yellow-100, .bg-gray-100');
      return {
        issues: issueItems.length,
        features: featureItems.length,
        priorities: priorities.length,
        statuses: statuses.length
      };
    });
    
    tests.push({
      name: 'Issue and feature data displays',
      passed: (issueData.issues + issueData.features) > 0,
      details: `${issueData.issues} issues, ${issueData.features} features`
    });
    
  } catch (error) {
    tests.push({
      name: 'Issues page loads',
      passed: false,
      details: error.message
    });
  }
  
  return { name: 'Issues & Features', tests };
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Real Backend Tests');
  console.log('=' .repeat(60));
  console.log(`Organization ID: ${TEST_ORG_ID}`);
  console.log(`Frontend URL: ${BASE_URL}`);
  console.log(`Backend URL: ${API_URL}`);
  console.log('=' .repeat(60) + '\n');
  
  const browser = await chromium.launch({
    headless: testConfig.headless,
    slowMo: testConfig.slowMo
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Setup authentication
    await setupAuthentication(page);
    
    // Run all tests
    const testResults = [];
    
    testResults.push(await testOrganizationsPage(page));
    testResults.push(await testAnalyticsPage(page));
    testResults.push(await testConversationsPage(page));
    testResults.push(await testLeadsPage(page));
    testResults.push(await testMembersPage(page));
    testResults.push(await testAIDetailsPage(page));
    testResults.push(await testIssuesPage(page));
    
    // Calculate summary
    let totalTests = 0;
    let passedTests = 0;
    
    testResults.forEach(pageResult => {
      pageResult.tests.forEach(test => {
        totalTests++;
        if (test.passed) passedTests++;
        results.tests.push({
          page: pageResult.name,
          ...test
        });
      });
    });
    
    results.summary.total = totalTests;
    results.summary.passed = passedTests;
    results.summary.failed = totalTests - passedTests;
    results.summary.successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    // Display results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    
    testResults.forEach(pageResult => {
      const passed = pageResult.tests.filter(t => t.passed).length;
      const total = pageResult.tests.length;
      const icon = passed === total ? '✅' : passed > 0 ? '⚠️' : '❌';
      console.log(`${icon} ${pageResult.name}: ${passed}/${total} tests passed`);
      
      pageResult.tests.forEach(test => {
        const testIcon = test.passed ? '  ✓' : '  ✗';
        console.log(`${testIcon} ${test.name}: ${test.details}`);
      });
      console.log('');
    });
    
    console.log('=' .repeat(60));
    console.log(`OVERALL: ${results.summary.passed}/${results.summary.total} tests passed (${results.summary.successRate}%)`);
    
    if (results.summary.successRate === '100.0') {
      console.log('🎉 ALL TESTS PASSED! Real backend integration is working perfectly!');
    } else if (parseFloat(results.summary.successRate) >= 80) {
      console.log('✅ Most tests passed. Minor issues remain.');
    } else if (parseFloat(results.summary.successRate) >= 50) {
      console.log('⚠️  Some tests passed. Database schema may need updates.');
    } else {
      console.log('❌ Most tests failed. Please check database migrations and data population.');
    }
    
    // Save results to file
    const resultsDir = './test-results-real-backend';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }
    
    fs.writeFileSync(
      `${resultsDir}/test-report-${Date.now()}.json`,
      JSON.stringify(results, null, 2)
    );
    
    console.log(`\n📄 Test report saved to ${resultsDir}/`);
    
  } catch (error) {
    console.error('❌ Fatal test error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
  
  // Exit with appropriate code
  process.exit(results.summary.successRate === '100.0' ? 0 : 1);
}

// Run the tests
runAllTests().catch(console.error);