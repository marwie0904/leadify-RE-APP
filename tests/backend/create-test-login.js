const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestLogin() {
  const email = 'test@example.com';
  const password = 'TestPassword123!';
  
  console.log('Creating/updating test user...');
  
  // First try to sign in to see if user exists
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (signInData?.session) {
    console.log('Test user already exists and can login!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Session token:', signInData.session.access_token);
    console.log('\nNow testing agents fetch with this token...');
    
    // Test fetching agents
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch('http://localhost:3001/api/agents', {
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const agents = await response.json();
    console.log('Agents response:', agents);
    
    return;
  }
  
  // If user doesn't exist or wrong password, create/update them
  console.log('Creating new test user or updating password...');
  
  // Use admin API to create user with known password
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User'
    }
  });
  
  if (createError && createError.message.includes('already been registered')) {
    // User exists, update password
    console.log('User exists, updating password...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userData?.id || '', 
      { password }
    );
    
    if (updateError) {
      console.error('Failed to update password:', updateError);
      return;
    }
  } else if (createError) {
    console.error('Failed to create user:', createError);
    return;
  }
  
  console.log('User ready!');
  console.log('Email:', email);
  console.log('Password:', password);
  
  // Now sign in with the new user
  const { data: newSignIn, error: newSignInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (newSignInError) {
    console.error('Failed to sign in with new user:', newSignInError);
    return;
  }
  
  console.log('Successfully signed in!');
  console.log('User ID:', newSignIn.user.id);
  console.log('Session token:', newSignIn.session.access_token);
  
  // Add user to the organization
  const orgId = '9f0de047-6b8d-41c4-9bce-ad3e267c8c66';
  console.log('\nAdding user to organization...');
  
  const { error: memberError } = await supabase
    .from('organization_members')
    .upsert({
      organization_id: orgId,
      user_id: newSignIn.user.id,
      role: 'member',
      joined_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id,user_id'
    });
    
  if (memberError) {
    console.error('Failed to add to organization:', memberError);
  } else {
    console.log('User added to organization successfully!');
  }
  
  // Test fetching agents
  console.log('\nTesting agents fetch...');
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const response = await fetch('http://localhost:3001/api/agents', {
    headers: {
      'Authorization': `Bearer ${newSignIn.session.access_token}`
    }
  });
  
  const agents = await response.json();
  console.log('Agents response:', agents);
}

createTestLogin().catch(console.error);