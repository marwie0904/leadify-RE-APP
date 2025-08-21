#!/usr/bin/env node

/**
 * Quick test of admin login
 */

const axios = require('axios');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🧪 Testing Admin Login\n');
  console.log('=' .repeat(50));
  
  // Test 1: Supabase Auth
  console.log('\n📍 Step 1: Testing Supabase Authentication...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@primeresidential.com',
    password: 'Admin123!'
  });
  
  if (authError) {
    console.error('❌ Supabase auth failed:', authError.message);
    return;
  }
  
  console.log('✅ Supabase auth successful!');
  console.log('   User ID:', authData.user.id);
  console.log('   Email:', authData.user.email);
  console.log('   Token:', authData.session.access_token.substring(0, 20) + '...');
  
  // Test 2: Backend Profile Endpoint
  console.log('\n📍 Step 2: Testing Backend Profile Endpoint...');
  try {
    const response = await axios.get('http://localhost:3001/api/profile', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    });
    
    console.log('✅ Backend profile fetch successful!');
    console.log('   Profile:', response.data);
  } catch (error) {
    console.error('❌ Backend profile fetch failed:', error.response?.data || error.message);
  }
  
  // Test 3: Admin Endpoint
  console.log('\n📍 Step 3: Testing Admin Access...');
  try {
    const response = await axios.get('http://localhost:3001/api/admin/organizations', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`
      }
    });
    
    console.log('✅ Admin access granted!');
    console.log('   Organizations:', response.data.organizations?.length || 0);
  } catch (error) {
    console.error('❌ Admin access failed:', error.response?.data || error.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test Complete\n');
}

testLogin().catch(console.error);