#!/usr/bin/env node

/**
 * Working test for AI Function 1: Intent Classification
 * Creates all necessary data directly in database
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';

async function testIntentClassification() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  AI FUNCTION 1: Intent Classification');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Get baseline token count
  console.log('\nGetting baseline token count...');
  const { data: beforeData } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline total (last 30s): ${beforeTotal} tokens`);
  
  // Use known agent and user
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  const userId = '8ad6ed68-ac60-4483-b22d-e6747727971b';
  const organizationId = '8266be99-fcfd-42f7-a6e2-948e070f1eef';
  
  // Create a new conversation directly in the database
  const conversationId = uuidv4();
  console.log('\nCreating test conversation directly in database...');
  
  const { data: newConv, error: convError } = await supabase
    .from('conversations')
    .insert({
      id: conversationId,
      agent_id: agentId,
      user_id: userId,
      organization_id: organizationId,
      source: 'website',
      status: 'active',
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    })
    .select()
    .single();
  
  if (convError) {
    console.error('Failed to create conversation:', convError);
    return;
  }
  
  console.log(`✅ Created conversation: ${conversationId}`);
  
  // Test message that should trigger intent classification
  const testMessage = "I'm interested in buying a house with a budget of 30 million dollars";
  
  console.log('\nTest Setup:');
  console.log(`  Message: "${testMessage}"`);
  console.log(`  Agent ID: ${agentId}`);
  console.log(`  Conversation ID: ${conversationId}`);
  console.log(`  User ID: ${userId}`);
  
  console.log('\nSending request to /api/chat...');
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message: testMessage,
        agentId: agentId,
        conversationId: conversationId,
        userId: userId,
        source: 'website'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Response received in ${responseTime}ms`);
    console.log(`Response preview: "${response.data.response?.substring(0, 100)}..."`);
    
    // Wait for database to update
    console.log('\nWaiting 3 seconds for database update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get tokens after the request - look at last 60 seconds
    console.log('\nChecking token usage...');
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('operation_type, prompt_tokens, completion_tokens, total_tokens, created_at')
      .gte('created_at', new Date(startTime - 1000).toISOString())
      .order('created_at', { ascending: false });
    
    // Show detailed breakdown
    if (afterData && afterData.length > 0) {
      console.log('\n═══ DETAILED TOKEN BREAKDOWN ═══');
      
      const operations = {};
      let grandTotal = 0;
      
      afterData.forEach(row => {
        if (!operations[row.operation_type]) {
          operations[row.operation_type] = {
            count: 0,
            prompt: 0,
            completion: 0,
            total: 0
          };
        }
        operations[row.operation_type].count++;
        operations[row.operation_type].prompt += row.prompt_tokens;
        operations[row.operation_type].completion += row.completion_tokens;
        operations[row.operation_type].total += row.total_tokens;
        grandTotal += row.total_tokens;
      });
      
      Object.entries(operations).forEach(([op, data]) => {
        console.log(`\n${op.toUpperCase()}:`);
        console.log(`  Calls: ${data.count}`);
        console.log(`  Prompt Tokens: ${data.prompt}`);
        console.log(`  Completion Tokens: ${data.completion}`);
        console.log(`  Total Tokens: ${data.total}`);
      });
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log(`  TOTAL TOKENS TRACKED: ${grandTotal}`);
      console.log('═══════════════════════════════════════════════════════════');
      
      // Show specific operation counts
      if (operations['intent_classification']) {
        console.log('\n✅ Intent Classification was called');
      }
      if (operations['bant_extraction']) {
        console.log('✅ BANT Extraction was called');
      }
      if (operations['chat_reply']) {
        console.log('✅ Chat Reply was called');
      }
      
    } else {
      console.log('\n⚠️ No token usage recorded');
    }
    
    console.log('\n📊 Please check your OpenAI Dashboard now');
    console.log('Compare the total tokens shown above with OpenAI\'s reported usage');
    
    // Clean up - delete the test conversation
    console.log('\nCleaning up test conversation...');
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    // Clean up on error too
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
  }
}

// Run the test
testIntentClassification().catch(console.error);