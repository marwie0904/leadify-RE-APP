// Test script to verify leads are properly filtered by organization

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLeadsFiltering() {
  console.log('=== Testing Leads Organization Filtering ===\n');

  try {
    // 1. First, let's check the leads table structure
    console.log('1. Checking leads table for organization_id column...');
    const { data: sampleLead, error: leadError } = await supabase
      .from('leads')
      .select('id, conversation_id, organization_id, full_name, lead_classification')
      .limit(1);

    if (leadError) {
      console.error('Error fetching lead:', leadError.message);
      if (leadError.message.includes('column "organization_id" does not exist')) {
        console.log('   ❌ organization_id column NOT found in leads table');
        console.log('   Please run the migration: migrate-leads-organization-id.sql');
        return;
      }
    } else {
      console.log('   ✓ organization_id column exists in leads table');
      if (sampleLead?.length > 0) {
        console.log('   Sample lead:', {
          id: sampleLead[0].id,
          has_org_id: !!sampleLead[0].organization_id,
          org_id: sampleLead[0].organization_id
        });
      }
    }

    // 2. Check how many leads have NULL organization_id
    console.log('\n2. Checking for leads without organization_id...');
    const { count: nullOrgCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);

    console.log(`   Found ${nullOrgCount || 0} leads without organization_id`);
    if (nullOrgCount > 0) {
      console.log('   ⚠️  Some leads need organization_id populated');
      console.log('   Run the UPDATE query in migrate-leads-organization-id.sql');
    }

    // 3. Test leads grouped by organization
    console.log('\n3. Checking leads distribution by organization...');
    const { data: allLeads, error: allLeadsError } = await supabase
      .from('leads')
      .select('organization_id')
      .not('organization_id', 'is', null);

    if (!allLeadsError && allLeads) {
      const orgCounts = {};
      allLeads.forEach(lead => {
        orgCounts[lead.organization_id] = (orgCounts[lead.organization_id] || 0) + 1;
      });

      console.log('   Lead counts by organization:');
      Object.entries(orgCounts).forEach(([orgId, count]) => {
        console.log(`   - ${orgId}: ${count} leads`);
      });
    }

    // 4. Test conversation -> lead -> organization relationship
    console.log('\n4. Verifying lead-conversation-organization relationships...');
    const { data: leadWithConv, error: convError } = await supabase
      .from('leads')
      .select(`
        id,
        organization_id,
        conversations!inner(
          id,
          agent_id,
          agents!inner(
            id,
            organization_id
          )
        )
      `)
      .limit(5);

    if (!convError && leadWithConv) {
      let mismatches = 0;
      leadWithConv.forEach(lead => {
        const leadOrgId = lead.organization_id;
        const convOrgId = lead.conversations?.agents?.organization_id;
        
        if (leadOrgId !== convOrgId) {
          mismatches++;
          console.log(`   ⚠️  Mismatch found:`);
          console.log(`      Lead org: ${leadOrgId}`);
          console.log(`      Conv org: ${convOrgId}`);
        }
      });

      if (mismatches === 0) {
        console.log('   ✓ All checked leads have matching organization_ids');
      } else {
        console.log(`   ❌ Found ${mismatches} mismatches`);
      }
    }

    // 5. Test the search_leads_fuzzy function
    console.log('\n5. Testing search_leads_fuzzy function...');
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgs?.length > 0) {
      const testOrgId = orgs[0].id;
      console.log(`   Testing with org: ${orgs[0].name} (${testOrgId})`);
      
      // Test with org_id parameter
      const { data: fuzzyResults, error: fuzzyError } = await supabase
        .rpc('search_leads_fuzzy', { 
          q: '',  // Empty search to get all
          org_id: testOrgId 
        });

      if (fuzzyError) {
        console.log('   ❌ search_leads_fuzzy function error:', fuzzyError.message);
        console.log('   You may need to run: update-search-leads-fuzzy.sql');
      } else {
        console.log(`   ✓ Fuzzy search returned ${fuzzyResults?.length || 0} leads for this org`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLeadsFiltering();