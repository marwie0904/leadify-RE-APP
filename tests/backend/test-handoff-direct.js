#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config();

async function testHandoffDirectly() {
  console.log('🔧 Testing handoff endpoint directly...\n');
  
  try {
    // First, get a conversation ID from the database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Find John Pork's conversation
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, user_id, status, handoff')
      .ilike('user_id', '%john%pork%')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !conversations?.length) {
      console.log('❌ Could not find John Pork conversation');
      
      // List all recent conversations
      const { data: allConvs } = await supabase
        .from('conversations')
        .select('id, user_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('\nRecent conversations:');
      allConvs?.forEach(c => {
        console.log(`  - ${c.id}: ${c.user_id} (${c.status}) - ${c.created_at}`);
      });
      return;
    }
    
    const conversation = conversations[0];
    console.log(`✅ Found conversation: ${conversation.id}`);
    console.log(`   User: ${conversation.user_id}`);
    console.log(`   Status: ${conversation.status}`);
    console.log(`   Handoff: ${conversation.handoff}\n`);
    
    if (conversation.handoff === true) {
      console.log('⚠️  Handoff already requested for this conversation');
      
      // Reset it for testing
      console.log('   Resetting handoff status for testing...');
      await supabase
        .from('conversations')
        .update({ 
          handoff: false, 
          handoff_requested_at: null,
          assigned_human_agent_id: null,
          status: 'active'
        })
        .eq('id', conversation.id);
      
      // Also delete any existing handoff records
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', conversation.id);
      
      console.log('   Reset complete\n');
    }
    
    // Now test the handoff endpoint
    console.log('📡 Calling handoff endpoint...');
    const response = await fetch(`http://localhost:3001/api/conversations/${conversation.id}/request-handoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Customer needs help with property valuation',
        priority: 'high',
        notes: 'Testing handoff functionality'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Handoff failed: ${data.message}`);
      return;
    }
    
    console.log('✅ Handoff request successful!\n');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Verify in database
    console.log('\n🔍 Verifying in database...');
    
    const { data: updatedConv } = await supabase
      .from('conversations')
      .select('handoff, handoff_requested_at, assigned_human_agent_id, status')
      .eq('id', conversation.id)
      .single();
    
    console.log('Conversation updated:');
    console.log(`  - Handoff: ${updatedConv.handoff}`);
    console.log(`  - Status: ${updatedConv.status}`);
    console.log(`  - Assigned Agent: ${updatedConv.assigned_human_agent_id || 'None'}`);
    
    const { data: handoffRecord } = await supabase
      .from('conversation_handoffs')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (handoffRecord) {
      console.log('\nHandoff record created:');
      console.log(`  - ID: ${handoffRecord.id}`);
      console.log(`  - Status: ${handoffRecord.status}`);
      console.log(`  - Priority: ${handoffRecord.priority}`);
      console.log(`  - Assigned To: ${handoffRecord.assigned_to || 'None'}`);
      
      if (handoffRecord.assigned_to) {
        // Get agent details
        const { data: { user } } = await supabase.auth.admin.getUserById(handoffRecord.assigned_to);
        if (user) {
          console.log(`  - Agent Name: ${user.user_metadata?.full_name || user.email}`);
        }
      }
    }
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testHandoffDirectly().catch(console.error);
}

module.exports = { testHandoffDirectly };