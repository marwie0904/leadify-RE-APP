#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAndTestHandoff() {
  console.log('🔧 Creating test conversation and testing handoff...\n');
  
  try {
    // Get an AI agent for testing
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, name, organization_id')
      .limit(1);
    
    if (agentError || !agents?.length) {
      console.log('❌ No agents found');
      return;
    }
    
    const agent = agents[0];
    console.log(`✅ Using agent: ${agent.name} (${agent.id})`);
    console.log(`   Organization: ${agent.organization_id}\n`);
    
    // Create a test conversation for John Pork
    const conversationData = {
      agent_id: agent.id,
      user_id: 'john.pork@example.com',
      organization_id: agent.organization_id,
      source: 'web',
      status: 'active',
      started_at: new Date().toISOString()
    };
    
    console.log('📝 Creating test conversation for John Pork...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();
    
    if (convError) {
      console.log(`❌ Failed to create conversation: ${convError.message}`);
      return;
    }
    
    console.log(`✅ Created conversation: ${conversation.id}\n`);
    
    // Add some messages
    await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversation.id,
          role: 'user',
          content: 'Hi, I am John Pork and I need help with property valuation',
          created_at: new Date().toISOString()
        },
        {
          conversation_id: conversation.id,
          role: 'assistant',
          content: 'Hello John! I\'d be happy to help you with property valuation. What property are you interested in?',
          created_at: new Date(Date.now() + 1000).toISOString()
        }
      ]);
    
    console.log('💬 Added test messages\n');
    
    // Now test the handoff endpoint
    console.log('📡 Testing handoff endpoint...');
    
    const http = require('http');
    const requestData = JSON.stringify({
      reason: 'Customer needs complex property valuation assistance',
      priority: 'high',
      notes: 'John Pork needs help with detailed property analysis'
    });
    
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': requestData.length
        }
      };
      
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            parsed._statusCode = res.statusCode;
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(requestData);
      req.end();
    });
    
    if (data._statusCode !== 201 && data._statusCode !== 200) {
      console.log(`❌ Handoff failed: ${data.message}`);
      
      // Cleanup
      await supabase.from('messages').delete().eq('conversation_id', conversation.id);
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return;
    }
    
    console.log('✅ Handoff request successful!\n');
    console.log('📊 Response Details:');
    console.log(`   Status: ${data.handoff?.status}`);
    console.log(`   Priority: ${data.handoff?.priority}`);
    console.log(`   Message: ${data.message}`);
    
    if (data.handoff?.assignedTo) {
      console.log(`\n👤 Assigned Agent:`);
      console.log(`   ID: ${data.handoff.assignedTo.id}`);
      console.log(`   Name: ${data.handoff.assignedTo.name}`);
      console.log(`   Email: ${data.handoff.assignedTo.email}`);
    } else {
      console.log('\n⚠️  No agent was assigned (may be pending)');
    }
    
    // Verify in database
    console.log('\n🔍 Verifying database updates...');
    
    const { data: updatedConv } = await supabase
      .from('conversations')
      .select('handoff, handoff_requested_at, assigned_human_agent_id, status')
      .eq('id', conversation.id)
      .single();
    
    console.log('✅ Conversation updated:');
    console.log(`   Handoff flag: ${updatedConv.handoff}`);
    console.log(`   Status: ${updatedConv.status}`);
    console.log(`   Assigned Agent ID: ${updatedConv.assigned_human_agent_id || 'None'}`);
    
    const { data: handoffRecord } = await supabase
      .from('conversation_handoffs')
      .select('*')
      .eq('conversation_id', conversation.id)
      .single();
    
    if (handoffRecord) {
      console.log('\n✅ Handoff record created:');
      console.log(`   Record ID: ${handoffRecord.id}`);
      console.log(`   Status: ${handoffRecord.status}`);
      console.log(`   Priority: ${handoffRecord.priority}`);
      console.log(`   Reason: ${handoffRecord.reason}`);
      
      if (handoffRecord.assigned_to) {
        console.log(`   Assigned To: ${handoffRecord.assigned_to}`);
      }
    }
    
    // Check for system message
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation.id)
      .eq('role', 'system')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (messages?.length > 0) {
      console.log(`\n💬 System message created: "${messages[0].content}"`);
    }
    
    console.log('\n✨ Handoff test completed successfully!');
    console.log(`\n📌 Conversation ID for frontend testing: ${conversation.id}`);
    console.log('   You can now test this in the frontend conversations page');
    
    // Keep the conversation for frontend testing
    console.log('\n💡 Note: Test conversation kept for frontend testing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  createAndTestHandoff().catch(console.error);
}

module.exports = { createAndTestHandoff };