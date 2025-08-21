/**
 * Test Admin Access
 */

const axios = require('axios');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE_URL = 'http://localhost:3001';

async function testAdminAccess() {
  console.log('=======================================');
  console.log('    ADMIN ACCESS TEST');
  console.log('=======================================\n');

  try {
    // 1. Login as marwryyy@gmail.com
    console.log('1. Logging in as marwryyy@gmail.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Session Token: ${authData.session.access_token.substring(0, 50)}...`);

    // 2. Check organization_members table for role
    console.log('\n2. Checking organization_members role...');
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('organization_id', '770257fa-dc41-4529-9cb3-43b47072c271')
      .single();

    if (memberError) {
      console.error('❌ Failed to fetch member data:', memberError.message);
    } else {
      console.log(`✅ Organization role: ${memberData.role}`);
    }

    // 3. Test admin endpoints
    console.log('\n3. Testing admin endpoints...');
    
    const endpoints = [
      '/api/admin/dashboard/stats',
      '/api/admin/users/stats',
      '/api/admin/ai-analytics/summary',
      '/api/admin/team/members'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          console.log(`✅ ${endpoint} - Access granted (${response.status})`);
          if (response.data.success) {
            console.log(`   Data keys:`, Object.keys(response.data).slice(0, 5));
          }
        }
      } catch (error) {
        if (error.response) {
          if (error.response.status === 403) {
            console.log(`❌ ${endpoint} - Access denied (403)`);
            console.log(`   Error:`, error.response.data.error || 'No error message');
          } else if (error.response.status === 401) {
            console.log(`❌ ${endpoint} - Unauthorized (401)`);
          } else {
            console.log(`❌ ${endpoint} - Error (${error.response.status})`);
          }
        } else {
          console.log(`❌ ${endpoint} - Network error`);
        }
      }
    }

    // 4. Check dev_members table (for AI Analytics access)
    console.log('\n4. Checking dev_members table...');
    const { data: devMemberData, error: devMemberError } = await supabase
      .from('dev_members')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (devMemberError) {
      if (devMemberError.message.includes('does not exist')) {
        console.log('❌ dev_members table does not exist');
        console.log('   This table is required for AI Analytics access');
        console.log('\n   To create the table, run this SQL:');
        console.log(`
CREATE TABLE IF NOT EXISTS dev_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'developer', 'super_admin')),
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert marwryyy@gmail.com as admin
INSERT INTO dev_members (user_id, email, full_name, role, permissions, is_active)
VALUES (
  '4c984a9a-150e-4673-8192-17f80a7ef4d7',
  'marwryyy@gmail.com',
  'Admin User',
  'admin',
  ARRAY['read', 'write', 'admin'],
  true
);
        `);
      } else {
        console.log('❌ User not in dev_members table:', devMemberError.message);
      }
    } else {
      console.log('✅ User found in dev_members table');
      console.log(`   Role: ${devMemberData.role}`);
      console.log(`   Active: ${devMemberData.is_active}`);
    }

    console.log('\n=======================================');
    console.log('    TEST COMPLETE');
    console.log('=======================================');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

testAdminAccess();