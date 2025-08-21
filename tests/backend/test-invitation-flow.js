const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001';

// Test data
const testToken = 'your-test-token-here'; // Replace with actual token
const newUserData = {
  token: testToken,
  password: 'Test1234!',
  confirmPassword: 'Test1234!',
  existingUser: false
};

const existingUserData = {
  token: testToken,
  password: 'ExistingUserPassword!',
  existingUser: true
};

async function testInviteVerification() {
  console.log('Testing invitation verification...');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/invite/verify?token=${testToken}`);
    const data = await response.json();
    
    console.log('Verification Response:', data);
    console.log('User exists:', data.userExists);
    
    return data;
  } catch (error) {
    console.error('Verification failed:', error);
  }
}

async function testNewUserAcceptance() {
  console.log('\nTesting new user invitation acceptance...');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/invite/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newUserData)
    });
    
    const data = await response.json();
    console.log('New User Acceptance Response:', data);
    
  } catch (error) {
    console.error('New user acceptance failed:', error);
  }
}

async function testExistingUserAcceptance() {
  console.log('\nTesting existing user invitation acceptance...');
  
  try {
    const response = await fetch(`${API_URL}/api/auth/invite/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(existingUserData)
    });
    
    const data = await response.json();
    console.log('Existing User Acceptance Response:', data);
    
  } catch (error) {
    console.error('Existing user acceptance failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('Starting invitation flow tests...\n');
  
  // First verify the invitation
  const verifyResult = await testInviteVerification();
  
  if (verifyResult?.valid) {
    if (verifyResult.userExists) {
      // Test existing user flow
      await testExistingUserAcceptance();
    } else {
      // Test new user flow
      await testNewUserAcceptance();
    }
  }
}

// Instructions
console.log(`
To test the invitation flow:

1. Replace 'your-test-token-here' with an actual invitation token
2. Run: node test-invitation-flow.js

The script will:
- Verify the invitation token
- Check if the user already exists
- Test the appropriate flow (new user or existing user)
`);

// Uncomment to run tests
// runTests();