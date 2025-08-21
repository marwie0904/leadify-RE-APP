#!/usr/bin/env node

/**
 * Simple test for AI Function 1: Intent Classification
 * Directly tests the chat endpoint with minimal setup
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
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
  
  // Use the existing conversation that we know works
  const conversationId = 'cb2a2e2d-fcb0-4a08-8be1-b6538dbd4ae6'; // From the server logs
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  const userId = '8ad6ed68-ac60-4483-b22d-e6747727971b';
  
  // Test message
  const testMessage = "What is your budget for buying a house?";
  
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
    
    // Get tokens after the request
    console.log('\nChecking token usage...');
    const { data: afterData } = await supabase
      .from('ai_token_usage')
      .select('operation_type, prompt_tokens, completion_tokens, total_tokens, created_at')
      .gte('created_at', new Date(startTime).toISOString())
      .order('created_at', { ascending: false });
    
    // Group by operation type
    const operations = {};
    let grandTotal = 0;
    
    if (afterData) {
      console.log('\n═══ TOKEN BREAKDOWN ═══');
      afterData.forEach(row => {
        console.log(`\n${row.operation_type}:`);
        console.log(`  Prompt: ${row.prompt_tokens}`);
        console.log(`  Completion: ${row.completion_tokens}`);
        console.log(`  Total: ${row.total_tokens}`);
        console.log(`  Time: ${new Date(row.created_at).toISOString()}`);
        
        if (!operations[row.operation_type]) {
          operations[row.operation_type] = {
            count: 0,
            tokens: 0
          };
        }
        operations[row.operation_type].count++;
        operations[row.operation_type].tokens += row.total_tokens;
        grandTotal += row.total_tokens;
      });
    }
    
    console.log('\n═══ OPERATIONS SUMMARY ═══');
    Object.entries(operations).forEach(([op, data]) => {
      console.log(`${op}: ${data.count} calls, ${data.tokens} tokens`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  TOTAL TOKENS TRACKED: ${grandTotal}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n📊 Please check your OpenAI Dashboard now');
    console.log(`Our tracking shows: ${grandTotal} tokens`);
    console.log(`OpenAI should show: ??? tokens`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testIntentClassification().catch(console.error);