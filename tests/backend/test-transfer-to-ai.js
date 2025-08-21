#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTransferToAI() {
  console.log('🔧 Testing Transfer to AI functionality...\n');
  
  try {
    // Find a conversation that's in handoff mode
    const { data: handoffConversations } = await supabase
      .from('conversations')
      .select('id, handoff, mode, assigned_human_agent_id')
      .eq('handoff', true)
      .limit(1);
    
    if (!handoffConversations?.length) {
      console.log('❌ No conversations in handoff mode found');
      console.log('Creating a test handoff...');
      
      // Create a handoff for testing
      const { data: activeConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('handoff', false)
        .limit(1)
        .single();
      
      if (!activeConv) {
        console.log('❌ No active conversations found to test with');
        return;
      }
      
      // Request handoff for this conversation
      const http = require('http');
      const handoffData = JSON.stringify({
        reason: 'Test handoff for transfer-to-ai',
        priority: 'normal'
      });
      
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: `/api/conversations/${activeConv.id}/request-handoff`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': handoffData.length
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(handoffData);
        req.end();
      });
      
      console.log(`✅ Created handoff for conversation: ${activeConv.id}`);
      
      // Refetch the conversation
      const { data: updatedConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', activeConv.id)
        .single();
      
      handoffConversations[0] = updatedConv;
    }
    
    const conversation = handoffConversations[0];
    console.log(`✅ Using conversation: ${conversation.id}`);
    console.log(`   Handoff status: ${conversation.handoff}`);
    console.log(`   Mode: ${conversation.mode}`);
    console.log(`   Assigned agent: ${conversation.assigned_human_agent_id}\n`);
    
    // Get a test user who is an agent or admin
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('role', ['agent', 'admin'])
      .limit(1)
      .single();
    
    if (!orgMember) {
      console.log('❌ No agent or admin users found');
      return;
    }
    
    console.log('📡 Calling /api/conversations/:id/transfer-to-ai...');
    
    // Simulate the transfer-to-ai API call
    const http = require('http');
    const requestData = JSON.stringify({
      reason: 'Testing transfer back to AI'
    });
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/transfer-to-ai`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': requestData.length,
          'x-user-id': orgMember.user_id  // Simulate auth
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
            resolve({ error: responseData, _statusCode: res.statusCode });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(requestData);
      req.end();
    });
    
    console.log(`\nResponse Status: ${response._statusCode}`);
    
    if (response._statusCode === 200) {
      console.log('✅ Transfer to AI successful!\n');
      console.log('Response:', JSON.stringify(response, null, 2));
      
      // Verify in database
      const { data: dbConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation.id)
        .single();
      
      console.log('\n✅ Database verification:');
      console.log(`   Handoff: ${dbConv.handoff}`);
      console.log(`   Mode: ${dbConv.mode}`);
      console.log(`   Assigned agent: ${dbConv.assigned_human_agent_id}`);
      console.log(`   Status: ${dbConv.status}`);
      
      if (dbConv.handoff === false && dbConv.mode === 'ai') {
        console.log('\n🎉 SUCCESS: Conversation successfully transferred back to AI!');
      } else {
        console.log('\n⚠️ WARNING: Database state doesn\'t match expected values');
      }
      
    } else {
      console.log(`❌ Transfer failed: ${response.message || response.error}`);
      if (response.error) {
        console.log('Full error:', response.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testTransferToAI().catch(console.error);
}

module.exports = { testTransferToAI };