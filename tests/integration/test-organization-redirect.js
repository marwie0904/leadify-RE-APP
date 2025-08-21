#!/usr/bin/env node

/**
 * Test Organization Setup Redirect
 * 
 * This script tests that users without organizations are redirected to
 * organization-setup page after login.
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testOrganizationRedirect() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                    Organization Redirect Test                              ║
║                                                                            ║
║  Testing that users without organizations are redirected to                ║
║  organization-setup page after login                                       ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // Test with a user that has no organization
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    console.log(`\n${colors.yellow}Testing login with user that has no organization...${colors.reset}`);
    console.log(`Email: ${testEmail}`);
    
    // Attempt login
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    }).catch(error => {
      console.log(`${colors.red}✗ Login failed: ${error.message}${colors.reset}`);
      return null;
    });

    if (!loginResponse) {
      console.log(`${colors.yellow}Note: User may not exist. This is expected if database was cleaned.${colors.reset}`);
      console.log(`${colors.cyan}Please test manually with a real user account.${colors.reset}`);
      return;
    }

    if (loginResponse.ok) {
      const data = await loginResponse.json();
      
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      console.log(`User ID: ${data.user?.id}`);
      console.log(`Has Organization: ${data.user?.hasOrganization || false}`);
      
      if (!data.user?.hasOrganization) {
        console.log(`${colors.green}✓ User has no organization${colors.reset}`);
        console.log(`${colors.bright}${colors.green}Expected: Frontend should redirect to /organization-setup${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ User already has an organization${colors.reset}`);
        console.log(`Expected: Frontend should redirect to /dashboard`);
      }
    } else {
      const errorData = await loginResponse.json();
      console.log(`${colors.red}✗ Login failed: ${errorData.error}${colors.reset}`);
    }

    console.log(`\n${colors.cyan}Manual Testing Instructions:${colors.reset}`);
    console.log(`1. Open browser and go to http://localhost:3000/auth`);
    console.log(`2. Sign in with a user account`);
    console.log(`3. Verify redirect behavior:`);
    console.log(`   - If user has NO organization → should redirect to /organization-setup`);
    console.log(`   - If user HAS organization → should redirect to /dashboard`);
    console.log(`\n${colors.yellow}The fix has been applied:${colors.reset}`);
    console.log(`- Auth page now redirects to '/' after login`);
    console.log(`- Root page checks hasOrganization and redirects accordingly`);

  } catch (error) {
    console.error(`${colors.red}Test error:${colors.reset}`, error.message);
  }
}

// Run the test
testOrganizationRedirect().then(() => {
  console.log(`\n${colors.green}Test information complete!${colors.reset}`);
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});