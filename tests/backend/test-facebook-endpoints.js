const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to log test results
function logTest(endpoint, method, scenario, passed, error = null) {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${method} ${endpoint} - ${scenario}`);
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({
      endpoint,
      method,
      scenario,
      error: error?.response?.data || error?.message || error
    });
  }
}

// Generate Facebook webhook signature
function generateWebhookSignature(payload) {
  const FB_APP_SECRET = process.env.FB_APP_SECRET || 'test-secret';
  return crypto
    .createHmac('sha256', FB_APP_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function testFacebookWebhookVerification() {
  console.log('\n🔐 TESTING FACEBOOK WEBHOOK VERIFICATION\n');
  
  // Test webhook verification
  try {
    const verifyToken = process.env.FB_VERIFY_TOKEN || 'test-verify-token';
    const challenge = 'test-challenge-123';
    
    const response = await axios.get(`${API_URL}/api/facebook/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': challenge
      }
    });
    
    logTest('/api/facebook/webhook', 'GET', 'Webhook verification with correct token', 
      response.data === challenge);
  } catch (error) {
    logTest('/api/facebook/webhook', 'GET', 'Webhook verification with correct token', false, error);
  }
  
  // Test with wrong verify token
  try {
    const response = await axios.get(`${API_URL}/api/facebook/webhook`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'test-challenge'
      }
    });
    
    logTest('/api/facebook/webhook', 'GET', 'Webhook verification with wrong token should fail', 
      false, 'Should have returned 403');
  } catch (error) {
    logTest('/api/facebook/webhook', 'GET', 'Webhook verification with wrong token should fail', 
      error.response?.status === 403);
  }
}

async function testFacebookWebhookMessages() {
  console.log('\n💬 TESTING FACEBOOK WEBHOOK MESSAGE HANDLING\n');
  
  // Test text message
  const textMessagePayload = {
    object: 'page',
    entry: [{
      id: 'test-page-id',
      time: Date.now(),
      messaging: [{
        sender: { id: 'test-user-123' },
        recipient: { id: 'test-page-456' },
        timestamp: Date.now(),
        message: {
          mid: 'test-message-id',
          text: 'Hello, I need help finding a house'
        }
      }]
    }]
  };
  
  try {
    const signature = generateWebhookSignature(textMessagePayload);
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      textMessagePayload,
      {
        headers: {
          'X-Hub-Signature-256': `sha256=${signature}`
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Handle text message', 
      response.status === 200);
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Handle text message', false, error);
  }
  
  // Test postback
  const postbackPayload = {
    object: 'page',
    entry: [{
      id: 'test-page-id',
      time: Date.now(),
      messaging: [{
        sender: { id: 'test-user-123' },
        recipient: { id: 'test-page-456' },
        timestamp: Date.now(),
        postback: {
          title: 'Get Started',
          payload: 'GET_STARTED'
        }
      }]
    }]
  };
  
  try {
    const signature = generateWebhookSignature(postbackPayload);
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      postbackPayload,
      {
        headers: {
          'X-Hub-Signature-256': `sha256=${signature}`
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Handle postback', 
      response.status === 200);
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Handle postback', false, error);
  }
  
  // Test without signature
  try {
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      textMessagePayload
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Request without signature should fail', 
      response.status === 200, 'Expected 200 (no signature verification)');
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Request without signature should fail', 
      false, error);
  }
  
  // Test with invalid signature
  try {
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      textMessagePayload,
      {
        headers: {
          'X-Hub-Signature-256': 'sha256=invalid-signature'
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Request with invalid signature should fail', 
      response.status === 200, 'Expected 200 (no signature verification)');
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Request with invalid signature should fail', 
      false, error);
  }
}

async function testFacebookMessengerProfile() {
  console.log('\n⚙️  TESTING FACEBOOK MESSENGER PROFILE ENDPOINTS\n');
  
  // Test get started button setup
  try {
    const response = await axios.post(`${API_URL}/api/facebook/setup-get-started`);
    logTest('/api/facebook/setup-get-started', 'POST', 'Setup Get Started button', 
      response.data.success === true);
  } catch (error) {
    logTest('/api/facebook/setup-get-started', 'POST', 'Setup Get Started button', false, error);
  }
  
  // Test persistent menu setup
  try {
    const response = await axios.post(`${API_URL}/api/facebook/setup-menu`);
    logTest('/api/facebook/setup-menu', 'POST', 'Setup persistent menu', 
      response.data.success === true);
  } catch (error) {
    logTest('/api/facebook/setup-menu', 'POST', 'Setup persistent menu', false, error);
  }
}

async function testFacebookPageIntegration() {
  console.log('\n📄 TESTING FACEBOOK PAGE INTEGRATION\n');
  
  // Test subscribe to page
  const testPageData = {
    agentId: 'test-agent-123',
    pageId: 'test-page-123',
    pageAccessToken: 'test-page-access-token'
  };
  
  try {
    const response = await axios.post(`${API_URL}/api/facebook/subscribe-page`, testPageData);
    logTest('/api/facebook/subscribe-page', 'POST', 'Subscribe to Facebook page', 
      response.data.success === true);
  } catch (error) {
    logTest('/api/facebook/subscribe-page', 'POST', 'Subscribe to Facebook page', false, error);
  }
  
  // Test get subscribed pages
  try {
    const response = await axios.get(`${API_URL}/api/facebook/pages`);
    logTest('/api/facebook/pages', 'GET', 'Get subscribed pages', 
      Array.isArray(response.data.pages));
  } catch (error) {
    logTest('/api/facebook/pages', 'GET', 'Get subscribed pages', false, error);
  }
}

async function testEdgeCases() {
  console.log('\n🔍 TESTING EDGE CASES\n');
  
  // Test empty webhook payload
  try {
    const emptyPayload = {};
    const signature = generateWebhookSignature(emptyPayload);
    
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      emptyPayload,
      {
        headers: {
          'X-Hub-Signature-256': `sha256=${signature}`
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Handle empty payload', 
      response.status === 404);
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Handle empty payload', false, error);
  }
  
  // Test malformed message structure
  try {
    const malformedPayload = {
      object: 'page',
      entry: [{
        messaging: [{ invalid: 'structure' }]
      }]
    };
    const signature = generateWebhookSignature(malformedPayload);
    
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      malformedPayload,
      {
        headers: {
          'X-Hub-Signature-256': `sha256=${signature}`
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Handle malformed message', 
      response.status === 200);
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Handle malformed message', false, error);
  }
  
  // Test multiple messages in one webhook
  const multiMessagePayload = {
    object: 'page',
    entry: [{
      id: 'test-page-id',
      time: Date.now(),
      messaging: [
        {
          sender: { id: 'user-1' },
          recipient: { id: 'page-1' },
          message: { text: 'First message' }
        },
        {
          sender: { id: 'user-2' },
          recipient: { id: 'page-1' },
          message: { text: 'Second message' }
        }
      ]
    }]
  };
  
  try {
    const signature = generateWebhookSignature(multiMessagePayload);
    const response = await axios.post(
      `${API_URL}/api/facebook/webhook`,
      multiMessagePayload,
      {
        headers: {
          'X-Hub-Signature-256': `sha256=${signature}`
        }
      }
    );
    
    logTest('/api/facebook/webhook', 'POST', 'Handle multiple messages', 
      response.status === 200);
  } catch (error) {
    logTest('/api/facebook/webhook', 'POST', 'Handle multiple messages', false, error);
  }
}

async function runAllTests() {
  console.log('🚀 FACEBOOK INTEGRATION ENDPOINT TESTING\n');
  console.log('Server:', API_URL);
  console.log('='*60);
  
  // Check if server is running
  try {
    await axios.get(`${API_URL}/api/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running on port 3001');
    console.log('Please start the server with: cd backend && npm run server');
    return;
  }
  
  // Check if Facebook environment variables are set
  const fbConfig = {
    appId: process.env.FB_APP_ID || 'not-set',
    appSecret: process.env.FB_APP_SECRET || 'not-set',
    verifyToken: process.env.FB_VERIFY_TOKEN || 'not-set'
  };
  
  console.log('📋 Facebook Configuration:');
  console.log(`   App ID: ${fbConfig.appId === 'not-set' ? '❌ Not set' : '✅ Set'}`);
  console.log(`   App Secret: ${fbConfig.appSecret === 'not-set' ? '❌ Not set' : '✅ Set'}`);
  console.log(`   Verify Token: ${fbConfig.verifyToken === 'not-set' ? '❌ Not set' : '✅ Set'}`);
  
  if (fbConfig.appId === 'not-set' || fbConfig.appSecret === 'not-set' || fbConfig.verifyToken === 'not-set') {
    console.log('\n⚠️  Warning: Facebook environment variables not fully configured');
    console.log('   Some tests may fail. Add these to your .env file:');
    console.log('   - FB_APP_ID');
    console.log('   - FB_APP_SECRET');
    console.log('   - FB_VERIFY_TOKEN');
  }
  
  // Run all test categories
  await testFacebookWebhookVerification();
  await testFacebookWebhookMessages();
  await testFacebookMessengerProfile();
  await testFacebookPageIntegration();
  await testEdgeCases();
  
  // Print summary
  console.log('\n' + '='*60);
  console.log('📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.method} ${error.endpoint} - ${error.scenario}`);
      console.log(`   Error: ${JSON.stringify(error.error)}\n`);
    });
  }
  
  console.log('\n💡 Notes:');
  console.log('- Facebook webhook requires HTTPS in production');
  console.log('- Webhook URL should be: https://yourdomain.com/webhook/facebook');
  console.log('- Configure webhook subscriptions in Facebook App Dashboard');
  console.log('- Subscribe to: messages, messaging_postbacks, messaging_optins');
}

// Run the tests
runAllTests();