const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM4MzkwNTU1LCJpYXQiOjE3MzgzODY5NTUsImlzcyI6Imh0dHBzOi8va2Jtc3lneWF3cGlxZWdlbXpldHAuc3VwYWJhc2UuY28vYXV0aC92MSIsInN1YiI6IjA2NDU5M2JlLTE5YjEtNDMzNC05ZWZlLWFhNmNjNmJkNmEzMCIsImVtYWlsIjoiYXlva29uZ2EwNzVAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6e30sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwic2Vzc2lvbl9pZCI6ImQ3YjkxMDM2LTc5ZDgtNDRjZS04ZWQ1LTJhNGEzMTFmZmRmZCJ9.xNcqRiKN-7kULepd6-a5_SPMm12qiQlk6wcL1nxBuuM';

async function testEndpoints() {
  console.log('Testing backend API endpoints...\n');
  
  // Test health check
  try {
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', health.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test the SSE streaming endpoint (should not crash)
  console.log('\nTesting SSE streaming endpoint...');
  try {
    // Just test that it connects without error
    const controller = new AbortController();
    const streamTest = axios.get(`${API_URL}/messages/test-conversation-id/stream`, {
      headers: {
        'Accept': 'text/event-stream'
      },
      signal: controller.signal
    });
    
    // Cancel after 1 second
    setTimeout(() => controller.abort(), 1000);
    
    await streamTest.catch(err => {
      if (err.code === 'ERR_CANCELED') {
        console.log('✅ SSE endpoint connected successfully (test canceled)');
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.log('❌ SSE endpoint failed:', error.response?.data || error.message);
  }
  
  // Test handoff request endpoint
  console.log('\nTesting handoff request endpoint...');
  try {
    const handoff = await axios.post(
      `${API_URL}/conversations/test-conversation-id/request-handoff`,
      {
        reason: 'Test handoff request',
        priority: 2
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Handoff request successful:', handoff.data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('⚠️  Handoff request returned 404 (expected - test conversation not found)');
    } else {
      console.log('❌ Handoff request failed:', error.response?.data || error.message);
    }
  }
  
  console.log('\n✨ Test complete!');
}

// Check if server is running first
axios.get(`${API_URL}/health`)
  .then(() => {
    console.log('Server is running on port 3001\n');
    testEndpoints();
  })
  .catch(() => {
    console.log('❌ Server is not running on port 3001');
    console.log('Please start the server with: cd backend && npm run server');
  });