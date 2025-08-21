require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAgentOrganization() {
  try {
    console.log('Checking agent and organization setup...\n');

    // Check agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, name, organization_id, user_id, created_at')
      .order('created_at', { ascending: false });

    if (agentError) {
      console.error('Error fetching agents:', agentError);
      return;
    }

    console.log(`Found ${agents?.length || 0} agents:`);
    agents?.forEach(agent => {
      console.log(`\nAgent: ${agent.name}`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Organization ID: ${agent.organization_id}`);
      console.log(`  User ID: ${agent.user_id}`);
      console.log(`  Created: ${agent.created_at}`);
    });

    // Check organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_id, created_at')
      .order('created_at', { ascending: false });

    console.log(`\n\nFound ${orgs?.length || 0} organizations:`);
    orgs?.forEach(org => {
      console.log(`\nOrganization: ${org.name}`);
      console.log(`  ID: ${org.id}`);
      console.log(`  Owner ID: ${org.owner_id}`);
      console.log(`  Created: ${org.created_at}`);
    });

    // Check organization members
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id, organization_id, role, joined_at')
      .order('joined_at', { ascending: false });

    console.log(`\n\nFound ${members?.length || 0} organization members:`);
    
    // Group members by organization
    const membersByOrg = {};
    members?.forEach(member => {
      if (!membersByOrg[member.organization_id]) {
        membersByOrg[member.organization_id] = [];
      }
      membersByOrg[member.organization_id].push(member);
    });

    Object.entries(membersByOrg).forEach(([orgId, orgMembers]) => {
      console.log(`\nOrganization ${orgId}:`);
      orgMembers.forEach(member => {
        console.log(`  User ${member.user_id} - Role: ${member.role} - Joined: ${member.joined_at}`);
      });
    });

    // Check if agents and organizations are properly linked
    console.log('\n\n=== Verification ===');
    
    agents?.forEach(agent => {
      const org = orgs?.find(o => o.id === agent.organization_id);
      if (org) {
        console.log(`✅ Agent "${agent.name}" is properly linked to organization "${org.name}"`);
      } else {
        console.log(`❌ Agent "${agent.name}" has organization_id ${agent.organization_id} which doesn't exist!`);
      }
    });

    // Check users table to see what users exist
    console.log('\n\n=== Users in Auth ===');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('Could not fetch auth users (requires admin key)');
    } else {
      console.log(`Found ${authUsers?.users?.length || 0} users in auth:`);
      authUsers?.users?.forEach(user => {
        console.log(`  ${user.email} (ID: ${user.id})`);
        
        // Check if this user is in any organization
        const userMemberships = members?.filter(m => m.user_id === user.id);
        if (userMemberships?.length > 0) {
          userMemberships.forEach(membership => {
            const org = orgs?.find(o => o.id === membership.organization_id);
            console.log(`    → Member of "${org?.name || membership.organization_id}" as ${membership.role}`);
          });
        } else {
          console.log(`    → Not a member of any organization`);
        }
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAgentOrganization();