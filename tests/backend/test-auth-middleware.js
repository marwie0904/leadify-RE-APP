const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuthMiddleware() {
  const token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjJmdk5DdHVVSmJzN2F3c2oiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2tibXN5Z3lhd3BpcWVnZW16ZXRwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkNjhlNzRhNy0wNTdhLTQ4NDAtYjJhYy1lODhmYTFiZjBiNmUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0NjYxODkxLCJpYXQiOjE3NTQ2NTgyOTEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcnN0X25hbWUiOiJUZXN0IiwiZnVsbF9uYW1lIjoiVGVzdCBVc2VyIiwibGFzdF9uYW1lIjoiVXNlciJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzU0NjU4MjkxfV0sInNlc3Npb25faWQiOiIzNWZjZTE4NS01MzQ2LTRiODYtOGE4YS0wMjEyYjQ4NmJkYmEiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.IExXubCosKy20u14NsTakaT6RDIT8JnazQllnZwqcw4';
  
  console.log('Testing auth middleware logic...');
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  
  // This is what the middleware does
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  console.log('\nResult from supabase.auth.getUser():');
  console.log('Error:', error);
  console.log('User:', user);
  
  if (user) {
    console.log('\n✅ Auth would SUCCEED');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    
    // Now test the agents query
    console.log('\nTesting agents query with this user...');
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);
      
    console.log('User organizations:', memberships);
    
    if (memberships && memberships.length > 0) {
      const orgIds = memberships.map(m => m.organization_id);
      
      const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .in('organization_id', orgIds);
        
      console.log('Agents found:', agents?.length || 0);
      console.log('Agents:', agents);
    }
  } else {
    console.log('\n❌ Auth would FAIL');
    console.log('Error message:', error?.message || 'Unknown error');
  }
}

testAuthMiddleware().catch(console.error);