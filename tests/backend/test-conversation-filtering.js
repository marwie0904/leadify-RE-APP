#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const http = require('http');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConversationFiltering() {
  console.log('🔧 Testing Conversation Filtering by Handoff Status...\n');
  
  try {
    // Step 1: Create two test conversations - one normal, one for handoff
    console.log('Step 1: Creating test conversations...');
    
    const { data: agent } = await supabase
      .from('agents')
      .select('id, organization_id')
      .limit(1)
      .single();
    
    if (!agent) {
      console.log('❌ No agents found');
      return;
    }
    
    // Create normal conversation
    const { data: normalConv } = await supabase
      .from('conversations')
      .insert({
        agent_id: agent.id,
        organization_id: agent.organization_id,
        user_id: 'test-normal@example.com',
        source: 'web',
        status: 'active',
        handoff: false,
        mode: 'ai',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // Create handoff conversation
    const { data: handoffConv } = await supabase
      .from('conversations')
      .insert({
        agent_id: agent.id,
        organization_id: agent.organization_id,
        user_id: 'test-handoff@example.com',
        source: 'web',
        status: 'active',
        handoff: false, // Start as false, will request handoff
        mode: 'ai',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    console.log(`✅ Created normal conversation: ${normalConv.id}`);
    console.log(`✅ Created handoff conversation: ${handoffConv.id}`);
    
    // Step 2: Request handoff for the second conversation
    console.log('\nStep 2: Requesting handoff for second conversation...');
    
    const handoffData = JSON.stringify({
      reason: 'Testing conversation filtering',
      priority: 'normal'
    });
    
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: `/api/conversations/${handoffConv.id}/request-handoff`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': handoffData.length
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve());
      });
      req.on('error', reject);
      req.write(handoffData);
      req.end();
    });
    
    console.log('✅ Handoff requested');
    
    // Step 3: Verify database state
    console.log('\nStep 3: Verifying database state...');
    
    const { data: updatedHandoffConv } = await supabase
      .from('conversations')
      .select('id, handoff, status')
      .eq('id', handoffConv.id)
      .single();
    
    console.log(`   Normal conversation - handoff: false`);
    console.log(`   Handoff conversation - handoff: ${updatedHandoffConv.handoff}`);
    
    // Step 4: Check what conversations API returns
    console.log('\nStep 4: Testing /api/conversations endpoint...');
    
    // Get a test user for auth
    const { data: testUser } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', agent.organization_id)
      .limit(1)
      .single();
    
    if (!testUser) {
      console.log('❌ No test user found');
      return;
    }
    
    // Generate a simple JWT for testing
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: testUser.user_id }, process.env.JWT_SECRET || 'test-secret');
    
    // Fetch conversations (should not include handoff conversation)
    const conversationsResponse = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/conversations',
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
    
    const normalConvFound = conversationsResponse.conversations?.some(c => c.id === normalConv.id);
    const handoffConvFound = conversationsResponse.conversations?.some(c => c.id === handoffConv.id);
    
    console.log(`   Normal conversation found: ${normalConvFound ? '✅' : '❌'}`);
    console.log(`   Handoff conversation found: ${handoffConvFound ? '❌ (correct - should be filtered out)' : '✅ (correct - filtered out)'}`);
    
    // Step 5: Check handoff endpoint
    console.log('\nStep 5: Testing /api/conversations/handoffs endpoint...');
    
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
    
    const normalInHandoffs = handoffsResponse.conversations?.some(c => c.id === normalConv.id);
    const handoffInHandoffs = handoffsResponse.conversations?.some(c => c.id === handoffConv.id);
    
    console.log(`   Normal conversation in handoffs: ${normalInHandoffs ? '❌ (should not be there)' : '✅ (correct - not in handoffs)'}`);
    console.log(`   Handoff conversation in handoffs: ${handoffInHandoffs ? '✅ (correct - is in handoffs)' : '❌ (should be there)'}`);
    
    // Step 6: Summary
    console.log('\n📊 Test Summary:');
    
    const conversationsCorrect = normalConvFound && !handoffConvFound;
    const handoffsCorrect = !normalInHandoffs && handoffInHandoffs;
    
    if (conversationsCorrect && handoffsCorrect) {
      console.log('🎉 SUCCESS: Conversation filtering working correctly!');
      console.log('   ✅ Normal conversations show in conversations page');
      console.log('   ✅ Handoff conversations excluded from conversations page');
      console.log('   ✅ Handoff conversations show in handoff page');
      console.log('   ✅ Normal conversations excluded from handoff page');
    } else {
      console.log('❌ FAILURE: Filtering not working as expected');
      if (!conversationsCorrect) {
        console.log('   ❌ Conversations page filtering issue');
      }
      if (!handoffsCorrect) {
        console.log('   ❌ Handoff page filtering issue');
      }
    }
    
    // Cleanup
    console.log('\nCleaning up test data...');
    await supabase.from('conversations').delete().eq('id', normalConv.id);
    await supabase.from('conversations').delete().eq('id', handoffConv.id);
    console.log('✅ Test conversations deleted');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testConversationFiltering().catch(console.error);
}

module.exports = { testConversationFiltering };