#!/usr/bin/env node

/**
 * Test Organization Settings Display
 * 
 * This script tests that organization settings are properly displayed
 * including name, overview, industry, and product/service.
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://localhost:3001';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function testOrganizationSettings() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                    Organization Settings Test                              ║
║                                                                            ║
║  Testing that organization details are properly displayed                  ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // First, let's check if there's an organization in the database
    console.log(`\n${colors.yellow}Checking organizations in database...${colors.reset}`);
    
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgError) {
      console.log(`${colors.red}✗ Error fetching organizations: ${orgError.message}${colors.reset}`);
      return;
    }
    
    if (!organizations || organizations.length === 0) {
      console.log(`${colors.yellow}No organizations found in database.${colors.reset}`);
      console.log(`${colors.cyan}Please create an organization first through the UI.${colors.reset}`);
      return;
    }
    
    const org = organizations[0];
    console.log(`${colors.green}✓ Found organization: ${org.name}${colors.reset}`);
    console.log(`  ID: ${org.id}`);
    console.log(`  Company Overview: ${org.company_overview || '(not set)'}`);
    console.log(`  Industry: ${org.industry || '(not set)'}`);
    console.log(`  Product/Service: ${org.product_service || '(not set)'}`);
    console.log(`  AI Context: ${org.ai_context_summary || '(not generated)'}`);
    
    // Now test the API endpoint
    console.log(`\n${colors.yellow}Testing API endpoint...${colors.reset}`);
    
    // Get a user token (you'll need to have a valid user in the system)
    const { data: users, error: userError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', org.id)
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.log(`${colors.yellow}No users found for this organization.${colors.reset}`);
      console.log(`${colors.cyan}Please sign up and create an organization through the UI.${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found user in organization${colors.reset}`);
    
    // Create a test JWT token (in real app, this comes from auth)
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      { id: users[0].user_id },
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Test the GET endpoint
    console.log(`\n${colors.yellow}Testing GET /api/organizations/${org.id}...${colors.reset}`);
    
    const response = await fetch(`${API_URL}/api/organizations/${org.id}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`${colors.red}✗ Failed to fetch organization: ${response.status}${colors.reset}`);
      console.log(`  Error: ${error}`);
      return;
    }
    
    const orgData = await response.json();
    console.log(`${colors.green}✓ Successfully fetched organization data${colors.reset}`);
    console.log(`${colors.cyan}Organization Data:${colors.reset}`);
    console.log(JSON.stringify(orgData, null, 2));
    
    // Check if all fields are present
    console.log(`\n${colors.cyan}Field Verification:${colors.reset}`);
    const fields = ['name', 'company_overview', 'industry', 'product_service', 'ai_context_summary'];
    fields.forEach(field => {
      if (orgData[field]) {
        console.log(`${colors.green}✓ ${field}: ${orgData[field].substring(0, 50)}${orgData[field].length > 50 ? '...' : ''}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}○ ${field}: (not set)${colors.reset}`);
      }
    });
    
    console.log(`\n${colors.cyan}Frontend Display Instructions:${colors.reset}`);
    console.log(`1. Navigate to http://localhost:3000/organization/settings`);
    console.log(`2. You should see:`);
    console.log(`   - Organization Name: ${orgData.name || '(empty)'}`);
    console.log(`   - Industry: ${orgData.industry || '(empty)'}`);
    console.log(`   - Company Overview: ${orgData.company_overview ? 'Present' : '(empty)'}`);
    console.log(`   - Product/Service: ${orgData.product_service ? 'Present' : '(empty)'}`);
    console.log(`   - AI Context Summary: ${orgData.ai_context_summary ? 'Present' : '(not generated)'}`);
    
    if (!orgData.company_overview || !orgData.industry || !orgData.product_service) {
      console.log(`\n${colors.yellow}Note: Some fields are empty. Fill them in through the settings page.${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Test error:${colors.reset}`, error.message);
  }
}

// Run the test
testOrganizationSettings().then(() => {
  console.log(`\n${colors.green}Test complete!${colors.reset}`);
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});