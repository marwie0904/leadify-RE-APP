#!/usr/bin/env node

/**
 * Create Test User in Supabase Auth
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

async function createTestUser() {
  console.log('🔧 Creating Test User...\n');
  
  const testUser = {
    email: 'marwie.ang.0904@gmail.com',
    password: 'ayokonga123',
    firstName: 'Marwie',
    lastName: 'Ang'
  };
  
  try {
    console.log(`Creating user: ${testUser.email}`);
    
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: {
        first_name: testUser.firstName,
        last_name: testUser.lastName
      }
    });
    
    if (authError) {
      console.error(`❌ Failed to create user: ${authError.message}`);
      return;
    }
    
    console.log(`✅ Auth user created: ${authUser.user.id}`);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: testUser.email,
        first_name: testUser.firstName,
        last_name: testUser.lastName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error(`❌ Failed to create profile: ${profileError.message}`);
    } else {
      console.log(`✅ User profile created`);
    }
    
    // Create a test organization for the user
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Organization',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orgError) {
      console.log(`⚠️ Organization might already exist: ${orgError.message}`);
    } else if (org) {
      console.log(`✅ Organization created: ${org.name}`);
      
      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: authUser.user.id,
          role: 'member',
          joined_at: new Date().toISOString()
        });
      
      if (memberError) {
        console.log(`❌ Failed to add as member: ${memberError.message}`);
      } else {
        console.log(`✅ Added as organization member`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Error creating user:`, error.message);
  }
  
  console.log('\n✅ Test user creation complete!');
  console.log('\nYou can now login with:');
  console.log(`  Email: marwie.ang.0904@gmail.com`);
  console.log(`  Password: ayokonga123`);
}

// Run the creation
createTestUser().catch(console.error);