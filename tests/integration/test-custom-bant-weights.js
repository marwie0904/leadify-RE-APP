const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';
const API_BASE_URL = 'http://localhost:3001';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Different custom weight configurations to test
const customWeightConfigs = [
  {
    name: 'Custom Test 1 (35/20/25/15/5)',
    budgetWeight: 35,
    authorityWeight: 20,
    needWeight: 25,
    timelineWeight: 15,
    contactWeight: 5
  },
  {
    name: 'Custom Test 2 (10/30/30/25/5)',
    budgetWeight: 10,
    authorityWeight: 30,
    needWeight: 30,
    timelineWeight: 25,
    contactWeight: 5
  },
  {
    name: 'Custom Test 3 (45/15/20/15/5)',
    budgetWeight: 45,
    authorityWeight: 15,
    needWeight: 20,
    timelineWeight: 15,
    contactWeight: 5
  },
  {
    name: 'Custom Test 4 (15/35/25/20/5)',
    budgetWeight: 15,
    authorityWeight: 35,
    needWeight: 25,
    timelineWeight: 20,
    contactWeight: 5
  }
];

async function cleanupTestData(email) {
  try {
    const { data: userData } = await supabase.auth.admin.listUsers();
    const testUser = userData?.users?.find(u => u.email === email);
    
    if (testUser) {
      // Clean up related data
      await supabase.from('custom_bant_configs').delete().eq('agent_id', testUser.id);
      await supabase.from('agent_configs').delete().eq('agent_id', testUser.id);
      await supabase.from('agents').delete().eq('user_id', testUser.id);
      await supabase.from('organization_members').delete().eq('user_id', testUser.id);
      await supabase.from('organizations').delete().eq('created_by', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
      console.log(`✅ Cleaned up test data for ${email}`);
    }
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

async function createTestUser(email, fullName) {
  const password = 'TestPassword123!';
  
  // Clean up any existing user
  await cleanupTestData(email);
  
  // Create new user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });
  
  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }
  
  // Sign in to get access token
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  
  if (signInError) {
    throw new Error(`Failed to sign in: ${signInError.message}`);
  }
  
  return {
    userId: authData.user.id,
    accessToken: signInData.session.access_token
  };
}

async function createOrganization(accessToken, orgName) {
  const response = await fetch(`${API_BASE_URL}/api/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: orgName
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create organization');
  }
  
  const orgData = await response.json();
  return orgData.organization?.id || orgData.id;
}

async function createAgentWithCustomWeights(accessToken, orgId, agentName, weights) {
  const bantConfiguration = {
    thresholds: {
      budget: weights.budgetWeight,
      authority: weights.authorityWeight,
      need: weights.needWeight,
      timeline: weights.timelineWeight,
      priority: 90,
      hot: 70,
      warm: 50
    },
    budgetRanges: [
      { section: 'millions', amount: 5, points: weights.budgetWeight, label: '$5M' },
      { section: 'millions', amount: 1, points: Math.floor(weights.budgetWeight * 0.6), label: '$1M' },
      { section: 'thousands', amount: 500, points: Math.floor(weights.budgetWeight * 0.4), label: '$500K' }
    ],
    authorityLevels: [
      { type: 'single', points: weights.authorityWeight, label: 'Single' },
      { type: 'dual', points: Math.floor(weights.authorityWeight * 0.8), label: 'Dual' },
      { type: 'group', points: Math.floor(weights.authorityWeight * 0.6), label: 'Group' }
    ],
    needCategories: ['If need was properly stated'],
    timelineRanges: [
      { timeAmount: 1, timeUnit: 'months', points: weights.timelineWeight, label: '1 months' },
      { timeAmount: 3, timeUnit: 'months', points: Math.floor(weights.timelineWeight * 0.6), label: '3 months' }
    ]
  };
  
  const response = await fetch(`${API_BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: agentName,
      language: 'English',
      tone: 'Professional',
      openingMessage: 'Hello! How can I help you today?',
      organizationId: orgId,
      bantConfiguration: bantConfiguration
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create agent: ${error}`);
  }
  
  const agentData = await response.json();
  return agentData.agent?.id || agentData.id;
}

async function verifyWeights(agentId, expectedWeights) {
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
  
  // Verify weights match
  const weightsMatch = 
    bantConfig.budget_weight === expectedWeights.budgetWeight &&
    bantConfig.authority_weight === expectedWeights.authorityWeight &&
    bantConfig.need_weight === expectedWeights.needWeight &&
    bantConfig.timeline_weight === expectedWeights.timelineWeight &&
    bantConfig.contact_weight === expectedWeights.contactWeight;
  
  console.log(`    📊 Weights in DB: B:${bantConfig.budget_weight} A:${bantConfig.authority_weight} N:${bantConfig.need_weight} T:${bantConfig.timeline_weight} C:${bantConfig.contact_weight}`);
  console.log(`    📊 Expected:     B:${expectedWeights.budgetWeight} A:${expectedWeights.authorityWeight} N:${expectedWeights.needWeight} T:${expectedWeights.timelineWeight} C:${expectedWeights.contactWeight}`);
  console.log(`    ${weightsMatch ? '✅' : '❌'} Weights ${weightsMatch ? 'match' : 'DO NOT match'}`);
  
  // Verify criteria_prompt contains the custom weights
  const promptHasWeights = 
    agentConfig.criteria_prompt.includes(`${expectedWeights.budgetWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedWeights.authorityWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedWeights.needWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedWeights.timelineWeight} points`) &&
    agentConfig.criteria_prompt.includes(`${expectedWeights.contactWeight} points`);
  
  console.log(`    ${promptHasWeights ? '✅' : '❌'} Criteria prompt ${promptHasWeights ? 'contains' : 'MISSING'} custom weights`);
  console.log(`    📝 Prompt length: ${agentConfig.criteria_prompt.length} characters`);
  
  return weightsMatch && promptHasWeights;
}

async function runTests() {
  console.log('====================================');
  console.log('🧪 CUSTOM BANT WEIGHTS TEST');
  console.log('====================================');
  console.log('Testing that custom BANT weights are properly saved');
  console.log('with different values than the defaults.');
  console.log('====================================\n');
  
  let allTestsPassed = true;
  const results = [];
  
  for (let i = 0; i < customWeightConfigs.length; i++) {
    const config = customWeightConfigs[i];
    const email = `custom_weights_test_${i + 1}@example.com`;
    
    console.log(`\n📊 Test ${i + 1}: ${config.name}`);
    console.log('================================');
    
    try {
      // Create test user
      console.log(`  👤 Creating user: ${email}`);
      const { userId, accessToken } = await createTestUser(email, `Test User ${i + 1}`);
      
      // Create organization
      console.log(`  🏢 Creating organization...`);
      const orgId = await createOrganization(accessToken, `Org ${i + 1}`);
      
      // Create agent with custom weights
      console.log(`  🤖 Creating agent with custom weights...`);
      const agentId = await createAgentWithCustomWeights(
        accessToken,
        orgId,
        config.name,
        config
      );
      
      // Wait for database to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the weights
      console.log(`  🔍 Verifying weights...`);
      const passed = await verifyWeights(agentId, config);
      
      results.push({
        test: config.name,
        passed: passed,
        weights: `B:${config.budgetWeight} A:${config.authorityWeight} N:${config.needWeight} T:${config.timelineWeight} C:${config.contactWeight}`
      });
      
      if (!passed) {
        allTestsPassed = false;
      }
      
      // Clean up
      await cleanupTestData(email);
      
    } catch (error) {
      console.error(`  ❌ Test failed: ${error.message}`);
      results.push({
        test: config.name,
        passed: false,
        error: error.message
      });
      allTestsPassed = false;
      
      // Try to clean up on error
      await cleanupTestData(email).catch(() => {});
    }
  }
  
  // Print summary
  console.log('\n====================================');
  console.log('📊 TEST SUMMARY');
  console.log('====================================');
  
  results.forEach((result, i) => {
    console.log(`Test ${i + 1}: ${result.test}`);
    console.log(`  Weights: ${result.weights}`);
    console.log(`  Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  console.log('\n====================================');
  console.log('FINAL RESULT');
  console.log('====================================');
  
  if (allTestsPassed) {
    console.log('✅ SUCCESS: All custom weight configurations are properly saved!');
    console.log('\n🎉 The BANT system correctly stores custom weights');
    console.log('   and generates appropriate criteria prompts.');
  } else {
    console.log('❌ FAILURE: Some custom weight configurations failed');
    console.log('\n⚠️  The BANT system may not be handling custom weights correctly.');
  }
  
  console.log('====================================\n');
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
runTests();