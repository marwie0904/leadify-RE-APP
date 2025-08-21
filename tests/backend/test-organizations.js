require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function testOrganizations() {
  console.log('Testing organizations table...\n');
  
  // 1. Check if table exists
  console.log('1. Checking if organizations table exists:');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'organizations');
  
  if (tablesError) {
    console.error('Error checking tables:', tablesError);
  } else {
    console.log('Table exists:', tables.length > 0);
  }
  
  // 2. Try to select from organizations
  console.log('\n2. Selecting from organizations:');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
    .limit(5);
  
  if (orgsError) {
    console.error('Error selecting organizations:', orgsError);
  } else {
    console.log('Organizations found:', orgs?.length || 0);
    if (orgs?.length > 0) {
      console.log('Sample org:', orgs[0]);
    }
  }
  
  // 3. Try to insert a test organization
  console.log('\n3. Trying to insert test organization:');
  const testOrgId = 'test-' + Date.now();
  const { data: newOrg, error: insertError } = await supabase
    .from('organizations')
    .insert({
      id: testOrgId,
      name: 'Test Organization'
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('Error inserting organization:', insertError);
  } else {
    console.log('Organization created:', newOrg);
  }
  
  // 4. Try to select the inserted org
  if (!insertError) {
    console.log('\n4. Selecting inserted organization:');
    const { data: fetchedOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', testOrgId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching organization:', fetchError);
    } else {
      console.log('Organization fetched:', fetchedOrg);
    }
  }
}

testOrganizations().catch(console.error);