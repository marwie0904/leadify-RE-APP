const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';
const API_BASE_URL = 'http://localhost:3001';

// Test user credentials
const TEST_EMAIL = 'test_bant_fix@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_ORG_NAME = 'Test BANT Organization';
const TEST_AGENT_NAME = 'Test BANT Agent';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// BANT configuration matching what the frontend sends
const bantConfiguration = {
  enabled: true,
  budgetWeight: 30,
  authorityWeight: 25,
  needWeight: 25,
  timelineWeight: 15,
  contactWeight: 5,
  budgetRanges: ['Under $500K', '$500K-$1M', '$1M-$2M', 'Over $2M'],
  authorityRoles: ['Decision Maker', 'Influencer', 'End User', 'Other'],
  needUrgency: ['Immediate', 'This Quarter', 'This Year', 'Exploring'],
  timelineOptions: ['Within 1 month', '1-3 months', '3-6 months', '6+ months'],
  thresholds: {
    hot: 80,
    warm: 60,
    cold: 40
  }
};

async function cleanupTestData() {
  console.log('🧹 Cleaning up existing test data...');
  
  try {
    // Get user ID if exists
    const { data: userData } = await supabase.auth.admin.listUsers();
    const testUser = userData?.users?.find(u => u.email === TEST_EMAIL);
    
    if (testUser) {
      // Delete agent configs first (due to foreign key)
      await supabase
        .from('agent_configs')
        .delete()
        .eq('agent_id', testUser.id);
      
      // Delete agents
      await supabase
        .from('agents')
        .delete()
        .eq('user_id', testUser.id);
      
      // Delete organization members
      await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', testUser.id);
      
      // Delete organizations
      await supabase
        .from('organizations')
        .delete()
        .eq('created_by', testUser.id);
      
      // Delete user
      await supabase.auth.admin.deleteUser(testUser.id);
      console.log('✅ Cleaned up existing test user and data');
    }
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

async function createTestUser() {
  console.log('\n👤 Creating test user...');
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true
  });
  
  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }
  
  console.log('✅ Test user created:', TEST_EMAIL);
  return authData.user;
}

async function simulateOrganizationFlow(userId, accessToken) {
  console.log('\n🏢 Simulating organization flow (like onboarding)...');
  
  // Step 1: Create organization via API (simulating frontend flow)
  console.log('  📝 Creating organization via API...');
  const orgResponse = await fetch(`${API_BASE_URL}/api/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: TEST_ORG_NAME
    })
  });
  
  if (!orgResponse.ok) {
    const error = await orgResponse.text();
    throw new Error(`Failed to create organization: ${error}`);
  }
  
  const orgData = await orgResponse.json();
  console.log('  ✅ Organization created:', orgData.organization?.name || orgData.name);
  
  // Step 2: Create agent with BANT configuration (simulating frontend flow)
  console.log('\n  🤖 Creating agent with BANT configuration...');
  const agentResponse = await fetch(`${API_BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: TEST_AGENT_NAME,
      role: 'Real Estate Sales Agent',
      context: 'You are a helpful real estate agent assistant.',
      leadQualificationEnabled: true,
      organizationId: orgData.organization?.id || orgData.id, // Include organization ID
      bantConfiguration: bantConfiguration // This is what the frontend sends
    })
  });
  
  if (!agentResponse.ok) {
    const errorText = await agentResponse.text();
    console.log('  ❌ Agent creation failed with status:', agentResponse.status);
    console.log('  Error response:', errorText);
    
    // Try to parse as JSON to get more details
    try {
      const errorJson = JSON.parse(errorText);
      console.log('  Error details:', errorJson);
    } catch (e) {
      // Not JSON, that's ok
    }
    
    throw new Error(`Failed to create agent: ${errorText}`);
  }
  
  const agentData = await agentResponse.json();
  console.log('  ✅ Agent created:', agentData.agent?.name || agentData.name);
  
  return {
    organizationId: orgData.organization?.id || orgData.id,
    agentId: agentData.agent?.id || agentData.id
  };
}

async function verifyBantCriteria(agentId) {
  console.log('\n🔍 Verifying BANT criteria_prompt in database...');
  
  // Check agent_configs table for criteria_prompt
  const { data: configData, error: configError } = await supabase
    .from('agent_configs')
    .select('criteria_prompt')
    .eq('agent_id', agentId)
    .single();
  
  if (configError) {
    throw new Error(`Failed to fetch agent config: ${configError.message}`);
  }
  
  if (!configData || !configData.criteria_prompt) {
    console.error('❌ NO CRITERIA_PROMPT FOUND IN DATABASE!');
    return false;
  }
  
  console.log('\n📋 Criteria prompt found in database:');
  console.log('  Length:', configData.criteria_prompt.length, 'characters');
  
  // Verify the content includes expected elements
  const promptContent = configData.criteria_prompt.toLowerCase();
  const expectedElements = [
    'bant criteria',
    'budget',
    'authority',
    'need',
    'timeline',
    'contact',
    'weight distribution',
    'score'
  ];
  
  console.log('\n  Checking for expected elements:');
  let allElementsFound = true;
  for (const element of expectedElements) {
    const found = promptContent.includes(element);
    console.log(`    ${found ? '✅' : '❌'} Contains "${element}"`);
    if (!found) allElementsFound = false;
  }
  
  // Check for specific weights
  console.log('\n  Checking for specific weights:');
  const hasWeights = 
    configData.criteria_prompt.includes('30 points') && // Budget weight
    configData.criteria_prompt.includes('25 points') && // Authority weight
    configData.criteria_prompt.includes('15 points') && // Timeline weight
    configData.criteria_prompt.includes('5 points');    // Contact weight
  
  console.log(`    ${hasWeights ? '✅' : '❌'} Contains correct weight values`);
  
  // Check for budget ranges
  const hasBudgetRanges = bantConfiguration.budgetRanges.every(range => 
    configData.criteria_prompt.includes(range)
  );
  console.log(`    ${hasBudgetRanges ? '✅' : '❌'} Contains all budget ranges`);
  
  // Check for authority roles
  const hasAuthorityRoles = bantConfiguration.authorityRoles.every(role => 
    configData.criteria_prompt.includes(role)
  );
  console.log(`    ${hasAuthorityRoles ? '✅' : '❌'} Contains all authority roles`);
  
  // Display first 500 characters of the prompt
  console.log('\n  First 500 characters of criteria_prompt:');
  console.log('  ---');
  console.log(configData.criteria_prompt.substring(0, 500) + '...');
  console.log('  ---');
  
  return allElementsFound && hasWeights && hasBudgetRanges && hasAuthorityRoles;
}

async function testConversationWithBant(agentId, accessToken) {
  console.log('\n💬 Testing conversation with BANT scoring...');
  
  // Start a conversation
  const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message: "Hi, I'm looking for a house. My budget is around $1.5 million and I need to buy within 2 months.",
      agentId: agentId,
      source: 'web'
    })
  });
  
  if (!chatResponse.ok) {
    const error = await chatResponse.text();
    throw new Error(`Failed to send chat message: ${error}`);
  }
  
  const chatData = await chatResponse.json();
  console.log('  ✅ Conversation started:', chatData.conversationId);
  
  // Check if BANT scoring was triggered
  // Note: The actual BANT scoring happens asynchronously, but we can verify the setup
  const { data: conversation } = await supabase
    .from('conversations')
    .select('lead_id')
    .eq('id', chatData.conversationId)
    .single();
  
  if (conversation?.lead_id) {
    console.log('  ✅ Lead created with ID:', conversation.lead_id);
    
    // Check if BANT memory was created
    const { data: bantMemory } = await supabase
      .from('bant_memory')
      .select('*')
      .eq('conversation_id', chatData.conversationId)
      .single();
    
    if (bantMemory) {
      console.log('  ✅ BANT memory initialized');
      console.log('    - Budget info captured:', !!bantMemory.budget_info);
      console.log('    - Current question:', bantMemory.current_question || 'None');
    }
  }
  
  return true;
}

async function runTest() {
  console.log('====================================');
  console.log('🧪 BANT CRITERIA_PROMPT FIX TEST');
  console.log('====================================');
  console.log('This test verifies that the criteria_prompt is properly');
  console.log('generated and saved when creating an agent during the');
  console.log('organization flow (onboarding).');
  console.log('====================================\n');
  
  try {
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test user
    const user = await createTestUser();
    
    // Sign in to get access token
    console.log('\n🔐 Signing in test user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (signInError) {
      throw new Error(`Failed to sign in: ${signInError.message}`);
    }
    
    const accessToken = signInData.session.access_token;
    console.log('✅ Signed in successfully');
    
    // Simulate the organization flow (like during onboarding)
    const { agentId } = await simulateOrganizationFlow(user.id, accessToken);
    
    // Verify BANT criteria was saved
    const criteriaValid = await verifyBantCriteria(agentId);
    
    // Test conversation with BANT
    await testConversationWithBant(agentId, accessToken);
    
    console.log('\n====================================');
    console.log('📊 TEST RESULTS');
    console.log('====================================');
    
    if (criteriaValid) {
      console.log('✅ SUCCESS: BANT criteria_prompt is properly generated');
      console.log('   and saved during the organization flow!');
      console.log('\n🎉 The fix is working correctly!');
      console.log('\nThe AI will now use the custom BANT scoring criteria');
      console.log('instead of falling back to programmatic scoring.');
    } else {
      console.log('❌ FAILURE: BANT criteria_prompt is NOT properly saved');
      console.log('   The fix may not be working correctly.');
      console.log('\n⚠️  Please check the backend agent creation endpoint.');
    }
    
    console.log('====================================\n');
    
    // Clean up test data
    await cleanupTestData();
    
    process.exit(criteriaValid ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
    
    // Try to clean up on error
    await cleanupTestData().catch(() => {});
    
    process.exit(1);
  }
}

// Run the test
runTest();