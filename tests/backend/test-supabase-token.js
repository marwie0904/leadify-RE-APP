/**
 * Test the Supabase token directly with the API
 */

const fetch = require('node-fetch');

// This is the actual Supabase token from the browser
const supabaseToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjJmdk5DdHVVSmJzN2F3c2oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tibXN5Z3lhd3BpcWVnZW16ZXRwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0Yzk4NGE5YS0xNTBlLTQ2NzMtODE5Mi0xN2Y4MGE3ZWY0ZDciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1MDAzMzcwLCJpYXQiOjE3NTQ5OTk3NzAsImVtYWlsIjoibWFyd3J5eXlAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6Im1hcndyeXl5QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJzdF9uYW1lIjoiTWFyIFdpZSIsImZ1bGxfbmFtZSI6Ik1hciBXaWUgQW5nIiwibGFzdF9uYW1lIjoiQW5nIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiI0Yzk4NGE5YS0xNTBlLTQ2NzMtODE5Mi0xN2Y4MGE3ZWY0ZDcifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NDk5OTc3MH1dLCJzZXNzaW9uX2lkIjoiZGNiZGI0Y2YtNzUxZC00Y2VhLTg0ZTItNTFjNzI3MmVjZTZlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.5dHF6ZlGs41CqpzFi6HMfgbpeT56XQPyQ_9UXhyFRzA";

const API_URL = 'http://localhost:3001';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testToken() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            SUPABASE TOKEN - DIRECT API TEST               ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  // Decode the token to see what's in it
  const tokenParts = supabaseToken.split('.');
  const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
  
  console.log(`${colors.cyan}Token Payload:${colors.reset}`);
  console.log(`  Subject (user ID): ${payload.sub}`);
  console.log(`  Email: ${payload.email}`);
  console.log(`  Role: ${payload.role}`);
  console.log(`  User Metadata:`, payload.user_metadata);
  console.log();

  // Test 1: Regular authenticated endpoint (should work)
  console.log(`${colors.cyan}Test 1: Regular Authenticated Endpoint${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      headers: {
        'Authorization': `Bearer ${supabaseToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Health check successful${colors.reset}`);
      console.log(`   Status: ${data.status}`);
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Test 2: Admin endpoint (should work with database role lookup)
  console.log(`\n${colors.cyan}Test 2: Admin Users Endpoint${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseToken}`
      }
    });

    console.log(`  Response status: ${response.status}`);
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log(`${colors.green}✅ Admin access successful!${colors.reset}`);
      console.log(`   Users found: ${data.users?.length || 0}`);
    } else {
      console.log(`${colors.red}❌ Failed with status ${response.status}${colors.reset}`);
      console.log(`   Response: ${responseText}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Test 3: Check what requireAuth returns for this token
  console.log(`\n${colors.cyan}Test 3: Direct Server Logs${colors.reset}`);
  console.log(`Check the server console for detailed logs about:`);
  console.log(`  - [Auth] messages showing Supabase auth`);
  console.log(`  - [Admin Auth] messages showing role checking`);
}

// Run the test
testToken().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});