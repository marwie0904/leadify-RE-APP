const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4MDIxNzAsImV4cCI6MjA0MzM3ODE3MH0.MnOhJmlPJXDqZ7AaWHR5u6jNy01bLttAMDDUPLjeFzY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAgentFetching() {
  log('\n===== TESTING AGENT DISPLAY FIX =====', 'cyan');
  
  try {
    // 1. Create a test user and authenticate
    const email = `test_agent_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    log('\n1. Creating test user...', 'blue');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (authError) {
      log(`Auth error: ${authError.message}`, 'red');
      return;
    }
    
    const token = authData.session?.access_token;
    const userId = authData.user?.id;
    
    if (!token) {
      log('No auth token received', 'red');
      return;
    }
    
    log(`✓ User created: ${email}`, 'green');
    
    // 2. Create an organization
    log('\n2. Creating organization...', 'blue');
    const orgRes = await fetch(`${API_URL}/api/organization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Real Estate Agency',
        description: 'Testing agent display'
      })
    });
    
    if (!orgRes.ok) {
      const error = await orgRes.json();
      log(`Organization creation failed: ${error.message}`, 'red');
      return;
    }
    
    const org = await orgRes.json();
    const organizationId = org.id;
    log(`✓ Organization created: ${org.name} (${organizationId})`, 'green');
    
    // 3. Create an agent
    log('\n3. Creating AI agent...', 'blue');
    const agentRes = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Real Estate Bot',
        description: 'Your friendly real estate assistant',
        systemPrompt: 'You are a helpful real estate agent.',
        organizationId: organizationId,
        tone: 'Friendly',
        responseStyle: 'detailed'
      })
    });
    
    if (!agentRes.ok) {
      const error = await agentRes.json();
      log(`Agent creation failed: ${error.message}`, 'red');
      return;
    }
    
    const agent = await agentRes.json();
    log(`✓ Agent created: ${agent.name} (${agent.id})`, 'green');
    
    // 4. Now fetch agents through the API
    log('\n4. Fetching agents via API...', 'blue');
    const fetchRes = await fetch(`${API_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!fetchRes.ok) {
      const error = await fetchRes.json();
      log(`Fetch failed: ${error.message}`, 'red');
      return;
    }
    
    const data = await fetchRes.json();
    const agents = data.agents || data;
    
    if (Array.isArray(agents) && agents.length > 0) {
      log(`✓ SUCCESS! Found ${agents.length} agent(s):`, 'green');
      agents.forEach((a, i) => {
        console.log(`   ${i + 1}. ${a.name} (ID: ${a.id})`);
        console.log(`      Organization: ${a.organization_id || 'N/A'}`);
        console.log(`      Status: ${a.status || 'active'}`);
      });
    } else {
      log('✗ No agents returned by API', 'red');
      
      // Debug: Check server logs
      log('\nChecking server logs...', 'yellow');
      const logsRes = await fetch(`${API_URL}/api/health`);
      if (logsRes.ok) {
        log('Server is running. Check server.log for details', 'yellow');
      }
    }
    
    // 5. Check what's actually in the database
    log('\n5. Verifying database directly...', 'blue');
    
    // Note: This would need service role key to work properly
    log('Note: Direct database access requires service role key', 'yellow');
    
    // Clean up
    await supabase.auth.signOut();
    
    log('\n===== TEST COMPLETE =====', 'cyan');
    
    if (Array.isArray(agents) && agents.length > 0) {
      log('\n✅ AGENT DISPLAY ISSUE FIXED!', 'green');
      log('The frontend should now display agents correctly.', 'green');
    } else {
      log('\n⚠️ Issue may persist. Check:', 'yellow');
      log('1. Database schema (agents table structure)', 'yellow');
      log('2. Frontend is calling GET /api/agents correctly', 'yellow');
      log('3. Frontend is handling the response format { agents: [...] }', 'yellow');
    }
    
  } catch (error) {
    log(`\nTest error: ${error.message}`, 'red');
  }
}

// Run the test
testAgentFetching();