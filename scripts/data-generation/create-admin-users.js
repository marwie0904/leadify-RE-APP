#!/usr/bin/env node

/**
 * Create Admin Users in Supabase Auth
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

const adminUsers = [
  {
    email: 'admin@primeresidential.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Prime',
    organizationName: 'Prime Residential Realty'
  },
  {
    email: 'admin@luxuryestates.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Luxury',
    organizationName: 'Luxury Estates International'
  },
  {
    email: 'admin@urbanrealty.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Urban',
    organizationName: 'Urban Realty Solutions'
  },
  {
    email: 'admin@coastalproperties.com',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Coastal',
    organizationName: 'Coastal Properties Group'
  }
];

async function createAdminUsers() {
  console.log('🔧 Creating Admin Users...\n');
  
  for (const user of adminUsers) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.firstName,
          last_name: user.lastName
        }
      });
      
      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`  ⚠️ User already exists: ${user.email}`);
          
          // Get existing user
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          const existingUser = users?.find(u => u.email === user.email);
          
          if (existingUser) {
            // Create user profile if missing
            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                id: existingUser.id,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });
            
            if (profileError) {
              console.log(`  ❌ Failed to create profile: ${profileError.message}`);
            } else {
              console.log(`  ✅ Profile created/updated for existing user`);
            }
          }
        } else {
          console.error(`  ❌ Failed to create user: ${authError.message}`);
        }
        continue;
      }
      
      console.log(`  ✅ Auth user created: ${authUser.user.id}`);
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error(`  ❌ Failed to create profile: ${profileError.message}`);
      } else {
        console.log(`  ✅ User profile created`);
      }
      
      // Create organization
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
        console.log(`  ⚠️ Organization might already exist: ${orgError.message}`);
      } else if (org) {
        console.log(`  ✅ Organization created: ${org.name}`);
        
        // Add user as admin member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: authUser.user.id,
            role: 'admin',
            joined_at: new Date().toISOString()
          });
        
        if (memberError) {
          console.log(`  ❌ Failed to add as member: ${memberError.message}`);
        } else {
          console.log(`  ✅ Added as organization admin`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
    }
  }
  
  console.log('\n✅ Admin user creation complete!');
  console.log('\nYou can now login with:');
  adminUsers.forEach(user => {
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
}

// Run the creation
createAdminUsers().catch(console.error);