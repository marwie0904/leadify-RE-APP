#!/usr/bin/env node

/**
 * Create a test conversation to verify admin dashboard
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function createTestConversation() {
  console.log('🧪 Creating Test Conversation\n');
  console.log('=' .repeat(50));
  
  const agentId = '59f3e30b-107a-4289-905b-92fa46f56e5f'; // ResidentialBot
  const userId = 'test-user-' + Date.now();
  
  try {
    // Send a greeting
    console.log('📝 Sending greeting...');
    let response = await axios.post(`${API_URL}/api/chat`, {
      message: "Hello",
      agentId: agentId,
      userId: userId
    });
    
    const conversationId = response.data.conversationId;
    console.log('✅ Greeting sent, conversation ID:', conversationId);
    console.log('   Response:', response.data.response);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send a property inquiry
    console.log('\n📝 Sending property inquiry...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "I'm looking for a 3-bedroom home with a budget of $500K",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Property inquiry sent');
    console.log('   Response:', response.data.response);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Answer authority question
    console.log('\n📝 Answering BANT questions...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "I'm the sole decision maker",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Authority answered');
    console.log('   Response:', response.data.response);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Answer need question
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "It's for my family to live in",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Need answered');
    console.log('   Response:', response.data.response);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Answer timeline question
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "We need to move within 2 months",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Timeline answered');
    console.log('   Response:', response.data.response);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Provide contact info
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "I'm John Doe, you can reach me at 555-1234 or john@example.com",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Contact info provided');
    console.log('   Response:', response.data.response);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test conversation created successfully!');
    console.log('📊 Conversation ID:', conversationId);
    console.log('👤 User ID:', userId);
    console.log('🤖 Agent: ResidentialBot');
    console.log('🏢 Organization: Prime Residential Realty');
    console.log('\n🔗 You can now check the admin dashboard to see this conversation');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
createTestConversation().catch(console.error);