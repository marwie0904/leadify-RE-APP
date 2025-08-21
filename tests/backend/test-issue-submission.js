/**
 * Test Issue Submission
 * Run with: node scripts/test-issue-submission.js
 * 
 * This script tests the issue submission flow with proper authentication
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

async function testIssueSubmission() {
  console.log(`${colors.blue}Testing Issue Submission${colors.reset}\n`);

  try {
    // Step 1: Get a test user
    console.log('1. Getting test user...');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });

    if (userError || !users.users || users.users.length === 0) {
      throw new Error('No users found in database');
    }

    const testUser = users.users[0];
    console.log(`${colors.green}✓ Found test user: ${testUser.email}${colors.reset}`);

    // Step 2: Create a JWT token for the user
    console.log('\n2. Creating auth token...');
    const jwt = require('jsonwebtoken');
    
    // Ensure we have the JWT_SECRET
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not found in environment variables');
    }
    
    const token = jwt.sign(
      { 
        id: testUser.id, 
        email: testUser.email,
        sub: testUser.id // Supabase uses 'sub' for user ID
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log(`${colors.green}✓ Auth token created${colors.reset}`);

    // Step 3: Get organization ID if user has one
    console.log('\n3. Checking for organization...');
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', testUser.id)
      .limit(1);

    let organizationId = null;
    if (!memberError && members && members.length > 0) {
      organizationId = members[0].organization_id;
      console.log(`${colors.green}✓ Found organization: ${organizationId}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ User has no organization${colors.reset}`);
    }

    // Step 4: Submit a test issue
    console.log('\n4. Submitting test issue...');
    const issueData = {
      subject: 'Test Issue: Authentication Fix Verification',
      description: 'This is a test issue to verify the authentication fix is working correctly. The issue submission should work with the simple-auth-context JWT token.',
      organizationId: organizationId,
      posthogSessionId: 'test-session-' + Date.now(),
      posthogPersonId: 'test-person-' + testUser.id,
      browserInfo: {
        userAgent: 'Test Script',
        platform: 'Node.js',
        language: 'en-US',
        screenResolution: '1920x1080',
        viewport: '1920x1080',
        url: 'http://localhost:3004/help'
      }
    };

    // Debug: Log the token (first few chars)
    console.log(`Token (first 20 chars): ${token.substring(0, 20)}...`);
    
    const response = await fetch(`${API_URL}/api/issues/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(issueData)
    });

    const responseData = await response.json();
    
    // Debug: Log the response
    console.log('Response status:', response.status);
    console.log('Response data:', responseData);

    if (!response.ok) {
      throw new Error(`Failed to submit issue: ${responseData.error || response.statusText}`);
    }

    console.log(`${colors.green}✓ Issue submitted successfully!${colors.reset}`);
    console.log('\nIssue Details:');
    console.log(`- ID: ${responseData.data.id}`);
    console.log(`- Priority: ${responseData.data.priority}`);
    console.log(`- Status: ${responseData.data.status}`);

    if (responseData.data.aiClassification) {
      console.log('\nAI Classification:');
      console.log(`- Priority: ${responseData.data.aiClassification.priority} (Score: ${responseData.data.aiClassification.priorityScore})`);
      console.log(`- Category: ${responseData.data.aiClassification.category}`);
      console.log(`- Reasoning: ${responseData.data.aiClassification.reasoning}`);
      
      if (responseData.data.aiClassification.suggestedActions && responseData.data.aiClassification.suggestedActions.length > 0) {
        console.log('- Suggested Actions:');
        responseData.data.aiClassification.suggestedActions.forEach(action => {
          console.log(`  • ${action}`);
        });
      }
    }

    // Step 5: Verify the issue was saved
    console.log('\n5. Verifying issue in database...');
    const { data: savedIssue, error: fetchError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', responseData.data.id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to verify issue: ${fetchError.message}`);
    }

    console.log(`${colors.green}✓ Issue verified in database${colors.reset}`);
    console.log(`- Subject: ${savedIssue.subject}`);
    console.log(`- Created: ${new Date(savedIssue.created_at).toLocaleString()}`);

    console.log(`\n${colors.green}========================================`);
    console.log('✅ Issue Submission Test PASSED!');
    console.log(`========================================${colors.reset}\n`);

    return true;

  } catch (error) {
    console.error(`\n${colors.red}❌ Test Failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run the test
testIssueSubmission().then(success => {
  process.exit(success ? 0 : 1);
});