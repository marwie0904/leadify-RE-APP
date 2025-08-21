const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpass123';

async function createTestAgent() {
  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Get user's organization
    console.log('🏢 Getting organization...');
    const orgResponse = await axios.get(`${API_URL}/api/organizations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let organizationId;
    if (orgResponse.data && orgResponse.data.length > 0) {
      organizationId = orgResponse.data[0].id;
      console.log('✅ Organization found:', organizationId);
    } else {
      console.error('❌ No organization found');
      return;
    }
    
    // Create agent
    console.log('🤖 Creating test agent...');
    const agentResponse = await axios.post(
      `${API_URL}/api/agents`,
      {
        name: 'Test Agent for Tracking',
        organization_id: organizationId,  // Add organization ID
        initial_message: 'Hello! I am Test Agent. How can I help you today?',
        prompt: 'You are a helpful real estate agent assistant.',
        suggested_questions: JSON.stringify([
          'What properties do you have?',
          'Can you help me find a home?',
          'What is your budget range?'
        ]),
        color: '#4F46E5',
        notification_email: TEST_EMAIL,
        facebook_page_id: null,
        facebook_page_access_token: null,
        facebook_page_name: null,
        fallback_message: 'I apologize, but I am unable to process your request at the moment.',
        chat_model: 'gpt-4o-mini',
        criteria_prompt: 'Qualify leads based on BANT criteria'
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Agent created successfully!');
    console.log('Agent ID:', agentResponse.data.agent.id);
    console.log('Agent Name:', agentResponse.data.agent.name);
    
    return agentResponse.data.agent;
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
  }
}

createTestAgent();