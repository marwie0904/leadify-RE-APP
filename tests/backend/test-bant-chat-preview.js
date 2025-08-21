require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testChatPreview() {
  console.log('🧪 Testing BANT extraction in Chat Preview');
  console.log('=' .repeat(80));
  
  try {
    // 1. Get user ID for michael.brown@homes.com
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'michael.brown@homes.com')
      .single();
    
    if (userError || !userData) {
      console.error('User not found:', userError);
      return;
    }
    
    console.log('✅ Found user:', userData.id);
    
    // 2. Find the agent for this user
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userData.id);
    
    if (agentError || !agents || agents.length === 0) {
      console.error('No agents found for michael.brown@homes.com');
      return;
    }
    
    const agent = agents[0];
    console.log('✅ Found agent:', agent.name, '(ID:', agent.id, ')');
    
    // 2. Find or create a conversation for this agent
    let conversation;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('source', 'preview')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (existingConv) {
      conversation = existingConv;
      console.log('✅ Using existing conversation:', conversation.id);
    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          source: 'preview',
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (convError) {
        console.error('Failed to create conversation:', convError);
        return;
      }
      conversation = newConv;
      console.log('✅ Created new conversation:', conversation.id);
    }
    
    // 3. Get recent messages from the conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: true });
    
    console.log(`\n📝 Existing messages in conversation (${messages?.length || 0} total):`);
    if (messages && messages.length > 0) {
      messages.slice(-5).forEach(msg => {
        const time = new Date(msg.sent_at).toLocaleTimeString();
        console.log(`  [${time}] ${msg.sender}: "${msg.content?.substring(0, 60)}..."`);
      });
    }
    
    // 4. Simulate sending "35M" as a message
    console.log('\n🚀 Sending test message: "35M"');
    
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'test-token'}`
      },
      body: JSON.stringify({
        conversationId: conversation.id,
        message: '35M',
        agentId: agent.id,
        source: 'preview'
      })
    });
    
    if (!response.ok) {
      console.error('❌ Chat API failed:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }
    
    const result = await response.json();
    console.log('\n📊 API Response:');
    console.log('  Success:', result.success);
    console.log('  Message ID:', result.messageId);
    console.log('  Conversation ID:', result.conversationId);
    
    // 5. Wait a bit for processing
    console.log('\n⏳ Waiting 3 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. Check the latest messages
    const { data: newMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('sent_at', { ascending: false })
      .limit(3);
    
    console.log('\n📬 Latest messages after sending "35M":');
    newMessages?.reverse().forEach(msg => {
      const time = new Date(msg.sent_at).toLocaleTimeString();
      console.log(`  [${time}] ${msg.sender}: "${msg.content}"`);
    });
    
    // 7. Check BANT memory
    const { data: bantMemory } = await supabase
      .from('bant_memory')
      .select('*')
      .eq('conversation_id', conversation.id)
      .single();
    
    if (bantMemory) {
      console.log('\n💾 BANT Memory State:');
      console.log('  Budget:', bantMemory.budget || '❌ Not found');
      console.log('  Authority:', bantMemory.authority || '❌ Not found');
      console.log('  Need:', bantMemory.need || '❌ Not found');
      console.log('  Timeline:', bantMemory.timeline || '❌ Not found');
    }
    
    // 8. Check server logs analysis
    console.log('\n📋 Expected Server Logs to Check:');
    console.log('  1. [BANT EXTRACTION] messages - should show "35M" included');
    console.log('  2. [EXTRACT BANT] API call - should show successful');
    console.log('  3. [EXTRACT BANT] Raw response - should show JSON with budget: "35M"');
    console.log('  4. [BANT PROMPT] Current BANT state - should show Budget: 35M');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testChatPreview().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});