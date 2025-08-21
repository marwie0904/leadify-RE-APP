const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';
const API_BASE_URL = 'http://localhost:3001';

// Test configurations
const TEST_EMAIL = 'test_weights@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Different weight configurations to test
const testConfigs = [
  {
    name: 'Custom Weights (30/25/25/15/5)',
    config: {
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
      thresholds: { hot: 80, warm: 60, cold: 40 }
    }
  },
  {
    name: 'Equal Weights (20/20/20/20/20)',
    config: {
      enabled: true,
      budgetWeight: 20,
      authorityWeight: 20,
      needWeight: 20,
      timelineWeight: 20,
      contactWeight: 20,
      budgetRanges: ['Under $1M', 'Over $1M'],
      authorityRoles: ['Decision Maker', 'Other'],
      needUrgency: ['Urgent', 'Not Urgent'],
      timelineOptions: ['Soon', 'Later'],
      thresholds: { hot: 75, warm: 50, cold: 25 }
    }
  },
  {
    name: 'Budget Heavy (40/20/20/15/5)',
    config: {
      enabled: true,
      budgetWeight: 40,
      authorityWeight: 20,
      needWeight: 20,
      timelineWeight: 15,
      contactWeight: 5,
      budgetRanges: ['Premium', 'Standard', 'Budget'],
      authorityRoles: ['Authorized', 'Not Authorized'],
      needUrgency: ['Critical', 'Important', 'Nice to Have'],
      timelineOptions: ['Immediate', 'Planned'],
      thresholds: { hot: 85, warm: 65, cold: 45 }
    }
  }
];

async function cleanupTestData() {
  console.log('🧹 Cleaning up existing test data...');
  
  try {
    const { data: userData } = await supabase.auth.admin.listUsers();
    const testUser = userData?.users?.find(u => u.email === TEST_EMAIL);
    
    if (testUser) {
      // Clean up related data
      await supabase.from('custom_bant_configs').delete().eq('agent_id', testUser.id);
      await supabase.from('agent_configs').delete().eq('agent_id', testUser.id);
      await supabase.from('agents').delete().eq('user_id', testUser.id);
      await supabase.from('organization_members').delete().eq('user_id', testUser.id);
      await supabase.from('organizations').delete().eq('created_by', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
      console.log('✅ Cleaned up existing test data');
    }
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

async function createTestAgent(accessToken, orgId, agentName, bantConfig) {
  console.log(`\n  🤖 Creating agent: ${agentName}`);
  
  const response = await fetch(`${API_BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: agentName,
      role: 'Real Estate Sales Agent',
      context: 'You are a helpful real estate agent assistant.',
      leadQualificationEnabled: true,
      organizationId: orgId,
      bantConfiguration: bantConfig
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent: ${error}`);
  }
  
  const agentData = await response.json();
  const agentId = agentData.agent?.id || agentData.id;
  console.log(`    ✅ Agent created with ID: ${agentId}`);
  
  return agentId;
}

async function verifyWeights(agentId, expectedConfig) {
  console.log(`\n  🔍 Verifying weights for agent ${agentId}`);
  
  // Check custom_bant_configs table
  const { data: bantConfig, error: bantError } = await supabase
    .from('custom_bant_configs')
    .select('*')
    .eq('agent_id', agentId)
    .single();
  
  if (bantError || !bantConfig) {
    console.error('    ❌ Failed to fetch BANT config:', bantError?.message);
    return false;
  }
  
  // Check agent_configs table for criteria_prompt
  const { data: agentConfig, error: agentError } = await supabase
    .from('agent_configs')
    .select('criteria_prompt')
    .eq('agent_id', agentId)
    .single();
  
  if (agentError || !agentConfig) {
    console.error('    ❌ Failed to fetch agent config:', agentError?.message);
    return false;
  }
  
  // Verify weights
  const weightsCorrect = 
    bantConfig.budget_weight === expectedConfig.budgetWeight &&
    bantConfig.authority_weight === expectedConfig.authorityWeight &&
    bantConfig.need_weight === expectedConfig.needWeight &&
    bantConfig.timeline_weight === expectedConfig.timelineWeight &&
    bantConfig.contact_weight === expectedConfig.contactWeight;
  
  console.log(`    📊 Weight Verification:`);
  console.log(`      Budget: ${bantConfig.budget_weight} (expected: ${expectedConfig.budgetWeight}) ${bantConfig.budget_weight === expectedConfig.budgetWeight ? '✅' : '❌'}`);
  console.log(`      Authority: ${bantConfig.authority_weight} (expected: ${expectedConfig.authorityWeight}) ${bantConfig.authority_weight === expectedConfig.authorityWeight ? '✅' : '❌'}`);
  console.log(`      Need: ${bantConfig.need_weight} (expected: ${expectedConfig.needWeight}) ${bantConfig.need_weight === expectedConfig.needWeight ? '✅' : '❌'}`);
  console.log(`      Timeline: ${bantConfig.timeline_weight} (expected: ${expectedConfig.timelineWeight}) ${bantConfig.timeline_weight === expectedConfig.timelineWeight ? '✅' : '❌'}`);
  console.log(`      Contact: ${bantConfig.contact_weight} (expected: ${expectedConfig.contactWeight}) ${bantConfig.contact_weight === expectedConfig.contactWeight ? '✅' : '❌'}`);
  
  // Verify criteria are saved
  const criteriaCorrect = 
    JSON.stringify(bantConfig.budget_criteria) === JSON.stringify(expectedConfig.budgetRanges) &&
    JSON.stringify(bantConfig.authority_criteria) === JSON.stringify(expectedConfig.authorityRoles) &&
    JSON.stringify(bantConfig.need_criteria) === JSON.stringify(expectedConfig.needUrgency) &&
    JSON.stringify(bantConfig.timeline_criteria) === JSON.stringify(expectedConfig.timelineOptions);
  
  console.log(`    📋 Criteria Verification:`);
  console.log(`      Budget Ranges: ${JSON.stringify(bantConfig.budget_criteria) === JSON.stringify(expectedConfig.budgetRanges) ? '✅' : '❌'}`);
  console.log(`      Authority Roles: ${JSON.stringify(bantConfig.authority_criteria) === JSON.stringify(expectedConfig.authorityRoles) ? '✅' : '❌'}`);
  console.log(`      Need Urgency: ${JSON.stringify(bantConfig.need_criteria) === JSON.stringify(expectedConfig.needUrgency) ? '✅' : '❌'}`);
  console.log(`      Timeline Options: ${JSON.stringify(bantConfig.timeline_criteria) === JSON.stringify(expectedConfig.timelineOptions) ? '✅' : '❌'}`);
  
  // Verify thresholds
  const thresholdsCorrect = 
    bantConfig.hot_threshold === expectedConfig.thresholds.hot &&
    bantConfig.warm_threshold === expectedConfig.thresholds.warm;
  
  console.log(`    🎯 Threshold Verification:`);
  console.log(`      Hot: ${bantConfig.hot_threshold} (expected: ${expectedConfig.thresholds.hot}) ${bantConfig.hot_threshold === expectedConfig.thresholds.hot ? '✅' : '❌'}`);
  console.log(`      Warm: ${bantConfig.warm_threshold} (expected: ${expectedConfig.thresholds.warm}) ${bantConfig.warm_threshold === expectedConfig.thresholds.warm ? '✅' : '❌'}`);
  
  // Verify criteria_prompt contains correct weights
  const promptHasWeights = 
    agentConfig.criteria_prompt.includes(`${expectedConfig.budgetWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedConfig.authorityWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedConfig.needWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedConfig.timelineWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedConfig.contactWeight} points`);
  
  console.log(`    📝 Criteria Prompt Verification:`);
  console.log(`      Has correct weights: ${promptHasWeights ? '✅' : '❌'}`);
  console.log(`      Length: ${agentConfig.criteria_prompt.length} characters`);
  
  return weightsCorrect && criteriaCorrect && thresholdsCorrect && promptHasWeights;
}

async function runTest() {
  console.log('====================================');
  console.log('🧪 BANT WEIGHTS VERIFICATION TEST');
  console.log('====================================');
  console.log('Testing that custom BANT weights are properly saved');
  console.log('to the custom_bant_configs table during agent creation.');
  console.log('====================================\n');
  
  let allTestsPassed = true;
  
  try {
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test user
    console.log('👤 Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });
    
    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }
    
    const userId = authData.user.id;
    console.log('✅ Test user created');
    
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
    
    // Create organization
    console.log('\n🏢 Creating test organization...');
    const orgResponse = await fetch(`${API_BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Test Weight Organization'
      })
    });
    
    if (!orgResponse.ok) {
      throw new Error('Failed to create organization');
    }
    
    const orgData = await orgResponse.json();
    const orgId = orgData.organization?.id || orgData.id;
    console.log('✅ Organization created');
    
    // Test each configuration
    console.log('\n🧪 Testing different weight configurations...');
    
    for (const testCase of testConfigs) {
      console.log(`\n📊 Test Case: ${testCase.name}`);
      console.log('  Expected weights:', 
        `B:${testCase.config.budgetWeight}`,
        `A:${testCase.config.authorityWeight}`,
        `N:${testCase.config.needWeight}`,
        `T:${testCase.config.timelineWeight}`,
        `C:${testCase.config.contactWeight}`
      );
      
      // Create agent with specific configuration
      const agentId = await createTestAgent(
        accessToken,
        orgId,
        testCase.name,
        testCase.config
      );
      
      // Wait a moment for database to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the weights were saved correctly
      const passed = await verifyWeights(agentId, testCase.config);
      
      if (passed) {
        console.log(`  ✅ Test Case PASSED: ${testCase.name}`);
      } else {
        console.log(`  ❌ Test Case FAILED: ${testCase.name}`);
        allTestsPassed = false;
      }
    }
    
    console.log('\n====================================');
    console.log('📊 FINAL TEST RESULTS');
    console.log('====================================');
    
    if (allTestsPassed) {
      console.log('✅ SUCCESS: All weight configurations are properly saved!');
      console.log('\n🎉 The BANT weights are correctly stored in the database');
      console.log('   and the criteria_prompt reflects the custom weights.');
    } else {
      console.log('❌ FAILURE: Some weight configurations were not saved correctly');
      console.log('\n⚠️  Please check the backend agent creation endpoint.');
    }
    
    console.log('====================================\n');
    
    // Clean up test data
    await cleanupTestData();
    
    process.exit(allTestsPassed ? 0 : 1);
    
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