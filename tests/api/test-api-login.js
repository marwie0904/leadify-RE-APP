#!/usr/bin/env node

/**
 * Test API Login Directly
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:3001';

async function testLogin(email, password) {
  console.log(`\n🔐 Testing login for: ${email}`);
  console.log('=' .repeat(50));
  
  try {
    // First, try the login endpoint
    console.log('📡 Calling /api/auth/login...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Login successful!');
      console.log('📦 Response data:', {
        hasToken: !!response.data.token,
        hasUser: !!response.data.user,
        userId: response.data.user?.id,
        userEmail: response.data.user?.email
      });
      
      // Try to get organization members with the token
      if (response.data.token) {
        console.log('\n📡 Testing /api/organization/members with token...');
        try {
          const membersResponse = await axios.get(`${API_URL}/api/organization/members`, {
            headers: {
              'Authorization': `Bearer ${response.data.token}`
            }
          });
          
          console.log('✅ Members endpoint working!');
          console.log(`📊 Found ${membersResponse.data.length} members`);
          
          // Find the user in the members
          const currentUser = membersResponse.data.find(m => m.user_id === response.data.user.id);
          if (currentUser) {
            console.log('👤 User found in organization:', {
              role: currentUser.role,
              organizationId: currentUser.organization_id
            });
          }
        } catch (err) {
          console.log('❌ Members endpoint error:', err.message);
        }
      }
      
    } else if (response.status === 401) {
      console.log('❌ Authentication failed - Invalid credentials');
      console.log('📦 Error:', response.data);
    } else if (response.status === 500) {
      console.log('❌ Server error');
      console.log('📦 Error:', response.data);
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
      console.log('📦 Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function runTests() {
  console.log('🚀 API LOGIN TEST');
  console.log('=====================================');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  // Test organization admin
  await testLogin('admin@primeresidential.com', 'Admin123!');
  
  // Test with wrong password to see error handling
  await testLogin('admin@primeresidential.com', 'WrongPassword');
  
  // Test super admin
  await testLogin('admin@gmail.com', 'admin123');
}

runTests().catch(console.error);