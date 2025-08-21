#!/usr/bin/env node

// Direct database check after handoff creation
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffDatabaseCheck() {
  console.log('🔍 Testing Handoff Database Storage...\n');
  
  try {
    // Get a test conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, organization_id')
      .eq('status', 'active')
      .eq('handoff', false)
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
          user_id: 'test-priority@example.com',
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
    
    // Test each priority level
    const testCases = [
      { priority: 'normal', reason: 'Normal priority test' },
      { priority: 'high', reason: 'High priority test' },
      { priority: 'urgent', reason: 'Urgent priority test' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n📝 Testing ${testCase.priority.toUpperCase()} priority`);
      console.log(`   Sending: priority="${testCase.priority}", reason="${testCase.reason}"`);
      
      // Clean up any existing handoffs
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', conversation.id);
      
      await supabase
        .from('conversations')
        .update({ handoff: false, assigned_human_agent_id: null })
        .eq('id', conversation.id);
      
      // Make the request
      const payload = JSON.stringify({
        priority: testCase.priority,
        reason: testCase.reason,
        notes: `Notes for ${testCase.priority} priority`
      });
      
      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: `/api/conversations/${conversation.id}/request-handoff`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
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
        req.write(payload);
        req.end();
      });
      
      if (response.status === 201) {
        console.log('   ✅ Handoff created');
        
        // Check what's in the database
        const { data: dbHandoff } = await supabase
          .from('conversation_handoffs')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (dbHandoff) {
          console.log('\n   📊 Database Record:');
          console.log(`      ID: ${dbHandoff.id}`);
          console.log(`      Priority: ${dbHandoff.priority} ${dbHandoff.priority === testCase.priority ? '✅' : '❌'}`);
          console.log(`      Reason: ${dbHandoff.reason} ${dbHandoff.reason === testCase.reason ? '✅' : '❌'}`);
          console.log(`      Notes: ${dbHandoff.notes}`);
          console.log(`      Status: ${dbHandoff.status}`);
          console.log(`      Created: ${dbHandoff.created_at}`);
          
          // Now check what the backend would return when fetching this conversation
          const { data: convWithHandoff } = await supabase
            .from('conversations')
            .select(`
              *,
              conversation_handoffs (
                id,
                priority,
                reason,
                notes,
                status,
                created_at
              )
            `)
            .eq('id', conversation.id)
            .single();
          
          if (convWithHandoff) {
            console.log('\n   🔄 What backend would fetch:');
            console.log(`      conversations.handoff: ${convWithHandoff.handoff}`);
            console.log(`      conversations.priority: ${convWithHandoff.priority || 'undefined'}`);
            console.log(`      conversation_handoffs[0].priority: ${convWithHandoff.conversation_handoffs?.[0]?.priority}`);
            
            // Simulate backend logic
            const backendPriority = convWithHandoff.conversation_handoffs?.[0]?.priority || convWithHandoff.priority || 'normal';
            console.log(`\n   💻 Backend would send: priority="${backendPriority}"`);
            
            if (backendPriority === testCase.priority) {
              console.log('   ✅ Priority would be displayed correctly');
            } else {
              console.log(`   ❌ Priority mismatch! Expected "${testCase.priority}", would get "${backendPriority}"`);
            }
          }
        } else {
          console.log('   ❌ No handoff found in database!');
        }
      } else {
        console.log(`   ❌ Failed to create handoff: ${response.data.message || response.data}`);
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
  testHandoffDatabaseCheck().catch(console.error);
}

module.exports = { testHandoffDatabaseCheck };