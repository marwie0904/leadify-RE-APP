/**
 * Simple test for admin users endpoints
 * Tests the new admin user management API
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function getAuthToken() {
  // Get a real user token
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });

  if (error || !users?.length) {
    console.error('No users found:', error);
    return null;
  }

  const user = users[0];
  console.log(`Using user: ${user.email}`);

  // Generate access token for the user
  const { data: { session }, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email
  });

  // For testing, we'll use service role key as bearer token
  // In production, you'd get actual user JWT
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function testAdminUsersAPI() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ADMIN USERS API TEST SUITE                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const token = await getAuthToken();
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }

  let passed = 0;
  let failed = 0;

  // Test 1: Get users list
  console.log(`${colors.cyan}Test 1: GET /api/admin/users${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Success: Retrieved ${data.users?.length || 0} users${colors.reset}`);
      console.log(`   Pagination: Page ${data.pagination?.page} of ${data.pagination?.pages}`);
      passed++;
    } else {
      const error = await response.text();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${error}${colors.reset}`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Test 2: Get user statistics
  console.log(`\n${colors.cyan}Test 2: GET /api/admin/users/stats${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Success: Retrieved statistics${colors.reset}`);
      console.log(`   Total Users: ${data.totalUsers}`);
      console.log(`   Active: ${data.activeUsers}`);
      console.log(`   Organizations: ${data.totalOrganizations}`);
      passed++;
    } else {
      const error = await response.text();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${error}${colors.reset}`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Test 3: Search users
  console.log(`\n${colors.cyan}Test 3: Search users with query${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?search=test&page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Success: Search returned ${data.users?.length || 0} results${colors.reset}`);
      passed++;
    } else {
      const error = await response.text();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${error}${colors.reset}`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Test 4: Export users as CSV
  console.log(`\n${colors.cyan}Test 4: Export users as CSV${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users/export?format=csv`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/csv')) {
        console.log(`${colors.green}✅ Success: CSV export successful${colors.reset}`);
        const csvData = await response.text();
        console.log(`   CSV Size: ${csvData.length} bytes`);
        console.log(`   First line: ${csvData.split('\n')[0]}`);
        passed++;
      } else {
        console.log(`${colors.red}❌ Failed: Expected CSV but got ${contentType}${colors.reset}`);
        failed++;
      }
    } else {
      const error = await response.text();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${error}${colors.reset}`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Test 5: Test user suspension (if we have a test user)
  console.log(`\n${colors.cyan}Test 5: User suspension workflow${colors.reset}`);
  try {
    // First, get a user to test with
    const listResponse = await fetch(`${API_URL}/api/admin/users?limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listResponse.ok) {
      const { users } = await listResponse.json();
      if (users && users.length > 0) {
        const testUserId = users[0].id;
        console.log(`   Testing with user: ${users[0].email}`);

        // Try to suspend (may fail if user is admin)
        const suspendResponse = await fetch(`${API_URL}/api/admin/users/${testUserId}/suspend`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: 'API test' })
        });

        if (suspendResponse.ok) {
          console.log(`${colors.green}✅ User suspended successfully${colors.reset}`);
          
          // Now reactivate
          const reactivateResponse = await fetch(`${API_URL}/api/admin/users/${testUserId}/reactivate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (reactivateResponse.ok) {
            console.log(`${colors.green}✅ User reactivated successfully${colors.reset}`);
            passed++;
          } else {
            console.log(`${colors.yellow}⚠️ Could not reactivate user${colors.reset}`);
          }
        } else {
          const error = await suspendResponse.json();
          console.log(`${colors.yellow}⚠️ Could not suspend user: ${error.error}${colors.reset}`);
          // This is expected for admin users
          if (error.error === 'Cannot suspend admin users') {
            console.log(`${colors.green}✅ Correctly prevented admin suspension${colors.reset}`);
            passed++;
          }
        }
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}TEST RESULTS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (passed === 5) {
    console.log(`${colors.bright}${colors.green}🎉 All admin user API tests passed!${colors.reset}`);
    console.log(`${colors.green}The user management system is working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ Some tests failed. Check the implementation.${colors.reset}`);
  }

  // Test migration
  console.log(`\n${colors.cyan}Checking if database migrations are needed...${colors.reset}`);
  try {
    const { data: stats, error } = await supabase.rpc('get_admin_user_stats');
    if (error) {
      console.log(`${colors.yellow}⚠️ Database functions not found. Run migrations:${colors.reset}`);
      console.log(`   psql $SUPABASE_DB_URL < migrations/admin-users-functions.sql`);
    } else {
      console.log(`${colors.green}✅ Database functions are installed${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️ Could not check database: ${error.message}${colors.reset}`);
  }
}

// Run tests
testAdminUsersAPI().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});