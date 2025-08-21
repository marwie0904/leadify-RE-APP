const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Organization configurations
const organizations = [
  {
    name: 'Prime Residential Realty',
    email_domain: 'primeresidential.com',
    focus: 'residential',
    admin_email: 'admin@primeresidential.com',
    admin_first_name: 'Sarah',
    admin_last_name: 'Johnson'
  },
  {
    name: 'Commercial Property Experts',
    email_domain: 'commercialproperty.com',
    focus: 'commercial',
    admin_email: 'admin@commercialproperty.com',
    admin_first_name: 'Michael',
    admin_last_name: 'Chen'
  },
  {
    name: 'Luxury Estate Partners',
    email_domain: 'luxuryestates.com',
    focus: 'luxury',
    admin_email: 'admin@luxuryestates.com',
    admin_first_name: 'Victoria',
    admin_last_name: 'Sterling'
  },
  {
    name: 'Urban Rental Solutions',
    email_domain: 'urbanrentals.com',
    focus: 'rental',
    admin_email: 'admin@urbanrentals.com',
    admin_first_name: 'David',
    admin_last_name: 'Martinez'
  }
];

// Agent names for each organization
const agentNames = {
  'primeresidential.com': [
    { first: 'Emily', last: 'Davis' },
    { first: 'James', last: 'Wilson' },
    { first: 'Linda', last: 'Brown' },
    { first: 'Robert', last: 'Taylor' }
  ],
  'commercialproperty.com': [
    { first: 'Jennifer', last: 'Lee' },
    { first: 'Daniel', last: 'Kim' },
    { first: 'Amy', last: 'Wang' },
    { first: 'Kevin', last: 'Zhang' }
  ],
  'luxuryestates.com': [
    { first: 'Alexander', last: 'Black' },
    { first: 'Isabella', last: 'White' },
    { first: 'Christopher', last: 'Gold' },
    { first: 'Sophia', last: 'Silver' }
  ],
  'urbanrentals.com': [
    { first: 'Maria', last: 'Garcia' },
    { first: 'John', last: 'Rodriguez' },
    { first: 'Lisa', last: 'Anderson' },
    { first: 'Mark', last: 'Thompson' }
  ]
};

async function createUsersAndOrganizations() {
  console.log('👥 Starting user and organization creation...');
  
  const createdOrgs = [];
  const createdUsers = [];
  
  try {
    // Create organizations and their users
    for (const org of organizations) {
      console.log(`\n🏢 Creating organization: ${org.name}`);
      
      // First, create admin user in auth
      const { data: authAdmin, error: authAdminError } = await supabase.auth.admin.createUser({
        email: org.admin_email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: org.admin_first_name,
          last_name: org.admin_last_name,
          role: 'admin'
        }
      });
      
      if (authAdminError) {
        console.error(`❌ Error creating auth admin for ${org.name}:`, authAdminError);
        continue;
      }
      
      console.log(`✅ Created auth admin: ${org.admin_email}`);
      
      // Create or update admin user in users table
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .upsert({
          id: authAdmin.user.id,
          email: org.admin_email,
          first_name: org.admin_first_name,
          last_name: org.admin_last_name,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (adminError) {
        console.error(`❌ Error creating admin user for ${org.name}:`, adminError);
        continue;
      }
      
      createdUsers.push(adminUser);
      console.log(`✅ Created admin user: ${adminUser.first_name} ${adminUser.last_name}`);
      
      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: org.name,
          created_by: adminUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orgError) {
        console.error(`❌ Error creating organization ${org.name}:`, orgError);
        continue;
      }
      
      createdOrgs.push(newOrg);
      console.log(`✅ Created organization: ${newOrg.name}`);
      
      // Add admin as organization member
      const { error: adminMemberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: newOrg.id,
          user_id: adminUser.id,
          role: 'admin',
          joined_at: new Date().toISOString()
        });
      
      if (adminMemberError) {
        console.error(`❌ Error adding admin member:`, adminMemberError);
      }
      
      // Create agent users for this organization
      const agents = agentNames[org.email_domain];
      for (let i = 0; i < agents.length; i++) {
        const agentEmail = `agent${i + 1}@${org.email_domain}`;
        const agentName = agents[i];
        
        // Create agent in auth
        const { data: authAgent, error: authAgentError } = await supabase.auth.admin.createUser({
          email: agentEmail,
          password: 'TestPassword123!',
          email_confirm: true,
          user_metadata: {
            first_name: agentName.first,
            last_name: agentName.last,
            role: 'agent'
          }
        });
        
        if (authAgentError) {
          console.error(`❌ Error creating auth agent ${agentEmail}:`, authAgentError);
          continue;
        }
        
        // Create or update agent user in users table
        const { data: agentUser, error: agentError } = await supabase
          .from('users')
          .upsert({
            id: authAgent.user.id,
            email: agentEmail,
            first_name: agentName.first,
            last_name: agentName.last,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (agentError) {
          console.error(`❌ Error creating agent ${agentEmail}:`, agentError);
          continue;
        }
        
        createdUsers.push(agentUser);
        console.log(`✅ Created agent: ${agentName.first} ${agentName.last} (${agentEmail})`);
        
        // Add agent as organization member
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: newOrg.id,
            user_id: agentUser.id,
            role: 'agent',
            joined_at: new Date().toISOString()
          });
        
        if (memberError) {
          console.error(`❌ Error adding agent member:`, memberError);
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Created ${createdOrgs.length} organizations`);
    console.log(`✅ Created ${createdUsers.length} users`);
    
    // Count admins and agents based on user_metadata from auth
    const adminCount = createdUsers.filter(u => u.email.includes('admin@')).length;
    const agentCount = createdUsers.filter(u => u.email.includes('agent')).length;
    console.log(`   - ${adminCount} admins`);
    console.log(`   - ${agentCount} agents`);
    
    return { organizations: createdOrgs, users: createdUsers };
    
  } catch (error) {
    console.error('❌ Error in user/org creation:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createUsersAndOrganizations().then((result) => {
    console.log('\n🎉 User and organization creation completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { createUsersAndOrganizations, organizations };