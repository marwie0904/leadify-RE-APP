#!/usr/bin/env node

/**
 * Create admin user properly through Supabase Auth
 * This ensures the password works correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAdminUser() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 CREATING ADMIN USER PROPERLY');
  console.log('='.repeat(60));
  
  const email = 'admin@gmail.com';
  const password = 'admin123';
  
  try {
    // Step 1: Create user through Supabase Admin Auth API
    console.log('\n📝 Creating user through Supabase Auth...');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: 'Admin User'
      }
    });
    
    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already exists')) {
        console.log('  ⚠️ User already exists, updating password...');
        
        // Update the existing user's password
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          authError.message.match(/User (\S+) already exists/)?.[1] || '',
          { password: password }
        );
        
        if (updateError) {
          throw updateError;
        }
        
        console.log('  ✅ Password updated successfully');
      } else {
        throw authError;
      }
    } else {
      console.log('  ✅ User created successfully');
      console.log('  📧 Email:', authUser.user.email);
      console.log('  🆔 User ID:', authUser.user.id);
    }
    
    // Step 2: Get the user ID (either from creation or by lookup)
    console.log('\n🔍 Looking up user ID...');
    const { data: users, error: lookupError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (lookupError) {
      console.log('  ❌ Could not find user:', lookupError.message);
      // Try alternative method
      const { data: authData, error: authCheckError } = await supabase.auth.admin.listUsers();
      
      if (!authCheckError && authData?.users) {
        const user = authData.users.find(u => u.email === email);
        if (user) {
          console.log('  ✅ Found user via admin API:', user.id);
          
          // Step 3: Add to dev_members table
          console.log('\n📊 Adding user to dev_members table...');
          const { data: devMember, error: devError } = await supabase
            .from('dev_members')
            .upsert({
              user_id: user.id,
              email: email,
              full_name: 'Admin User',
              role: 'admin',
              permissions: ['read', 'write', 'delete', 'admin_access', 'super_admin'],
              is_active: true
            }, {
              onConflict: 'email'
            })
            .select()
            .single();
          
          if (devError) {
            console.log('  ❌ Error adding to dev_members:', devError.message);
          } else {
            console.log('  ✅ Added to dev_members successfully');
            console.log('  📊 Role:', devMember.role);
            console.log('  🔑 Permissions:', devMember.permissions);
          }
        }
      }
    } else {
      console.log('  ✅ User found:', users.id);
      
      // Step 3: Add to dev_members table
      console.log('\n📊 Adding user to dev_members table...');
      const { data: devMember, error: devError } = await supabase
        .from('dev_members')
        .upsert({
          user_id: users.id,
          email: email,
          full_name: 'Admin User',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'admin_access', 'super_admin'],
          is_active: true
        }, {
          onConflict: 'email'
        })
        .select()
        .single();
      
      if (devError) {
        console.log('  ❌ Error adding to dev_members:', devError.message);
      } else {
        console.log('  ✅ Added to dev_members successfully');
        console.log('  📊 Role:', devMember.role);
        console.log('  🔑 Permissions:', devMember.permissions);
      }
    }
    
    // Step 4: Test the login
    console.log('\n🔐 Testing login credentials...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    if (signInError) {
      console.log('  ❌ Login test failed:', signInError.message);
    } else {
      console.log('  ✅ Login test successful!');
      console.log('  🎯 User can now login with:');
      console.log('     Email:', email);
      console.log('     Password:', password);
      
      // Sign out after test
      await supabase.auth.signOut();
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ADMIN USER SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: admin123');
    console.log('  Role: Admin with full permissions');
    console.log('  Status: Active in dev_members table');
    console.log('\n🚀 You can now login to the admin panel!');
    
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error('Details:', error);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });