/**
 * Route Discovery Test
 * Tests actual available endpoints from the server
 */

const axios = require('axios');

const CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  TIMEOUT: 5000
};

async function testActualRoutes() {
  console.log('🔍 Testing Actual Available Routes...\n');
  
  // Routes that should exist based on server.js
  const routes = [
    // Core routes
    { path: '/api/health', method: 'GET', description: 'Health check', expectAuth: false },
    { path: '/api/test-supabase', method: 'GET', description: 'Supabase connection test', expectAuth: false },
    { path: '/api/protected', method: 'GET', description: 'Protected route test', expectAuth: true },
    
    // Agent routes
    { path: '/api/agents', method: 'GET', description: 'Get agents', expectAuth: true },
    { path: '/api/agents/create', method: 'POST', description: 'Create agent', expectAuth: true },
    
    // Chat routes
    { path: '/api/chat', method: 'POST', description: 'Chat endpoint', expectAuth: false },
    
    // Conversation routes
    { path: '/api/conversations', method: 'GET', description: 'Get conversations', expectAuth: true },
    { path: '/api/conversations/handoffs', method: 'GET', description: 'Get handoffs', expectAuth: true },
    
    // Lead routes
    { path: '/api/leads', method: 'GET', description: 'Get leads', expectAuth: true },
    
    // Notification routes
    { path: '/api/notifications', method: 'GET', description: 'Get notifications', expectAuth: true },
    
    // Facebook routes
    { path: '/api/facebook/oauth', method: 'GET', description: 'Facebook OAuth', expectAuth: false },
    { path: '/api/facebook/webhook', method: 'GET', description: 'Facebook webhook verify', expectAuth: false },
    { path: '/api/facebook/webhook', method: 'POST', description: 'Facebook webhook handler', expectAuth: false },
  ];
  
  const results = [];
  
  for (const route of routes) {
    try {
      const startTime = Date.now();
      
      let response;
      if (route.method === 'GET') {
        response = await axios.get(`${CONFIG.API_BASE_URL}${route.path}`, {
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true
        });
      } else if (route.method === 'POST') {
        response = await axios.post(`${CONFIG.API_BASE_URL}${route.path}`, {}, {
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true
        });
      }
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      
      // Determine if response is as expected
      let statusIcon = '✅';
      let statusDesc = 'Available';
      
      if (status === 404) {
        statusIcon = '❌';
        statusDesc = 'Not Found';
      } else if (route.expectAuth && status === 401) {
        statusIcon = '✅';
        statusDesc = 'Protected (401)';
      } else if (!route.expectAuth && status === 200) {
        statusIcon = '✅';
        statusDesc = 'Accessible';
      } else if (status === 400) {
        statusIcon = '✅';
        statusDesc = 'Requires Data (400)';
      } else if (status >= 500) {
        statusIcon = '🚨';
        statusDesc = 'Server Error';
      } else {
        statusIcon = '⚠️';
        statusDesc = `Status ${status}`;
      }
      
      console.log(`${statusIcon} ${route.method} ${route.path}`);
      console.log(`   ${statusDesc} | ${responseTime}ms | ${route.description}`);
      
      // Check response data
      if (response.data && typeof response.data === 'object') {
        if (response.data.message || response.data.error) {
          console.log(`   Message: ${response.data.message || response.data.error}`);
        }
      }
      
      console.log('');
      
      results.push({
        route: route.path,
        method: route.method,
        status: status,
        responseTime: responseTime,
        available: status !== 404,
        description: route.description,
        statusDescription: statusDesc
      });
      
    } catch (error) {
      console.log(`❌ ${route.method} ${route.path}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   ${route.description}`);
      console.log('');
      
      results.push({
        route: route.path,
        method: route.method,
        status: 'ERROR',
        error: error.message,
        available: false,
        description: route.description
      });
    }
  }
  
  // Summary
  console.log('📊 ROUTE DISCOVERY SUMMARY');
  console.log('=' .repeat(40));
  
  const available = results.filter(r => r.available).length;
  const total = results.length;
  const notFound = results.filter(r => r.status === 404).length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  
  console.log(`✅ Available Routes: ${available}/${total}`);
  console.log(`❌ Not Found (404): ${notFound}`);
  console.log(`🚨 Errors: ${errors}`);
  
  if (notFound > 0) {
    console.log('\n❌ ROUTES NOT FOUND:');
    results.filter(r => r.status === 404).forEach(r => {
      console.log(`   ${r.method} ${r.route} - ${r.description}`);
    });
  }
  
  return results;
}

// Test specific functionalities
async function testSpecificFunctionalities() {
  console.log('\n🧪 Testing Specific Functionalities...\n');
  
  // Test health endpoint in detail
  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL}/api/health`);
    console.log('✅ Health Check Details:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
  }
  
  console.log('');
  
  // Test Supabase connection
  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL}/api/test-supabase`);
    console.log('✅ Supabase Connection Test:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.log('❌ Supabase Test Failed:', error.message);
  }
  
  console.log('');
  
  // Test chat endpoint with minimal data
  try {
    const response = await axios.post(`${CONFIG.API_BASE_URL}/api/chat`, {
      message: 'Hello, this is a test message'
    }, {
      validateStatus: () => true
    });
    
    console.log('🤖 Chat Endpoint Test:');
    console.log(`   Status: ${response.status}`);
    if (response.data) {
      console.log(`   Response Type: ${typeof response.data}`);
      if (typeof response.data === 'object') {
        console.log(`   Response Keys: ${Object.keys(response.data).join(', ')}`);
      }
    }
  } catch (error) {
    console.log('❌ Chat Test Failed:', error.message);
  }
}

async function runRouteDiscovery() {
  console.log('🚀 Starting Route Discovery Test...\n');
  
  const results = await testActualRoutes();
  await testSpecificFunctionalities();
  
  // Save results
  const fs = require('fs');
  const resultsPath = `./route-discovery-${Date.now()}.json`;
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Route discovery results saved to: ${resultsPath}`);
  
  return results;
}

if (require.main === module) {
  runRouteDiscovery();
}