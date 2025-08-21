// Direct API test for Transfer to AI functionality
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-auth-token-here';

// Test user credentials
const TEST_USER = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

async function getSupabaseToken() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';
    
    console.log('Getting Supabase auth token...');
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
}

async function getHandoffConversations(authToken) {
  try {
    console.log('\nFetching handoff conversations...');
    const response = await fetch(`${API_BASE_URL}/api/conversations/handoffs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch handoffs: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch handoff conversations:', error);
    throw error;
  }
}

async function testTransferToAI(conversationId, authToken) {
  try {
    console.log(`\nTesting Transfer to AI for conversation: ${conversationId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/transfer-to-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'resolved'
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Transfer failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return data;
  } catch (error) {
    console.error('Failed to transfer to AI:', error);
    throw error;
  }
}

async function createHandoffConversation(authToken) {
  try {
    console.log('\nCreating a test handoff conversation...');
    
    // First, get agents
    const agentsResponse = await fetch(`${API_BASE_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!agentsResponse.ok) {
      throw new Error(`Failed to fetch agents: ${agentsResponse.status}`);
    }

    const agents = await agentsResponse.json();
    console.log(`Found ${agents.length} agents`);

    if (agents.length === 0) {
      console.log('No agents found. Creating one...');
      // You would need to create an agent here
      throw new Error('No agents available');
    }

    const agentId = agents[0].id;
    console.log(`Using agent: ${agentId}`);

    // Create a conversation
    const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: agentId,
        message: 'I need help with something complex that requires human assistance',
        source: 'test'
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`Failed to create conversation: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const conversationId = chatData.conversationId;
    console.log(`Created conversation: ${conversationId}`);

    // Now trigger handoff
    const handoffResponse = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}/request-handoff`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'test_handoff'
      })
    });

    if (!handoffResponse.ok) {
      const errorText = await handoffResponse.text();
      throw new Error(`Failed to create handoff: ${handoffResponse.status} - ${errorText}`);
    }

    const handoffData = await handoffResponse.json();
    console.log('Handoff created:', handoffData);

    return conversationId;
  } catch (error) {
    console.error('Failed to create handoff conversation:', error);
    throw error;
  }
}

async function runTest() {
  try {
    console.log('=== TRANSFER TO AI API TEST ===\n');

    // Get auth token
    const authToken = await getSupabaseToken();
    console.log('✅ Authentication successful');

    // Check for existing handoff conversations
    const handoffData = await getHandoffConversations(authToken);
    console.log(`\n✅ Found ${handoffData.conversations?.length || 0} handoff conversations`);
    console.log('View mode:', handoffData.viewMode);

    let conversationId;

    if (!handoffData.conversations || handoffData.conversations.length === 0) {
      console.log('\nNo handoff conversations found. Creating one...');
      conversationId = await createHandoffConversation(authToken);
    } else {
      // Use the first handoff conversation
      conversationId = handoffData.conversations[0].id;
      console.log(`\nUsing existing handoff conversation: ${conversationId}`);
      console.log('Status:', handoffData.conversations[0].status);
      console.log('Assigned to:', handoffData.conversations[0].assigned_agent_name || 'Unassigned');
    }

    // Test Transfer to AI
    console.log('\n--- Testing Transfer to AI ---');
    const transferResult = await testTransferToAI(conversationId, authToken);
    console.log('\n✅ Transfer to AI successful!');
    console.log('Result:', transferResult);

    // Verify the conversation is no longer in handoff
    const updatedHandoffs = await getHandoffConversations(authToken);
    const stillInHandoff = updatedHandoffs.conversations?.some(c => c.id === conversationId);
    
    if (!stillInHandoff) {
      console.log('\n✅ Verified: Conversation removed from handoff list');
    } else {
      console.log('\n❌ Warning: Conversation still appears in handoff list');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
runTest();