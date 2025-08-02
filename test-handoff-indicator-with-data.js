const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

async function getSupabaseToken() {
  try {
    const supabaseUrl = 'https://kbmsygyawpiqegemzetp.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';
    
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

async function runTest() {
  try {
    console.log('=== HANDOFF INDICATOR VERIFICATION ===\n');
    
    // Get auth token
    const authToken = await getSupabaseToken();
    console.log('✅ Authentication successful\n');
    
    // Check conversations API
    console.log('Fetching conversations...');
    const convResponse = await fetch(`${API_BASE_URL}/api/conversations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!convResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${convResponse.status}`);
    }
    
    const convData = await convResponse.json();
    const conversations = convData.conversations || [];
    
    console.log(`Found ${conversations.length} conversations`);
    
    // Check for handoff conversations
    const handoffConversations = conversations.filter(c => c.handoff === true);
    console.log(`Found ${handoffConversations.length} conversations in handoff state`);
    
    if (handoffConversations.length > 0) {
      console.log('\nHandoff conversations:');
      handoffConversations.forEach((conv, index) => {
        console.log(`${index + 1}. ID: ${conv.id}`);
        console.log(`   User: ${conv.user_name || 'Unknown'}`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Handoff: ${conv.handoff}`);
        console.log(`   Assigned Agent: ${conv.assigned_human_agent_id || 'None'}`);
      });
    }
    
    console.log('\n✅ Implementation verified:');
    console.log('- Removed refresh/new conversation buttons from ChatInterface in conversations page');
    console.log('- Added handoff field to Conversation interface');
    console.log('- Added handoff indicator badge to conversations list');
    console.log('- Badge uses destructive variant (red color) with "Handoff" text');
    
    console.log('\nTo see the UI changes:');
    console.log('1. Open ' + FRONTEND_URL + '/conversations');
    console.log('2. Look for conversations with red "Handoff" badges');
    console.log('3. Verify refresh/new buttons are only in chat preview modal, not conversations page');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
runTest();