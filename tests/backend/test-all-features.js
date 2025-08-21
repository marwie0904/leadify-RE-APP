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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test data
let authToken = null;
let userId = null;
let organizationId = null;
let agentId = null;
let conversationId = null;
let leadId = null;

async function authenticateUser() {
  logSection('AUTHENTICATION');
  
  try {
    // Sign up or sign in a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    logInfo(`Creating/signing in user: ${email}`);
    
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    authToken = authData.session?.access_token;
    userId = authData.user?.id;
    
    if (authToken) {
      logSuccess(`Authenticated successfully. User ID: ${userId}`);
      return true;
    } else {
      throw new Error('No auth token received');
    }
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    return false;
  }
}

async function testOrganizationManagement() {
  logSection('ORGANIZATION MANAGEMENT TESTS');
  
  try {
    // Create organization
    logInfo('Creating organization...');
    const createRes = await fetch(`${API_URL}/api/organization`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Test Org ${Date.now()}`,
        description: 'Test organization'
      })
    });
    
    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(`Create organization failed: ${error.message}`);
    }
    
    const orgData = await createRes.json();
    organizationId = orgData.id;
    logSuccess(`Organization created: ${organizationId}`);
    
    // Test role update (should fail as we need another user)
    logInfo('Testing role update endpoint...');
    const roleRes = await fetch(`${API_URL}/api/organization/members/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'admin' })
    });
    
    if (roleRes.ok) {
      logSuccess('Role update endpoint accessible');
    } else {
      const error = await roleRes.json();
      logInfo(`Role update test response: ${error.message}`);
    }
    
    // Test join organization endpoint
    logInfo('Testing join organization endpoint...');
    const joinRes = await fetch(`${API_URL}/api/organization/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ organizationId })
    });
    
    if (joinRes.ok) {
      logSuccess('Join organization endpoint works');
    } else {
      const error = await joinRes.json();
      logInfo(`Join test response: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logError(`Organization management test failed: ${error.message}`);
    return false;
  }
}

async function testLeadManagement() {
  logSection('LEAD MANAGEMENT TESTS');
  
  try {
    // Create a lead with automatic assignment
    logInfo('Creating lead with automatic assignment...');
    const createRes = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        organizationId,
        lead_classification: 'Hot', // Should trigger automatic assignment
        lead_score: 85,
        budget_range: '$500k-$1M',
        timeline: '1-3 months'
      })
    });
    
    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(`Create lead failed: ${error.message}`);
    }
    
    const leadData = await createRes.json();
    leadId = leadData.id;
    logSuccess(`Lead created: ${leadId}`);
    
    if (leadData.agent_id) {
      logSuccess(`Lead automatically assigned to agent: ${leadData.agent_id}`);
    } else {
      logInfo('No automatic assignment (no agents available)');
    }
    
    // Test manual lead reassignment
    if (leadId) {
      logInfo('Testing manual lead reassignment...');
      const reassignRes = await fetch(`${API_URL}/api/leads/${leadId}/assign-agent`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId: userId })
      });
      
      if (reassignRes.ok) {
        logSuccess('Lead reassignment endpoint works');
      } else {
        const error = await reassignRes.json();
        logInfo(`Reassignment test response: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    logError(`Lead management test failed: ${error.message}`);
    return false;
  }
}

async function testConversationManagement() {
  logSection('CONVERSATION MANAGEMENT TESTS');
  
  try {
    // First, create an agent
    logInfo('Creating test agent...');
    const agentRes = await fetch(`${API_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Agent',
        description: 'Test agent for conversation testing',
        systemPrompt: 'You are a helpful real estate assistant.',
        organizationId
      })
    });
    
    if (agentRes.ok) {
      const agent = await agentRes.json();
      agentId = agent.id;
      logSuccess(`Agent created: ${agentId}`);
    }
    
    // Create a conversation
    logInfo('Creating test conversation...');
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({
        agent_id: agentId || '00000000-0000-0000-0000-000000000000',
        source: 'test',
        status: 'active',
        mode: 'ai'
      })
      .select()
      .single();
    
    if (convError) throw convError;
    conversationId = conv.id;
    logSuccess(`Conversation created: ${conversationId}`);
    
    // Add some test messages
    await supabase.from('messages').insert([
      { conversation_id: conversationId, sender: 'user', content: 'Hi, I need help finding a home' },
      { conversation_id: conversationId, sender: 'assistant', content: 'I can help you with that!' },
      { conversation_id: conversationId, sender: 'user', content: 'My budget is $500,000' }
    ]);
    
    // Test conversation scoring
    logInfo('Testing conversation scoring...');
    const scoreRes = await fetch(`${API_URL}/api/conversations/${conversationId}/score`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (scoreRes.ok) {
      const scoreData = await scoreRes.json();
      logSuccess(`Conversation scored: ${JSON.stringify(scoreData.score?.classification || 'N/A')}`);
    } else {
      logInfo('Scoring endpoint not accessible');
    }
    
    // Test transfer to human
    logInfo('Testing transfer to human...');
    const transferHumanRes = await fetch(`${API_URL}/api/conversations/${conversationId}/transfer-to-human`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test transfer',
        priority: 2
      })
    });
    
    if (transferHumanRes.ok) {
      const transferData = await transferHumanRes.json();
      logSuccess('Transfer to human successful');
      if (transferData.assignedAgent) {
        logSuccess(`Auto-assigned to: ${transferData.assignedAgent.name}`);
      }
    } else {
      const error = await transferHumanRes.json();
      logInfo(`Transfer to human test response: ${error.message}`);
    }
    
    // Test transfer back to AI
    logInfo('Testing transfer to AI...');
    const transferAIRes = await fetch(`${API_URL}/api/conversations/${conversationId}/transfer-to-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test transfer back'
      })
    });
    
    if (transferAIRes.ok) {
      logSuccess('Transfer to AI successful');
    } else {
      const error = await transferAIRes.json();
      logInfo(`Transfer to AI test response: ${error.message}`);
    }
    
    // Test conversation close
    logInfo('Testing conversation close with lead scoring...');
    const closeRes = await fetch(`${API_URL}/api/conversations/${conversationId}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Test completed'
      })
    });
    
    if (closeRes.ok) {
      const closeData = await closeRes.json();
      logSuccess('Conversation closed successfully');
      if (closeData.leadData) {
        logSuccess(`Lead data extracted: Score=${closeData.leadData.lead_score}, Classification=${closeData.leadData.lead_classification}`);
      }
    } else {
      const error = await closeRes.json();
      logInfo(`Close test response: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logError(`Conversation management test failed: ${error.message}`);
    return false;
  }
}

async function testNotificationWebhook() {
  logSection('NOTIFICATION WEBHOOK TEST');
  
  try {
    logInfo('Testing frontend notification webhook...');
    const res = await fetch(`${API_URL}/api/frontend/handoff-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: conversationId || 'test-conv-id',
        humanAgentId: userId || 'test-user-id',
        agentName: 'Test Agent',
        userMessage: 'Test notification',
        priority: 2
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }
    
    const data = await res.json();
    logSuccess(`Notification webhook works. ID: ${data.notificationId}`);
    return true;
  } catch (error) {
    logError(`Notification webhook test failed: ${error.message}`);
    return false;
  }
}

async function testFacebookIntegration() {
  logSection('FACEBOOK INTEGRATION TEST');
  
  try {
    logInfo('Testing Facebook page subscription...');
    const res = await fetch(`${API_URL}/api/facebook/subscribe-page`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pageId: 'test-page-123',
        pageName: 'Test Page',
        pageAccessToken: 'test-token-xyz',
        agentId: agentId || '00000000-0000-0000-0000-000000000000'
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message);
    }
    
    const data = await res.json();
    logSuccess('Facebook page subscription successful');
    return true;
  } catch (error) {
    logError(`Facebook integration test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\\n' + '='.repeat(60));
  log('COMPREHENSIVE FEATURE TESTING', 'yellow');
  console.log('='.repeat(60));
  
  const results = {
    auth: false,
    organization: false,
    leads: false,
    conversations: false,
    notifications: false,
    facebook: false
  };
  
  // Run tests in sequence
  results.auth = await authenticateUser();
  
  if (results.auth) {
    results.organization = await testOrganizationManagement();
    results.leads = await testLeadManagement();
    results.conversations = await testConversationManagement();
    results.notifications = await testNotificationWebhook();
    results.facebook = await testFacebookIntegration();
  }
  
  // Summary
  logSection('TEST SUMMARY');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  console.log('\\nTest Results:');
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    const color = result ? 'green' : 'red';
    log(`  ${test.padEnd(15)} ${status}`, color);
  }
  
  console.log('\\n' + '-'.repeat(30));
  if (passed === total) {
    log(`ALL TESTS PASSED (${passed}/${total})`, 'green');
  } else if (passed > total / 2) {
    log(`PARTIAL SUCCESS (${passed}/${total})`, 'yellow');
  } else {
    log(`TESTS FAILED (${passed}/${total})`, 'red');
  }
  console.log('='.repeat(60) + '\\n');
  
  // Cleanup
  if (authToken) {
    await supabase.auth.signOut();
  }
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  process.exit(1);
});