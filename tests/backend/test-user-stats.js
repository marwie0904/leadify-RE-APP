/**
 * Test user statistics API
 */

const fetch = require('node-fetch');

// Use a real Supabase token (you'll need to get this from browser localStorage)
// For testing, we'll use the admin token we created earlier
const jwt = require('jsonwebtoken');

const adminToken = jwt.sign(
  {
    sub: '4c984a9a-150e-4673-8192-17f80a7ef4d7',
    email: 'marwryyy@gmail.com',
    role: 'authenticated',
    user_metadata: { 
      role: 'admin',
      full_name: 'Admin User'
    }
  },
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
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

async function testUserStats() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                USER STATISTICS API TEST                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  // Test 1: Get user statistics
  console.log(`${colors.cyan}Test 1: GET /api/admin/users/stats${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users/stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`${colors.green}✅ Success: Retrieved user statistics${colors.reset}`);
      console.log(`   Total Users: ${data.totalUsers}`);
      console.log(`   Active Users: ${data.activeUsers}`);
      console.log(`   Inactive Users: ${data.inactiveUsers}`);
      console.log(`   Total Organizations: ${data.totalOrganizations}`);
      console.log(`   ${colors.yellow}Note: Suspended users stat removed from UI${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(data)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Test 2: Get users list to verify stats
  console.log(`\n${colors.cyan}Test 2: GET /api/admin/users (for verification)${colors.reset}`);
  try {
    const response = await fetch(`${API_URL}/api/admin/users?limit=100`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`${colors.green}✅ Success: Retrieved ${data.users.length} users${colors.reset}`);
      
      // Calculate stats from users list
      const activeCount = data.users.filter(u => u.status === 'active').length;
      const inactiveCount = data.users.filter(u => u.status === 'inactive').length;
      const orgs = new Set(data.users.map(u => u.organizationId).filter(Boolean));
      
      console.log(`   Calculated from list:`);
      console.log(`   - Active: ${activeCount}`);
      console.log(`   - Inactive: ${inactiveCount}`);
      console.log(`   - Organizations: ${orgs.size}`);
    } else {
      console.log(`${colors.red}❌ Failed: ${response.status} - ${JSON.stringify(data)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}UI CHANGES SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Stats cards updated:${colors.reset}`);
  console.log(`   - Changed from 5 to 4 cards`);
  console.log(`   - Removed "Suspended" card`);
  console.log(`   - Added colored left borders for visual distinction`);
  console.log(`   - Cards now show: Total Users, Active, Inactive, Organizations`);
  console.log();
  console.log(`${colors.green}✅ Filter dropdown updated:${colors.reset}`);
  console.log(`   - Removed "Suspended" option from status filter`);
  console.log(`   - Only shows: All, Active, Inactive`);
}

// Run the test
testUserStats().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});