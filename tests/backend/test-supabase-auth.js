const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './FRONTEND/financial-dashboard-2/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('Testing Supabase authentication...');
  console.log('Email: marwryyy@gmail.com');
  
  try {
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (error) {
      console.error('Sign in error:', error.message);
      return;
    }

    if (data.session) {
      console.log('\n✅ Authentication successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      console.log('Token present:', !!data.session.access_token);
      
      // Now test the API with this token
      console.log('\nTesting API access...');
      const response = await fetch('http://localhost:3001/api/admin/ai-analytics/summary', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response Status:', response.status);
      
      if (response.status === 403) {
        console.log('\n⚠️  User authenticated but lacks admin access');
        console.log('\n📝 Add this user to dev_members table:');
        console.log(`
INSERT INTO public.dev_members (
  user_id, email, full_name, role, permissions, is_active
) VALUES (
  '${data.user.id}',
  '${data.user.email}',
  'Admin User',
  'developer',
  ARRAY['read', 'write', 'admin'],
  true
) ON CONFLICT (user_id) 
DO UPDATE SET 
  is_active = true,
  role = 'developer',
  permissions = ARRAY['read', 'write', 'admin'],
  last_login = NOW();
        `);
      } else if (response.ok) {
        const result = await response.json();
        console.log('\n✅ Admin access confirmed!');
        console.log('API Response:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
      } else {
        console.log('Unexpected response:', response.status, response.statusText);
      }
      
      // Sign out
      await supabase.auth.signOut();
      console.log('\nSigned out successfully');
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testAuth();