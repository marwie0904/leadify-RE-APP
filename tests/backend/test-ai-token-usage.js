/**
 * Test script to check AI token usage tracking
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAITokenUsage() {
  console.log('=======================================');
  console.log('    AI TOKEN USAGE CHECK');
  console.log('=======================================\n');

  try {
    // 1. Check if table exists
    console.log('1. Checking if ai_token_usage table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ai_token_usage')
      .select('*')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.log('❌ Table ai_token_usage does not exist!');
        console.log('\n📋 Need to create the table. Here\'s the SQL:');
        console.log(`
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id TEXT,
  agent_id UUID,
  conversation_id UUID,
  user_id UUID,
  model TEXT,
  model_category TEXT,
  operation_type TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  endpoint TEXT,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE GENERATED ALWAYS AS (created_at::date) STORED,
  hour INTEGER GENERATED ALWAYS AS (EXTRACT(hour FROM created_at)) STORED
);

-- Create indexes for better performance
CREATE INDEX idx_ai_token_usage_organization ON ai_token_usage(organization_id);
CREATE INDEX idx_ai_token_usage_date ON ai_token_usage(date);
CREATE INDEX idx_ai_token_usage_conversation ON ai_token_usage(conversation_id);
CREATE INDEX idx_ai_token_usage_created_at ON ai_token_usage(created_at);
        `);
        return;
      }
      throw tableError;
    }

    console.log('✅ Table exists');

    // 2. Check record count
    console.log('\n2. Checking record count...');
    const { count, error: countError } = await supabase
      .from('ai_token_usage')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`   Total records: ${count || 0}`);

    if (count === 0) {
      console.log('   ⚠️ No token usage data found!');
      console.log('\n   Token usage should be tracked when:');
      console.log('   - AI conversations occur');
      console.log('   - Chat messages are sent to OpenAI');
      console.log('   - BANT extraction happens');
      console.log('   - Lead scoring is performed');
      console.log('   - Estimation flows are processed');
    }

    // 3. Check recent records
    if (count > 0) {
      console.log('\n3. Recent token usage (last 5 records):');
      const { data: recentData, error: recentError } = await supabase
        .from('ai_token_usage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      recentData.forEach((record, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`   - Model: ${record.model || 'N/A'}`);
        console.log(`   - Operation: ${record.operation_type || 'N/A'}`);
        console.log(`   - Tokens: ${record.total_tokens || 0}`);
        console.log(`   - Cost: $${record.cost || 0}`);
        console.log(`   - Date: ${new Date(record.created_at).toLocaleString()}`);
      });

      // 4. Check aggregate stats
      console.log('\n4. Aggregate Statistics:');
      const { data: stats, error: statsError } = await supabase
        .from('ai_token_usage')
        .select('total_tokens, cost');

      if (statsError) throw statsError;

      const totalTokens = stats.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
      const totalCost = stats.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

      console.log(`   Total Tokens Used: ${totalTokens.toLocaleString()}`);
      console.log(`   Total Cost: $${totalCost.toFixed(2)}`);

      // 5. Check by organization
      console.log('\n5. Usage by Organization:');
      const { data: orgData, error: orgError } = await supabase
        .from('ai_token_usage')
        .select('organization_id')
        .not('organization_id', 'is', null);

      if (orgError) throw orgError;

      const orgCounts = {};
      orgData.forEach(r => {
        orgCounts[r.organization_id] = (orgCounts[r.organization_id] || 0) + 1;
      });

      Object.entries(orgCounts).forEach(([orgId, count]) => {
        console.log(`   - ${orgId}: ${count} records`);
      });
    }

    // 6. Test inserting a record
    console.log('\n6. Testing token tracking (inserting test record)...');
    const testRecord = {
      organization_id: '770257fa-dc41-4529-9cb3-43b47072c271', // Leadify org
      model: 'gpt-4',
      model_category: 'chat',
      operation_type: 'test_tracking',
      prompt_tokens: 100,
      completion_tokens: 150,
      total_tokens: 250,
      cost: 0.0075,
      endpoint: '/api/test',
      response_time_ms: 1234,
      success: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('ai_token_usage')
      .insert([testRecord])
      .select();

    if (insertError) {
      console.log('   ❌ Failed to insert test record:', insertError.message);
    } else {
      console.log('   ✅ Test record inserted successfully');
      console.log(`   Record ID: ${insertData[0].id}`);
    }

    console.log('\n=======================================');
    console.log('    CHECK COMPLETE');
    console.log('=======================================');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the check
checkAITokenUsage();