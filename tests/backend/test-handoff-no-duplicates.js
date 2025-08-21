#!/usr/bin/env node

// Test to ensure no duplicate handoff records are created
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffNoDuplicates() {
  console.log('🔍 Testing Handoff Duplicate Prevention...\n');
  
  try {
    // Get a test conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id')
      .eq('status', 'active')
      .limit(1)
      .single();
    
    if (!conversation) {
      console.log('Creating a test conversation...');
      const { data: agent } = await supabase
        .from('agents')
        .select('id, organization_id')
        .limit(1)
        .single();
      
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          organization_id: agent.organization_id,
          user_id: 'test-no-duplicates@example.com',
          source: 'web',
          status: 'active',
          handoff: false,
          mode: 'ai',
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      conversation = newConv;
    }
    
    console.log(`Using conversation: ${conversation.id}\n`);
    
    // Clean up any existing handoffs
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    // Step 1: Request first handoff
    console.log('Step 1: Requesting first handoff...');
    
    const firstHandoffPayload = JSON.stringify({
      priority: 'normal',
      reason: 'First handoff request',
      notes: 'Testing duplicate prevention'
    });
    
    const firstResponse = await makeRequest('POST', `/api/conversations/${conversation.id}/request-handoff`, firstHandoffPayload);
    
    if (firstResponse.status === 201) {
      console.log('✅ First handoff created successfully');
      
      // Check database
      const { data: firstHandoffs } = await supabase
        .from('conversation_handoffs')
        .select('id, priority, reason')
        .eq('conversation_id', conversation.id);
      
      console.log(`   Found ${firstHandoffs.length} handoff record(s) in database`);
      if (firstHandoffs.length === 1) {
        console.log('   ✅ Exactly one handoff record exists');
      } else {
        console.log(`   ❌ Expected 1 record, found ${firstHandoffs.length}`);
      }
    } else {
      console.log('❌ Failed to create first handoff:', firstResponse.data);
      return;
    }
    
    // Step 2: Transfer back to AI
    console.log('\nStep 2: Transferring back to AI...');
    
    const transferResponse = await makeRequest('POST', `/api/conversations/${conversation.id}/transfer-to-ai`, '{}');
    
    if (transferResponse.status === 200) {
      console.log('✅ Transferred back to AI');
      
      // Check if handoff records were deleted
      const { data: afterTransferHandoffs } = await supabase
        .from('conversation_handoffs')
        .select('id')
        .eq('conversation_id', conversation.id);
      
      console.log(`   Found ${afterTransferHandoffs.length} handoff record(s) after transfer`);
      if (afterTransferHandoffs.length === 0) {
        console.log('   ✅ All handoff records deleted');
      } else {
        console.log(`   ❌ ${afterTransferHandoffs.length} handoff record(s) still exist`);
      }
      
      // Check conversation status
      const { data: convAfterTransfer } = await supabase
        .from('conversations')
        .select('handoff, mode')
        .eq('id', conversation.id)
        .single();
      
      console.log(`   Conversation handoff status: ${convAfterTransfer.handoff}`);
      console.log(`   Conversation mode: ${convAfterTransfer.mode}`);
    } else {
      console.log('❌ Failed to transfer to AI:', transferResponse.data);
    }
    
    // Step 3: Request second handoff
    console.log('\nStep 3: Requesting second handoff (should not create duplicates)...');
    
    const secondHandoffPayload = JSON.stringify({
      priority: 'high',
      reason: 'Second handoff request',
      notes: 'This should not create duplicates'
    });
    
    const secondResponse = await makeRequest('POST', `/api/conversations/${conversation.id}/request-handoff`, secondHandoffPayload);
    
    if (secondResponse.status === 201) {
      console.log('✅ Second handoff created successfully');
      
      // Check database for duplicates
      const { data: secondHandoffs } = await supabase
        .from('conversation_handoffs')
        .select('id, priority, reason, created_at')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false });
      
      console.log(`   Found ${secondHandoffs.length} handoff record(s) in database`);
      
      if (secondHandoffs.length === 1) {
        console.log('   ✅ SUCCESS: No duplicates! Only one handoff record exists');
        console.log(`      Priority: ${secondHandoffs[0].priority}`);
        console.log(`      Reason: ${secondHandoffs[0].reason}`);
      } else {
        console.log(`   ❌ FAILURE: Found ${secondHandoffs.length} records (duplicates exist)`);
        secondHandoffs.forEach((h, i) => {
          console.log(`      Record ${i + 1}: ${h.reason} (${h.priority}) - ${h.created_at}`);
        });
      }
    } else {
      console.log('❌ Failed to create second handoff:', secondResponse.data);
    }
    
    // Step 4: Test rapid succession (edge case)
    console.log('\nStep 4: Testing rapid succession handoff requests...');
    
    // Transfer back to AI first
    await makeRequest('POST', `/api/conversations/${conversation.id}/transfer-to-ai`, '{}');
    
    // Make multiple rapid requests
    const rapidRequests = [];
    for (let i = 0; i < 3; i++) {
      const payload = JSON.stringify({
        priority: 'urgent',
        reason: `Rapid request ${i + 1}`,
        notes: 'Testing race condition'
      });
      rapidRequests.push(makeRequest('POST', `/api/conversations/${conversation.id}/request-handoff`, payload));
    }
    
    const rapidResults = await Promise.allSettled(rapidRequests);
    const successCount = rapidResults.filter(r => r.status === 'fulfilled' && r.value.status === 201).length;
    console.log(`   ${successCount} out of 3 rapid requests succeeded`);
    
    // Check final state
    const { data: finalHandoffs } = await supabase
      .from('conversation_handoffs')
      .select('id')
      .eq('conversation_id', conversation.id);
    
    console.log(`   Final handoff count: ${finalHandoffs.length}`);
    if (finalHandoffs.length === 1) {
      console.log('   ✅ SUCCESS: Even with rapid requests, only one handoff exists');
    } else {
      console.log(`   ⚠️ WARNING: ${finalHandoffs.length} handoffs exist after rapid requests`);
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

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body ? body.length : 0
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
    if (body) req.write(body);
    req.end();
  });
}

// Run the test
if (require.main === module) {
  testHandoffNoDuplicates().catch(console.error);
}

module.exports = { testHandoffNoDuplicates };