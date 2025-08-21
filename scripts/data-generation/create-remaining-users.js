const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Agent configurations for each organization
const agentConfigs = [
  {
    org_id: '2a1e8d1e-8337-4643-af9e-ffe0a2bc9c8c',
    org_name: 'Prime Residential Realty',
    domain: 'primeresidential.com',
    agents: [
      { first: 'Emily', last: 'Davis' },
      { first: 'James', last: 'Wilson' },
      { first: 'Linda', last: 'Brown' },
      { first: 'Robert', last: 'Taylor' }
    ]
  },
  {
    org_id: 'a073bcbc-9e9e-46b4-8f3f-6da3989b57bd',
    org_name: 'Commercial Property Experts',
    domain: 'commercialproperty.com',
    agents: [
      { first: 'Jennifer', last: 'Lee' },
      { first: 'Daniel', last: 'Kim' },
      { first: 'Amy', last: 'Wang' },
      { first: 'Kevin', last: 'Zhang' }
    ]
  },
  {
    org_id: '49bf5c3e-8612-4a53-88ac-19a70432e000',
    org_name: 'Luxury Estate Partners',
    domain: 'luxuryestates.com',
    agents: [
      { first: 'Alexander', last: 'Black' },
      { first: 'Isabella', last: 'White' },
      { first: 'Christopher', last: 'Gold' },
      { first: 'Sophia', last: 'Silver' }
    ]
  },
  {
    org_id: 'e4efb9e8-397d-47ea-96c7-21edcc0c4b0c',
    org_name: 'Urban Rental Solutions',
    domain: 'urbanrentals.com',
    agents: [
      { first: 'Maria', last: 'Garcia' },
      { first: 'John', last: 'Rodriguez' },
      { first: 'Lisa', last: 'Anderson' },
      { first: 'Mark', last: 'Thompson' }
    ]
  }
];

async function createRemainingUsers() {
  console.log('👥 Creating agent users for all organizations...');
  
  let totalCreated = 0;
  
  for (const org of agentConfigs) {
    console.log(`\n🏢 Creating agents for ${org.org_name}...`);
    
    for (let i = 0; i < org.agents.length; i++) {
      const agent = org.agents[i];
      const email = `agent${i + 1}@${org.domain}`;
      
      try {
        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: 'TestPassword123!',
          email_confirm: true,
          user_metadata: {
            first_name: agent.first,
            last_name: agent.last,
            role: 'agent'
          }
        });
        
        if (authError) {
          console.error(`❌ Error creating auth user ${email}:`, authError);
          continue;
        }
        
        // Add to users table
        const { error: userError } = await supabase
          .from('users')
          .upsert({
            id: authUser.user.id,
            email: email,
            first_name: agent.first,
            last_name: agent.last,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (userError) {
          console.error(`❌ Error adding user ${email} to users table:`, userError);
          continue;
        }
        
        // Add to organization_members
        const { error: memberError } = await supabase
          .from('organization_members')
          .insert({
            organization_id: org.org_id,
            user_id: authUser.user.id,
            role: 'agent',
            joined_at: new Date().toISOString()
          });
        
        if (memberError) {
          console.error(`❌ Error adding ${email} to organization:`, memberError);
          continue;
        }
        
        console.log(`✅ Created agent: ${agent.first} ${agent.last} (${email})`);
        totalCreated++;
        
      } catch (error) {
        console.error(`❌ Error creating agent ${email}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Total agents created: ${totalCreated}`);
  return totalCreated;
}

// Run if called directly
if (require.main === module) {
  createRemainingUsers().then((count) => {
    console.log(`\n🎉 Successfully created ${count} agent users!`);
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { createRemainingUsers };