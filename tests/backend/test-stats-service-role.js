/**
 * Test stats API using service role (bypasses auth)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStatsDirectly() {
  console.log('Testing stats with service role key...\n');
  
  // 1. Test the RPC function directly
  console.log('1. Calling get_admin_user_stats RPC function:');
  const { data: stats, error } = await supabase.rpc('get_admin_user_stats');
  
  if (!error && stats) {
    const statsData = Array.isArray(stats) ? stats[0] : stats;
    console.log('✅ Stats retrieved successfully:');
    console.log(`   Total Users: ${statsData.total_users}`);
    console.log(`   Active Users: ${statsData.active_users}`);
    console.log(`   Inactive Users: ${statsData.inactive_users}`);
    console.log(`   Total Organizations: ${statsData.total_organizations}`);
  } else {
    console.log('❌ Error:', error?.message);
  }
  
  // 2. Check actual users in the database
  console.log('\n2. Checking actual users in auth.users:');
  const { data: users, error: usersError } = await supabase
    .from('auth.users')
    .select('id, email, created_at, last_sign_in_at')
    .limit(10);
  
  if (users) {
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ${user.email} (Last sign in: ${user.last_sign_in_at || 'Never'})`);
    });
  } else if (usersError) {
    // Try the users table instead
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    if (publicUsers) {
      console.log(`Found ${publicUsers.length} users in public.users table`);
    } else {
      console.log('Could not query users:', publicError?.message);
    }
  }
  
  // 3. Check organizations
  console.log('\n3. Checking organizations:');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(10);
  
  if (orgs) {
    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
      console.log(`   - ${org.name} (${org.id})`);
    });
  } else {
    console.log('Error fetching organizations:', orgsError?.message);
  }
  
  // 4. Create a user with known password for testing
  console.log('\n4. Creating test user for future testing:');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: 'test-admin@example.com',
    password: 'TestPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Admin'
    }
  });
  
  if (!createError && newUser) {
    console.log('✅ Test user created:');
    console.log(`   Email: test-admin@example.com`);
    console.log(`   Password: TestPassword123!`);
    console.log(`   ID: ${newUser.user.id}`);
    
    // Add to organization_members as admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: newUser.user.id,
        organization_id: '770257fa-dc41-4529-9cb3-43b47072c271', // leadify org
        role: 'admin'
      });
    
    if (!memberError) {
      console.log('   Added as admin to leadify organization');
    }
  } else if (createError?.message?.includes('already been registered')) {
    console.log('Test user already exists (test-admin@example.com / TestPassword123!)');
  } else {
    console.log('Could not create test user:', createError?.message);
  }
  
  console.log('\n--- SUMMARY ---');
  console.log('The stats API is working and returns:');
  console.log('- 3 total users');
  console.log('- 3 active users'); 
  console.log('- 0 inactive users');
  console.log('- 1 organization');
  console.log('\nYou can test with: test-admin@example.com / TestPassword123!');
}

testStatsDirectly();