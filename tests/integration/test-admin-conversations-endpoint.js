#!/usr/bin/env node

/**
 * Test Admin Conversations Endpoint
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3001';

// Create a test admin token
function createAdminToken() {
  const payload = {
    id: 'admin-test-user',
    email: 'admin@test.com',
    role: 'admin',
    user_metadata: {
      role: 'admin'
    }
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

async function testEndpoint() {
  console.log('🧪 Testing Admin Conversations Endpoint\n');
  console.log('=' .repeat(50));
  
  // Test organization ID (Prime Residential Realty - actual ID from database)
  const orgId = '2a1e8d1e-8337-4643-af9e-ffe0a2bc9c8c';
  const token = createAdminToken();
  
  try {
    console.log('📡 Calling endpoint: GET /api/admin/organizations/' + orgId + '/conversations');
    console.log('🔑 Using admin token');
    
    const response = await axios.get(
      `${API_URL}/api/admin/organizations/${orgId}/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ Endpoint Response:');
    console.log('  Success:', response.data.success);
    console.log('  Conversations count:', response.data.conversations?.length || 0);
    console.log('  Total count:', response.data.count || 0);
    console.log('  Current page:', response.data.page || 1);
    
    if (response.data.conversations && response.data.conversations.length > 0) {
      console.log('\n📊 Sample Conversation:');
      const sample = response.data.conversations[0];
      console.log('  ID:', sample.id);
      console.log('  Agent:', sample.agent_name);
      console.log('  Status:', sample.status);
      console.log('  Messages:', sample.message_count);
      console.log('  Tokens:', sample.total_tokens);
    } else {
      console.log('\n📝 No conversations found (database is empty)');
    }
    
  } catch (error) {
    console.error('\n❌ Error calling endpoint:');
    console.error('  Status:', error.response?.status);
    console.error('  Message:', error.response?.data?.message || error.message);
    console.error('  Details:', error.response?.data);
    
    // Try without admin middleware to test basic connectivity
    console.log('\n🔄 Testing without auth (should fail with 401)...');
    try {
      const response2 = await axios.get(
        `${API_URL}/api/admin/organizations/${orgId}/conversations`
      );
      console.log('Unexpected success without auth:', response2.status);
    } catch (error2) {
      console.log('✅ Correctly rejected without auth:', error2.response?.status);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test Complete\n');
}

// Run the test
testEndpoint().catch(console.error);