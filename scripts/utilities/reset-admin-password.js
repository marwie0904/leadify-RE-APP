#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role to update password
);

async function resetPassword() {
  console.log('🔐 Resetting password for admin@primeresidential.com...\n');
  
  try {
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      'f44bcaa7-8a7c-4ac4-b72a-fe160db26edc',  // User ID from earlier query
      {
        password: 'TestPassword123!'
      }
    );
    
    if (error) {
      console.error('❌ Failed to reset password:', error);
      return;
    }
    
    console.log('✅ Password reset successfully!');
    console.log('\nNew credentials:');
    console.log('Email: admin@primeresidential.com');
    console.log('Password: TestPassword123!');
    
    // Test the new password
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'admin@primeresidential.com',
      password: 'TestPassword123!'
    });
    
    if (loginError) {
      console.error('\n❌ Login test failed:', loginError.message);
    } else {
      console.log('\n✅ Login test successful!');
      console.log('User can now login with the new password.');
      
      // Sign out
      await supabaseClient.auth.signOut();
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

resetPassword();