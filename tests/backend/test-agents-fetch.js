const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzgwMjE3MCwiZXhwIjoyMDQzMzc4MTcwfQ.hdNrmyPpQxZu6-kBGfHioXr5eQqVw8CqQqWmABNLq_4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function checkAgentsInDatabase() {
  log('\n=== CHECKING AGENTS IN DATABASE ===', 'cyan');
  
  try {
    // 1. Check all agents in database
    const { data: allAgents, error: allError } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (allError) {
      log(`Error fetching agents: ${allError.message}`, 'red');
      return;
    }
    
    log(`\nFound ${allAgents?.length || 0} agents in database:`, 'green');
    
    if (allAgents && allAgents.length > 0) {
      allAgents.forEach((agent, index) => {
        console.log(`\n${index + 1}. Agent: ${agent.name}`);
        console.log(`   ID: ${agent.id}`);
        console.log(`   Organization ID: ${agent.organization_id}`);
        console.log(`   Created: ${agent.created_at}`);
        console.log(`   Status: ${agent.is_active ? 'Active' : 'Inactive'}`);
      });
      
      // 2. Check organization details for first agent
      if (allAgents[0].organization_id) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', allAgents[0].organization_id)
          .single();
        
        if (org) {
          log(`\nOrganization for first agent:`, 'blue');
          console.log(`   Name: ${org.name}`);
          console.log(`   ID: ${org.id}`);
        }
      }
      
      // 3. Check organization members
      if (allAgents[0].organization_id) {
        const { data: members, error: membersError } = await supabase
          .from('organization_members')
          .select(`
            *,
            profiles:user_id (
              id,
              email,
              full_name
            )
          `)
          .eq('organization_id', allAgents[0].organization_id);
        
        if (members && members.length > 0) {
          log(`\nOrganization members:`, 'blue');
          members.forEach(member => {
            console.log(`   User: ${member.profiles?.email || member.user_id}`);
            console.log(`   Role: ${member.role}`);
          });
        }
      }
    } else {
      log('No agents found in database', 'yellow');
    }
    
  } catch (error) {
    log(`Database check error: ${error.message}`, 'red');
  }
}

async function testAgentEndpoint() {
  log('\n=== TESTING AGENT API ENDPOINT ===', 'cyan');
  
  try {
    // Test without auth first
    log('\n1. Testing /api/agents without auth:', 'blue');
    const noAuthRes = await fetch(`${API_URL}/api/agents`);
    log(`   Status: ${noAuthRes.status} ${noAuthRes.statusText}`, noAuthRes.status === 401 ? 'green' : 'yellow');
    
    // Get a user to test with
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (users) {
      log(`\n2. Testing with user: ${users.email}`, 'blue');
      
      // Create a mock auth token (for testing - in production this would come from Supabase Auth)
      // Note: This won't work without proper JWT signing
      log('   Note: Cannot test authenticated endpoint without valid JWT token', 'yellow');
      log('   The frontend needs a valid auth token from Supabase Auth', 'yellow');
    }
    
  } catch (error) {
    log(`API test error: ${error.message}`, 'red');
  }
}

async function checkAPIEndpointCode() {
  log('\n=== CHECKING API ENDPOINT IMPLEMENTATION ===', 'cyan');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const serverFile = path.join(__dirname, 'server.js');
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    // Find the GET /api/agents endpoint
    const agentsEndpointMatch = serverContent.match(/app\.get\(['"`]\/api\/agents['"`][\s\S]*?\n\}\);/);
    
    if (agentsEndpointMatch) {
      log('\nFound GET /api/agents endpoint:', 'green');
      
      // Check if it has requireAuth middleware
      if (agentsEndpointMatch[0].includes('requireAuth')) {
        log('✓ Endpoint requires authentication', 'green');
      } else {
        log('✗ Endpoint does NOT require authentication', 'red');
      }
      
      // Check what it's querying
      if (agentsEndpointMatch[0].includes('organization_id')) {
        log('✓ Endpoint filters by organization_id', 'green');
      } else {
        log('✗ Endpoint does NOT filter by organization_id', 'red');
      }
      
      // Show the actual query
      const queryMatch = agentsEndpointMatch[0].match(/from\(['"`]agents['"`]\)[\s\S]*?(?:select|single)/);
      if (queryMatch) {
        log('\nQuery being used:', 'blue');
        console.log(queryMatch[0]);
      }
    } else {
      log('✗ GET /api/agents endpoint NOT FOUND', 'red');
    }
    
  } catch (error) {
    log(`Code check error: ${error.message}`, 'red');
  }
}

async function suggestFix() {
  log('\n=== DIAGNOSTIC SUMMARY ===', 'magenta');
  
  const { data: agents } = await supabase.from('agents').select('count').single();
  const agentCount = agents?.count || 0;
  
  if (agentCount > 0) {
    log('\n✓ Agents exist in database', 'green');
    log('\nPossible issues:', 'yellow');
    log('1. Frontend not sending proper authentication token', 'yellow');
    log('2. User not associated with the organization that owns the agents', 'yellow');
    log('3. API endpoint filtering by wrong organization_id', 'yellow');
    log('4. Frontend not calling the API endpoint correctly', 'yellow');
    
    log('\nTo fix:', 'cyan');
    log('1. Check browser DevTools Network tab for /api/agents request', 'cyan');
    log('2. Verify Authorization header is being sent', 'cyan');
    log('3. Check if user is member of organization that owns agents', 'cyan');
    log('4. Verify organization_id is being passed correctly', 'cyan');
  } else {
    log('\n✗ No agents in database', 'red');
    log('Create an agent first before debugging the display issue', 'yellow');
  }
}

// Run all checks
async function runDiagnostics() {
  log('AGENT DISPLAY DIAGNOSTIC TOOL', 'magenta');
  log('==============================\n', 'magenta');
  
  await checkAgentsInDatabase();
  await testAgentEndpoint();
  await checkAPIEndpointCode();
  await suggestFix();
}

runDiagnostics().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});