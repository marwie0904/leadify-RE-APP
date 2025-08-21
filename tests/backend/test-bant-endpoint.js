const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';

async function testEndpoint() {
  try {
    console.log('=== TESTING BANT ENDPOINT ===\n');
    
    // 1. First test if server is running
    console.log('1. Testing server health...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    console.log('Health check status:', healthResponse.status);
    
    if (!healthResponse.ok) {
      console.log('❌ Server might not be running on port 3001');
      return;
    }
    
    const healthData = await healthResponse.text();
    console.log('Health response:', healthData);
    console.log();
    
    // 2. Test authentication requirement
    console.log('2. Testing BANT endpoint without auth...');
    const noAuthResponse = await fetch(`${API_BASE_URL}/api/agents/test-agent-id/bant-config`);
    console.log('No auth status:', noAuthResponse.status);
    console.log('No auth headers:', Object.fromEntries(noAuthResponse.headers.entries()));
    
    if (noAuthResponse.status !== 401) {
      const responseText = await noAuthResponse.text();
      console.log('Unexpected response (first 500 chars):', responseText.substring(0, 500));
    }
    console.log();
    
    // 3. Get auth token
    console.log('3. Getting auth token...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwie0904@gmail.com',
      password: 'ayokonga123'
    });
    
    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      return;
    }
    
    const authToken = authData.session.access_token;
    console.log('✅ Got auth token');
    console.log();
    
    // 4. Test with auth but non-existent agent
    console.log('4. Testing BANT endpoint with auth...');
    const authResponse = await fetch(`${API_BASE_URL}/api/agents/non-existent-agent/bant-config`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Auth response status:', authResponse.status);
    console.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()));
    
    const authResponseText = await authResponse.text();
    console.log('Response (first 500 chars):', authResponseText.substring(0, 500));
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(authResponseText);
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEndpoint();