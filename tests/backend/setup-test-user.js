const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase Admin Client
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

const TEST_USER = {
  email: 'test-api@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

async function setupTestUser() {
  console.log('🔧 Setting up test user for API testing...\n');
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(TEST_USER.email);
    
    if (existingUser.user) {
      console.log('✅ Test user already exists:', TEST_USER.email);
      console.log('   User ID:', existingUser.user.id);
      
      // Create a session for the user
      const { data: session, error: sessionError } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: {
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName
        }
      });
      
      // Sign in to get a token
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      if (loginData.session) {
        console.log('\n📝 Test User Credentials:');
        console.log('   Email:', TEST_USER.email);
        console.log('   Password:', TEST_USER.password);
        console.log('   Token:', loginData.session.access_token);
        console.log('\n✅ Test user is ready for API testing!');
        
        // Save token to file for easy access
        const fs = require('fs');
        const testConfig = {
          email: TEST_USER.email,
          password: TEST_USER.password,
          token: loginData.session.access_token,
          userId: existingUser.user.id
        };
        
        fs.writeFileSync('test-user-config.json', JSON.stringify(testConfig, null, 2));
        console.log('\n📁 Test config saved to: test-user-config.json');
      }
      
      return existingUser.user;
    }
    
    // Create new user with confirmed email
    console.log('Creating new test user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: {
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName
      }
    });
    
    if (createError) {
      throw createError;
    }
    
    console.log('✅ Test user created successfully!');
    console.log('   User ID:', newUser.user.id);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        full_name: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
        email: TEST_USER.email
      });
    
    if (profileError) {
      console.warn('⚠️  Profile creation failed:', profileError.message);
    } else {
      console.log('✅ User profile created');
    }
    
    // Create default organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: `${TEST_USER.firstName} ${TEST_USER.lastName}'s Test Org`,
        created_by: newUser.user.id
      })
      .select()
      .single();
    
    if (orgError) {
      console.warn('⚠️  Organization creation failed:', orgError.message);
    } else {
      console.log('✅ Default organization created:', org.name);
      
      // Add user as admin of organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: newUser.user.id,
          role: 'admin'
        });
      
      if (!memberError) {
        console.log('✅ User added as organization admin');
      }
    }
    
    // Sign in to get a token
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (loginData.session) {
      console.log('\n📝 Test User Credentials:');
      console.log('   Email:', TEST_USER.email);
      console.log('   Password:', TEST_USER.password);
      console.log('   Token:', loginData.session.access_token);
      console.log('\n✅ Test user is ready for API testing!');
      
      // Save token to file for easy access
      const fs = require('fs');
      const testConfig = {
        email: TEST_USER.email,
        password: TEST_USER.password,
        token: loginData.session.access_token,
        userId: newUser.user.id,
        organizationId: org?.id
      };
      
      fs.writeFileSync('test-user-config.json', JSON.stringify(testConfig, null, 2));
      console.log('\n📁 Test config saved to: test-user-config.json');
    }
    
    return newUser.user;
    
  } catch (error) {
    console.error('❌ Error setting up test user:', error.message);
    throw error;
  }
}

// Run setup
setupTestUser()
  .then(() => {
    console.log('\n🎉 Test user setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });