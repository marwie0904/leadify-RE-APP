/**
 * Test Organizations API Response
 */

const axios = require('axios');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE_URL = 'http://localhost:3001';

async function testOrganizationsAPI() {
  console.log('=======================================');
  console.log('    ORGANIZATIONS API TEST');
  console.log('=======================================\n');

  try {
    // 1. Login as marwryyy@gmail.com
    console.log('1. Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful\n');

    // 2. Test organizations endpoint
    console.log('2. Testing /api/admin/organizations endpoint...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/organizations?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ API Response Status:', response.status);
      console.log('\n📊 Response Structure:');
      console.log('   Keys:', Object.keys(response.data));
      
      if (response.data.success) {
        console.log('   Success:', response.data.success);
        
        if (response.data.data) {
          console.log('\n📦 Data Structure:');
          console.log('   Data Keys:', Object.keys(response.data.data));
          
          if (response.data.data.summary) {
            console.log('\n   Summary:');
            console.log('   - Total Organizations:', response.data.data.summary.totalOrganizations);
            console.log('   - Total Users:', response.data.data.summary.totalUsers);
          }
          
          if (response.data.data.organizations) {
            console.log('\n   Organizations:');
            console.log('   - Count:', response.data.data.organizations.length);
            
            if (response.data.data.organizations.length > 0) {
              const firstOrg = response.data.data.organizations[0];
              console.log('\n   First Organization:');
              console.log('   - ID:', firstOrg.id);
              console.log('   - Name:', firstOrg.name);
              console.log('   - Plan:', firstOrg.plan);
              console.log('   - Keys:', Object.keys(firstOrg));
            }
          } else {
            console.log('   ⚠️ No organizations array in response.data.data');
          }
          
          if (response.data.data.pagination) {
            console.log('\n   Pagination:');
            console.log('   - Page:', response.data.data.pagination.page);
            console.log('   - Total:', response.data.data.pagination.total);
            console.log('   - Total Pages:', response.data.data.pagination.totalPages);
          }
        } else {
          console.log('   ⚠️ No data property in response');
        }
      } else {
        console.log('   ❌ Success: false');
        console.log('   Error:', response.data.error);
      }
      
      // 3. Check organization_members table directly
      console.log('\n3. Checking organization_members table directly...');
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('organization_id', '770257fa-dc41-4529-9cb3-43b47072c271');
      
      if (orgError) {
        console.log('   ❌ Error fetching org members:', orgError.message);
      } else {
        console.log('   ✅ Organization members found:', orgMembers.length);
      }
      
      // 4. Check organizations table
      console.log('\n4. Checking organizations table directly...');
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .limit(5);
      
      if (orgsError) {
        console.log('   ❌ Error fetching organizations:', orgsError.message);
      } else {
        console.log('   ✅ Organizations in database:', orgs.length);
        orgs.forEach(org => {
          console.log(`   - ${org.name} (${org.id})`);
        });
      }
      
    } catch (error) {
      if (error.response) {
        console.log('❌ API Error:', error.response.status, error.response.statusText);
        console.log('   Response:', error.response.data);
      } else {
        console.log('❌ Request Error:', error.message);
      }
    }

    console.log('\n=======================================');
    console.log('    TEST COMPLETE');
    console.log('=======================================');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the test
testOrganizationsAPI();