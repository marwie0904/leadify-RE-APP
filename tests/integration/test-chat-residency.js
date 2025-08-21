const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

async function testResidencyInChat() {
  console.log('🚀 Testing "residency" classification in actual chat');
  console.log('=' . repeat(60));
  
  try {
    // Get auth token for michael.brown@homes.com
    const authResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'michael.brown@homes.com',
      password: process.env.TEST_PASSWORD || 'Test123!'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authenticated successfully');
    
    // Get an agent ID
    const agentsResponse = await axios.get(`${API_URL}/api/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!agentsResponse.data.agents || agentsResponse.data.agents.length === 0) {
      console.log('❌ No agents found for this user');
      return;
    }
    
    const agent = agentsResponse.data.agents[0];
    console.log(`✅ Using agent: ${agent.name} (${agent.id})`);
    
    // Create a new conversation
    const conversationId = uuidv4();
    
    // Test sequence
    const testMessages = [
      { message: 'I am looking for a property', expectedIntent: 'BANT' },
      { message: '30M', expectedIntent: 'BANT' },
      { message: 'yes', expectedIntent: 'BANT' },
      { message: 'residency', expectedIntent: 'BANT' }  // The critical test
    ];
    
    console.log('\n📝 Starting BANT conversation flow:');
    console.log('-'.repeat(40));
    
    for (const test of testMessages) {
      console.log(`\n📤 Sending: "${test.message}"`);
      console.log(`   Expected: ${test.expectedIntent}`);
      
      try {
        const response = await axios.post(
          `${API_URL}/api/chat`,
          {
            message: test.message,
            conversationId: conversationId,
            agentId: agent.id,
            source: 'web'
          },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`   ✅ Message sent successfully`);
        
        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.response?.data?.error || error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\n💡 Check server.log for classification results');
    console.log('   Look for "[MASTER INTENT]" lines to see how "residency" was classified');
    console.log('   If classified as BANT, the conversation should continue to timeline question');
    console.log('   If classified as Embeddings, you\'ll see "not trained to answer" response');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testResidencyInChat().catch(console.error);