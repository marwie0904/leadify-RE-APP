#!/usr/bin/env node

// Simple test to check what the frontend is sending to the backend
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffSimple() {
  console.log('🔍 Testing Handoff Priority Submission...\n');
  
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
    
    // Test cases matching what the frontend sends
    const testCases = [
      {
        // What frontend sends when user selects "Normal - General inquiry"
        frontendPriority: 'normal',
        expectedDisplay: 'normal',
        reason: 'User selected Normal priority'
      },
      {
        // What frontend sends when user selects "High - Urgent assistance needed"
        frontendPriority: 'high',
        expectedDisplay: 'high',
        reason: 'User selected High priority'
      },
      {
        // What frontend sends when user selects "Urgent - Critical issue"
        frontendPriority: 'urgent',
        expectedDisplay: 'urgent',
        reason: 'User selected Urgent priority'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.frontendPriority} priority`);
      console.log(`  Frontend sends: priority="${testCase.frontendPriority}", reason="${testCase.reason}"`);
      
      // Reset conversation state
      await supabase
        .from('conversations')
        .update({ handoff: false, assigned_human_agent_id: null })
        .eq('id', conversation.id);
      
      // Delete any existing handoffs
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', conversation.id);
      
      // Make the request exactly as the frontend does
      const payload = JSON.stringify({
        priority: testCase.frontendPriority,
        reason: testCase.reason,
        notes: testCase.reason
      });
      
      console.log(`  Payload being sent: ${payload}`);
      
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
        console.log(`  ✅ Backend accepted request`);
        console.log(`  Response priority: ${response.data.handoff?.priority}`);
        
        // Check database
        const { data: dbHandoff } = await supabase
          .from('conversation_handoffs')
          .select('priority, reason, notes')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (dbHandoff) {
          console.log(`  📊 Database values:`);
          console.log(`     Priority: ${dbHandoff.priority}`);
          console.log(`     Reason: ${dbHandoff.reason}`);
          console.log(`     Notes: ${dbHandoff.notes}`);
          
          const priorityMatch = dbHandoff.priority === testCase.expectedDisplay;
          const reasonMatch = dbHandoff.reason === testCase.reason;
          
          if (!priorityMatch) {
            console.log(`  ❌ PRIORITY MISMATCH!`);
            console.log(`     Expected: ${testCase.expectedDisplay}`);
            console.log(`     Got: ${dbHandoff.priority}`);
          } else {
            console.log(`  ✅ Priority correct`);
          }
          
          if (!reasonMatch) {
            console.log(`  ❌ REASON MISMATCH!`);
            console.log(`     Expected: ${testCase.reason}`);
            console.log(`     Got: ${dbHandoff.reason}`);
          } else {
            console.log(`  ✅ Reason correct`);
          }
        } else {
          console.log(`  ❌ No handoff found in database!`);
        }
      } else {
        console.log(`  ❌ Backend rejected request: ${response.data.message || response.data}`);
      }
      
      console.log('');
    }
    
    // Cleanup
    console.log('Cleaning up test data...');
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
  testHandoffSimple().catch(console.error);
}

module.exports = { testHandoffSimple };