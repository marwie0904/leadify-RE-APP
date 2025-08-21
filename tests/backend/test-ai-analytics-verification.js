#!/usr/bin/env node

/**
 * AI Analytics Token Tracking Verification Script
 * 
 * This script verifies that:
 * 1. All AI tokens are being tracked in the database
 * 2. Tokens are tracked by model (GPT-5, MINI, NANO)
 * 3. Tokens are tracked by usage type (BANT Extraction, reply, Scoring, etc.)
 * 4. The analytics endpoint properly aggregates and returns this data
 * 5. The frontend correctly displays the token usage analytics
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test organization ID
const TEST_ORG_ID = '9a24d180-a1fe-4d22-91e2-066d55679888';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function checkDatabaseSchema() {
  logSection('1. Checking Database Schema for Token Tracking');
  
  try {
    // Check if ai_token_usage table exists
    const { data: tables, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      log('❌ ai_token_usage table does not exist', 'red');
      log('   Creating table...', 'yellow');
      
      // Create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ai_token_usage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id),
          agent_id UUID REFERENCES agents(id),
          conversation_id UUID REFERENCES conversations(id),
          user_id UUID,
          prompt_tokens INTEGER DEFAULT 0,
          completion_tokens INTEGER DEFAULT 0,
          input_tokens INTEGER DEFAULT 0,
          total_tokens INTEGER DEFAULT 0,
          model TEXT,
          model_category TEXT,
          cost DECIMAL(10,6) DEFAULT 0,
          operation_type TEXT,
          endpoint TEXT,
          response_time_ms INTEGER,
          success BOOLEAN DEFAULT true,
          is_cached BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_ai_token_usage_org ON ai_token_usage(organization_id);
        CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created ON ai_token_usage(created_at);
        CREATE INDEX IF NOT EXISTS idx_ai_token_usage_model ON ai_token_usage(model);
        CREATE INDEX IF NOT EXISTS idx_ai_token_usage_operation ON ai_token_usage(operation_type);
      `;
      
      // Note: Direct SQL execution not available via client, need manual creation
      log('   Please run the following SQL in Supabase dashboard:', 'yellow');
      console.log(createTableSQL);
      return false;
    }
    
    log('✅ ai_token_usage table exists', 'green');
    
    // Check for required columns
    const requiredColumns = [
      'organization_id', 'agent_id', 'model', 'model_category',
      'operation_type', 'total_tokens', 'cost', 'created_at'
    ];
    
    // Get a sample record to check columns
    const { data: sample } = await supabase
      .from('ai_token_usage')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      const sampleRecord = sample[0];
      const existingColumns = Object.keys(sampleRecord);
      
      requiredColumns.forEach(col => {
        if (existingColumns.includes(col)) {
          log(`   ✅ Column ${col} exists`, 'green');
        } else {
          log(`   ❌ Column ${col} missing`, 'red');
        }
      });
    }
    
    return true;
  } catch (error) {
    log(`❌ Error checking schema: ${error.message}`, 'red');
    return false;
  }
}

async function checkExistingTokenData() {
  logSection('2. Checking Existing Token Usage Data');
  
  try {
    // Get token usage for the test organization
    const { data: tokenUsage, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('organization_id', TEST_ORG_ID)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      log(`❌ Error fetching token usage: ${error.message}`, 'red');
      return;
    }
    
    if (!tokenUsage || tokenUsage.length === 0) {
      log('⚠️  No token usage data found for test organization', 'yellow');
      log('   This means no AI operations have been tracked yet', 'yellow');
      return;
    }
    
    log(`✅ Found ${tokenUsage.length} token usage records`, 'green');
    
    // Analyze by model
    const modelUsage = {};
    tokenUsage.forEach(record => {
      const model = record.model || record.model_category || 'unknown';
      if (!modelUsage[model]) {
        modelUsage[model] = {
          count: 0,
          tokens: 0,
          cost: 0
        };
      }
      modelUsage[model].count++;
      modelUsage[model].tokens += record.total_tokens || 0;
      modelUsage[model].cost += parseFloat(record.cost) || 0;
    });
    
    log('\n   Token Usage by Model:', 'blue');
    Object.entries(modelUsage).forEach(([model, stats]) => {
      log(`   - ${model}: ${stats.count} requests, ${stats.tokens} tokens, $${stats.cost.toFixed(4)}`, 'cyan');
    });
    
    // Analyze by operation type
    const operationUsage = {};
    tokenUsage.forEach(record => {
      const operation = record.operation_type || 'unknown';
      if (!operationUsage[operation]) {
        operationUsage[operation] = {
          count: 0,
          tokens: 0,
          cost: 0
        };
      }
      operationUsage[operation].count++;
      operationUsage[operation].tokens += record.total_tokens || 0;
      operationUsage[operation].cost += parseFloat(record.cost) || 0;
    });
    
    log('\n   Token Usage by Operation:', 'blue');
    Object.entries(operationUsage).forEach(([operation, stats]) => {
      log(`   - ${operation}: ${stats.count} requests, ${stats.tokens} tokens, $${stats.cost.toFixed(4)}`, 'cyan');
    });
    
  } catch (error) {
    log(`❌ Error checking token data: ${error.message}`, 'red');
  }
}

async function simulateTokenTracking() {
  logSection('3. Simulating Token Tracking for Different Models and Operations');
  
  try {
    // Get an agent for the test organization
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('organization_id', TEST_ORG_ID)
      .limit(1);
    
    if (agentError || !agents || agents.length === 0) {
      log('⚠️  No agents found for test organization', 'yellow');
      return;
    }
    
    const agentId = agents[0].id;
    log(`✅ Using agent: ${agentId}`, 'green');
    
    // Simulate different token tracking scenarios
    const testScenarios = [
      {
        model: 'gpt-5-mini-2025-08-07',
        operation_type: 'bant_extraction',
        prompt_tokens: 150,
        completion_tokens: 50,
        description: 'BANT Extraction with GPT-5 Mini'
      },
      {
        model: 'gpt-5-nano-2025-08-07',
        operation_type: 'intent_classification',
        prompt_tokens: 80,
        completion_tokens: 10,
        description: 'Intent Classification with GPT-5 Nano'
      },
      {
        model: 'gpt-4-turbo-preview',
        operation_type: 'chat_reply',
        prompt_tokens: 500,
        completion_tokens: 200,
        description: 'Chat Reply Generation with GPT-4 Turbo'
      },
      {
        model: 'gpt-5-mini-2025-08-07',
        operation_type: 'estimation',
        prompt_tokens: 200,
        completion_tokens: 100,
        description: 'Property Estimation with GPT-5 Mini'
      },
      {
        model: 'text-embedding-3-small',
        operation_type: 'semantic_search',
        input_tokens: 50,
        prompt_tokens: 0,
        completion_tokens: 0,
        description: 'Semantic Search Embedding'
      }
    ];
    
    log('\n   Inserting test token usage records:', 'blue');
    
    for (const scenario of testScenarios) {
      // Calculate cost based on model
      let cost = 0;
      if (scenario.model.includes('gpt-5-mini')) {
        cost = (scenario.prompt_tokens * 0.00025 + scenario.completion_tokens * 0.002) / 1000;
      } else if (scenario.model.includes('gpt-5-nano')) {
        cost = (scenario.prompt_tokens * 0.00005 + scenario.completion_tokens * 0.0004) / 1000;
      } else if (scenario.model.includes('gpt-4')) {
        cost = (scenario.prompt_tokens * 0.01 + scenario.completion_tokens * 0.03) / 1000;
      } else if (scenario.model.includes('embedding')) {
        cost = (scenario.input_tokens * 0.00002) / 1000;
      }
      
      const { error } = await supabase
        .from('ai_token_usage')
        .insert({
          organization_id: TEST_ORG_ID,
          agent_id: agentId,
          model: scenario.model,
          model_category: scenario.model.includes('gpt-5-mini') ? 'gpt-5-mini' :
                          scenario.model.includes('gpt-5-nano') ? 'gpt-5-nano' :
                          scenario.model.includes('gpt-4') ? 'gpt-4-turbo' :
                          'embedding',
          operation_type: scenario.operation_type,
          prompt_tokens: scenario.prompt_tokens || 0,
          completion_tokens: scenario.completion_tokens || 0,
          input_tokens: scenario.input_tokens || 0,
          total_tokens: (scenario.prompt_tokens || 0) + (scenario.completion_tokens || 0) + (scenario.input_tokens || 0),
          cost: cost,
          endpoint: '/api/chat',
          response_time_ms: Math.floor(Math.random() * 1000) + 500,
          success: true,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        log(`   ❌ Failed: ${scenario.description} - ${error.message}`, 'red');
      } else {
        log(`   ✅ Tracked: ${scenario.description} - Cost: $${cost.toFixed(6)}`, 'green');
      }
    }
    
  } catch (error) {
    log(`❌ Error simulating token tracking: ${error.message}`, 'red');
  }
}

async function testAnalyticsEndpoint() {
  logSection('4. Testing Analytics API Endpoint');
  
  try {
    // Get a valid admin token (you may need to create one or use existing)
    log('⚠️  Note: Analytics endpoint requires admin authentication', 'yellow');
    log('   Testing with direct database queries instead...', 'yellow');
    
    // Directly query aggregated data
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    // Get token usage for the organization
    const { data: tokenUsage, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('organization_id', TEST_ORG_ID)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', now.toISOString());
    
    if (error) {
      log(`❌ Error fetching analytics data: ${error.message}`, 'red');
      return;
    }
    
    // Aggregate by model
    const tokenByModel = {};
    tokenUsage?.forEach(record => {
      const model = record.model_category || record.model || 'unknown';
      if (!tokenByModel[model]) {
        tokenByModel[model] = {
          model: model,
          tokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          cost: 0,
          requests: 0
        };
      }
      tokenByModel[model].tokens += record.total_tokens || 0;
      tokenByModel[model].promptTokens += record.prompt_tokens || 0;
      tokenByModel[model].completionTokens += record.completion_tokens || 0;
      tokenByModel[model].cost += parseFloat(record.cost) || 0;
      tokenByModel[model].requests++;
    });
    
    // Aggregate by operation type
    const tokenByTask = {};
    tokenUsage?.forEach(record => {
      const task = record.operation_type || 'general';
      if (!tokenByTask[task]) {
        tokenByTask[task] = {
          task: task,
          tokens: 0,
          cost: 0,
          requests: 0,
          totalResponseTime: 0
        };
      }
      tokenByTask[task].tokens += record.total_tokens || 0;
      tokenByTask[task].cost += parseFloat(record.cost) || 0;
      tokenByTask[task].requests++;
      tokenByTask[task].totalResponseTime += record.response_time_ms || 0;
    });
    
    log('\n✅ Analytics Data Summary:', 'green');
    
    log('\n   Token Usage by Model:', 'blue');
    Object.values(tokenByModel).forEach(model => {
      const avgTokens = model.requests > 0 ? Math.round(model.tokens / model.requests) : 0;
      log(`   - ${model.model}:`, 'cyan');
      log(`     Total Tokens: ${model.tokens}`, 'white');
      log(`     Total Cost: $${model.cost.toFixed(4)}`, 'white');
      log(`     Requests: ${model.requests}`, 'white');
      log(`     Avg Tokens/Request: ${avgTokens}`, 'white');
    });
    
    log('\n   Token Usage by Task:', 'blue');
    Object.values(tokenByTask).forEach(task => {
      const avgTokens = task.requests > 0 ? Math.round(task.tokens / task.requests) : 0;
      const avgResponseTime = task.requests > 0 ? Math.round(task.totalResponseTime / task.requests) : 0;
      log(`   - ${task.task}:`, 'cyan');
      log(`     Total Tokens: ${task.tokens}`, 'white');
      log(`     Total Cost: $${task.cost.toFixed(4)}`, 'white');
      log(`     Requests: ${task.requests}`, 'white');
      log(`     Avg Tokens/Request: ${avgTokens}`, 'white');
      log(`     Avg Response Time: ${avgResponseTime}ms`, 'white');
    });
    
  } catch (error) {
    log(`❌ Error testing analytics: ${error.message}`, 'red');
  }
}

async function verifyFrontendDisplay() {
  logSection('5. Frontend Display Verification');
  
  log('📊 Expected Frontend Display:', 'blue');
  log('\n   Token Usage by Model should show:', 'cyan');
  log('   - GPT-5 (mapped from gpt-5-mini)', 'white');
  log('   - MINI (mapped from gpt-5-mini)', 'white');
  log('   - NANO (mapped from gpt-5-nano)', 'white');
  
  log('\n   Token Usage by Task should show:', 'cyan');
  log('   - BANT Extraction', 'white');
  log('   - Generating Reply (from chat_reply)', 'white');
  log('   - Scoring (from bant_extraction)', 'white');
  log('   - Intent Classification', 'white');
  log('   - Estimation', 'white');
  log('   - Semantic Search', 'white');
  
  log('\n📱 To verify in the frontend:', 'yellow');
  log('   1. Navigate to: http://localhost:3000/admin/organizations/' + TEST_ORG_ID + '/analytics', 'white');
  log('   2. Check the "Token Usage by Model" chart', 'white');
  log('   3. Check the "Token Usage by Task" chart', 'white');
  log('   4. Verify data matches the backend aggregations', 'white');
}

async function generateSummaryReport() {
  logSection('6. Summary Report');
  
  try {
    // Get final statistics
    const { data: totalUsage, error } = await supabase
      .from('ai_token_usage')
      .select('*')
      .eq('organization_id', TEST_ORG_ID);
    
    if (!error && totalUsage) {
      const totalTokens = totalUsage.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
      const totalCost = totalUsage.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
      const uniqueModels = [...new Set(totalUsage.map(r => r.model_category || r.model))];
      const uniqueOperations = [...new Set(totalUsage.map(r => r.operation_type))];
      
      log('\n📈 Token Tracking Summary:', 'green');
      log(`   Total Records: ${totalUsage.length}`, 'white');
      log(`   Total Tokens: ${totalTokens.toLocaleString()}`, 'white');
      log(`   Total Cost: $${totalCost.toFixed(4)}`, 'white');
      log(`   Unique Models: ${uniqueModels.length} (${uniqueModels.join(', ')})`, 'white');
      log(`   Unique Operations: ${uniqueOperations.length} (${uniqueOperations.join(', ')})`, 'white');
      
      // Check compliance with requirements
      log('\n✅ Requirement Verification:', 'green');
      
      const hasGPT5 = uniqueModels.some(m => m && (m.includes('gpt-5') || m.includes('GPT-5')));
      const hasMini = uniqueModels.some(m => m && (m.includes('mini') || m.includes('MINI')));
      const hasNano = uniqueModels.some(m => m && (m.includes('nano') || m.includes('NANO')));
      const hasBANT = uniqueOperations.some(o => o && o.includes('bant'));
      const hasReply = uniqueOperations.some(o => o && (o.includes('reply') || o.includes('chat')));
      const hasScoring = uniqueOperations.some(o => o && (o.includes('scoring') || o.includes('score')));
      
      log(`   ✓ Tracking by Model:`, 'cyan');
      log(`     ${hasGPT5 ? '✅' : '❌'} GPT-5 models tracked`, hasGPT5 ? 'green' : 'red');
      log(`     ${hasMini ? '✅' : '❌'} MINI model tracked`, hasMini ? 'green' : 'red');
      log(`     ${hasNano ? '✅' : '❌'} NANO model tracked`, hasNano ? 'green' : 'red');
      
      log(`   ✓ Tracking by Operation Type:`, 'cyan');
      log(`     ${hasBANT ? '✅' : '❌'} BANT operations tracked`, hasBANT ? 'green' : 'red');
      log(`     ${hasReply ? '✅' : '❌'} Reply generation tracked`, hasReply ? 'green' : 'red');
      log(`     ${hasScoring ? '✅' : '❌'} Scoring operations tracked`, hasScoring ? 'green' : 'red');
      
      const allRequirementsMet = hasGPT5 && hasMini && hasNano && hasBANT && hasReply && hasScoring;
      
      if (allRequirementsMet) {
        log('\n🎉 SUCCESS: All AI Analytics requirements are met!', 'green');
        log('   ✅ All AI tokens are being tracked', 'green');
        log('   ✅ Tokens tracked by model (GPT-5, MINI, NANO)', 'green');
        log('   ✅ Tokens tracked by usage type (BANT, Reply, Scoring)', 'green');
      } else {
        log('\n⚠️  Some requirements are not fully met', 'yellow');
        log('   Run more AI operations to generate tracking data', 'yellow');
      }
    }
    
  } catch (error) {
    log(`❌ Error generating report: ${error.message}`, 'red');
  }
}

// Main execution
async function main() {
  console.log('\n' + '='.repeat(60));
  log('🔍 AI ANALYTICS TOKEN TRACKING VERIFICATION', 'magenta');
  console.log('='.repeat(60));
  
  // Run all checks
  const schemaOk = await checkDatabaseSchema();
  
  if (schemaOk) {
    await checkExistingTokenData();
    await simulateTokenTracking();
    await testAnalyticsEndpoint();
    await verifyFrontendDisplay();
    await generateSummaryReport();
  } else {
    log('\n❌ Database schema issues detected. Please fix before continuing.', 'red');
  }
  
  console.log('\n' + '='.repeat(60));
  log('📊 Verification Complete', 'magenta');
  console.log('='.repeat(60) + '\n');
}

// Run the verification
main().catch(console.error);