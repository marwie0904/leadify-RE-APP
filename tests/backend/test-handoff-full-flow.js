#!/usr/bin/env node

// Full flow test - create handoff and then fetch it to see what's returned
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffFullFlow() {
  console.log('🔄 Testing Full Handoff Flow...\n');
  
  try {
    // Get a test conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id')
      .eq('status', 'active')
      .eq('handoff', false)
      .limit(1)
      .single();
    
    if (!conversation) {
      console.log('❌ No active conversations found');
      return;
    }
    
    console.log(`Using conversation: ${conversation.id}\n`);
    
    // Get a test user for auth
    const { data: testUser } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', conversation.organization_id)
      .limit(1)
      .single();
    
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    
    // Generate a JWT for testing
    const token = jwt.sign({ id: testUser.user_id }, process.env.JWT_SECRET || 'test-secret');
    
    // Clean up any existing handoffs
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    // Step 1: Create a handoff with normal priority
    console.log('Step 1: Creating handoff with NORMAL priority...');
    
    const handoffPayload = JSON.stringify({
      priority: 'normal',
      reason: 'Testing normal priority display',
      notes: 'This should show as normal priority'
    });
    
    const handoffResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': handoffPayload.length
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
      req.write(handoffPayload);
      req.end();
    });
    
    if (handoffResponse.status === 201) {
      console.log('✅ Handoff created successfully');
      console.log('Response priority:', handoffResponse.data.handoff?.priority);
    } else {
      console.log('❌ Failed to create handoff:', handoffResponse.data);
      return;
    }
    
    // Step 2: Fetch handoff conversations to see what the frontend would receive
    console.log('\nStep 2: Fetching handoff conversations (what frontend sees)...');
    
    const handoffsResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/conversations/handoffs',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ error: data });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    if (handoffsResponse.conversations) {
      const ourConversation = handoffsResponse.conversations.find(c => c.id === conversation.id);
      
      if (ourConversation) {
        console.log('\n📊 What the frontend receives:');
        console.log('  conversation.priority:', ourConversation.priority);
        console.log('  conversation.handoff_details?.priority:', ourConversation.handoff_details?.priority);
        console.log('  conversation.handoff_details?.reason:', ourConversation.handoff_details?.reason);
        console.log('  conversation.handoff_details?.notes:', ourConversation.handoff_details?.notes);
        
        // Check what the frontend would display
        const frontendPriority = ourConversation.priority || 'normal';
        const frontendReason = ourConversation.handoff_details?.reason || "Human assistance requested";
        
        console.log('\n🖥️ What the frontend would display:');
        console.log('  Priority:', frontendPriority);
        console.log('  Reason:', frontendReason);
        
        if (frontendPriority === 'normal') {
          console.log('\n✅ SUCCESS: Priority would display correctly as "normal"');
        } else {
          console.log(`\n❌ FAILURE: Priority would display as "${frontendPriority}" instead of "normal"`);
        }
      } else {
        console.log('❌ Conversation not found in handoffs response');
      }
    } else {
      console.log('❌ Failed to fetch handoffs:', handoffsResponse);
    }
    
    // Step 3: Test with HIGH priority
    console.log('\n\nStep 3: Testing with HIGH priority...');
    
    // Clean up first
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    const highPayload = JSON.stringify({
      priority: 'high',
      reason: 'Testing high priority display',
      notes: 'This should show as high priority'
    });
    
    const highResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': highPayload.length
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
      req.write(highPayload);
      req.end();
    });
    
    if (highResponse.status === 201) {
      console.log('✅ High priority handoff created');
      
      // Fetch again
      const highHandoffsResponse = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/api/conversations/handoffs',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({ error: data });
            }
          });
        });
        req.on('error', reject);
        req.end();
      });
      
      if (highHandoffsResponse.conversations) {
        const ourConversation = highHandoffsResponse.conversations.find(c => c.id === conversation.id);
        
        if (ourConversation) {
          console.log('\n📊 What the frontend receives for HIGH priority:');
          console.log('  conversation.priority:', ourConversation.priority);
          console.log('  conversation.handoff_details?.priority:', ourConversation.handoff_details?.priority);
          
          const frontendPriority = ourConversation.priority || 'normal';
          
          if (frontendPriority === 'high') {
            console.log('✅ SUCCESS: High priority would display correctly');
          } else {
            console.log(`❌ FAILURE: Priority would display as "${frontendPriority}" instead of "high"`);
          }
        }
      }
    }
    
    // Cleanup
    console.log('\n\nCleaning up test data...');
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    console.log('✅ Test complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testHandoffFullFlow().catch(console.error);
}

module.exports = { testHandoffFullFlow };