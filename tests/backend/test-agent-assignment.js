// Test script to verify agent assignment using organization_members table

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAgentAssignment() {
  console.log('=== Testing Agent Assignment with organization_members ===\n');

  try {
    // 1. First, let's check if we have any organizations
    console.log('1. Checking organizations...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgsError || !orgs?.length) {
      console.error('No organizations found:', orgsError);
      return;
    }

    const testOrgId = orgs[0].id;
    console.log(`   Using organization: ${orgs[0].name} (${testOrgId})`);

    // 2. Check for agents in this organization
    console.log('\n2. Checking for agents in organization_members...');
    const { data: agents, error: agentsError } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', testOrgId)
      .eq('role', 'agent');

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return;
    }

    console.log(`   Found ${agents?.length || 0} agents in organization`);
    
    if (agents && agents.length > 0) {
      // 3. Get user details for each agent
      console.log('\n3. Getting agent details...');
      for (const agent of agents) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(agent.user_id);
        if (userData?.user) {
          const email = userData.user.email;
          const name = userData.user.user_metadata?.full_name || email;
          console.log(`   - Agent: ${name} (${email})`);
          
          // Count active conversations for this agent
          const { count } = await supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_human_agent_id', agent.user_id)
            .eq('mode', 'human');
          
          console.log(`     Active conversations: ${count || 0}`);
        }
      }
    } else {
      console.log('   No agents found. You may need to assign users the "agent" role.');
    }

    // 4. Test the assignment logic
    console.log('\n4. Testing assignment logic...');
    const availableAgent = await findMostAvailableAgent(testOrgId);
    
    if (availableAgent) {
      console.log(`   Selected agent: ${availableAgent.name}`);
      console.log(`   Agent ID: ${availableAgent.id}`);
      console.log(`   Conversation count: ${availableAgent.conversationCount}`);
    } else {
      console.log('   No available agent found');
    }

    // 5. Check for any remaining references to human_agents table
    console.log('\n5. Checking for human_agents table usage...');
    const { error: humanAgentsError } = await supabase
      .from('human_agents')
      .select('id')
      .limit(1);
    
    if (humanAgentsError?.message?.includes('relation "public.human_agents" does not exist')) {
      console.log('   ✓ human_agents table not found (good - migration complete)');
    } else {
      console.log('   ⚠️  human_agents table still exists - consider migrating data');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Copy of the updated findMostAvailableAgent function for testing
async function findMostAvailableAgent(organizationId) {
  console.log('[AGENT ASSIGNMENT] Finding most available agent for organization:', organizationId);
  
  try {
    // Get all agents for this organization from organization_members
    const { data: orgAgents, error: agentsError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .eq('role', 'agent');
    
    if (agentsError || !orgAgents?.length) {
      console.log('[AGENT ASSIGNMENT] No agents found in organization:', agentsError);
      return null;
    }
    
    console.log('[AGENT ASSIGNMENT] Found', orgAgents.length, 'potential agents');
    
    // Get user details and count active conversations for each agent
    const agentLoads = await Promise.all(
      orgAgents.map(async (member) => {
        // Get user details from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(member.user_id);
        if (userError || !userData?.user) {
          console.log('[AGENT ASSIGNMENT] Error fetching user data for:', member.user_id);
          return null;
        }
        
        const userEmail = userData.user.email;
        const userName = userData.user.user_metadata?.full_name || userEmail;
        
        // Count active conversations assigned to this agent
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_human_agent_id', member.user_id)
          .eq('mode', 'human'); // Only count active human-mode conversations
        
        const conversationCount = conversations?.length || 0;
        console.log('[AGENT ASSIGNMENT] Agent', userName, 'has', conversationCount, 'active conversations');
        
        return {
          id: member.user_id,
          name: userName,
          email: userEmail,
          conversationCount
        };
      })
    );
    
    // Filter out any null results
    const validAgents = agentLoads.filter(agent => agent !== null);
    
    if (!validAgents.length) {
      console.log('[AGENT ASSIGNMENT] No valid agents found');
      return null;
    }
    
    // Sort by conversation count (least busy first)
    validAgents.sort((a, b) => a.conversationCount - b.conversationCount);
    
    const selectedAgent = validAgents[0];
    console.log('[AGENT ASSIGNMENT] Selected agent:', selectedAgent.name, 'with', selectedAgent.conversationCount, 'conversations');
    return selectedAgent;
  } catch (error) {
    console.error('[AGENT ASSIGNMENT] Error finding available agent:', error);
    return null;
  }
}

// Run the test
testAgentAssignment();