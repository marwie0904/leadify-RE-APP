require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserOrganization(userEmail) {
  try {
    console.log(`\nFixing organization membership for user: ${userEmail}\n`);

    // Get the user by email
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', userEmail)
      .single();

    if (userError || !users) {
      // Try using auth admin API
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Could not fetch users:', authError);
        return;
      }

      const user = authData.users.find(u => u.email === userEmail);
      
      if (!user) {
        console.error(`User with email ${userEmail} not found`);
        console.log('\nAvailable users:');
        authData.users.forEach(u => {
          console.log(`  - ${u.email} (ID: ${u.id})`);
        });
        return;
      }

      await ensureOrganizationMembership(user.id, user.email);
    } else {
      await ensureOrganizationMembership(users.id, users.email);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

async function ensureOrganizationMembership(userId, userEmail) {
  console.log(`User found: ${userEmail} (ID: ${userId})`);

  // Check if user is already in an organization
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .single();

  if (membership) {
    console.log(`✅ User is already a member of organization ${membership.organization_id} with role: ${membership.role}`);
    
    // Check if this organization has agents
    const { data: agents, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('organization_id', membership.organization_id);

    console.log(`\nOrganization has ${agents?.length || 0} agents:`);
    agents?.forEach(agent => {
      console.log(`  - ${agent.name} (ID: ${agent.id})`);
    });
    
    return;
  }

  console.log('User is not a member of any organization');

  // Get the leadify organization (or create one)
  let orgId = '9f0de047-6b8d-41c4-9bce-ad3e267c8c66'; // leadify organization ID
  
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .single();

  if (!org) {
    console.log('Leadify organization not found, creating one...');
    
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Default Organization',
        owner_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createOrgError) {
      console.error('Failed to create organization:', createOrgError);
      return;
    }

    orgId = newOrg.id;
    console.log(`Created new organization: ${newOrg.name} (ID: ${newOrg.id})`);
  } else {
    console.log(`Using existing organization: ${org.name}`);
  }

  // Add user to the organization
  const { error: addMemberError } = await supabase
    .from('organization_members')
    .insert({
      user_id: userId,
      organization_id: orgId,
      role: 'admin', // Give admin role so they can manage agents
      joined_at: new Date().toISOString()
    });

  if (addMemberError) {
    console.error('Failed to add user to organization:', addMemberError);
    return;
  }

  console.log(`✅ Successfully added user to organization as admin`);

  // Check if this organization has agents
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', orgId);

  console.log(`\nOrganization has ${agents?.length || 0} agents:`);
  agents?.forEach(agent => {
    console.log(`  - ${agent.name} (ID: ${agent.id})`);
  });

  if (!agents || agents.length === 0) {
    console.log('\n⚠️  No agents found for this organization.');
    console.log('The user can create an agent through the frontend interface.');
  }
}

// Get the email from command line argument or use a default
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node fix-user-organization.js <user-email>');
  console.log('\nExample: node fix-user-organization.js user@example.com');
  console.log('\nThis script will ensure the user is a member of an organization with agents.');
} else {
  fixUserOrganization(userEmail);
}