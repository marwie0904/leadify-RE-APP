const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, path, description) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // We expect 401 (unauthorized) or 400 (bad request) for protected endpoints
    // This confirms the endpoint exists
    if (res.status === 401 || res.status === 400 || res.status === 403) {
      log(`✅ ${description} - Endpoint exists (requires auth)`, 'green');
      return true;
    } else if (res.status === 404) {
      log(`❌ ${description} - Endpoint NOT FOUND`, 'red');
      return false;
    } else {
      log(`✅ ${description} - Endpoint exists (status: ${res.status})`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ ${description} - Error: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  console.log('\\n' + '='.repeat(60));
  log('ENDPOINT EXISTENCE VERIFICATION', 'cyan');
  console.log('='.repeat(60) + '\\n');
  
  const tests = [
    // Organization Management
    { method: 'PATCH', path: '/api/organization/members/test-id/role', desc: 'Role update endpoint' },
    { method: 'POST', path: '/api/organization/join', desc: 'Join organization endpoint' },
    { method: 'POST', path: '/api/organization/leave', desc: 'Leave organization endpoint' },
    
    // Lead Management
    { method: 'POST', path: '/api/leads', desc: 'Create lead with auto-assignment' },
    { method: 'PATCH', path: '/api/leads/test-id/assign-agent', desc: 'Manual lead reassignment' },
    
    // Conversation Management
    { method: 'POST', path: '/api/conversations/test-id/close', desc: 'Close conversation with scoring' },
    { method: 'POST', path: '/api/conversations/test-id/score', desc: 'Score conversation' },
    
    // Handoff Management
    { method: 'POST', path: '/api/conversations/test-id/transfer-to-human', desc: 'Transfer to human' },
    { method: 'POST', path: '/api/conversations/test-id/transfer-to-ai', desc: 'Transfer to AI' },
    
    // Notifications
    { method: 'POST', path: '/api/frontend/handoff-notification', desc: 'Frontend notification webhook' },
    
    // Facebook Integration
    { method: 'POST', path: '/api/facebook/subscribe-page', desc: 'Facebook page subscription' }
  ];
  
  let passed = 0;
  const total = tests.length;
  
  for (const test of tests) {
    const result = await testEndpoint(test.method, test.path, test.desc);
    if (result) passed++;
  }
  
  console.log('\\n' + '-'.repeat(60));
  if (passed === total) {
    log(`ALL ENDPOINTS VERIFIED (${passed}/${total})`, 'green');
  } else if (passed > 0) {
    log(`PARTIAL SUCCESS (${passed}/${total} endpoints exist)`, 'yellow');
  } else {
    log(`NO ENDPOINTS FOUND (${passed}/${total})`, 'red');
  }
  console.log('='.repeat(60) + '\\n');
}

// Check if server is running
fetch(`${API_URL}/api/health`)
  .then(res => {
    if (res.ok) {
      log('✅ Server is running on port 3001', 'green');
      return runTests();
    } else {
      log('❌ Server health check failed', 'red');
    }
  })
  .catch(error => {
    log(`❌ Server not running on port 3001: ${error.message}`, 'red');
    log('Please start the server with: node server.js', 'yellow');
  });