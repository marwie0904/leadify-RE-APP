#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffPriority() {
  console.log('🔧 Testing Handoff Priority Levels...\n');
  
  const priorities = [
    { value: 'normal', label: 'Normal - General inquiry', color: 'green' },
    { value: 'high', label: 'High - Urgent assistance needed', color: 'orange' },
    { value: 'urgent', label: 'Urgent - Critical issue', color: 'red' }
  ];
  
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
      // Create a test conversation
      const { data: agent } = await supabase
        .from('agents')
        .select('id, organization_id')
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
    for (const priority of priorities) {
      console.log(`Testing priority: ${priority.label}`);
      
      // First reset the conversation to not be in handoff
      await supabase
        .from('conversations')
        .update({ handoff: false, assigned_human_agent_id: null })
        .eq('id', conversation.id);
      
      // Delete any existing handoffs for this conversation
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', conversation.id);
      
      // Request handoff with specific priority
      const handoffData = JSON.stringify({
        priority: priority.value,
        reason: `Testing ${priority.label}`,
        notes: `This is a test of the ${priority.value} priority level`
      });
      
      const response = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: 3001,
          path: `/api/conversations/${conversation.id}/request-handoff`,
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
      
      if (response.status === 201) {
        console.log(`  ✅ Handoff created with priority: ${response.data.handoff?.priority}`);
        
        // Verify in database
        const { data: dbHandoff } = await supabase
          .from('conversation_handoffs')
          .select('priority, reason, notes')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (dbHandoff) {
          const priorityMatch = dbHandoff.priority === priority.value;
          const reasonMatch = dbHandoff.reason === `Testing ${priority.label}`;
          const notesMatch = dbHandoff.notes === `This is a test of the ${priority.value} priority level`;
          
          console.log(`  Database verification:`);
          console.log(`    Priority: ${dbHandoff.priority} ${priorityMatch ? '✅' : '❌'}`);
          console.log(`    Reason: ${dbHandoff.reason ? '✅' : '❌'}`);
          console.log(`    Notes: ${dbHandoff.notes ? '✅' : '❌'}`);
          
          if (!priorityMatch) {
            console.log(`    ❌ Priority mismatch! Expected: ${priority.value}, Got: ${dbHandoff.priority}`);
          }
        }
      } else {
        console.log(`  ❌ Failed to create handoff: ${response.data.message || response.data}`);
      }
      
      console.log('');
    }
    
    // Test with no priority (should default to 'normal')
    console.log('Testing with no priority specified (should default to normal):');
    
    // Reset conversation
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    const defaultData = JSON.stringify({
      // No priority specified
      reason: 'Testing default priority'
    });
    
    const defaultResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': defaultData.length
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
      req.write(defaultData);
      req.end();
    });
    
    if (defaultResponse.status === 201) {
      const priority = defaultResponse.data.handoff?.priority;
      console.log(`  Priority: ${priority} ${priority === 'normal' ? '✅' : '❌'}`);
    }
    
    // Test with no reason (should use default)
    console.log('\nTesting with no reason specified (should use default):');
    
    // Reset conversation
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    const noReasonData = JSON.stringify({
      priority: 'high'
      // No reason specified
    });
    
    const noReasonResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': noReasonData.length
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
      req.write(noReasonData);
      req.end();
    });
    
    if (noReasonResponse.status === 201) {
      const reason = noReasonResponse.data.handoff?.reason;
      console.log(`  Reason: "${reason}"`);
      console.log(`  ${reason === 'User requested human assistance' ? '✅ Using default reason' : '❌ Not using default'}`);
    }
    
    console.log('\n🎉 Priority level testing complete!');
    
    // Cleanup
    console.log('\nCleaning up test data...');
    await supabase
      .from('conversation_handoffs')
      .delete()
      .eq('conversation_id', conversation.id);
    
    await supabase
      .from('conversations')
      .update({ handoff: false, assigned_human_agent_id: null })
      .eq('id', conversation.id);
    
    console.log('✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testHandoffPriority().catch(console.error);
}

module.exports = { testHandoffPriority };