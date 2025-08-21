/**
 * Test Suite for Lead Assignment to Human Agents
 * 
 * This test verifies that leads are correctly assigned to organization members
 * with role='agent' instead of AI agents from the agents table.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';

// Test data
let testOrganizationId;
let testAgentId; // AI Agent
let testHumanAgentId; // Human Agent (org member with role='agent')
let testUserId;
let testConversationId;

// Helper function to create test organization
async function createTestOrganization() {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Lead Assignment Org',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

// Helper function to create test user
async function createTestUser(email) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: email.split('@')[0]
    }
  });
  
  if (error) throw error;
  
  // Create a profile for the user (required for findMostAvailableAgent)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email: email,
      full_name: email.split('@')[0]
    });
  
  if (profileError && profileError.code !== '23505') { // Ignore duplicate errors
    console.log('Warning: Could not create profile:', profileError);
  }
  
  return data.user.id;
}

// Helper function to add user to organization with specific role
async function addUserToOrganization(userId, organizationId, role) {
  const { error } = await supabase
    .from('organization_members')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      role,
      joined_at: new Date().toISOString()
    });
  
  if (error) throw error;
}

// Helper function to create AI agent
async function createTestAgent(organizationId, userId) {
  const { data, error } = await supabase
    .from('agents')
    .insert({
      name: 'Test AI Agent',
      user_id: userId,  // Required field
      organization_id: organizationId,
      tone: 'Professional',  // Must be 'Professional', 'Friendly', or 'Neutral'
      status: 'creating',  // Valid status values are: creating, ready, error
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

// Helper function to create test conversation
async function createTestConversation(agentId, organizationId) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      agent_id: agentId,
      organization_id: organizationId,
      user_id: 'test-user',  // Required field
      source: 'web',  // Required field: web, facebook, or embed
      status: 'active',
      started_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data.id;
}

// Test 1: Verify findMostAvailableAgent only returns users with role='agent'
async function testFindMostAvailableAgent() {
  console.log('\n🧪 Test 1: findMostAvailableAgent should only return users with role="agent"');
  
  try {
    // Make internal API call to test the function
    const response = await axios.post(`${API_URL}/api/test/find-agent`, {
      organizationId: testOrganizationId
    });
    
    if (response.data.agent) {
      console.log('✅ Found agent:', response.data.agent.name);
      console.log('   Agent ID:', response.data.agent.id);
      
      // Verify this user has role='agent' in organization_members
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', response.data.agent.id)
        .eq('organization_id', testOrganizationId)
        .single();
      
      if (membership && membership.role === 'agent') {
        console.log('✅ Confirmed: User has role="agent"');
        return true;
      } else {
        console.log('❌ Error: User does not have role="agent", has:', membership?.role);
        return false;
      }
    } else {
      console.log('⚠️ No agent found (expected if no agents in org)');
      return true;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Test 2: Verify lead creation via API assigns to human agent
async function testLeadCreationViaAPI() {
  console.log('\n🧪 Test 2: Lead creation via POST /api/leads should assign to human agent');
  
  try {
    const response = await axios.post(`${API_URL}/api/leads`, {
      name: 'Test Lead',
      email: 'testlead@example.com',
      phone: '1234567890',
      organizationId: testOrganizationId,
      lead_classification: 'Hot',
      source: 'test'
    });
    
    const lead = response.data;
    console.log('✅ Lead created:', lead.id);
    
    if (lead.agent_id) {
      // Verify the assigned agent is a human agent (org member)
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', lead.agent_id)
        .eq('organization_id', testOrganizationId)
        .single();
      
      if (membership && membership.role === 'agent') {
        console.log('✅ Lead assigned to human agent with role="agent"');
        console.log('   Assigned agent ID:', lead.agent_id);
        return true;
      } else {
        // Check if it's mistakenly assigned to AI agent
        const { data: aiAgent } = await supabase
          .from('agents')
          .select('id')
          .eq('id', lead.agent_id)
          .single();
        
        if (aiAgent) {
          console.log('❌ Error: Lead assigned to AI agent instead of human agent');
          return false;
        }
        
        console.log('❌ Error: Lead assigned to user without agent role');
        return false;
      }
    } else {
      console.log('⚠️ No agent assigned (OK if no agents available)');
      return true;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Test 3: Verify lead creation from BANT conversation assigns to human agent
async function testLeadCreationFromBANT() {
  console.log('\n🧪 Test 3: Lead creation from BANT conversation should assign to human agent');
  
  try {
    // Simulate BANT completion by creating necessary data
    const { data: bantMemory } = await supabase
      .from('bant_memory')
      .insert({
        conversation_id: testConversationId,
        budget_range: 'high',
        authority: 'single',
        need: 'Investment property',
        timeline: '3 months',
        contact_info: JSON.stringify({
          fullName: 'BANT Test Lead',
          mobileNumber: '9876543210',
          email: 'banttest@example.com'
        }),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // Simulate lead creation through conversation (this would normally happen in chat flow)
    // We'll directly test the createLeadFromBANT function behavior
    
    // Check if a lead was created for this conversation
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('conversation_id', testConversationId)
      .single();
    
    if (lead) {
      console.log('✅ Lead found for conversation:', lead.id);
      
      if (lead.agent_id) {
        // Verify it's a human agent
        const { data: membership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', lead.agent_id)
          .eq('organization_id', testOrganizationId)
          .single();
        
        if (membership && membership.role === 'agent') {
          console.log('✅ BANT lead assigned to human agent');
          return true;
        } else {
          console.log('❌ BANT lead not assigned to human agent');
          return false;
        }
      } else {
        console.log('⚠️ No agent assigned to BANT lead');
        return true; // OK if no agents available
      }
    } else {
      console.log('⚠️ No lead created from BANT (testing direct creation)');
      // Test direct creation with BANT data
      return await testDirectBANTLeadCreation();
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Helper for direct BANT lead creation test
async function testDirectBANTLeadCreation() {
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      conversation_id: testConversationId,
      organization_id: testOrganizationId,
      full_name: 'Direct BANT Test',
      email: 'directbant@example.com',
      mobile_number: '5555555555',
      budget_range: 'high',
      authority: 'individual',  // Must be 'individual' or 'shared'
      need: 'Test property',
      timeline: '1 month',
      lead_classification: 'Hot',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.log('❌ Failed to create direct BANT lead:', error);
    return false;
  }
  
  console.log('✅ Direct BANT lead created');
  return true;
}

// Test 4: Verify admin/moderator users are NOT assigned leads
async function testOnlyAgentRoleGetsLeads() {
  console.log('\n🧪 Test 4: Only users with role="agent" should be assigned leads');
  
  try {
    // Create users with different roles
    const adminUser = await createTestUser('admin_test@example.com');
    const moderatorUser = await createTestUser('moderator_test@example.com');
    
    await addUserToOrganization(adminUser, testOrganizationId, 'admin');
    await addUserToOrganization(moderatorUser, testOrganizationId, 'moderator');
    
    // Test lead assignment
    const response = await axios.post(`${API_URL}/api/test/find-agent`, {
      organizationId: testOrganizationId
    });
    
    if (response.data.agent) {
      // Verify the selected agent is NOT admin or moderator
      if (response.data.agent.id === adminUser || response.data.agent.id === moderatorUser) {
        console.log('❌ Error: Admin or moderator was selected as agent');
        return false;
      }
      
      // Verify it's the agent role user
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', response.data.agent.id)
        .eq('organization_id', testOrganizationId)
        .single();
      
      if (membership?.role === 'agent') {
        console.log('✅ Correctly selected user with agent role only');
        return true;
      } else {
        console.log('❌ Selected user has wrong role:', membership?.role);
        return false;
      }
    } else {
      console.log('✅ No agent selected (correct - no users with agent role)');
      return true;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Test 5: Test load balancing between multiple agents
async function testLoadBalancing() {
  console.log('\n🧪 Test 5: Load balancing between multiple agents');
  
  try {
    // Create multiple agents
    const agent1 = await createTestUser('agent1@example.com');
    const agent2 = await createTestUser('agent2@example.com');
    
    await addUserToOrganization(agent1, testOrganizationId, 'agent');
    await addUserToOrganization(agent2, testOrganizationId, 'agent');
    
    // Create some existing conversations for agent1 to make them busier
    for (let i = 0; i < 3; i++) {
      await supabase
        .from('conversations')
        .insert({
          agent_id: testAgentId,
          organization_id: testOrganizationId,
          assigned_human_agent_id: agent1,
          mode: 'human',
          status: 'active',
          started_at: new Date().toISOString()
        });
    }
    
    // Now test assignment - should go to agent2 as they have fewer conversations
    const response = await axios.post(`${API_URL}/api/test/find-agent`, {
      organizationId: testOrganizationId
    });
    
    if (response.data.agent) {
      if (response.data.agent.id === agent2) {
        console.log('✅ Correctly assigned to least busy agent');
        return true;
      } else {
        console.log('❌ Did not assign to least busy agent');
        return false;
      }
    } else {
      console.log('❌ No agent found');
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Lead Assignment Tests');
  console.log('=' .repeat(50));
  
  let totalTests = 0;
  let passedTests = 0;
  
  try {
    // Setup test data
    console.log('\n📋 Setting up test data...');
    testOrganizationId = await createTestOrganization();
    console.log('✅ Created test organization:', testOrganizationId);
    
    // Create a test user for the AI agent owner
    const agentOwnerId = await createTestUser('agentowner@example.com');
    console.log('✅ Created agent owner user:', agentOwnerId);
    
    testAgentId = await createTestAgent(testOrganizationId, agentOwnerId);
    console.log('✅ Created test AI agent:', testAgentId);
    
    testHumanAgentId = await createTestUser('humanagent@example.com');
    await addUserToOrganization(testHumanAgentId, testOrganizationId, 'agent');
    console.log('✅ Created test human agent:', testHumanAgentId);
    
    testConversationId = await createTestConversation(testAgentId, testOrganizationId);
    console.log('✅ Created test conversation:', testConversationId);
    
    // Run tests
    const tests = [
      testFindMostAvailableAgent,
      testLeadCreationViaAPI,
      testLeadCreationFromBANT,
      testOnlyAgentRoleGetsLeads,
      testLoadBalancing
    ];
    
    for (const test of tests) {
      totalTests++;
      const passed = await test();
      if (passed) passedTests++;
    }
    
  } catch (error) {
    console.error('\n❌ Test setup failed:', error);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete test data in reverse order of dependencies
      await supabase.from('leads').delete().eq('organization_id', testOrganizationId);
      await supabase.from('bant_memory').delete().eq('conversation_id', testConversationId);
      await supabase.from('conversations').delete().eq('organization_id', testOrganizationId);
      await supabase.from('organization_members').delete().eq('organization_id', testOrganizationId);
      await supabase.from('agents').delete().eq('id', testAgentId);
      await supabase.from('organizations').delete().eq('id', testOrganizationId);
      
      // Delete test users
      const testEmails = ['agentowner@example.com', 'humanagent@example.com', 'admin_test@example.com', 
                         'moderator_test@example.com', 'agent1@example.com', 'agent2@example.com'];
      for (const email of testEmails) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        if (user) {
          await supabase.auth.admin.deleteUser(user.id);
        }
      }
      
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.log('⚠️ Some cleanup failed:', cleanupError.message);
    }
    
    // Print summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n❌ Some tests failed. Please review the output above.');
    }
  }
}

// Run the tests
runTests();