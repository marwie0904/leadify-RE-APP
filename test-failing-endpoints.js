const http = require('http');
const https = require('https');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const authToken = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjJmdk5DdHVVSmJzN2F3c2oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tibXN5Z3lhd3BpcWVnZW16ZXRwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkYjA4ZTViNy1hN2VhLTQ3YjctODBjMi0xY2ZhM2QzNjRhNjUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0MDA4ODM3LCJpYXQiOjE3NTQwMDUyMzcsImVtYWlsIjoibWFyd2llMDkwNEBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoibWFyd2llMDkwNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiTWFyIFdpZSBBbmciLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6ImRiMDhlNWI3LWE3ZWEtNDdiNy04MGMyLTFjZmEzZDM2NGE2NSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0MDA1MjM3fV0sInNlc3Npb25faWQiOiI5NTJhYTgxMi1lOGRlLTQ1M2EtOWFmZi1kMTU2NTY5ZDFlMjkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.3OSCStfG9D-5I4pw3sRnrds3PPj-szrssh3WZhgxU38';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`\n📡 Testing ${method} ${path}`);
    console.log('Headers:', options.headers);

    const req = http.request(options, (res) => {
      let body = '';
      
      console.log(`Status: ${res.statusCode}`);
      console.log('Response Headers:', res.headers);
      
      res.on('data', (chunk) => {
        body += chunk;
        console.log('Chunk received:', chunk.toString());
      });
      
      res.on('end', () => {
        console.log('Full response body:', body);
        console.log('Body length:', body.length);
        
        try {
          if (body) {
            const parsed = JSON.parse(body);
            console.log('✅ Valid JSON:', parsed);
          } else {
            console.log('⚠️  Empty response body');
          }
        } catch (e) {
          console.log('❌ Invalid JSON:', e.message);
          console.log('Raw body:', body);
        }
        
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testFailingEndpoints() {
  console.log('=== TESTING FAILING ENDPOINTS ===\n');

  // Test Dashboard Activity
  console.log('\n1️⃣  Testing Dashboard Activity');
  try {
    await makeRequest('GET', '/api/dashboard/activity?limit=5');
  } catch (error) {
    console.error('Dashboard Activity Error:', error);
  }

  // Test Priority Queue
  console.log('\n2️⃣  Testing Priority Queue');
  try {
    await makeRequest('GET', '/api/conversations/priority-queue?limit=10');
  } catch (error) {
    console.error('Priority Queue Error:', error);
  }

  // Test Logout
  console.log('\n3️⃣  Testing Logout');
  try {
    await makeRequest('POST', '/api/auth/logout', {});
  } catch (error) {
    console.error('Logout Error:', error);
  }
}

testFailingEndpoints();