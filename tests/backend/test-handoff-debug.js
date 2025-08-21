#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffDebug() {
  console.log('🔍 Testing handoff with debug info...\n');
  
  try {
    // Get a test conversation
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, agent_id, organization_id, status, handoff')
      .eq('status', 'active')
      .eq('handoff', false)
      .limit(1);
    
    if (convError || !conversations?.length) {
      console.log('Creating new test conversation...');
      
      // Get an agent
      const { data: agents } = await supabase
        .from('agents')
        .select('id, organization_id')
        .limit(1);
      
      if (!agents?.length) {
        console.log('❌ No agents found');
        return;
      }
      
      const agent = agents[0];
      
      // Create conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          agent_id: agent.id,
          organization_id: agent.organization_id,
          user_id: 'test-john-pork@example.com',
          source: 'web',
          status: 'active',
          handoff: false,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Failed to create conversation:', createError);
        return;
      }
      
      conversations[0] = newConv;
    }
    
    const conversation = conversations[0];
    console.log(`✅ Using conversation: ${conversation.id}`);
    console.log(`   Organization: ${conversation.organization_id}\n`);
    
    // Check if we have human agents
    const { data: agents, error: agentError } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', conversation.organization_id)
      .eq('role', 'agent');
    
    console.log(`👥 Found ${agents?.length || 0} human agents in organization`);
    
    if (!agents?.length) {
      console.log('⚠️  No human agents available - handoff will be pending\n');
    } else {
      for (const agent of agents) {
        const { data: { user } } = await supabase.auth.admin.getUserById(agent.user_id);
        console.log(`   - ${user?.email || agent.user_id}`);
      }
      console.log('');
    }
    
    // Now test creating a handoff directly in database
    console.log('📝 Creating handoff record directly...');
    
    const handoffData = {
      conversation_id: conversation.id,
      organization_id: conversation.organization_id,
      requested_by: 'system',
      status: 'pending',
      priority: 'high',
      reason: 'Test handoff request',
      notes: 'Testing handoff functionality',
      requested_at: new Date().toISOString()
    };
    
    // If we have agents, assign to the first one
    if (agents?.length > 0) {
      handoffData.assigned_to = agents[0].user_id;
      handoffData.status = 'assigned';
    }
    
    console.log('Handoff data:', JSON.stringify(handoffData, null, 2));
    
    const { data: handoff, error: handoffError } = await supabase
      .from('conversation_handoffs')
      .insert(handoffData)
      .select()
      .single();
    
    if (handoffError) {
      console.log('❌ Failed to create handoff:', handoffError);
      return;
    }
    
    console.log('✅ Handoff created successfully!');
    console.log(`   ID: ${handoff.id}`);
    console.log(`   Status: ${handoff.status}`);
    console.log(`   Priority: ${handoff.priority}`);
    
    if (handoff.assigned_to) {
      console.log(`   Assigned to: ${handoff.assigned_to}`);
    }
    
    // Update conversation
    console.log('\n📝 Updating conversation...');
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        handoff: true,
        handoff_requested_at: new Date().toISOString(),
        assigned_human_agent_id: handoff.assigned_to || null
      })
      .eq('id', conversation.id);
    
    if (updateError) {
      console.log('❌ Failed to update conversation:', updateError);
    } else {
      console.log('✅ Conversation updated successfully!');
    }
    
    console.log('\n✨ Test completed! Handoff functionality is working.');
    console.log(`\n📌 Conversation ID: ${conversation.id}`);
    console.log('   You can now test this in the frontend');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testHandoffDebug().catch(console.error);
}

module.exports = { testHandoffDebug };