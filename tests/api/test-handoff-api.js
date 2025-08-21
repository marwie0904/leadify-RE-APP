#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testHandoffAPI() {
  console.log('🔧 Testing handoff API endpoint...\n');
  
  try {
    // Get or create a test conversation
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, agent_id, organization_id, status, handoff')
      .eq('status', 'active')
      .eq('handoff', false)
      .limit(1);
    
    let conversation;
    
    if (!conversations?.length) {
      console.log('Creating new test conversation...');
      const { data: agents } = await supabase
        .from('agents')
        .select('id, organization_id')
        .limit(1);
      
      if (!agents?.length) {
        console.log('❌ No agents found');
        return;
      }
      
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          agent_id: agents[0].id,
          organization_id: agents[0].organization_id,
          user_id: 'john.pork.test@example.com',
          source: 'web',
          status: 'active',
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      conversation = newConv;
    } else {
      conversation = conversations[0];
    }
    
    console.log(`✅ Using conversation: ${conversation.id}`);
    console.log(`   Organization: ${conversation.organization_id}\n`);
    
    // Test the API endpoint
    console.log('📡 Calling /api/conversations/:id/request-handoff...');
    
    const http = require('http');
    const requestData = JSON.stringify({
      reason: 'Customer needs assistance with property valuation',
      priority: 'high',
      notes: 'John Pork requires detailed help'
    });
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${conversation.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': requestData.length
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
    
    if (response._statusCode === 201 || response._statusCode === 200) {
      console.log('✅ Handoff request successful!\n');
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.handoff?.assignedTo) {
        console.log(`\n🎯 Automatically assigned to: ${response.handoff.assignedTo.name}`);
      }
      
      // Verify in database
      const { data: dbHandoff } = await supabase
        .from('conversation_handoffs')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (dbHandoff) {
        console.log('\n✅ Database verification:');
        console.log(`   Status: ${dbHandoff.status}`);
        console.log(`   Priority: ${dbHandoff.priority}`);
        console.log(`   Assigned To: ${dbHandoff.assigned_to || 'None'}`);
      }
      
      console.log(`\n📌 Test conversation ID: ${conversation.id}`);
      console.log('   You can now test this in the frontend!');
      
    } else {
      console.log(`❌ Handoff failed: ${response.message || response.error}`);
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
  testHandoffAPI().catch(console.error);
}

module.exports = { testHandoffAPI };