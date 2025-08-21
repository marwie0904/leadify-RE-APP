#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

async function testSimpleChat() {
  // Create JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      sub: '8ad6ed68-ac60-4483-b22d-e6747727971b',
      email: 'michael.brown@homes.com',
      aud: 'authenticated',
      role: 'authenticated'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  console.log('Testing simple chat request...');
  console.log('Token payload:', jwt.decode(token));
  
  try {
    const response = await axios.post(
      'http://localhost:3001/api/chat',
      {
        message: "Hello, I need help with properties",
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        conversationId: 'c08666a3-6a5c-420c-8431-abda46650ce3',
        source: 'website'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Success!');
    console.log('Response:', response.data.response);
    console.log('Conversation ID:', response.data.conversationId);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('Authentication failed - check JWT token');
    }
    if (error.response?.status === 404) {
      console.log('Agent not found - check agent ID');
    }
  }
}

testSimpleChat();