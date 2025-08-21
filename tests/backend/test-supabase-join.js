#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  
  console.log('Test 1: With custom_bant_configs join');
  const { data: d1, error: e1 } = await supabase
    .from('agents')
    .select('*, custom_bant_configs(*)')
    .eq('id', agentId)
    .single();
  
  console.log('  Error:', e1);
  console.log('  Data:', d1 ? 'Found' : 'Not found');
  
  console.log('\nTest 2: Without join');
  const { data: d2, error: e2 } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();
  
  console.log('  Error:', e2);
  console.log('  Data:', d2 ? 'Found' : 'Not found');
  
  console.log('\nTest 3: With left join syntax');
  const { data: d3, error: e3 } = await supabase
    .from('agents')
    .select('*, custom_bant_configs!left(*)')
    .eq('id', agentId)
    .single();
  
  console.log('  Error:', e3);
  console.log('  Data:', d3 ? 'Found' : 'Not found');
}

test();
