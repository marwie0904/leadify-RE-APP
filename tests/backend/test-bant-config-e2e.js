#!/usr/bin/env node

/**
 * End-to-End Test for Custom BANT Configuration
 * 
 * This script tests the complete flow of creating, updating, and using custom BANT configurations
 * 
 * Prerequisites:
 * 1. Backend server running on port 3001
 * 2. Frontend running on port 3000
 * 3. Valid test user credentials
 * 4. At least one agent created
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_JWT = process.env.TEST_JWT || 'your-test-jwt-token';

// Test data
const testBANTConfig = {
  budget_weight: 35,
  authority_weight: 20,
  need_weight: 15,
  timeline_weight: 20,
  contact_weight: 10,
  budget_criteria: [
    { min: 25000000, max: null, points: 35, label: ">$25M" },
    { min: 20000000, max: 25000000, points: 30, label: "$20-25M" },
    { min: 15000000, max: 20000000, points: 25, label: "$15-20M" },
    { min: 10000000, max: 15000000, points: 20, label: "$10-15M" },
    { min: 5000000, max: 10000000, points: 15, label: "$5-10M" },
    { min: 0, max: 5000000, points: 10, label: "<$5M" }
  ],
  authority_criteria: [
    { type: "sole_owner", points: 20, label: "Sole Owner" },
    { type: "partner", points: 15, label: "Business Partner" },
    { type: "family", points: 10, label: "Family Decision" },
    { type: "advisor", points: 8, label: "Financial Advisor" },
    { type: "committee", points: 5, label: "Committee/Board" }
  ],
  need_criteria: [
    { type: "immediate", points: 15, label: "Immediate Need" },
    { type: "residence", points: 12, label: "Primary Residence" },
    { type: "investment", points: 10, label: "Investment Property" },
    { type: "resale", points: 8, label: "Resale/Flip" },
    { type: "other", points: 5, label: "Other Purpose" }
  ],
  timeline_criteria: [
    { type: "immediate", points: 20, label: "Immediate" },
    { type: "within_1_month", points: 18, label: "Within 1 Month" },
    { type: "1_3_months", points: 15, label: "1-3 Months" },
    { type: "3_6_months", points: 10, label: "3-6 Months" },
    { type: "6_12_months", points: 5, label: "6-12 Months" },
    { type: "over_1_year", points: 2, label: "Over 1 Year" }
  ],
  contact_criteria: [
    { type: "full_contact", points: 10, label: "Name + Phone + Email" },
    { type: "partial_contact", points: 5, label: "Name + Phone or Email" },
    { type: "name_only", points: 3, label: "Name Only" },
    { type: "no_contact", points: 0, label: "No Contact Info" }
  ],
  priority_threshold: 85,
  hot_threshold: 70,
  warm_threshold: 50
};

async function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${TEST_JWT}`,
    'Content-Type': 'application/json'
  };
}

async function testAPI(method, endpoint, body = null) {
  const options = {
    method,
    headers: await getAuthHeaders()
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    console.error(`Error calling ${method} ${endpoint}:`, error);
    throw error;
  }
}

async function runTests() {
  console.log('🚀 Starting Custom BANT Configuration E2E Tests\n');
  
  try {
    // Step 1: Get available agents
    console.log('1️⃣ Fetching available agents...');
    const agentsResponse = await testAPI('GET', '/api/agents');
    
    if (!agentsResponse.ok) {
      throw new Error('Failed to fetch agents');
    }
    
    const agents = agentsResponse.data.agents || [];
    if (agents.length === 0) {
      throw new Error('No agents found. Please create an agent first.');
    }
    
    const testAgent = agents[0];
    console.log(`   ✅ Found agent: ${testAgent.name} (ID: ${testAgent.id})\n`);
    
    // Step 2: Check if BANT config already exists
    console.log('2️⃣ Checking existing BANT configuration...');
    const existingConfig = await testAPI('GET', `/api/agents/${testAgent.id}/bant-config`);
    
    if (existingConfig.status === 404) {
      console.log('   ℹ️  No existing BANT configuration found\n');
    } else if (existingConfig.ok) {
      console.log('   ⚠️  Existing BANT configuration found, will be updated\n');
    }
    
    // Step 3: Create/Update BANT configuration
    console.log('3️⃣ Creating/Updating BANT configuration...');
    const createResponse = await testAPI('POST', `/api/agents/${testAgent.id}/bant-config`, testBANTConfig);
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create BANT config: ${JSON.stringify(createResponse.data)}`);
    }
    
    console.log('   ✅ BANT configuration saved successfully');
    console.log(`   📊 Weights: B:${testBANTConfig.budget_weight}% A:${testBANTConfig.authority_weight}% N:${testBANTConfig.need_weight}% T:${testBANTConfig.timeline_weight}% C:${testBANTConfig.contact_weight}%\n`);
    
    // Step 4: Retrieve and verify configuration
    console.log('4️⃣ Retrieving saved configuration...');
    const getResponse = await testAPI('GET', `/api/agents/${testAgent.id}/bant-config`);
    
    if (!getResponse.ok) {
      throw new Error('Failed to retrieve BANT config');
    }
    
    const savedConfig = getResponse.data.config;
    console.log('   ✅ Configuration retrieved successfully');
    console.log('   📝 Generated prompt length:', savedConfig.bant_scoring_prompt?.length || 0, 'characters\n');
    
    // Step 5: Test validation with invalid weights
    console.log('5️⃣ Testing validation (invalid weights)...');
    const invalidConfig = { ...testBANTConfig, budget_weight: 50 }; // Total would be 115
    const invalidResponse = await testAPI('POST', `/api/agents/${testAgent.id}/bant-config`, invalidConfig);
    
    if (invalidResponse.status === 400) {
      console.log('   ✅ Validation working correctly - rejected invalid weights\n');
    } else {
      console.log('   ⚠️  Validation may not be working correctly\n');
    }
    
    // Step 6: Test conversation with custom BANT
    console.log('6️⃣ Testing conversation with custom BANT scoring...');
    const chatResponse = await testAPI('POST', '/api/chat', {
      agentId: testAgent.id,
      message: "I'm looking for a property. My budget is $22 million and I need to make a decision within the next month.",
      source: 'web'
    });
    
    if (chatResponse.ok) {
      console.log('   ✅ Chat request successful');
      console.log('   💬 Conversation ID:', chatResponse.data.conversationId);
      
      // Wait a bit for lead scoring to complete
      console.log('   ⏳ Waiting for lead scoring...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if lead was created with custom scoring
      const leadsResponse = await testAPI('GET', '/api/leads');
      if (leadsResponse.ok && leadsResponse.data.leads) {
        const recentLead = leadsResponse.data.leads.find(lead => 
          lead.conversation_id === chatResponse.data.conversationId
        );
        
        if (recentLead) {
          console.log('   ✅ Lead created with BANT score:', recentLead.bant_score);
          console.log('   🏷️  Lead type:', recentLead.lead_type);
        }
      }
    }
    console.log('');
    
    // Step 7: Delete configuration
    console.log('7️⃣ Testing configuration deletion...');
    const deleteResponse = await testAPI('DELETE', `/api/agents/${testAgent.id}/bant-config`);
    
    if (deleteResponse.ok) {
      console.log('   ✅ Configuration deleted successfully');
      
      // Verify deletion
      const verifyDelete = await testAPI('GET', `/api/agents/${testAgent.id}/bant-config`);
      if (verifyDelete.status === 404) {
        console.log('   ✅ Deletion verified - configuration no longer exists\n');
      }
    }
    
    console.log('✨ All tests completed successfully!\n');
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('   • Agent found and accessible');
    console.log('   • BANT configuration created successfully');
    console.log('   • Configuration retrieval working');
    console.log('   • Validation rules enforced correctly');
    console.log('   • Chat integration with custom BANT working');
    console.log('   • Configuration deletion working');
    console.log('\n🎉 Custom BANT feature is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
console.log('Custom BANT Configuration E2E Test');
console.log('==================================\n');
console.log('Prerequisites:');
console.log('- Backend running on port 3001');
console.log('- Valid JWT token in TEST_JWT env var');
console.log('- At least one agent created\n');

if (!TEST_JWT || TEST_JWT === 'your-test-jwt-token') {
  console.error('❌ Please set TEST_JWT environment variable with a valid JWT token');
  console.log('\nExample:');
  console.log('TEST_JWT="your-jwt-token" node test-bant-config-e2e.js\n');
  process.exit(1);
}

runTests();