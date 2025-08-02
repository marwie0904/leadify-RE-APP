const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

// Test token - replace with actual token for testing
const TEST_TOKEN = 'your-test-token-here';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

// Define all frontend API endpoints and their backend counterparts
const API_ENDPOINTS_MAP = {
  // Authentication
  'POST /api/auth/signup': { exists: true, backend: 'POST /api/auth/signup' },
  'POST /api/auth/login': { exists: true, backend: 'POST /api/auth/login' },
  'POST /api/auth/logout': { exists: false, backend: null, issue: 'Missing in backend' },
  
  // Settings
  'GET /api/settings/profile': { exists: true, backend: 'GET /api/settings/profile' },
  'POST /api/settings/profile': { exists: true, backend: 'POST /api/settings/profile' },
  
  // Organization
  'GET /api/organization/members': { exists: true, backend: 'GET /api/organization/members' },
  
  // Agents
  'GET /api/agents': { exists: true, backend: 'GET /api/agents' },
  'POST /api/agents': { exists: true, backend: 'POST /api/agents/create', issue: 'Different path' },
  
  // Leads
  'PATCH /api/leads/:id/assign-agent': { exists: true, backend: 'PATCH /api/leads/:id/assign-agent' },
  
  // Conversations
  'GET /api/conversations': { exists: true, backend: 'GET /api/conversations' },
  'GET /api/conversations/:id/messages': { exists: true, backend: 'GET /api/conversations/:id/messages' },
  
  // Chat
  'POST /api/chat': { exists: true, backend: 'POST /api/chat' },
  
  // Dashboard
  'GET /api/dashboard/stats': { exists: false, backend: 'GET /api/dashboard/summary', issue: 'Different endpoint name' },
  'GET /api/dashboard/activity': { exists: false, backend: null, issue: 'Missing in backend' },
  
  // Human-in-loop
  'GET /api/human-agents/dashboard': { exists: true, backend: 'GET /api/human-agents/dashboard' },
  'POST /api/conversations/:id/request-handoff': { exists: true, backend: 'POST /api/conversations/:id/request-handoff' },
  'POST /api/conversations/:id/accept-handoff': { exists: true, backend: 'POST /api/conversations/:id/accept-handoff' },
  'GET /api/conversations/priority-queue': { exists: true, backend: 'GET /api/conversations/priority-queue' },
  'POST /api/conversations/:id/send-message': { exists: true, backend: 'POST /api/conversations/:id/send-message' },
};

// Issues found:
console.log('=== API CONNECTIVITY ANALYSIS ===\n');
console.log('Issues found:');
console.log('1. POST /api/auth/logout - Missing in backend');
console.log('2. POST /api/agents - Frontend expects this, but backend uses /api/agents/create');
console.log('3. GET /api/dashboard/stats - Frontend expects this, but backend uses /api/dashboard/summary');
console.log('4. GET /api/dashboard/activity - Missing in backend');

console.log('\n=== RECOMMENDATIONS ===\n');
console.log('1. Add missing /api/auth/logout endpoint to backend');
console.log('2. Update frontend to use /api/agents/create instead of /api/agents for agent creation');
console.log('3. Update frontend to use /api/dashboard/summary instead of /api/dashboard/stats');
console.log('4. Add missing /api/dashboard/activity endpoint to backend');

// Function to test endpoints
async function testEndpoints() {
  console.log('\n=== TESTING ENDPOINTS ===\n');
  
  const results = [];
  
  for (const [endpoint, info] of Object.entries(API_ENDPOINTS_MAP)) {
    const [method, path] = endpoint.split(' ');
    
    try {
      const response = await axios({
        method,
        url: `${API_BASE_URL}${path.replace(':id', 'test-id').replace(':userId', 'test-user')}`,
        headers,
        data: method !== 'GET' ? {} : undefined
      });
      
      results.push({
        endpoint,
        status: 'SUCCESS',
        statusCode: response.status
      });
    } catch (error) {
      results.push({
        endpoint,
        status: 'FAILED',
        statusCode: error.response?.status || 0,
        error: error.message
      });
    }
  }
  
  return results;
}

// Export for use in other files
module.exports = {
  API_ENDPOINTS_MAP,
  testEndpoints
};