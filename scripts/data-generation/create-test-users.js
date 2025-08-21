#!/usr/bin/env node

/**
 * Create 4 Test Users in Supabase Auth
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

const testUsers = [
  {
    email: 'john.smith@realestate.com',
    password: 'TestUser123!',
    firstName: 'John',
    lastName: 'Smith',
    organizationName: 'Smith Real Estate Group'
  },
  {
    email: 'sarah.johnson@properties.com',
    password: 'TestUser123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    organizationName: 'Johnson Properties LLC'
  },
  {
    email: 'michael.brown@homes.com',
    password: 'TestUser123!',
    firstName: 'Michael',
    lastName: 'Brown',
    organizationName: 'Brown Home Solutions'
  },
  {
    email: 'emily.davis@realty.com',
    password: 'TestUser123!',
    firstName: 'Emily',
    lastName: 'Davis',
    organizationName: 'Davis Realty Partners'
  }
];

async function createTestUsers() {
  console.log('🔧 Creating 4 Test Users...\n');
  console.log('=' .repeat(50));
  
  const createdUsers = [];
  
  for (const user of testUsers) {
    try {
      console.log(`\n📝 Creating user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.users?.some(u => u.email === user.email);
      
      if (userExists) {
        console.log(`   ⚠️ User already exists: ${user.email}`);
        createdUsers.push({
          email: user.email,
          password: user.password,
          status: 'already exists'
        });
        continue;
      }
      
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName,
          full_name: `${user.firstName} ${user.lastName}`
        }
      });
      
      if (authError) {
        console.error(`   ❌ Failed to create user: ${authError.message}`);
        continue;
      }
      
      console.log(`   ✅ Auth user created: ${authUser.user.id}`);
      
      // Create organization for the user
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: user.organizationName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orgError) {
        console.log(`   ⚠️ Organization creation failed: ${orgError.message}`);
      } else if (org) {
        console.log(`   ✅ Organization created: ${org.name}`);
        
        // Add user as organization member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: authUser.user.id,
            role: 'member',
            joined_at: new Date().toISOString()
          });
        
        if (memberError) {
          console.log(`   ⚠️ Failed to add as member: ${memberError.message}`);
        } else {
          console.log(`   ✅ Added as organization member`);
        }
      }
      
      createdUsers.push({
        email: user.email,
        password: user.password,
        status: 'created successfully',
        userId: authUser.user.id,
        organization: user.organizationName
      });
      
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
      createdUsers.push({
        email: user.email,
        password: user.password,
        status: 'error',
        error: error.message
      });
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Test user creation complete!\n');
  console.log('📋 LOGIN CREDENTIALS:');
  console.log('=' .repeat(50));
  
  testUsers.forEach((user, index) => {
    console.log(`\nUser ${index + 1}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Organization: ${user.organizationName}`);
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('All users share the same password: TestUser123!');
  console.log('=' .repeat(50));
}

// Run the creation
createTestUsers().catch(console.error);