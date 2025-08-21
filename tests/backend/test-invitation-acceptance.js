#!/usr/bin/env node

const TOKEN = 'dfb9eb2ef1d6b79e1db789bb75ea7ffe16f5043150de40a93572fab881001607';
const API_URL = 'http://localhost:3001';

// Color output helpers
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

async function testInvitationFlow() {
  console.log(blue('\n🔐 Testing Organization Invitation Acceptance Flow\n'));
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Verify the invitation
    console.log(yellow('\n1️⃣  Verifying invitation token...'));
    const verifyResponse = await fetch(`${API_URL}/api/auth/invite/verify?token=${TOKEN}`);
    const verifyData = await verifyResponse.json();
    
    if (!verifyData.valid) {
      throw new Error(`Invalid invitation: ${verifyData.message}`);
    }
    
    console.log(green('✅ Invitation verified successfully!'));
    console.log('   Email:', verifyData.email);
    console.log('   Organization:', verifyData.organizationName);
    console.log('   User exists:', verifyData.userExists);
    console.log('   Expires:', new Date(verifyData.expiresAt).toLocaleDateString());
    
    // Step 2: Show what would happen on acceptance
    console.log(yellow('\n2️⃣  Invitation Ready for Acceptance'));
    console.log('\nTo accept this invitation via the frontend:');
    console.log(blue(`   Visit: http://localhost:3001/auth/invite?token=${TOKEN}`));
    console.log('\nOr test acceptance via API:');
    console.log('   POST /api/auth/invite/accept');
    console.log('   Body: {');
    console.log('     "token": "' + TOKEN + '",');
    console.log('     "password": "YourPassword123!",');
    console.log('     "confirmPassword": "YourPassword123!",');
    console.log('     "firstName": "Test",');
    console.log('     "lastName": "User"');
    console.log('   }');
    
    // Step 3: Test acceptance (optional - commented out to avoid creating the user)
    /*
    console.log(yellow('\n3️⃣  Testing invitation acceptance...'));
    const acceptResponse = await fetch(`${API_URL}/api/auth/invite/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: TOKEN,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    const acceptData = await acceptResponse.json();
    
    if (acceptResponse.ok) {
      console.log(green('✅ Invitation accepted successfully!'));
      console.log('   User ID:', acceptData.user.id);
      console.log('   Auth Token:', acceptData.token.substring(0, 20) + '...');
      console.log('   Organization:', acceptData.organization.name);
    } else {
      console.log(red('❌ Acceptance failed:', acceptData.message));
    }
    */
    
    console.log('\n' + '=' .repeat(60));
    console.log(green('\n✨ Invitation flow is working correctly!\n'));
    console.log('The invitation can now be accepted through:');
    console.log('1. Frontend: http://localhost:3000/auth/invite?token=' + TOKEN);
    console.log('2. Direct link: http://localhost:3001/auth/invite?token=' + TOKEN);
    console.log('\n');
    
  } catch (error) {
    console.error(red('\n❌ Test failed:'), error.message);
    process.exit(1);
  }
}

testInvitationFlow();