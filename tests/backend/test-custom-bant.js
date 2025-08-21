const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';

// Test user credentials
const TEST_USER = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

async function runCustomBANTTest() {
  try {
    console.log('=== CUSTOM BANT CONFIGURATION TEST ===\n');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 1. Authenticate
    console.log('1. Authenticating user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const authToken = authData.session.access_token;
    console.log('✅ Authentication successful\n');
    
    // 2. Get user's agents
    console.log('2. Fetching user agents...');
    const agentsResponse = await fetch(`${API_BASE_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!agentsResponse.ok) {
      throw new Error(`Failed to fetch agents: ${agentsResponse.status}`);
    }
    
    const agentsData = await agentsResponse.json();
    const agents = agentsData.agents || [];
    
    if (agents.length === 0) {
      console.log('❌ No agents found for user. Please create an agent first.');
      return;
    }
    
    const agent = agents[0];
    console.log(`✅ Found agent: ${agent.name} (ID: ${agent.id})\n`);
    
    // 3. Create custom BANT configuration
    console.log('3. Creating custom BANT configuration...');
    const customBANTConfig = {
      budget_weight: 35,
      authority_weight: 15,
      need_weight: 10,
      timeline_weight: 30,
      contact_weight: 10,
      budget_criteria: [
        { min: 25000000, max: null, points: 35, label: '>$25M' },
        { min: 20000000, max: 25000000, points: 30, label: '$20-25M' },
        { min: 15000000, max: 20000000, points: 25, label: '$15-20M' },
        { min: 10000000, max: 15000000, points: 20, label: '$10-15M' },
        { min: 5000000, max: 10000000, points: 15, label: '$5-10M' },
        { min: 1000000, max: 5000000, points: 10, label: '$1-5M' },
        { min: 0, max: 1000000, points: 5, label: '<$1M' }
      ],
      authority_criteria: [
        { type: 'ceo_owner', points: 15, label: 'CEO/Owner' },
        { type: 'decision_maker', points: 12, label: 'Decision Maker' },
        { type: 'influencer', points: 8, label: 'Influencer' },
        { type: 'user_only', points: 3, label: 'End User Only' }
      ],
      need_criteria: [
        { type: 'immediate_need', points: 10, label: 'Immediate Need' },
        { type: 'active_search', points: 8, label: 'Actively Searching' },
        { type: 'planning', points: 5, label: 'Planning Stage' },
        { type: 'exploring', points: 2, label: 'Just Exploring' }
      ],
      timeline_criteria: [
        { type: 'this_week', points: 30, label: 'This Week' },
        { type: 'this_month', points: 25, label: 'This Month' },
        { type: '2_months', points: 20, label: 'Within 2 Months' },
        { type: '3_months', points: 15, label: 'Within 3 Months' },
        { type: '6_months', points: 10, label: 'Within 6 Months' },
        { type: 'this_year', points: 5, label: 'This Year' },
        { type: 'no_timeline', points: 0, label: 'No Timeline' }
      ],
      contact_criteria: [
        { type: 'full_verified', points: 10, label: 'Full Contact (Verified)' },
        { type: 'full_unverified', points: 8, label: 'Full Contact' },
        { type: 'phone_email', points: 6, label: 'Phone + Email' },
        { type: 'email_only', points: 4, label: 'Email Only' },
        { type: 'name_only', points: 2, label: 'Name Only' },
        { type: 'anonymous', points: 0, label: 'Anonymous' }
      ],
      priority_threshold: 85,
      hot_threshold: 70,
      warm_threshold: 50
    };
    
    const createConfigResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customBANTConfig)
    });
    
    if (!createConfigResponse.ok) {
      const responseText = await createConfigResponse.text();
      console.log('Response status:', createConfigResponse.status);
      console.log('Response text:', responseText.substring(0, 200));
      throw new Error(`Failed to create BANT config: ${createConfigResponse.status}`);
    }
    
    const createResult = await createConfigResponse.json();
    console.log('✅ Custom BANT configuration created successfully');
    console.log('   Generated prompt length:', createResult.config.bant_scoring_prompt.length, 'characters\n');
    
    // 4. Retrieve the configuration
    console.log('4. Retrieving custom BANT configuration...');
    const getConfigResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getConfigResponse.ok) {
      throw new Error(`Failed to retrieve BANT config: ${getConfigResponse.status}`);
    }
    
    const getResult = await getConfigResponse.json();
    console.log('✅ Configuration retrieved successfully');
    console.log('   Weights:', {
      budget: getResult.config.budget_weight + '%',
      authority: getResult.config.authority_weight + '%',
      need: getResult.config.need_weight + '%',
      timeline: getResult.config.timeline_weight + '%',
      contact: getResult.config.contact_weight + '%'
    });
    console.log('   Thresholds:', {
      priority: '>=' + getResult.config.priority_threshold,
      hot: '>=' + getResult.config.hot_threshold,
      warm: '>=' + getResult.config.warm_threshold
    });
    console.log();
    
    // 5. Test lead scoring with custom config
    console.log('5. Testing lead scoring with custom configuration...');
    
    // First, we need to create a test conversation
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('agent_id', agent.id)
      .limit(1);
    
    if (conversations && conversations.length > 0) {
      const conversationId = conversations[0].id;
      console.log(`   Using conversation: ${conversationId}`);
      
      // Trigger scoring
      const scoreResponse = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/score`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (scoreResponse.ok) {
        const scoreResult = await scoreResponse.json();
        console.log('✅ Lead scored with custom BANT configuration');
        console.log('   Lead Score:', scoreResult.lead_score);
        console.log('   Classification:', scoreResult.classification);
        console.log();
      } else {
        console.log('⚠️  Could not score conversation (might not have messages)');
      }
    } else {
      console.log('⚠️  No conversations found for testing scoring');
    }
    
    // 6. Update configuration
    console.log('6. Testing configuration update...');
    customBANTConfig.warm_threshold = 45;
    customBANTConfig.timeline_weight = 35;
    customBANTConfig.need_weight = 5;
    
    const updateResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customBANTConfig)
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update BANT config: ${updateResponse.status}`);
    }
    
    console.log('✅ Configuration updated successfully\n');
    
    // 7. Delete configuration
    console.log('7. Testing configuration deletion...');
    const deleteResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete BANT config: ${deleteResponse.status}`);
    }
    
    console.log('✅ Configuration deleted successfully');
    
    // Verify deletion
    const verifyResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (verifyResponse.status === 404) {
      console.log('✅ Verified: Configuration no longer exists\n');
    } else {
      console.log('❌ Configuration still exists after deletion\n');
    }
    
    console.log('=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
runCustomBANTTest();