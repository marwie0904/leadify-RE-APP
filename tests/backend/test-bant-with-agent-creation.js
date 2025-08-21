const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';

// Test user credentials
const TEST_USER = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

async function runBANTTestWithAgentCreation() {
  try {
    console.log('=== BANT CONFIGURATION TEST WITH AGENT CREATION ===\n');
    
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
    
    // 2. Create a test agent
    console.log('2. Creating test agent...');
    const form = new FormData();
    form.append('name', 'Test BANT Agent');
    form.append('tone', 'Professional');
    form.append('language', 'English');
    form.append('role', 'Real Estate Assistant');
    form.append('systemPrompt', 'You are a helpful real estate assistant focused on qualifying leads.');
    form.append('model', 'gpt-4o');
    form.append('enableBant', 'true');
    form.append('initialMessage', 'Hello! I\'m here to help you find your perfect property.');
    
    const createAgentResponse = await fetch(`${API_BASE_URL}/api/agents/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    if (!createAgentResponse.ok) {
      const responseText = await createAgentResponse.text();
      console.log('Response status:', createAgentResponse.status);
      console.log('Response text:', responseText.substring(0, 200));
      throw new Error(`Failed to create agent: ${createAgentResponse.status}`);
    }
    
    const agentData = await createAgentResponse.json();
    const agent = agentData.agent;
    console.log(`✅ Agent created: ${agent.name} (ID: ${agent.id})\n`);
    
    // 3. Test GET BANT config (should return 404 initially)
    console.log('3. Testing GET BANT config (expecting 404)...');
    const getInitialResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-config`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Response status: ${getInitialResponse.status}`);
    if (getInitialResponse.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent config\n');
    } else {
      console.log('❌ Expected 404 but got different status\n');
    }
    
    // 4. Create custom BANT configuration
    console.log('4. Creating custom BANT configuration...');
    const customBANTConfig = {
      budget_weight: 30,
      authority_weight: 20,
      need_weight: 20,
      timeline_weight: 20,
      contact_weight: 10,
      budget_criteria: [
        { min: 25000000, max: null, points: 30, label: '>$25M' },
        { min: 20000000, max: 25000000, points: 25, label: '$20-25M' },
        { min: 15000000, max: 20000000, points: 20, label: '$15-20M' },
        { min: 10000000, max: 15000000, points: 15, label: '$10-15M' },
        { min: 5000000, max: 10000000, points: 10, label: '$5-10M' },
        { min: 1000000, max: 5000000, points: 5, label: '$1-5M' },
        { min: 0, max: 1000000, points: 2, label: '<$1M' }
      ],
      authority_criteria: [
        { type: 'ceo_owner', points: 20, label: 'CEO/Owner' },
        { type: 'decision_maker', points: 15, label: 'Decision Maker' },
        { type: 'influencer', points: 10, label: 'Influencer' },
        { type: 'user_only', points: 5, label: 'End User Only' }
      ],
      need_criteria: [
        { type: 'immediate_need', points: 20, label: 'Immediate Need' },
        { type: 'active_search', points: 15, label: 'Actively Searching' },
        { type: 'planning', points: 10, label: 'Planning Stage' },
        { type: 'exploring', points: 5, label: 'Just Exploring' }
      ],
      timeline_criteria: [
        { type: 'this_week', points: 20, label: 'This Week' },
        { type: 'this_month', points: 17, label: 'This Month' },
        { type: '2_months', points: 14, label: 'Within 2 Months' },
        { type: '3_months', points: 11, label: 'Within 3 Months' },
        { type: '6_months', points: 8, label: 'Within 6 Months' },
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
      console.log('Response headers:', createConfigResponse.headers);
      console.log('Response text:', responseText);
      throw new Error(`Failed to create BANT config: ${createConfigResponse.status}`);
    }
    
    const createResult = await createConfigResponse.json();
    console.log('✅ Custom BANT configuration created successfully');
    console.log('   Configuration ID:', createResult.config.id);
    console.log('   Generated prompt length:', createResult.config.bant_scoring_prompt?.length || 0, 'characters\n');
    
    // 5. Retrieve the configuration
    console.log('5. Retrieving custom BANT configuration...');
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
    
    // 6. Clean up - delete the test agent
    console.log('6. Cleaning up - deleting test agent...');
    const deleteAgentResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteAgentResponse.ok) {
      console.log('✅ Test agent deleted successfully\n');
    } else {
      console.log('⚠️  Could not delete test agent\n');
    }
    
    console.log('=== TEST COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
runBANTTestWithAgentCreation();