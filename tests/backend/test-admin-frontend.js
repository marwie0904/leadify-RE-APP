/**
 * Test script to verify admin authentication and API access from frontend
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

  // Create a JWT token for this user with admin role
  const token = jwt.sign(
    {
      sub: adminUser.id,
      email: adminUser.email,
      role: 'authenticated',
      user_metadata: { 
        role: 'admin',
        full_name: 'Admin User'
      }
    },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  return { token, user: adminUser };
}

async function testFrontendAuth() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           FRONTEND ADMIN AUTH - INTEGRATION TEST          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const adminData = await getAdminToken();
  if (!adminData) {
    console.error('Failed to get admin token');
    return;
  }

  const { token, user } = adminData;

  console.log(`${colors.cyan}Admin User Details:${colors.reset}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  ID: ${user.id}`);
  console.log(`  Token (first 50 chars): ${token.substring(0, 50)}...`);
  console.log();

  // Simulate what the frontend would store in localStorage
  console.log(`${colors.cyan}Frontend localStorage Simulation:${colors.reset}`);
  console.log(`  Key: auth_token`);
  console.log(`  Value: ${token.substring(0, 30)}...`);
  console.log();

  // Test 1: Verify token works with admin endpoints
  console.log(`${colors.cyan}Test 1: Admin Users API with auth_token${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Success: Admin API accessible${colors.reset}`);
      console.log(`   Users found: ${data.users.length}`);
      console.log(`   Pagination: Page ${data.pagination.page} of ${data.pagination.pages}`);
    } else {
      const error = await response.json();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(error)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Test 2: Verify admin role check
  console.log(`\n${colors.cyan}Test 2: Admin Role Verification${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`${colors.green}✅ Success: Admin role verified${colors.reset}`);
      console.log(`   Total Users: ${data.totalUsers}`);
      console.log(`   Organizations: ${data.totalOrganizations}`);
    } else {
      const error = await response.json();
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(error)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Test 3: Test with non-admin user
  console.log(`\n${colors.cyan}Test 3: Non-Admin User Access (Should Fail)${colors.reset}`);
  const nonAdminToken = jwt.sign(
    {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'authenticated',
      user_metadata: { 
        role: 'agent', // Not admin
        full_name: 'Test User'
      }
    },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  );

  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${nonAdminToken}`
      }
    });

    if (response.status === 403) {
      const error = await response.json();
      console.log(`${colors.green}✅ Correct: Non-admin access denied${colors.reset}`);
      console.log(`   Message: ${error.message}`);
    } else {
      console.log(`${colors.red}❌ Security Issue: Non-admin was allowed access!${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}FRONTEND INTEGRATION INSTRUCTIONS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}To use admin features in the frontend:${colors.reset}`);
  console.log(`1. Ensure user is logged in with admin role (marwryyy@gmail.com)`);
  console.log(`2. Token is stored in localStorage as 'auth_token'`);
  console.log(`3. Admin API client will automatically use this token`);
  console.log(`4. Admin pages should check user.role === 'admin' for access control`);
  console.log();
  console.log(`${colors.yellow}Note: The admin-users.ts API client has been updated to use 'auth_token'${colors.reset}`);
}

// Run the test
testFrontendAuth().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});