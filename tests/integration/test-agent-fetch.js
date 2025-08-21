#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAgentFetch() {
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  
  console.log('Testing agent fetch with custom_bant_configs...');
  
  const { data, error } = await supabase
    .from('agents')
    .select('*, custom_bant_configs(*)')
    .eq('id', agentId)
    .single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Agent found:', data.name);
    console.log('Has custom_bant_configs:', !!data.custom_bant_configs);
  }
  
  // Try without custom_bant_configs
  console.log('\nTrying without custom_bant_configs...');
  const { data: agent2, error: error2 } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();
  
  if (error2) {
    console.error('Error:', error2);
  } else {
    console.log('Success! Agent found:', agent2.name);
  }
}

testAgentFetch();
