require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { 
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

async function testOrgLookup() {
  console.log('Testing organization lookup...\n');
  
  // 1. Create a test organization
  const orgId = uuidv4();
  console.log('1. Creating test organization with ID:', orgId);
  
  const { data: newOrg, error: insertError } = await supabase
    .from('organizations')
    .insert({
      id: orgId,
      name: 'Test Org for Lookup'
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('Error creating org:', insertError);
    return;
  }
  
  console.log('Organization created:', newOrg);
  
  // 2. Try to look it up using the same query as the endpoint
  console.log('\n2. Looking up organization using .maybeSingle():');
  const { data: org1, error: error1 } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();
    
  console.log('Result with maybeSingle:', { org: org1, error: error1 });
  
  // 3. Try with .single()
  console.log('\n3. Looking up organization using .single():');
  const { data: org2, error: error2 } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
    
  console.log('Result with single:', { org: org2, error: error2 });
  
  // 4. Check if RLS is the issue by checking if we can see all orgs
  console.log('\n4. Checking all organizations:');
  const { data: allOrgs, error: allError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(10);
    
  console.log('All orgs:', { count: allOrgs?.length, error: allError });
  if (allOrgs?.length > 0) {
    console.log('Sample IDs:', allOrgs.map(o => o.id).slice(0, 3));
  }
  
  // 5. Clean up
  console.log('\n5. Cleaning up test organization...');
  const { error: deleteError } = await supabase
    .from('organizations')
    .delete()
    .eq('id', orgId);
    
  if (deleteError) {
    console.error('Error deleting org:', deleteError);
  } else {
    console.log('Test organization deleted');
  }
}

testOrgLookup().catch(console.error);