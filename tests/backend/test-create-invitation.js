#!/usr/bin/env node

require('dotenv').config();

const API_URL = 'http://localhost:3001';

// First, we need to get an auth token by logging in
async function testInvitationCreation() {
  console.log('🔐 Testing Organization Invitation Creation\n');
  
  try {
    // Login first to get auth token
    console.log('1️⃣ Logging in to get auth token...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mosesmkrs@gmail.com', // Your admin user
        password: 'Mo112233@' // Your password
      })
    });
    
    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      throw new Error(`Login failed: ${error.message}`);
    }
    
    const loginData = await loginResponse.json();
    const authToken = loginData.token;
    console.log('✅ Logged in successfully');
    
    // Now test creating an invitation
    console.log('\n2️⃣ Creating invitation...');
    const inviteResponse = await fetch(`${API_URL}/api/organization/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        email: 'test_invite_' + Date.now() + '@example.com',
        organizationId: '74b8a0fd-4352-4526-bb9c-97e3af99adfb',
        role: 'member'
      })
    });
    
    const inviteData = await inviteResponse.json();
    
    if (!inviteResponse.ok) {
      console.error('❌ Invitation creation failed:', inviteData);
      
      if (inviteData.error === 'RLS_POLICY_ERROR') {
        console.log('\n⚠️ RLS Policy Error detected');
        console.log('The server is properly detecting the RLS issue.');
        console.log('\nPossible solutions:');
        console.log('1. Ensure SUPABASE_SERVICE_ROLE_KEY is the service role key (not anon key)');
        console.log('2. Check if RLS is enabled on organization_invites table in Supabase');
        console.log('3. You may need to temporarily disable RLS on organization_invites table');
      }
    } else {
      console.log('✅ Invitation created successfully!');
      console.log('   Invitation ID:', inviteData.invitation.id);
      console.log('   Email:', inviteData.invitation.email);
      console.log('   Token:', inviteData.invitation.token?.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInvitationCreation();