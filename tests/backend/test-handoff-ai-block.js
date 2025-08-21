#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffAIBlock() {
  console.log('🔧 Testing AI blocking during handoff mode...\n');
  
  try {
    // Step 1: Find or create a conversation in handoff mode
    console.log('Step 1: Finding a conversation in handoff mode...');
    let { data: handoffConversations } = await supabase
      .from('conversations')
      .select('id, handoff, agent_id')
      .eq('handoff', true)
      .limit(1);
    
    let conversationId;
    let agentId;
    
    if (!handoffConversations?.length) {
      console.log('No handoff conversations found. Creating one...');
      
      // Get an active conversation to create handoff
      const { data: activeConv } = await supabase
        .from('conversations')
        .select('id, agent_id')
        .eq('handoff', false)
        .eq('status', 'active')
        .limit(1)
        .single();
      
      if (!activeConv) {
        console.log('❌ No active conversations found');
        return;
      }
      
      conversationId = activeConv.id;
      agentId = activeConv.agent_id;
      
      // Request handoff
      const handoffData = JSON.stringify({
        reason: 'Testing AI blocking during handoff',
        priority: 'normal'
      });
      
      const handoffResponse = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: `/api/conversations/${conversationId}/request-handoff`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': handoffData.length
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ data: JSON.parse(data), status: res.statusCode });
            } catch (e) {
              resolve({ data: data, status: res.statusCode });
            }
          });
        });
        req.on('error', reject);
        req.write(handoffData);
        req.end();
      });
      
      console.log(`✅ Created handoff for conversation: ${conversationId}`);
      console.log(`   Status: ${handoffResponse.status}`);
    } else {
      conversationId = handoffConversations[0].id;
      agentId = handoffConversations[0].agent_id;
      console.log(`✅ Using existing handoff conversation: ${conversationId}`);
    }
    
    // Step 2: Verify conversation is in handoff mode
    console.log('\nStep 2: Verifying handoff status...');
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    console.log(`   Conversation ID: ${conversation.id}`);
    console.log(`   Handoff: ${conversation.handoff}`);
    console.log(`   Mode: ${conversation.mode}`);
    console.log(`   Assigned Agent: ${conversation.assigned_human_agent_id}`);
    
    if (!conversation.handoff) {
      console.log('❌ Conversation is not in handoff mode');
      return;
    }
    
    // Step 3: Send a message to the conversation and check AI response
    console.log('\nStep 3: Sending test message to conversation in handoff mode...');
    const testMessage = 'Hello, I need help with property valuation';
    
    const chatData = JSON.stringify({
      message: testMessage,
      agentId: agentId,
      conversationId: conversationId,
      userId: 'test-user@example.com',
      source: 'web'
    });
    
    const chatResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': chatData.length
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ data: JSON.parse(data), status: res.statusCode });
          } catch (e) {
            resolve({ data: data, status: res.statusCode });
          }
        });
      });
      req.on('error', reject);
      req.write(chatData);
      req.end();
    });
    
    console.log(`\n📡 Chat API Response:`);
    console.log(`   Status: ${chatResponse.status}`);
    console.log(`   Response:`, chatResponse.data);
    
    // Step 4: Verify the response
    console.log('\n🔍 Verification:');
    if (chatResponse.data.isHumanMode === true && chatResponse.data.handoffCreated === true) {
      console.log('✅ SUCCESS: AI correctly blocked from responding');
      console.log('   The system returned a handoff notification instead of AI response');
      console.log(`   Message: "${chatResponse.data.response}"`);
    } else if (chatResponse.data.response && !chatResponse.data.isHumanMode) {
      console.log('❌ FAILURE: AI responded when it should have been blocked');
      console.log(`   AI Response: "${chatResponse.data.response}"`);
    } else {
      console.log('⚠️ UNEXPECTED: Unclear response from API');
      console.log('   Full response:', JSON.stringify(chatResponse.data, null, 2));
    }
    
    // Step 5: Transfer back to AI for cleanup
    console.log('\nStep 5: Cleaning up - transferring back to AI...');
    const transferData = JSON.stringify({
      reason: 'Test complete - returning to AI'
    });
    
    // Get an agent/admin user for auth
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('role', ['agent', 'admin'])
      .limit(1)
      .single();
    
    if (orgMember) {
      const transferResponse = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: `/api/conversations/${conversationId}/transfer-to-ai`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': transferData.length,
            'x-user-id': orgMember.user_id
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ data: JSON.parse(data), status: res.statusCode });
            } catch (e) {
              resolve({ data: data, status: res.statusCode });
            }
          });
        });
        req.on('error', reject);
        req.write(transferData);
        req.end();
      });
      
      if (transferResponse.status === 200) {
        console.log('✅ Conversation transferred back to AI');
      } else {
        console.log('⚠️ Could not transfer back to AI:', transferResponse.data);
      }
    }
    
    console.log('\n🎉 Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testHandoffAIBlock().catch(console.error);
}

module.exports = { testHandoffAIBlock };