require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPIWithRealUser() {
  try {
    console.log('Testing API with real user authentication...\n');

    // Try to sign in as the admin user
    const email = 'marwryyy@gmail.com';
    const password = 'password123'; // You'll need to know the actual password
    
    console.log(`Attempting to sign in as ${email}...`);
    console.log('Note: This test requires knowing the actual password for this user.\n');

    // First, let's test the /api/auth/login endpoint
    console.log('Testing /api/auth/login endpoint...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.error('Login failed:', error);
      console.log('\nSince we don\'t know the password, let\'s create a test user...\n');
      
      // Create a new test user
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      console.log(`Creating test user: ${testEmail}`);
      
      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            name: 'Test User'
          }
        }
      });

      if (signUpError) {
        console.error('Failed to create test user:', signUpError);
        return;
      }

      console.log('Test user created successfully');
      
      // Add the test user to the organization
      const orgId = '9f0de047-6b8d-41c4-9bce-ad3e267c8c66'; // leadify organization
      
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: signUpData.user.id,
          organization_id: orgId,
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (memberError) {
        console.error('Failed to add user to organization:', memberError);
      } else {
        console.log('Added test user to leadify organization');
      }

      // Now sign in with the test user
      console.log('\nSigning in with test user...');
      const testLoginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: testEmail, 
          password: testPassword 
        })
      });

      if (!testLoginResponse.ok) {
        const error = await testLoginResponse.json();
        console.error('Test user login failed:', error);
        return;
      }

      const loginData = await testLoginResponse.json();
      console.log('Login successful!');
      console.log('Token received:', loginData.token?.substring(0, 50) + '...');
      
      await testAgentsEndpoint(loginData.token);
      
    } else {
      const loginData = await loginResponse.json();
      console.log('Login successful!');
      console.log('Token received:', loginData.token?.substring(0, 50) + '...');
      
      await testAgentsEndpoint(loginData.token);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testAgentsEndpoint(token) {
  console.log('\n--- Testing /api/agents endpoint ---');
  
  try {
    const response = await fetch('http://localhost:3001/api/agents', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.agents && Array.isArray(data.agents)) {
      console.log(`\n✅ Successfully fetched ${data.agents.length} agents`);
      data.agents.forEach(agent => {
        console.log(`  - ${agent.name} (ID: ${agent.id})`);
      });
    } else {
      console.log('\n❌ Unexpected response format');
    }
    
  } catch (error) {
    console.error('Failed to test agents endpoint:', error);
  }
}

testAPIWithRealUser();