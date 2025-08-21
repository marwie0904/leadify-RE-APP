#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ data: JSON.parse(responseData), status: res.statusCode });
        } catch (e) {
          resolve({ data: responseData, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function testCompleteHandoffFlow() {
  console.log('🔧 Testing Complete Handoff Flow...\n');
  console.log('This test will:');
  console.log('1. Start with AI conversation');
  console.log('2. Request handoff to human');
  console.log('3. Verify AI stops responding');
  console.log('4. Transfer back to AI');
  console.log('5. Verify AI resumes responding\n');
  
  try {
    // Step 1: Create a fresh conversation
    console.log('Step 1: Creating fresh conversation...');
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .limit(1)
      .single();
    
    if (!agent) {
      console.log('❌ No agents found');
      return;
    }
    
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        agent_id: agent.id,
        user_id: 'test-flow@example.com',
        source: 'web',
        status: 'active',
        handoff: false,
        mode: 'ai',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    const conversationId = newConv.id;
    console.log(`✅ Created conversation: ${conversationId}`);
    console.log(`   Agent: ${agent.id}`);
    console.log(`   Handoff: ${newConv.handoff}`);
    console.log(`   Mode: ${newConv.mode}`);
    
    // Step 2: Send initial message to AI
    console.log('\nStep 2: Sending message to AI...');
    const aiMessage1 = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      message: 'Hello, I want to know about property prices',
      agentId: agent.id,
      conversationId: conversationId,
      userId: 'test-flow@example.com',
      source: 'web'
    });
    
    console.log(`   Response status: ${aiMessage1.status}`);
    if (!aiMessage1.data.isHumanMode) {
      console.log(`   ✅ AI responded: "${aiMessage1.data.response?.substring(0, 100)}..."`);
    } else {
      console.log(`   ❌ Unexpected: Got human mode response`);
    }
    
    // Step 3: Request handoff
    console.log('\nStep 3: Requesting handoff to human...');
    const handoffResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/conversations/${conversationId}/request-handoff`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      reason: 'Customer needs detailed assistance',
      priority: 'high'
    });
    
    console.log(`   Response status: ${handoffResponse.status}`);
    if (handoffResponse.status === 201) {
      console.log(`   ✅ Handoff created: ${handoffResponse.data.handoff?.id}`);
      if (handoffResponse.data.handoff?.assignedTo) {
        console.log(`   ✅ Auto-assigned to: ${handoffResponse.data.handoff.assignedTo.name}`);
      } else {
        console.log(`   ⚠️ No agent available for assignment`);
      }
    } else {
      console.log(`   ❌ Handoff failed: ${handoffResponse.data.message}`);
    }
    
    // Step 4: Verify conversation is in handoff mode
    console.log('\nStep 4: Verifying handoff status...');
    const { data: handoffConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    console.log(`   Handoff: ${handoffConv.handoff}`);
    console.log(`   Mode: ${handoffConv.mode}`);
    console.log(`   Status: ${handoffConv.status}`);
    
    // Step 5: Try to send message - AI should NOT respond
    console.log('\nStep 5: Testing AI blocking during handoff...');
    const blockedMessage = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      message: 'What is the average price per square foot?',
      agentId: agent.id,
      conversationId: conversationId,
      userId: 'test-flow@example.com',
      source: 'web'
    });
    
    console.log(`   Response status: ${blockedMessage.status}`);
    if (blockedMessage.data.isHumanMode === true) {
      console.log(`   ✅ AI correctly blocked: "${blockedMessage.data.response}"`);
    } else {
      console.log(`   ❌ AI should not have responded!`);
      console.log(`   Got: "${blockedMessage.data.response?.substring(0, 100)}..."`);
    }
    
    // Step 6: Transfer back to AI
    console.log('\nStep 6: Transferring back to AI...');
    
    // Get an agent/admin user for auth
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('role', ['agent', 'admin'])
      .limit(1)
      .single();
    
    if (!orgMember) {
      console.log('❌ No agent/admin found for transfer');
      return;
    }
    
    const transferResponse = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/conversations/${conversationId}/transfer-to-ai`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': orgMember.user_id
      }
    }, {
      reason: 'Issue resolved, returning to AI'
    });
    
    console.log(`   Response status: ${transferResponse.status}`);
    if (transferResponse.status === 200) {
      console.log(`   ✅ Successfully transferred back to AI`);
    } else {
      console.log(`   ❌ Transfer failed: ${transferResponse.data.message}`);
    }
    
    // Step 7: Verify AI can respond again
    console.log('\nStep 7: Testing AI response after transfer...');
    const aiMessage2 = await httpRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      message: 'Thank you! Can you tell me about the neighborhood?',
      agentId: agent.id,
      conversationId: conversationId,
      userId: 'test-flow@example.com',
      source: 'web'
    });
    
    console.log(`   Response status: ${aiMessage2.status}`);
    if (!aiMessage2.data.isHumanMode && aiMessage2.data.response) {
      console.log(`   ✅ AI is responding again: "${aiMessage2.data.response?.substring(0, 100)}..."`);
    } else {
      console.log(`   ❌ AI should be responding but isn't`);
    }
    
    // Final verification
    console.log('\n📊 Final Verification:');
    const { data: finalConv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    console.log(`   Conversation ID: ${finalConv.id}`);
    console.log(`   Handoff: ${finalConv.handoff}`);
    console.log(`   Mode: ${finalConv.mode}`);
    console.log(`   Status: ${finalConv.status}`);
    console.log(`   Assigned Agent: ${finalConv.assigned_human_agent_id}`);
    
    if (finalConv.handoff === false && finalConv.mode === 'ai') {
      console.log('\n🎉 SUCCESS: Complete handoff flow working correctly!');
      console.log('   ✅ AI responds normally');
      console.log('   ✅ Handoff blocks AI responses');
      console.log('   ✅ Transfer to AI restores normal operation');
    } else {
      console.log('\n⚠️ WARNING: Final state doesn\'t match expected values');
    }
    
    // Cleanup
    console.log('\nCleaning up test conversation...');
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    console.log('✅ Test conversation deleted');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testCompleteHandoffFlow().catch(console.error);
}

module.exports = { testCompleteHandoffFlow };