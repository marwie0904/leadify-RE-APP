/**
 * Direct test of the stats RPC function
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectStats() {
  console.log('Testing get_admin_user_stats RPC function directly...\n');

  try {
    // Call the RPC function
    const { data, error } = await supabase.rpc('get_admin_user_stats');
    
    if (error) {
      console.error('Error calling RPC:', error);
      return;
    }

    console.log('Raw response from RPC:');
    console.log('Type:', typeof data);
    console.log('Is Array:', Array.isArray(data));
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Test how the backend would handle this
    const statsData = Array.isArray(data) ? data[0] : data;
    
    console.log('\nProcessed stats (as backend would see it):');
    console.log({
      totalUsers: statsData?.total_users || 0,
      activeUsers: statsData?.active_users || 0,
      inactiveUsers: statsData?.inactive_users || 0,
      suspendedUsers: statsData?.suspended_users || 0,
      totalOrganizations: statsData?.total_organizations || 0
    });

    // Also check the users table directly
    console.log('\n--- Direct table queries for comparison ---');
    
    // Count all users from auth.users
    const { count: totalUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total users in auth.users table:', totalUsers);

    // Count organizations
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    console.log('Total organizations:', totalOrgs);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDirectStats();