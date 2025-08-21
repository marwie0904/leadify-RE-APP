#!/usr/bin/env node

/**
 * Test Contact Extraction Fix
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testContactExtraction() {
  console.log('🧪 Testing Contact Extraction Fix\n');
  console.log('=' .repeat(50));
  
  const agentId = '59f3e30b-107a-4289-905b-92fa46f56e5f'; // ResidentialBot
  const userId = 'test-contact-' + Date.now();
  let conversationId = null;
  
  try {
    // Step 1: Send greeting
    console.log('\n📝 Step 1: Sending greeting...');
    let response = await axios.post(`${API_URL}/api/chat`, {
      message: "Hello",
      agentId: agentId,
      userId: userId
    });
    conversationId = response.data.conversationId;
    console.log('✅ Response:', response.data.response.substring(0, 100) + '...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Property interest with budget
    console.log('\n📝 Step 2: Expressing property interest with budget...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "I'm looking for a 3-bedroom home with a budget of $500K",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response.substring(0, 100) + '...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Authority
    console.log('\n📝 Step 3: Answering authority question...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "Yes, I'm the sole decision maker",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response.substring(0, 100) + '...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Need
    console.log('\n📝 Step 4: Answering need question...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "It's for my family to live in",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response.substring(0, 100) + '...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Timeline
    console.log('\n📝 Step 5: Answering timeline question...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "We need to move within 2 months",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response.substring(0, 100) + '...');
    
    // Should ask for contact info now
    const shouldAskForContact = response.data.response.toLowerCase().includes('name') || 
                                response.data.response.toLowerCase().includes('contact');
    console.log(`\n🔍 Asked for contact info: ${shouldAskForContact ? '✅ YES' : '❌ NO'}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 6: CRITICAL TEST - Provide contact info
    console.log('\n📝 Step 6: PROVIDING CONTACT INFORMATION...');
    console.log('   Sending: "Samuel Jackson, 098124814122"');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "Samuel Jackson, 098124814122",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response);
    
    // Check if it keeps asking for contact info (FAILURE) or moves on (SUCCESS)
    const stillAskingForContact = response.data.response.toLowerCase().includes('name') && 
                                  response.data.response.toLowerCase().includes('contact');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST RESULTS:');
    console.log('='.repeat(50));
    
    if (stillAskingForContact) {
      console.log('❌ FAILED: AI is still asking for contact information!');
      console.log('   The contact extraction is not working properly.');
    } else {
      console.log('✅ SUCCESS: AI acknowledged the contact information!');
      console.log('   The contact extraction fix is working!');
    }
    
    // Step 7: Send another message to double-check
    console.log('\n📝 Step 7: Sending follow-up message...');
    response = await axios.post(`${API_URL}/api/chat`, {
      message: "What properties do you have available?",
      agentId: agentId,
      conversationId: conversationId,
      userId: userId
    });
    console.log('✅ Response:', response.data.response.substring(0, 150) + '...');
    
    const stillAskingInFollowup = response.data.response.toLowerCase().includes('name') && 
                                   response.data.response.toLowerCase().includes('contact');
    
    if (stillAskingInFollowup) {
      console.log('\n❌ Still asking for contact in follow-up - extraction definitely broken');
    } else {
      console.log('\n✅ Follow-up working correctly - extraction is fixed!');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test Complete\n');
}

// Run the test
testContactExtraction().catch(console.error);