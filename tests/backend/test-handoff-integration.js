#!/usr/bin/env node

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test configuration
const API_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Color codes for output
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

class HandoffIntegrationTest {
  constructor() {
    this.testConversationId = null;
    this.testAgentId = null;
    this.testOrgId = '770257fa-dc41-4529-9cb3-43b47072c271'; // Your test org
  }

  async setup() {
    log('\n=== SETUP ===', 'cyan');
    
    // Get an AI agent for testing
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('organization_id', this.testOrgId)
      .limit(1)
      .single();

    if (agentError || !agent) {
      throw new Error('No AI agent found for testing');
    }

    this.testAgentId = agent.id;
    log(`✓ Using AI agent: ${agent.name} (${agent.id})`, 'green');

    // Create a test conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        agent_id: this.testAgentId,
        user_id: 'test-user-' + Date.now(),
        organization_id: this.testOrgId,
        source: 'web',
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) {
      throw new Error(`Failed to create test conversation: ${convError.message}`);
    }

    this.testConversationId = conversation.id;
    log(`✓ Created test conversation: ${this.testConversationId}`, 'green');

    // Add some messages to the conversation
    await supabase
      .from('messages')
      .insert([
        {
          conversation_id: this.testConversationId,
          role: 'user',
          content: 'Hello, I need help with a property',
          created_at: new Date().toISOString()
        },
        {
          conversation_id: this.testConversationId,
          role: 'assistant',
          content: 'Hello! I\'d be happy to help you with property information.',
          created_at: new Date(Date.now() + 1000).toISOString()
        }
      ]);

    log('✓ Added test messages to conversation', 'green');
  }

  async testHandoffRequest() {
    log('\n=== TEST: Handoff Request ===', 'cyan');
    
    try {
      // Make handoff request
      const response = await fetch(`${API_URL}/api/conversations/${this.testConversationId}/request-handoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Customer requested human assistance for complex query',
          priority: 'high',
          notes: 'Test handoff integration'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        log(`✗ Handoff request failed: ${data.message}`, 'red');
        return false;
      }

      log(`✓ Handoff request successful`, 'green');
      log(`  Status: ${data.handoff?.status}`, 'yellow');
      log(`  Priority: ${data.handoff?.priority}`, 'yellow');
      
      if (data.handoff?.assignedTo) {
        log(`  Assigned to: ${data.handoff.assignedTo.name} (${data.handoff.assignedTo.id})`, 'green');
      } else {
        log(`  No agent assigned (pending)`, 'yellow');
      }

      // Verify in database
      const { data: handoff, error } = await supabase
        .from('conversation_handoffs')
        .select('*')
        .eq('conversation_id', this.testConversationId)
        .single();

      if (error) {
        log(`✗ Failed to verify handoff in database: ${error.message}`, 'red');
        return false;
      }

      log(`✓ Handoff verified in database`, 'green');
      log(`  Handoff ID: ${handoff.id}`, 'yellow');
      log(`  Organization ID: ${handoff.organization_id}`, 'yellow');
      log(`  Status: ${handoff.status}`, 'yellow');
      log(`  Assigned to: ${handoff.assigned_to || 'None'}`, 'yellow');

      // Verify conversation was updated
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('handoff, handoff_requested_at, assigned_human_agent_id, status')
        .eq('id', this.testConversationId)
        .single();

      if (convError) {
        log(`✗ Failed to verify conversation update: ${convError.message}`, 'red');
        return false;
      }

      log(`✓ Conversation updated correctly`, 'green');
      log(`  Handoff flag: ${conv.handoff}`, 'yellow');
      log(`  Status: ${conv.status}`, 'yellow');
      log(`  Assigned human agent: ${conv.assigned_human_agent_id || 'None'}`, 'yellow');

      // Check if a system message was created
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', this.testConversationId)
        .eq('role', 'system')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!msgError && messages?.length > 0) {
        log(`✓ System message created: "${messages[0].content}"`, 'green');
      }

      return true;
    } catch (error) {
      log(`✗ Test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testDuplicateHandoffPrevention() {
    log('\n=== TEST: Duplicate Handoff Prevention ===', 'cyan');
    
    try {
      // Try to request handoff again
      const response = await fetch(`${API_URL}/api/conversations/${this.testConversationId}/request-handoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Duplicate request test',
          priority: 'urgent'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        log(`✗ Duplicate handoff was allowed (should have been prevented)`, 'red');
        return false;
      }

      if (response.status === 400 && data.message.includes('already requested')) {
        log(`✓ Duplicate handoff prevented correctly`, 'green');
        log(`  Error message: ${data.message}`, 'yellow');
        return true;
      }

      log(`✗ Unexpected response: ${data.message}`, 'red');
      return false;
    } catch (error) {
      log(`✗ Test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async testAgentAvailability() {
    log('\n=== TEST: Agent Availability Check ===', 'cyan');
    
    try {
      // Check how many agents are available
      const { data: agents, error } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', this.testOrgId)
        .eq('role', 'agent');

      if (error) {
        log(`✗ Failed to check agents: ${error.message}`, 'red');
        return false;
      }

      log(`✓ Found ${agents.length} human agents in organization`, 'green');

      if (agents.length === 0) {
        log(`  ⚠️  No human agents available - handoffs will remain pending`, 'yellow');
      } else {
        // Check agent loads
        for (const agent of agents) {
          const { data: userData } = await supabase.auth.admin.getUserById(agent.user_id);
          const name = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown';
          
          const { count } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_human_agent_id', agent.user_id)
            .in('status', ['active', 'handoff_assigned']);

          log(`  Agent: ${name} - Current load: ${count || 0} conversations`, 'yellow');
        }
      }

      return true;
    } catch (error) {
      log(`✗ Test failed: ${error.message}`, 'red');
      return false;
    }
  }

  async cleanup() {
    log('\n=== CLEANUP ===', 'cyan');
    
    if (this.testConversationId) {
      // Clean up handoffs
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', this.testConversationId);

      // Clean up messages
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', this.testConversationId);

      // Clean up conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', this.testConversationId);

      log('✓ Test data cleaned up', 'green');
    }
  }

  async runTests() {
    log('\n' + '='.repeat(60), 'blue');
    log('HANDOFF SYSTEM INTEGRATION TEST', 'blue');
    log('='.repeat(60), 'blue');

    let allPassed = true;

    try {
      await this.setup();
      
      // Run tests
      const test1 = await this.testHandoffRequest();
      allPassed = allPassed && test1;

      const test2 = await this.testDuplicateHandoffPrevention();
      allPassed = allPassed && test2;

      const test3 = await this.testAgentAvailability();
      allPassed = allPassed && test3;

    } catch (error) {
      log(`\n✗ Test suite error: ${error.message}`, 'red');
      allPassed = false;
    } finally {
      await this.cleanup();
    }

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    if (allPassed) {
      log('✅ ALL TESTS PASSED', 'green');
    } else {
      log('❌ SOME TESTS FAILED', 'red');
    }
    log('='.repeat(60), 'blue');

    process.exit(allPassed ? 0 : 1);
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Server not healthy');
    }
    return true;
  } catch (error) {
    log('\n❌ Server is not running on port 3001', 'red');
    log('Please start the server with: npm run server', 'yellow');
    return false;
  }
}

// Run the tests
async function main() {
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }

  const tester = new HandoffIntegrationTest();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = HandoffIntegrationTest;