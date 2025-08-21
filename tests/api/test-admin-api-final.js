/**
 * Final test for admin users API
 * Tests with real database data and authentication
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

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

async function getAdminToken() {
  // Get the admin user (marwryyy@gmail.com has admin role)
  const { data: adminUser, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'marwryyy@gmail.com')
    .single();

  if (error || !adminUser) {
    console.error('Admin user not found:', error);
    return null;
  }

  // Create a JWT token for this user
  const token = jwt.sign(
    {
      sub: adminUser.id,
      email: adminUser.email,
      role: 'authenticated',
      user_metadata: { role: 'admin' }
    },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  console.log(`Using admin user: ${adminUser.email} (${adminUser.id})`);
  return token;
}

async function testAdminAPI() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ADMIN USERS API - FINAL INTEGRATION TEST          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const token = await getAdminToken();
  if (!token) {
    console.error('Failed to get admin token');
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

    const data = await response.json();
    
    if (response.ok && data.users) {
      console.log(`${colors.green}✅ Success: Retrieved ${data.users.length} users${colors.reset}`);
      console.log(`   Users found:`);
      data.users.forEach(user => {
        console.log(`   - ${user.name || user.email} (${user.role}) - ${user.organization || 'No org'}`);
      });
      passed++;
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(data)}${colors.reset}`);
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

    const data = await response.json();
    
    if (response.ok && data.totalUsers !== undefined) {
      console.log(`${colors.green}✅ Success: Retrieved statistics${colors.reset}`);
      console.log(`   Total Users: ${data.totalUsers}`);
      console.log(`   Active: ${data.activeUsers}`);
      console.log(`   Inactive: ${data.inactiveUsers}`);
      console.log(`   Suspended: ${data.suspendedUsers}`);
      console.log(`   Organizations: ${data.totalOrganizations}`);
      passed++;
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(data)}${colors.reset}`);
      failed++;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Test 3: Search users
  console.log(`\n${colors.cyan}Test 3: Search users with query${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?search=gmail&page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.users) {
      console.log(`${colors.green}✅ Success: Search returned ${data.users.length} results${colors.reset}`);
      if (data.users.length > 0) {
        console.log(`   First result: ${data.users[0].email}`);
      }
      passed++;
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(data)}${colors.reset}`);
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
        const lines = csvData.split('\n');
        console.log(`   CSV has ${lines.length} lines`);
        console.log(`   Headers: ${lines[0]}`);
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

  // Test 5: Test email sending (won't actually suspend/delete real users)
  console.log(`\n${colors.cyan}Test 5: Email functionality${colors.reset}`);
  try {
    // Get a test user (not the admin)
    const listResponse = await fetch(`${API_URL}/api/admin/users?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (listResponse.ok) {
      const { users } = await listResponse.json();
      // Find a non-admin user for testing
      const testUser = users.find(u => u.role !== 'admin' && u.email !== 'marwryyy@gmail.com');
      
      if (testUser) {
        console.log(`   Testing email to: ${testUser.email}`);
        
        // Test email sending
        const emailResponse = await fetch(`${API_URL}/api/admin/users/${testUser.id}/email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: 'Test Email from Admin Panel',
            message: 'This is a test email sent from the admin user management system.'
          })
        });

        if (emailResponse.ok) {
          const result = await emailResponse.json();
          console.log(`${colors.green}✅ Email endpoint working: ${result.message}${colors.reset}`);
          passed++;
        } else {
          const error = await emailResponse.json();
          console.log(`${colors.yellow}⚠️ Email endpoint returned: ${error.error}${colors.reset}`);
          failed++;
        }
      } else {
        console.log(`${colors.yellow}⚠️ No non-admin user found for testing${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    failed++;
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}FINAL TEST RESULTS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (passed >= 4) {
    console.log(`${colors.bright}${colors.green}🎉 Admin User Management System is working!${colors.reset}`);
    console.log(`${colors.green}All major features are operational.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ Some features need attention. Check the errors above.${colors.reset}`);
  }

  // Check database
  console.log(`\n${colors.cyan}Database Status:${colors.reset}`);
  const { data: stats } = await supabase.rpc('get_admin_user_stats');
  console.log(`   Total users in database: ${stats?.total_users || 0}`);
  console.log(`   Total organizations: ${stats?.total_organizations || 0}`);
  
  // Check audit log
  const { data: auditLogs, error: auditError } = await supabase
    .from('user_admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (auditLogs && auditLogs.length > 0) {
    console.log(`\n${colors.cyan}Recent Admin Actions:${colors.reset}`);
    auditLogs.forEach(log => {
      console.log(`   - ${log.action} at ${new Date(log.created_at).toLocaleString()}`);
    });
  }
}

// Run the test
testAdminAPI().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});