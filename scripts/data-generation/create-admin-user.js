#!/usr/bin/env node

/**
 * Create Admin User for Admin Dashboard Access
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🔧 Creating Admin User for Dashboard Access...\n');
  console.log('=' .repeat(50));
  
  const adminUser = {
    email: 'admin@gmail.com',
    password: 'admin123'
  };
  
  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === adminUser.email);
    
    let userId;
    
    if (userExists) {
      console.log(`⚠️ User already exists: ${adminUser.email}`);
      const existingUser = existingUsers.users.find(u => u.email === adminUser.email);
      userId = existingUser.id;
      console.log(`Using existing user ID: ${userId}`);
      
      // Update password for existing user
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: adminUser.password }
      );
      
      if (updateError) {
        console.error(`❌ Failed to update password: ${updateError.message}`);
      } else {
        console.log(`✅ Password updated for existing user`);
      }
    } else {
      // Create new auth user
      console.log(`📝 Creating new user: ${adminUser.email}`);
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: adminUser.email,
        password: adminUser.password,
        email_confirm: true,
        user_metadata: {
          role: 'admin',
          is_admin: true
        }
      });
      
      if (authError) {
        console.error(`❌ Failed to create user: ${authError.message}`);
        process.exit(1);
      }
      
      userId = authUser.user.id;
      console.log(`✅ Auth user created: ${userId}`);
    }
    
    // Check if already in dev_members
    const { data: existingMember, error: checkError } = await supabase
      .from('dev_members')
      .select('*')
      .eq('email', adminUser.email)
      .single();
    
    if (existingMember) {
      console.log(`⚠️ Already in dev_members table`);
    } else {
      // Add to dev_members table for admin access
      const { error: memberError } = await supabase
        .from('dev_members')
        .insert({
          email: adminUser.email,
          role: 'admin',
          created_at: new Date().toISOString()
        });
      
      if (memberError) {
        console.error(`❌ Failed to add to dev_members: ${memberError.message}`);
      } else {
        console.log(`✅ Added to dev_members table with admin role`);
      }
    }
    
    // Sign in the user to verify authentication works
    console.log(`\n🔐 Testing authentication...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminUser.email,
      password: adminUser.password
    });
    
    if (signInError) {
      console.error(`❌ Authentication test failed: ${signInError.message}`);
    } else {
      console.log(`✅ Authentication successful!`);
      console.log(`   User ID: ${signInData.user.id}`);
      console.log(`   Session: ${signInData.session ? 'Active' : 'None'}`);
    }
    
  } catch (error) {
    console.error(`❌ Error creating admin user:`, error.message);
    process.exit(1);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Admin user setup complete!\n');
  console.log('📋 ADMIN DASHBOARD CREDENTIALS:');
  console.log('=' .repeat(50));
  console.log('Email: admin@gmail.com');
  console.log('Password: admin123');
  console.log('\nAccess the admin dashboard at:');
  console.log('http://localhost:3000/admin');
  console.log('=' .repeat(50));
}

// Run the creation
createAdminUser().catch(console.error);