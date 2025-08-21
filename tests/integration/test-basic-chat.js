#!/usr/bin/env node

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBasicChat() {
  console.log('Testing basic chat endpoint...\n');
  
  // Get baseline tokens
  const startTime = Date.now();
  const { data: beforeTokens } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', new Date(Date.now() - 30000).toISOString());
  
  const beforeTotal = beforeTokens?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline tokens (last 30s): ${beforeTotal}`);
  
  // Create a simple user ID
  const userId = 'test-' + Date.now();
  
  // Try with different agent IDs to see if any work
  const agents = [
    '2b51a1a2-e10b-43a0-8501-ca28cf767cca', // Brown-Homes-Agent
  ];
  
  for (const agentId of agents) {
    console.log(`\nTrying agent: ${agentId}`);
    
    try {
      // First, verify the agent exists
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, name')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agent) {
        console.log(`  ❌ Agent not found in database`);
        continue;
      }
      
      console.log(`  ✅ Agent found: ${agent.name}`);
      
      // Try to call the chat endpoint
      console.log(`  📤 Sending chat request...`);
      
      const response = await axios.post(
        'http://localhost:3001/api/chat',
        {
          message: "I have a budget of 50 million dollars",
          agentId: agentId,
          userId: userId,
          source: 'website'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          validateStatus: () => true // Accept any status
        }
      );
      
      if (response.status === 200) {
        console.log(`  ✅ Success! Got response`);
        console.log(`  Response: "${response.data.response?.substring(0, 100)}..."`);
        console.log(`  Conversation ID: ${response.data.conversationId}`);
        
        // Wait for DB update
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check tokens
        const { data: afterTokens } = await supabase
          .from('ai_token_usage')
          .select('operation_type, total_tokens')
          .gte('created_at', new Date(startTime).toISOString());
        
        if (afterTokens && afterTokens.length > 0) {
          console.log('\n  Token Usage:');
          const grouped = {};
          afterTokens.forEach(row => {
            if (!grouped[row.operation_type]) grouped[row.operation_type] = 0;
            grouped[row.operation_type] += row.total_tokens;
          });
          
          let total = 0;
          Object.entries(grouped).forEach(([op, tokens]) => {
            console.log(`    ${op}: ${tokens} tokens`);
            total += tokens;
          });
          
          console.log(`  -------------------`);
          console.log(`  TOTAL: ${total} tokens`);
          console.log('\n📊 Check OpenAI Dashboard and compare with the total above');
          return; // Success, exit
        }
        
      } else {
        console.log(`  ❌ Failed with status ${response.status}`);
        console.log(`  Error: ${JSON.stringify(response.data)}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n❌ All attempts failed');
}

testBasicChat().catch(console.error);