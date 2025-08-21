#!/usr/bin/env node

async function testBANTRoutes() {
  console.log('🧪 Testing BANT Routes...\n');
  
  // Test 1: Check if server is running
  console.log('1️⃣ Testing server health...');
  try {
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Server is running:', healthData);
  } catch (error) {
    console.log('❌ Server is not running:', error.message);
    return;
  }
  
  // Test 2: List all routes (if available)
  console.log('\n2️⃣ Testing available routes...');
  try {
    // Try to get a 404 on a completely invalid route
    const invalidResponse = await fetch('http://localhost:3001/api/this-route-does-not-exist');
    console.log('Invalid route response:', invalidResponse.status, invalidResponse.statusText);
    
    // Test our BANT routes
    const bantRoutes = [
      { method: 'GET', path: '/api/agents/test-agent-id/bant-config' },
      { method: 'POST', path: '/api/agents/test-agent-id/bant-config' },
      { method: 'DELETE', path: '/api/agents/test-agent-id/bant-config' }
    ];
    
    for (const route of bantRoutes) {
      const response = await fetch(`http://localhost:3001${route.path}`, {
        method: route.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: route.method === 'POST' ? JSON.stringify({
          budget_weight: 30,
          authority_weight: 20,
          need_weight: 20,
          timeline_weight: 20,
          contact_weight: 10
        }) : undefined
      });
      
      console.log(`${route.method} ${route.path}: ${response.status} ${response.statusText}`);
      
      // Check if we're getting HTML or JSON
      const contentType = response.headers.get('content-type');
      console.log(`  Content-Type: ${contentType}`);
      
      if (contentType?.includes('text/html')) {
        const text = await response.text();
        console.log(`  ❌ Got HTML response: ${text.substring(0, 100)}...`);
      } else if (contentType?.includes('application/json')) {
        try {
          const json = await response.json();
          console.log(`  ✅ Got JSON response:`, JSON.stringify(json).substring(0, 100), '...');
        } catch (e) {
          console.log(`  ❌ Failed to parse JSON:`, e.message);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error testing routes:', error);
  }
  
  // Test 3: Check if agents routes work
  console.log('\n3️⃣ Testing other agent routes...');
  try {
    const agentsResponse = await fetch('http://localhost:3001/api/agents', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log(`GET /api/agents: ${agentsResponse.status} ${agentsResponse.statusText}`);
  } catch (error) {
    console.log('❌ Error testing agents route:', error.message);
  }
  
  // Test 4: Check server logs
  console.log('\n4️⃣ Summary:');
  console.log('If BANT routes are returning HTML "Cannot GET/POST/DELETE", it means:');
  console.log('- The routes are not registered in Express');
  console.log('- Or they are registered after a catch-all route');
  console.log('- Or there\'s a middleware intercepting the routes');
  console.log('\nCheck the server.js file to ensure BANT routes are:');
  console.log('1. Defined before app.listen()');
  console.log('2. Not after any catch-all routes like app.use("*")');
  console.log('3. Using the correct path format');
}

testBANTRoutes().catch(console.error);