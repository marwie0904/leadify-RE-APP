#!/usr/bin/env node

const axios = require('axios');

async function testDirectChat() {
  console.log('Testing direct chat without authentication...');
  
  try {
    const response = await axios.post(
      'http://localhost:3001/api/chat',
      {
        message: "Hello, I need help finding a property",
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        userId: 'test-user-' + Date.now(),
        source: 'website'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', response.data.response);
    console.log('Conversation ID:', response.data.conversationId);
    console.log('Message ID:', response.data.messageId);
    
    return response.data.conversationId;
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDirectChat();